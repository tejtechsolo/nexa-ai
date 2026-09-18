create table if not exists public.ai_usage_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default (timezone('utc', now()))::date,
  request_count integer not null default 0 check (request_count >= 0),
  input_characters bigint not null default 0 check (input_characters >= 0),
  output_characters bigint not null default 0 check (output_characters >= 0),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, usage_date)
);

alter table public.ai_usage_daily enable row level security;

drop policy if exists "Users can view own daily usage" on public.ai_usage_daily;
create policy "Users can view own daily usage"
  on public.ai_usage_daily for select
  using (auth.uid() = user_id);

create or replace function public.consume_ai_request(
  p_input_characters integer,
  p_daily_limit integer default 50
)
returns table(allowed boolean, remaining integer, request_count integer)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_date date := (timezone('utc', now()))::date;
  v_count integer;
begin
  if v_user_id is null then
    return query select false, 0, 0;
    return;
  end if;

  if p_input_characters < 1 or p_input_characters > 1000000 then
    raise exception 'Invalid input size';
  end if;

  insert into public.ai_usage_daily(user_id, usage_date, request_count, input_characters)
  values (v_user_id, v_date, 1, p_input_characters)
  on conflict (user_id, usage_date) do update
    set request_count = public.ai_usage_daily.request_count + 1,
        input_characters = public.ai_usage_daily.input_characters + excluded.input_characters,
        updated_at = timezone('utc', now())
  returning request_count into v_count;

  if v_count > greatest(p_daily_limit, 1) then
    update public.ai_usage_daily
      set request_count = request_count - 1,
          input_characters = input_characters - p_input_characters,
          updated_at = timezone('utc', now())
      where user_id = v_user_id and usage_date = v_date;
    return query select false, 0, v_count - 1;
    return;
  end if;

  return query select true, greatest(p_daily_limit, 1) - v_count, v_count;
end;
$$;

create or replace function public.record_ai_output(
  p_output_characters integer
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if p_output_characters < 0 or p_output_characters > 1000000 then
    raise exception 'Invalid output size';
  end if;

  update public.ai_usage_daily
  set output_characters = output_characters + p_output_characters,
      updated_at = timezone('utc', now())
  where user_id = auth.uid()
    and usage_date = (timezone('utc', now()))::date;
end;
$$;
