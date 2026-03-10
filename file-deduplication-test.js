// 测试文件去重功能的简单脚本
// 使用方法: 在浏览器控制台中运行此代码，或在页面中添加此脚本

// 示例: 如何使用文件去重功能
console.log('PPChat 文件去重功能说明:');

console.log('1. 上传图片时，系统会自动计算文件的哈希值');
console.log('2. 如果检测到相同文件（基于哈希值），则不会重复上传到存储');
console.log('3. 每条消息会关联一个 file_hash_id，跟踪文件引用');
console.log('4. 删除消息时，系统会减少引用计数');
console.log('5. 当引用计数为0时，系统会自动清理OSS中的文件');

// 以下是在组件中使用示例（伪代码）
/*
// 在上传图片时
const handleImageUpload = async (file) => {
  if (!user?.id) return
  
  // uploadImage 函数现在会自动处理重复检测
  const { url, error, isDuplicate, fileHashId } = await uploadImage(file, user.id)
  
  if (error) {
    console.error('上传失败:', error)
    alert('图片上传失败，请稍后重试')
    return
  }
  
  if (isDuplicate) {
    console.log('这是一个重复文件，使用了已存在的文件链接')
  }
  
  // 发送图片消息，关联文件哈希ID
  await addMessage(url, channelId, user.id, 'image', fileHashId)
}

// 在删除消息时
const handleDeleteMessage = async (messageId) => {
  // deleteMessage 函数现在会自动处理引用计数
  await deleteMessage(messageId)
  // 如果该消息是图片消息且引用计数降至0，相关文件会被自动删除
}
*/