-- 添加频道删除级联删除消息的约束
-- 如果 messages 表的 channel_id 外键没有 on delete cascade，则删除并重建约束

-- 首先检查并删除现有的外键约束（如果存在但没有级联删除）
ALTER TABLE public.messages 
DROP CONSTRAINT IF EXISTS messages_channel_id_fkey;

-- 添加带有级联删除的外键约束
ALTER TABLE public.messages 
ADD CONSTRAINT messages_channel_id_fkey 
FOREIGN KEY (channel_id) 
REFERENCES public.channels(id) 
ON DELETE CASCADE;

-- 添加注释
COMMENT ON CONSTRAINT messages_channel_id_fkey ON public.messages IS 
'当频道被删除时，自动删除该频道的所有消息';
