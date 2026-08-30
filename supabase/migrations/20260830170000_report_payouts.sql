alter table public.profiles
  add column if not exists wallet_address text;

alter table public.profiles
  drop constraint if exists profiles_wallet_address_check;

alter table public.profiles
  add constraint profiles_wallet_address_check
  check (wallet_address is null or (char_length(trim(wallet_address)) between 20 and 200 and wallet_address !~ '\\s'));

alter table public.reports
  add column if not exists payout_address text,
  add column if not exists payment_status text not null default 'unpaid';

create table if not exists public.report_payments (
  submission_id bigint primary key references public.reports(submission_id) on delete cascade,
  payer uuid not null default auth.uid() references auth.users(id),
  recipient_address text not null,
  amount bigint not null check (amount > 0),
  tx_reference text not null unique,
  paid_at timestamptz not null default now()
);

alter table public.report_payments enable row level security;

drop policy if exists "report payments read authorized" on public.report_payments;
create policy "report payments read authorized"
  on public.report_payments for select to authenticated
  using (exists (
    select 1 from public.reports r
    where r.submission_id = report_payments.submission_id
      and (r.author = (select auth.uid()) or exists (
        select 1 from public.program_meta pm
        where pm.bounty_id = r.bounty_id
          and pm.author = (select auth.uid())
      ))
  ));

drop policy if exists "report payments insert owning org" on public.report_payments;
create policy "report payments insert owning org"
  on public.report_payments for insert to authenticated
  with check (payer = (select auth.uid()) and exists (
    select 1 from public.reports r
    join public.program_meta pm on pm.bounty_id = r.bounty_id
    where r.submission_id = report_payments.submission_id
      and pm.author = (select auth.uid())
  ));

alter table public.reports
  drop constraint if exists reports_payout_address_check;

alter table public.reports
  add constraint reports_payout_address_check
  check (payout_address is null or (char_length(trim(payout_address)) between 20 and 200 and payout_address !~ '\\s'));
