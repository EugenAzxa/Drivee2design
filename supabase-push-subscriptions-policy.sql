-- ============================================================================
-- Drivee — Row Level Security policies for the push_subscriptions table
-- ----------------------------------------------------------------------------
-- WHY THIS EXISTS
-- The app (running with the public "anon" key) needs to register a device's
-- push subscription when a user turns on notifications, and remove it when they
-- turn them off. With RLS enabled and no policies, every insert is rejected with
-- "new row violates row-level security policy" — which is the error users saw.
--
-- WHAT THIS DOES
--   * Allows anon to INSERT a subscription (register a device).
--   * Allows anon to DELETE a subscription (turn notifications off).
--   * Does NOT allow anon to SELECT — so nobody can read everyone's tokens.
--
-- The server functions (api/notify-daily-tip.js, api/notify-reminders.js) read
-- the table with the SECRET service-role key, which bypasses RLS, so sending
-- notifications keeps working without a SELECT policy for anon.
--
-- HOW TO RUN
--   Supabase dashboard → SQL Editor → New query → paste this → Run.
--   Safe to run more than once (it drops the policies first if they exist).
-- ============================================================================

-- Make sure RLS is on (it already is — this is just explicit/safe).
alter table public.push_subscriptions enable row level security;

-- Clean slate so re-running this file never errors on "already exists".
drop policy if exists "anon can register a push subscription" on public.push_subscriptions;
drop policy if exists "anon can remove a push subscription"   on public.push_subscriptions;

-- Allow anyone (anon + logged-in) to INSERT a subscription row.
create policy "anon can register a push subscription"
  on public.push_subscriptions
  for insert
  to anon, authenticated
  with check (true);

-- Allow anyone to DELETE a subscription (used when notifications are turned off).
create policy "anon can remove a push subscription"
  on public.push_subscriptions
  for delete
  to anon, authenticated
  using (true);

-- NOTE: No SELECT or UPDATE policy is granted to anon on purpose. Reading the
-- full table is done server-side with the service-role key only.
