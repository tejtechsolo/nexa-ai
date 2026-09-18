create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New conversation',
  provider text not null default 'openai',
  model text not null default 'gpt-4o-mini',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null check (char_length(content) <= 100000),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists conversations_user_updated_idx on public.conversations(user_id, updated_at desc);
create index if not exists messages_conversation_created_idx on public.messages(conversation_id, created_at);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "Users can view own conversations" on public.conversations for select using (auth.uid() = user_id);
create policy "Users can create own conversations" on public.conversations for insert with check (auth.uid() = user_id);
create policy "Users can update own conversations" on public.conversations for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own conversations" on public.conversations for delete using (auth.uid() = user_id);

create policy "Users can view own messages" on public.messages for select using (auth.uid() = user_id);
create policy "Users can create own messages" on public.messages for insert with check (auth.uid() = user_id);
create policy "Users can delete own messages" on public.messages for delete using (auth.uid() = user_id);

create or replace function public.touch_conversation_updated_at()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  update public.conversations set updated_at = timezone('utc', now()) where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists messages_touch_conversation on public.messages;
create trigger messages_touch_conversation after insert on public.messages
for each row execute function public.touch_conversation_updated_at();
