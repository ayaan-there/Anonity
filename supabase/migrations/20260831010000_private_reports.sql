-- Anonity privacy boundary.
-- Report and comment bodies are now sealed in the browser before insert.
-- The database may route ciphertext, but must not retain hunter identity or payout data.

alter table if exists public.program_meta
  add column if not exists encryption_public_key text,
  drop column if exists fee_recipient_address;

alter table if exists public.profiles
  drop column if exists wallet_address;

-- Hunter identities are local secrets now. Remove any legacy hunter account
-- rows, including their Auth users, while preserving organization accounts.
create temporary table if not exists anonity_legacy_hunter_ids (
  id uuid primary key
) on commit drop;

insert into anonity_legacy_hunter_ids (id)
select id from public.profiles where role = 'hunter'
on conflict do nothing;

delete from public.profiles p
using anonity_legacy_hunter_ids h
where p.id = h.id;

delete from auth.users u
using anonity_legacy_hunter_ids h
where u.id = h.id;

-- Do not allow the removed hunter-account role to be recreated through the
-- public profile API. Organization accounts remain supported.
alter table if exists public.profiles
  drop constraint if exists profiles_org_role_only_check;

alter table if exists public.profiles
  add constraint profiles_org_role_only_check
  check (role = 'org');

drop table if exists public.report_payments;

-- Existing plaintext rows cannot be made private retroactively. Remove them before
-- dropping the columns so an old database snapshot cannot serve report content.
delete from public.report_comments;
delete from public.reports;

do $$
declare
  policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('reports', 'report_comments')
  loop
    execute format('drop policy if exists %I on %I.%I', policy_row.policyname, policy_row.schemaname, policy_row.tablename);
  end loop;
end $$;

alter table if exists public.reports
  drop column if exists author,
  drop column if exists asset,
  drop column if exists weakness,
  drop column if exists severity,
  drop column if exists cvss_version,
  drop column if exists cvss_vector,
  drop column if exists description,
  drop column if exists impact,
  drop column if exists payout_address,
  drop column if exists payment_status,
  add column if not exists org_ciphertext text,
  add column if not exists hunter_ciphertext text,
  add column if not exists hunter_encryption_public_key text,
  add column if not exists encryption_version smallint not null default 1;

alter table if exists public.reports
  alter column org_ciphertext set not null,
  alter column hunter_ciphertext set not null,
  alter column hunter_encryption_public_key set not null;

alter table if exists public.report_comments
  drop column if exists author,
  drop column if exists body,
  add column if not exists org_ciphertext text,
  add column if not exists hunter_ciphertext text,
  add column if not exists sender_role text not null default 'org',
  add column if not exists encryption_version smallint not null default 1;

alter table if exists public.report_comments
  alter column org_ciphertext set not null,
  alter column hunter_ciphertext set not null;

alter table if exists public.report_comments
  drop constraint if exists report_comments_sender_role_check;

alter table if exists public.report_comments
  add constraint report_comments_sender_role_check
  check (sender_role in ('org', 'hunter'));

alter table if exists public.reports enable row level security;
alter table if exists public.report_comments enable row level security;

create policy "private report ciphertext is readable"
  on public.reports for select
  to anon, authenticated
  using (true);

create policy "private comment ciphertext is readable"
  on public.report_comments for select
  to anon, authenticated
  using (true);

create policy "private comment ciphertext requires an encrypted report"
  on public.report_comments for insert
  to anon, authenticated
  with check (
    encryption_version = 1
    and length(org_ciphertext) > 0
    and length(hunter_ciphertext) > 0
    and exists (
      select 1 from public.reports r
      where r.submission_id = report_comments.submission_id
    )
  );
