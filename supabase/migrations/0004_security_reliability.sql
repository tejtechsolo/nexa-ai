-- Security and reliability controls for authenticated application traffic.
create table if not exists public.api_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket_start timestamptz not null,
  bucket_seconds integer not null check (bucket_seconds in (60, 3600)),
  request_count integer not null default 0 check (request_count >= 0),
  primary key (user_id, bucket_start, bucket_seconds)
);

alter table public.api_rate_limits enable row level security;
revoke all on public.api_rate_limits from anon, authenticated;

create table if not exists public.security_audit_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (char_length(event_type) between 1 and 80),
  metadata jsonb not null default '{}'::jsonb check (pg_column_size(metadata) <= 4096),
  created_at timestamptz not null default now()
);
create index if not exists security_audit_events_user_created_idx
  on public.security_audit_events(user_id, created_at desc);
alter table public.security_audit_events enable row level security;
revoke all on public.security_audit_events from anon, authenticated;

-- SECURITY DEFINER is required because clients must not receive write access to the
-- underlying counters. auth.uid() is still taken from the authenticated JWT context.
create or replace function public.consume_api_rate_limit(
  p_minute_limit integer default 10,
  p_hour_limit integer default 100
)
returns table(allowed boolean, retry_after_seconds integer, minute_remaining integer, hour_remaining integer)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_now timestamptz := now();
  v_minute timestamptz := date_trunc('minute', v_now);
  v_hour timestamptz := date_trunc('hour', v_now);
  v_minute_count integer;
  v_hour_count integer;
begin
  if v_user is null then
    return query select false, 60, 0, 0;
    return;
  end if;

  insert into public.api_rate_limits(user_id, bucket_start, bucket_seconds, request_count)
  values (v_user, v_minute, 60, 1)
  on conflict (user_id, bucket_start, bucket_seconds)
  do update set request_count = public.api_rate_limits.request_count + 1
  returning request_count into v_minute_count;

  insert into public.api_rate_limits(user_id, bucket_start, bucket_seconds, request_count)
  values (v_user, v_hour, 3600, 1)
  on conflict (user_id, bucket_start, bucket_seconds)
  do update set request_count = public.api_rate_limits.request_count + 1
  returning request_count into v_hour_count;

  if v_minute_count > greatest(1, least(p_minute_limit, 60))
     or v_hour_count > greatest(1, least(p_hour_limit, 1000)) then
    update public.api_rate_limits
      set request_count = greatest(request_count - 1, 0)
      where user_id = v_user and bucket_start in (v_minute, v_hour)
        and bucket_seconds in (60, 3600);
    return query select false,
      case when v_minute_count > greatest(1, least(p_minute_limit, 60))
        then greatest(1, 60 - extract(second from v_now)::integer)
        else greatest(1, 3600 - (extract(minute from v_now)::integer * 60 + extract(second from v_now)::integer))
      end,
      greatest(0, greatest(1, least(p_minute_limit, 60)) - (v_minute_count - 1)),
      greatest(0, greatest(1, least(p_hour_limit, 1000)) - (v_hour_count - 1));
    return;
  end if;

  return query select true, 0,
    greatest(0, greatest(1, least(p_minute_limit, 60)) - v_minute_count),
    greatest(0, greatest(1, least(p_hour_limit, 1000)) - v_hour_count);
end;
$$;

create or replace function public.write_security_audit_event(
  p_event_type text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_event_type is null or char_length(p_event_type) not between 1 and 80 then
    raise exception 'Invalid event type';
  end if;
  insert into public.security_audit_events(user_id, event_type, metadata)
  values (auth.uid(), p_event_type, coalesce(p_metadata, '{}'::jsonb));
end;
$$;

-- Fix the daily quota functions: the previous invoker functions could not write
-- through the intentionally read-only RLS policy on ai_usage_daily.
create or replace function public.consume_ai_request(
  p_input_characters integer,
  p_daily_limit integer default 50
)
returns table(allowed boolean, remaining integer, request_count integer)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_date date := (now() at time zone 'utc')::date;
  v_count integer;
  v_limit integer := greatest(1, least(p_daily_limit, 10000));
begin
  if v_user_id is null then return query select false, 0, 0; return; end if;
  if p_input_characters < 1 or p_input_characters > 1000000 then raise exception 'Invalid input size'; end if;

  insert into public.ai_usage_daily(user_id, usage_date, request_count, input_characters)
  values (v_user_id, v_date, 1, p_input_characters)
  on conflict (user_id, usage_date) do update
    set request_count = public.ai_usage_daily.request_count + 1,
        input_characters = public.ai_usage_daily.input_characters + excluded.input_characters,
        updated_at = now()
  returning request_count into v_count;

  if v_count > v_limit then
    update public.ai_usage_daily
      set request_count = request_count - 1,
          input_characters = input_characters - p_input_characters,
          updated_at = now()
      where user_id = v_user_id and usage_date = v_date;
    return query select false, 0, v_count - 1;
    return;
  end if;
  return query select true, v_limit - v_count, v_count;
end;
$$;

create or replace function public.record_ai_output(p_output_characters integer)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_output_characters < 0 or p_output_characters > 1000000 then raise exception 'Invalid output size'; end if;
  update public.ai_usage_daily
    set output_characters = output_characters + p_output_characters, updated_at = now()
    where user_id = auth.uid() and usage_date = (now() at time zone 'utc')::date;
end;
$$;

revoke all on function public.consume_api_rate_limit(integer, integer) from public, anon;
revoke all on function public.write_security_audit_event(text, jsonb) from public, anon;
revoke all on function public.consume_ai_request(integer, integer) from public, anon;
revoke all on function public.record_ai_output(integer) from public, anon;
grant execute on function public.consume_api_rate_limit(integer, integer) to authenticated;
grant execute on function public.write_security_audit_event(text, jsonb) to authenticated;
grant execute on function public.consume_ai_request(integer, integer) to authenticated;
grant execute on function public.record_ai_output(integer) to authenticated;

-- Old rate-limit buckets are not useful after two days.
create index if not exists api_rate_limits_bucket_idx on public.api_rate_limits(bucket_start);
