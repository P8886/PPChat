-- 迁移：添加私密频道支持
-- 在 Supabase SQL 编辑器中运行此 SQL 以添加私密频道功能

-- 向 channels 表添加 is_private 和 password 列
ALTER TABLE public.channels 
ADD COLUMN IF NOT EXISTS is_private boolean DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS password text;

-- 添加注释
COMMENT ON COLUMN public.channels.is_private IS '频道是否私密（需要密码加入）';
COMMENT ON COLUMN public.channels.password IS '私密频道的密码';
