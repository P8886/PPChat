-- Guest room support with server-side rate limiting.

alter table public.messages
add column if not exists guest_session_id text;

create index if not exists messages_guest_session_recent_idx
on public.messages (guest_session_id, inserted_at desc)
where guest_session_id is not null;

do $$
declare
  guest_user_id uuid := '00000000-0000-4000-8000-000000000001';
begin
  insert into auth.users (id, email)
  values (guest_user_id, 'guest@ppchat.local')
  on conflict (id) do nothing;

  insert into public.users (id, username, status)
  values (guest_user_id, '游客', 'OFFLINE')
  on conflict (id) do update
  set username = excluded.username;

  insert into public.channels (slug, created_by, is_private, password)
  values ('guest', guest_user_id, false, null)
  on conflict (slug) do update
  set is_private = false,
      password = null;
end $$;

create or replace function public.guest_channel_id()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select id from public.channels where slug = 'guest' limit 1
$$;

create or replace function public.send_guest_message(
  p_message_text text,
  p_guest_session_id text
)
returns setof public.messages
language plpgsql
security definer
set search_path = public
as $$
declare
  guest_user_id constant uuid := '00000000-0000-4000-8000-000000000001';
  guest_channel_id bigint;
  clean_message text;
  clean_session_id text;
  recent_count integer;
begin
  clean_message := nullif(btrim(p_message_text), '');
  clean_session_id := nullif(btrim(p_guest_session_id), '');

  if clean_message is null then
    raise exception '消息不能为空';
  end if;

  if clean_session_id is null or length(clean_session_id) < 16 or length(clean_session_id) > 80 then
    raise exception '游客会话无效';
  end if;

  select id into guest_channel_id
  from public.channels
  where slug = 'guest'
  limit 1;

  if guest_channel_id is null then
    raise exception '游客房间不存在';
  end if;

  perform pg_advisory_xact_lock(hashtext(clean_session_id)::bigint);

  select count(*)
  into recent_count
  from public.messages
  where channel_id = guest_channel_id
    and guest_session_id = clean_session_id
    and inserted_at >= now() - interval '1 minute';

  if recent_count >= 10 then
    raise exception '游客一分钟内最多发10条信息';
  end if;

  return query
    insert into public.messages (message, user_id, channel_id, message_type, guest_session_id)
    values (clean_message, guest_user_id, guest_channel_id, 'text', clean_session_id)
    returning *;
end;
$$;

grant usage on schema public to anon;
grant select on public.channels to anon;
grant select on public.messages to anon;
grant select on public.users to anon;
grant execute on function public.guest_channel_id() to anon, authenticated;
grant execute on function public.send_guest_message(text, text) to anon;

drop policy if exists "Allow anon read guest channel" on public.channels;
create policy "Allow anon read guest channel" on public.channels
for select to anon
using (slug = 'guest');

drop policy if exists "Allow anon read guest messages" on public.messages;
create policy "Allow anon read guest messages" on public.messages
for select to anon
using (channel_id = public.guest_channel_id());

drop policy if exists "Allow anon read guest profile" on public.users;
create policy "Allow anon read guest profile" on public.users
for select to anon
using (id = '00000000-0000-4000-8000-000000000001'::uuid);
