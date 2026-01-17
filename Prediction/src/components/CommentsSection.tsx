import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useSendComment, useWatchComment } from '../hooks/usePredictionMarket'
import './CommentsSection.css'

interface CommentsSectionProps {
  eventId: string
}

interface Comment {
  id: string
  author: string
  avatar: string
  content: string
  timestamp: string
  likes: number
}

function CommentsSection({ eventId }: CommentsSectionProps) {
  const { address, isConnected } = useAccount()
  const marketId = parseInt(eventId) || 0
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [userComments, setUserComments] = useState<Comment[]>([]) // 记录用户自己的评论
  
  const { sendComment, isPending: isSendingComment } = useSendComment()

  // 随机生成评论内容
  const generateRandomComment = (): string => {
    const commentTemplates = [
      '这个预测很有意义，我支持Yes',
      '我觉得No更合理，从数据看是这样的',
      'Yes的概率正在上升，值得关注',
      'No的可能性比较大，基于我的分析',
      '这个市场很有意思，我投了Yes',
      'No看起来更稳，我已经买入了一些',
      'Yes的潜力很大，看好长期发展',
      'No确定性高，风险相对较低',
      'Yes的概率计算很准确，我认同',
      'No的趋势很明显，应该会赢',
      '这个预测的质量很高，支持Yes',
      'No更符合逻辑，我倾向于这个',
      'Yes的机会来了，不要错过',
      'No稳赢，数据支持这个结论',
      'Yes值得押注，概率很合适',
      'No看起来更有把握',
      'Yes会涨的，时机正好',
      'No确定性很高，建议关注',
      'Yes概率上升中，可以考虑',
      'No趋势明显，市场反应积极',
      '这个预测很有价值，看好Yes',
      'No更合理，逻辑清晰',
      'Yes潜力巨大，值得投资',
      'No确定性高，风险可控',
    ]
    return commentTemplates[Math.floor(Math.random() * commentTemplates.length)]
  }

  // 生成随机地址（简化版）
  const generateRandomAddress = (): string => {
    const chars = '0123456789abcdef'
    let address = '0x'
    for (let i = 0; i < 40; i++) {
      address += chars[Math.floor(Math.random() * chars.length)]
    }
    return address
  }

  // 格式化时间显示
  const formatTime = (timestamp: number): string => {
    const now = Date.now()
    const diff = now - timestamp
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (seconds < 60) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`
    return new Date(timestamp).toLocaleDateString()
  }

  // 初始化随机评论
  useEffect(() => {
    const generateInitialComments = () => {
      const initialCount = Math.floor(Math.random() * 8) + 5 // 5-12条
      const initialComments: Comment[] = []
      
      for (let i = 0; i < initialCount; i++) {
        const address = generateRandomAddress()
        const timestamp = Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000 // 最近7天内
        initialComments.push({
          id: `random-${i}-${timestamp}`,
          author: `${address.slice(0, 6)}...${address.slice(-4)}`,
          avatar: '👤',
          content: generateRandomComment(),
          timestamp: formatTime(timestamp),
          likes: Math.floor(Math.random() * 20) // 0-19个赞
        })
      }
      
      // 按时间排序（最新的在前）
      initialComments.sort((a, b) => {
        const timeA = parseInt(a.id.split('-').pop() || '0')
        const timeB = parseInt(b.id.split('-').pop() || '0')
        return timeB - timeA
      })
      
      setComments(initialComments)
    }

    if (comments.length === 0) {
      generateInitialComments()
    }

    // 定时随机生成新评论（每30-60秒一条）
    const intervalId = setInterval(() => {
      const shouldGenerate = Math.random() > 0.4 // 60%概率生成
      if (shouldGenerate) {
        const address = generateRandomAddress()
        const timestamp = Date.now()
        const newComment: Comment = {
          id: `random-${timestamp}`,
          author: `${address.slice(0, 6)}...${address.slice(-4)}`,
          avatar: '👤',
          content: generateRandomComment(),
          timestamp: '刚刚',
          likes: 0
        }
        
        setComments((prev) => {
          // 避免重复
          const lastComment = prev[0]
          if (lastComment && lastComment.content === newComment.content && lastComment.author === newComment.author) {
            return prev
          }
          // 最多保留100条评论
          const updated = [newComment, ...prev]
          return updated.slice(0, 100)
        })
      }
    }, Math.random() * 30000 + 30000) // 30-60秒

    return () => {
      clearInterval(intervalId)
    }
  }, [comments.length])
  
  // 监听链上评论事件
  useWatchComment(marketId, (log) => {
    if (log.args) {
      const user = log.args.user as string
      const content = log.args.content as string
      const isCurrentUser = address && user.toLowerCase() === address.toLowerCase()
      const timestamp = Date.now()
      
      const comment: Comment = {
        id: (log as any).transactionHash || `onchain-${timestamp}`,
        author: `${user.slice(0, 6)}...${user.slice(-4)}`,
        avatar: isCurrentUser ? '⭐' : '👤', // 用户自己的评论用特殊图标
        content: content,
        timestamp: '刚刚',
        likes: 0
      }
      
      // 如果是用户自己的评论，记录下来
      if (isCurrentUser) {
        setUserComments((prev) => {
          // 避免重复
          const exists = prev.find(c => c.id === comment.id)
          if (exists) return prev
          return [comment, ...prev].slice(0, 50) // 最多保留50条用户评论
        })
      }
      
      // 添加到评论列表（去重）
      setComments((prev) => {
        const exists = prev.find(c => c.id === comment.id)
        if (exists) return prev
        return [comment, ...prev].slice(0, 100) // 最多保留100条评论
      })
    }
  })

  const handleSubmit = async () => {
    if (!isConnected) {
      alert('请先连接钱包')
      return
    }
    
    if (!newComment.trim()) return

    const commentContent = newComment.trim()
    
    try {
      // 先本地添加用户评论（乐观更新）
      if (address) {
        const userComment: Comment = {
          id: `pending-${Date.now()}`,
          author: `${address.slice(0, 6)}...${address.slice(-4)}`,
          avatar: '⭐',
          content: commentContent,
          timestamp: '刚刚',
          likes: 0
        }
        
        // 添加到用户评论记录
        setUserComments((prev) => [userComment, ...prev].slice(0, 50))
        
        // 添加到评论列表顶部
        setComments((prev) => {
          const exists = prev.find(c => 
            c.author === userComment.author && 
            c.content === commentContent && 
            c.timestamp === '刚刚'
          )
          if (exists) return prev
          return [userComment, ...prev].slice(0, 100)
        })
      }
      
      // 发送到链上
      await sendComment(marketId, commentContent)
      setNewComment('')
      
      // 链上事件会自动更新评论列表（通过 useWatchComment）
    } catch (error) {
      console.error('发送评论失败:', error)
      // 如果发送失败，移除乐观更新的评论
      setComments((prev) => prev.filter(c => 
        !(c.author === `${address?.slice(0, 6)}...${address?.slice(-4)}` && 
          c.content === commentContent && 
          c.timestamp === '刚刚' &&
          c.id.startsWith('pending-'))
      ))
    }
  }

  const handleLike = (id: string) => {
    setComments(
      comments.map((comment) =>
        comment.id === id
          ? { ...comment, likes: comment.likes + 1 }
          : comment
      )
    )
  }

  return (
    <div className="comments-section">
      <div className="comments-header">
        <h3>Comments</h3>
        <span className="comments-count">{comments.length} 条评论</span>
        {userComments.length > 0 && (
          <span className="user-comments-count" style={{ marginLeft: '10px', color: '#1677ff' }}>
            我的评论: {userComments.length}
          </span>
        )}
      </div>

      <div className="comment-input-area">
        {!isConnected ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <ConnectButton />
          </div>
        ) : (
          <>
            <textarea
              className="comment-input"
              placeholder="发表你的看法..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
              disabled={isSendingComment}
            />
            <button 
              className="comment-submit" 
              onClick={handleSubmit}
              disabled={isSendingComment || !newComment.trim()}
            >
              {isSendingComment ? '发送中...' : '发送'}
            </button>
          </>
        )}
      </div>

      <div className="comments-list">
        {comments.map((comment) => (
          <div key={comment.id} className="comment-item">
            <div className="comment-avatar">{comment.avatar}</div>
            <div className="comment-content">
              <div className="comment-header">
                <span className="comment-author">{comment.author}</span>
                <span className="comment-timestamp">{comment.timestamp}</span>
              </div>
              <div className="comment-text">{comment.content}</div>
              <div className="comment-actions">
                <button
                  className="comment-like"
                  onClick={() => handleLike(comment.id)}
                >
                  ❤ {comment.likes}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default CommentsSection
