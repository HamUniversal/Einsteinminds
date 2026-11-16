create table if not exists public.paypal_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  paypal_subscription_id text not null unique,
  paypal_plan_id text not null,
  plan_key text not null check (plan_key in ('monthly','yearly')),
  status text not null default 'APPROVAL_PENDING',
  payer_email text,
  next_billing_time timestamptz,
  last_payment_at timestamptz,
  payment_status text,
  cancel_requested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists paypal_subscriptions_user_updated_idx
  on public.paypal_subscriptions(user_id, updated_at desc);
create unique index if not exists paypal_subscriptions_one_pending_or_live_per_user
  on public.paypal_subscriptions(user_id)
  where status in ('APPROVAL_PENDING','APPROVED','ACTIVE','SUSPENDED','PAYMENT_FAILED');
alter table public.paypal_subscriptions enable row level security;
drop policy if exists "Users can read their own PayPal subscription" on public.paypal_subscriptions;
create policy "Users can read their own PayPal subscription"
  on public.paypal_subscriptions for select to authenticated
  using (auth.uid() = user_id);
revoke all on public.paypal_subscriptions from anon, authenticated;
grant select on public.paypal_subscriptions to authenticated;
grant all on public.paypal_subscriptions to service_role;
create table if not exists public.paypal_webhook_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);
alter table public.paypal_webhook_events enable row level security;
revoke all on public.paypal_webhook_events from anon, authenticated;
grant all on public.paypal_webhook_events to service_role;
