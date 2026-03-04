/**
 * 认证钩子
 * 创建认证钩子以向访问令牌 JWT 添加自定义声明。
 */

-- 创建认证钩子函数
-- https://supabase.com/docs/guides/auth/auth-hooks#hook-custom-access-token
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
  declare
    claims jsonb;
    user_role public.app_role;
  begin
    -- 检查用户是否在 profiles 表中被标记为管理员
    select role into user_role from public.user_roles where user_id = (event->>'user_id')::uuid;

    claims := event->'claims';

    if user_role is not null then
      -- 设置声明
      claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
    else 
      claims := jsonb_set(claims, '{user_role}', 'null');
    end if;

    -- 更新原始事件中的 'claims' 对象
    event := jsonb_set(event, '{claims}', claims);

    -- 返回修改后或原始事件
    return event;
  end;
$$;

grant usage on schema public to supabase_auth_admin;

grant execute
  on function public.custom_access_token_hook
  to supabase_auth_admin;

revoke execute
  on function public.custom_access_token_hook
  from authenticated, anon;

grant all
  on table public.user_roles
to supabase_auth_admin;

revoke all
  on table public.user_roles
  from authenticated, anon;

create policy "允许认证管理员读取用户角色" ON public.user_roles
as permissive for select
to supabase_auth_admin
using (true)