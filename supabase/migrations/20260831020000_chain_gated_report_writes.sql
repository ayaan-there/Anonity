-- Reports are inserted only by the store-report Edge Function after it has
-- verified a finalized submitReport transaction against the Midnight indexer.
drop policy if exists "private report ciphertext accepts app-validated submission" on public.reports;

revoke insert on public.reports from anon, authenticated;
