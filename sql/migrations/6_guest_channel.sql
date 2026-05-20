-- Guest room support with server-side rate limiting.

create extension if not exists pgcrypto with schema extensions;

alter table public.messages
add column if not exists guest_session_id text;

comment on column public.messages.guest_session_id is 'SHA-256 fingerprint of the browser guest session id.';

create index if not exists messages_guest_session_recent_idx
on public.messages (guest_session_id, inserted_at desc)
where guest_session_id is not null;

create or replace function public.guest_session_hash(p_guest_session_id text)
returns text
language sql
immutable
security definer
set search_path = public, extensions
as $$
  select encode(digest(p_guest_session_id, 'sha256'), 'hex')
$$;

update public.messages
set guest_session_id = public.guest_session_hash(guest_session_id)
where guest_session_id is not null
  and guest_session_id !~* '^[0-9a-f]{64}$';

do $$
declare
  guest_user_id uuid := '00000000-0000-4000-8000-000000000001';
  guest_channel_id constant bigint := 888;
  existing_guest_channel_id bigint;
  channel_sequence text;
begin
  if exists (
    select 1
    from public.channels
    where id = guest_channel_id
      and slug <> 'guest'
  ) then
    raise exception '频道 888 已被其他房间占用，无法作为游客房间';
  end if;

  insert into auth.users (id, email)
  values (guest_user_id, 'guest@ppchat.local')
  on conflict (id) do nothing;

  insert into public.users (id, username, status)
  values (guest_user_id, '游客', 'OFFLINE')
  on conflict (id) do update
  set username = excluded.username;

  select id into existing_guest_channel_id
  from public.channels
  where slug = 'guest'
  limit 1;

  if existing_guest_channel_id is not null and existing_guest_channel_id <> guest_channel_id then
    update public.channels
    set slug = 'guest-old-' || existing_guest_channel_id
    where id = existing_guest_channel_id;
  end if;

  insert into public.channels (id, slug, created_by, is_private, password)
  values (guest_channel_id, 'guest', guest_user_id, false, null)
  on conflict (id) do update
  set slug = excluded.slug,
      created_by = excluded.created_by,
      is_private = excluded.is_private,
      password = excluded.password;

  if existing_guest_channel_id is not null and existing_guest_channel_id <> guest_channel_id then
    update public.messages
    set channel_id = guest_channel_id
    where channel_id = existing_guest_channel_id;

    delete from public.channels
    where id = existing_guest_channel_id;
  end if;

  channel_sequence := pg_get_serial_sequence('public.channels', 'id');
  if channel_sequence is not null then
    perform setval(
      channel_sequence,
      greatest(coalesce((select max(id) from public.channels), 1), guest_channel_id),
      true
    );
  end if;
end $$;

create or replace function public.guest_channel_id()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select id from public.channels where id = 888 and slug = 'guest' limit 1
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
  session_hash text;
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

  session_hash := public.guest_session_hash(clean_session_id);

  select id into guest_channel_id
  from public.channels
  where id = 888
    and slug = 'guest'
  limit 1;

  if guest_channel_id is null then
    raise exception '游客房间不存在';
  end if;

  perform pg_advisory_xact_lock(hashtext(session_hash)::bigint);

  select count(*)
  into recent_count
  from public.messages
  where channel_id = guest_channel_id
    and guest_session_id = session_hash
    and inserted_at >= now() - interval '1 minute';

  if recent_count >= 10 then
    raise exception '游客一分钟内最多发10条信息';
  end if;

  return query
    insert into public.messages (message, user_id, channel_id, message_type, guest_session_id)
    values (clean_message, guest_user_id, guest_channel_id, 'text', session_hash)
    returning *;
end;
$$;

create or replace function public.delete_guest_message(
  p_message_id bigint,
  p_guest_session_id text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_session_id text;
  session_hash text;
  deleted_message_id bigint;
begin
  clean_session_id := nullif(btrim(p_guest_session_id), '');

  if clean_session_id is null or length(clean_session_id) < 16 or length(clean_session_id) > 80 then
    raise exception '游客会话无效';
  end if;

  session_hash := public.guest_session_hash(clean_session_id);

  delete from public.messages
  where id = p_message_id
    and channel_id = public.guest_channel_id()
    and guest_session_id = session_hash
  returning id into deleted_message_id;

  if deleted_message_id is null then
    raise exception '只能删除自己的游客消息';
  end if;

  return deleted_message_id;
end;
$$;

grant usage on schema public to anon;
grant select on public.channels to anon;
grant select on public.messages to anon;
grant select on public.users to anon;
grant execute on function public.guest_channel_id() to anon, authenticated;
grant execute on function public.send_guest_message(text, text) to anon;
grant execute on function public.delete_guest_message(bigint, text) to anon;

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
