import { useState, useEffect, useContext, useMemo } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import UserContext from '../lib/UserContext'
import { useStore } from '../lib/Store'
import {
  listAllStorageFiles,
  deleteStorageFile,
  deleteStorageFiles,
  getStorageStats,
  fetchUsers,
  checkIsAdmin,
  formatFileSize,
} from '../lib/Store'

export default function FilesPage() {
  const { user } = useContext(UserContext)
  const router = useRouter()
  const { channels, unreadChannels } = useStore()
  
  const [files, setFiles] = useState([])
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState(new Map())
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState(new Set())
  const [viewMode, setViewMode] = useState('all') // 'all' | 'mine' | 'user'
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [previewImage, setPreviewImage] = useState(null)
  const [deleting, setDeleting] = useState(false)
  
  // 检查管理员权限
  useEffect(() => {
    if (user) {
      checkIsAdmin(user.id).then(setIsAdmin)
    }
  }, [user])
  
  const [error, setError] = useState(null)
  
  // 加载数据
  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [filesResult, statsResult] = await Promise.all([
        listAllStorageFiles(),
        getStorageStats()
      ])
      
      if (filesResult.error) {
        console.error('Files error:', filesResult.error)
        setError('无法读取文件列表: ' + (filesResult.error.message || JSON.stringify(filesResult.error)))
      } else if (filesResult.data) {
        setFiles(filesResult.data)
        
        // 获取用户信息
        const userIds = [...new Set(filesResult.data.map(f => f.userId))]
        if (userIds.length > 0) {
          const usersResult = await fetchUsers(userIds)
          if (usersResult.data) {
            setUsers(usersResult.data)
          }
        }
      }
      
      if (statsResult.data) {
        setStats(statsResult.data)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
      setError('加载失败: ' + error.message)
    }
    setLoading(false)
  }
  
  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])
  
  // 未登录跳转
  useEffect(() => {
    if (!user) {
      router.push('/')
    }
  }, [user, router])
  
  // 过滤后的文件列表
  const filteredFiles = useMemo(() => {
    if (viewMode === 'mine') {
      return files.filter(f => f.userId === user?.id)
    }
    if (viewMode === 'user' && selectedUserId) {
      return files.filter(f => f.userId === selectedUserId)
    }
    // 管理员可以看到所有，普通用户只能看到自己的
    if (!isAdmin) {
      return files.filter(f => f.userId === user?.id)
    }
    return files
  }, [files, viewMode, selectedUserId, user?.id, isAdmin])
  
  // 选择文件
  const toggleSelect = (fullPath) => {
    const newSelected = new Set(selectedFiles)
    if (newSelected.has(fullPath)) {
      newSelected.delete(fullPath)
    } else {
      newSelected.add(fullPath)
    }
    setSelectedFiles(newSelected)
  }
  
  // 全选
  const toggleSelectAll = () => {
    if (selectedFiles.size === filteredFiles.length) {
      setSelectedFiles(new Set())
    } else {
      setSelectedFiles(new Set(filteredFiles.map(f => f.fullPath)))
    }
  }
  
  // 删除单个文件
  const handleDelete = async (fullPath) => {
    if (!confirm('确定要删除这个文件吗？对应的聊天图片消息也会被删除。')) return
    
    setDeleting(true)
    const result = await deleteStorageFile(fullPath)
    if (result.error) {
      alert('删除失败：' + result.error.message)
    } else {
      loadData()
      setSelectedFiles(new Set())
    }
    setDeleting(false)
  }
  
  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedFiles.size === 0) return
    if (!confirm(`确定要删除 ${selectedFiles.size} 个文件吗？对应的聊天图片消息也会被删除。`)) return
    
    setDeleting(true)
    const result = await deleteStorageFiles(Array.from(selectedFiles))
    if (result.error) {
      alert('删除失败：' + result.error.message)
    } else {
      loadData()
      setSelectedFiles(new Set())
    }
    setDeleting(false)
  }
  
  // 计算总大小
  const totalSize = useMemo(() => {
    return filteredFiles.reduce((sum, f) => sum + (f.metadata?.size || 0), 0)
  }, [filteredFiles])
  
  if (!user) return null
  
  
  return (
    <Layout channels={channels} unreadChannels={unreadChannels}>
      <div className="files-page">
        {/* 头部统计 - 仅管理员可见 */}
        {isAdmin && (
          <div className="stats-header">
            <div className="stats-card">
              <svg className="stats-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
              <div className="stats-info">
                <div className="stats-value">{stats ? formatFileSize(stats.totalSize) : '-'}</div>
                <div className="stats-label">图片存储</div>
              </div>
            </div>
            <div className="stats-card">
              <svg className="stats-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <div className="stats-info">
                <div className="stats-value">{stats?.fileCount || 0}</div>
                <div className="stats-label">文件</div>
              </div>
            </div>
            <div className="stats-card">
              <svg className="stats-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <div className="stats-info">
                <div className="stats-value">{stats?.userStats?.length || 0}</div>
                <div className="stats-label">用户</div>
              </div>
            </div>
          </div>
        )}
        
        {/* 工具栏 */}
        <div className="toolbar">
          <div className="toolbar-left">
            {/* 视图切换 */}
            {isAdmin ? (
              <div className="view-tabs">
                <button
                  className={viewMode === 'all' ? 'active' : ''}
                  onClick={() => setViewMode('all')}
                >
                  全部文件
                </button>
                <button
                  className={viewMode === 'mine' ? 'active' : ''}
                  onClick={() => setViewMode('mine')}
                >
                  我的文件
                </button>
                <button
                  className={viewMode === 'user' ? 'active' : ''}
                  onClick={() => setViewMode('user')}
                >
                  按用户
                </button>
              </div>
            ) : (
              <div className="view-label">我的上传图片</div>
            )}
            
            {/* 用户选择器 */}
            {viewMode === 'user' && isAdmin && (
              <select
                className="user-select"
                value={selectedUserId || ''}
                onChange={(e) => setSelectedUserId(e.target.value || null)}
              >
                <option value="">选择用户</option>
                {stats?.userStats?.map(stat => (
                  <option key={stat.userId} value={stat.userId}>
                    {users.get(stat.userId)?.username || stat.userId.slice(0, 8)} 
                    ({formatFileSize(stat.totalSize)})
                  </option>
                ))}
              </select>
            )}
          </div>
          
          <div className="toolbar-right">
            {filteredFiles.length > 0 && (
              <>
                <button className="btn btn-secondary" onClick={toggleSelectAll}>
                  {selectedFiles.size === filteredFiles.length ? '取消全选' : '全选'}
                </button>
                {selectedFiles.size > 0 && (
                  <button
                    className="btn btn-danger"
                    onClick={handleBatchDelete}
                    disabled={deleting}
                  >
                    删除 ({selectedFiles.size})
                  </button>
                )}
              </>
            )}
            <button className="btn btn-secondary" onClick={loadData}>
              刷新
            </button>
          </div>
        </div>
        
        {/* 文件列表 */}
        <div className="files-content">
          {loading ? (
            <div className="loading">加载中...</div>
          ) : error ? (
            <div className="error-box">
              <div className="error-icon">⚠️</div>
              <p>{error}</p>
              <p className="error-hint">请检查 Supabase Storage Policies 是否允许 list 操作</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">📂</div>
              <p>暂无文件</p>
            </div>
          ) : (
            <>
              <div className="list-summary">
                显示 {filteredFiles.length} 个文件，共 {formatFileSize(totalSize)}
              </div>
              <div className="file-grid">
                {filteredFiles.map((file) => (
                  <div
                    key={file.fullPath}
                    className={`file-card ${selectedFiles.has(file.fullPath) ? 'selected' : ''}`}
                  >
                    <div
                      className="file-select"
                      onClick={() => toggleSelect(file.fullPath)}
                    >
                      <div className={`checkbox ${selectedFiles.has(file.fullPath) ? 'checked' : ''}`}>
                        {selectedFiles.has(file.fullPath) && '✓'}
                      </div>
                    </div>
                    <div className="file-preview" onClick={() => setPreviewImage(file)}>
                      <img src={file.publicUrl} alt={file.name} />
                    </div>
                    <div className="file-info">
                      <div className="file-name" title={file.name}>
                        {file.name.length > 20 ? file.name.slice(0, 20) + '...' : file.name}
                      </div>
                      <div className="file-meta">
                        <span>{formatFileSize(file.metadata?.size || 0)}</span>
                        <span>·</span>
                        <span>{users.get(file.userId)?.username || '未知用户'}</span>
                      </div>
                      <div className="file-date">
                        {new Date(file.created_at).toLocaleString('zh-CN')}
                      </div>
                    </div>
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(file.fullPath)}
                      disabled={deleting}
                      title="删除"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        
        {/* 图片预览 */}
        {previewImage && (
          <div className="preview-overlay" onClick={() => setPreviewImage(null)}>
            <div className="preview-content" onClick={(e) => e.stopPropagation()}>
              <button className="preview-close" onClick={() => setPreviewImage(null)}>✕</button>
              <img src={previewImage.publicUrl} alt={previewImage.name} />
              <div className="preview-info">
                <div>{previewImage.name}</div>
                <div>{formatFileSize(previewImage.metadata?.size || 0)}</div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <style jsx>{`
        .files-page {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: var(--bg-secondary);
        }
        
        .stats-header {
          display: flex;
          gap: 12px;
          padding: 12px;
          background: var(--bg);
          border-bottom: 1px solid var(--border);
          flex-wrap: wrap;
          align-items: center;
        }
        
        .stats-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          background: var(--bg-secondary);
          border-radius: 8px;
          border: 1px solid var(--border);
          flex: 1;
          min-width: 140px;
        }
        
        .stats-icon {
          width: 20px;
          height: 20px;
          color: var(--text-secondary);
          flex-shrink: 0;
        }
        
        .stats-value {
          font-size: 16px;
          font-weight: 600;
          color: var(--text);
        }
        
        .stats-label {
          font-size: 11px;
          color: var(--text-secondary);
        }
        
        .toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: var(--bg);
          border-bottom: 1px solid var(--border);
          gap: 12px;
          flex-wrap: wrap;
        }
        
        .toolbar-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .view-tabs {
          display: flex;
          background: var(--bg-secondary);
          border-radius: 6px;
          padding: 2px;
        }
        
        .view-tabs button {
          padding: 6px 12px;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
          border-radius: 4px;
          font-size: 13px;
          transition: all 0.2s;
        }
        
        .view-tabs button:hover {
          color: var(--text);
        }
        
        .view-tabs button.active {
          background: var(--primary);
          color: white;
        }
        
        .view-label {
          font-size: 14px;
          color: var(--text);
          font-weight: 500;
        }
        
        .user-select {
          padding: 6px 12px;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text);
          font-size: 13px;
        }
        
        .toolbar-right {
          display: flex;
          gap: 8px;
        }
        
        .btn {
          padding: 8px 14px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }
        
        .btn-secondary {
          background: var(--bg-secondary);
          color: var(--text);
          border: 1px solid var(--border);
        }
        
        .btn-secondary:hover {
          background: var(--hover);
        }
        
        .btn-danger {
          background: #dc2626;
          color: white;
        }
        
        .btn-danger:hover {
          background: #b91c1c;
        }
        
        .btn-danger:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .files-content {
          flex: 1;
          overflow: auto;
          padding: 16px;
        }
        
        .loading, .empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 300px;
          color: var(--text-secondary);
        }
        
        .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }
        
        .error-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 300px;
          color: #f87171;
          text-align: center;
          padding: 20px;
        }
        
        .error-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }
        
        .error-hint {
          font-size: 12px;
          color: var(--text-secondary);
          margin-top: 8px;
        }
        
        .list-summary {
          font-size: 13px;
          color: var(--text-secondary);
          margin-bottom: 12px;
        }
        
        .file-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 16px;
        }
        
        .file-card {
          background: var(--bg);
          border-radius: 8px;
          border: 1px solid var(--border);
          overflow: hidden;
          position: relative;
          transition: all 0.2s;
        }
        
        .file-card:hover {
          border-color: var(--primary);
        }
        
        .file-card.selected {
          border-color: var(--primary);
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
        }
        
        .file-select {
          position: absolute;
          top: 8px;
          left: 8px;
          z-index: 2;
          cursor: pointer;
        }
        
        .checkbox {
          width: 20px;
          height: 20px;
          border-radius: 4px;
          background: rgba(0, 0, 0, 0.5);
          border: 2px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 12px;
        }
        
        .checkbox.checked {
          background: var(--primary);
          border-color: var(--primary);
        }
        
        .file-preview {
          width: 100%;
          height: 120px;
          cursor: pointer;
          overflow: hidden;
        }
        
        .file-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.2s;
        }
        
        .file-preview:hover img {
          transform: scale(1.05);
        }
        
        .file-info {
          padding: 10px;
        }
        
        .file-name {
          font-size: 13px;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .file-meta {
          font-size: 11px;
          color: var(--text-secondary);
          margin-top: 4px;
          display: flex;
          gap: 4px;
        }
        
        .file-date {
          font-size: 11px;
          color: var(--text-secondary);
          margin-top: 4px;
        }
        
        .delete-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgba(220, 38, 38, 0.9);
          color: white;
          border: none;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.2s;
          font-size: 12px;
        }
        
        .file-card:hover .delete-btn {
          opacity: 1;
        }
        
        .delete-btn:hover {
          background: #dc2626;
        }
        
        .preview-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .preview-content {
          position: relative;
          max-width: 90vw;
          max-height: 90vh;
        }
        
        .preview-content img {
          max-width: 100%;
          max-height: 85vh;
          object-fit: contain;
        }
        
        .preview-close {
          position: absolute;
          top: -40px;
          right: 0;
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
        }
        
        .preview-info {
          text-align: center;
          color: white;
          margin-top: 12px;
          font-size: 14px;
        }
        
        .preview-info div:first-child {
          margin-bottom: 4px;
        }
        
        .preview-info div:last-child {
          color: rgba(255, 255, 255, 0.6);
          font-size: 12px;
        }
        
        @media (max-width: 640px) {
          .stats-header {
            padding: 8px;
            gap: 8px;
          }
          
          .stats-card {
            padding: 8px 10px;
            min-width: 0;
            flex: 1 1 calc(33% - 8px);
          }
          
          .stats-icon {
            width: 18px;
            height: 18px;
          }
          
          .stats-value {
            font-size: 14px;
          }
          
          .stats-label {
            font-size: 10px;
          }
          
          .file-grid {
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
            gap: 8px;
          }
          
          .toolbar {
            padding: 8px;
            flex-direction: column;
            align-items: stretch;
          }
          
          .toolbar-left {
            flex-wrap: wrap;
          }
          
          .view-tabs {
            width: 100%;
            justify-content: center;
          }
          
          .view-tabs button {
            flex: 1;
            font-size: 12px;
            padding: 8px 8px;
          }
          
          .file-card {
            padding: 8px;
          }
          
          .file-preview {
            height: 100px;
          }
          
          .file-name {
            font-size: 12px;
          }
        }
      `}</style>
    </Layout>
  )
}