import { useState, useRef, useEffect } from 'react'
import './ChatWindow.css'

interface ChatWindowProps {
  friend: {
    id: string
    name: string
    avatar: string
  }
  onClose?: () => void
}

interface Message {
  id: string
  type: 'text' | 'video'
  content: string
  sender: 'me' | 'friend'
  timestamp: string
  videoUrl?: string
}

function ChatWindow({ friend, onClose }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'video',
      content: '荞麦面^',
      sender: 'friend',
      timestamp: '昨天 23:12',
      videoUrl: 'https://example.com/video1.mp4'
    },
    {
      id: '2',
      type: 'video',
      content: '潮汕牛马兄弟',
      sender: 'friend',
      timestamp: '昨天 23:15',
      videoUrl: 'https://example.com/video2.mp4'
    }
  ])

  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (inputValue.trim()) {
      const newMessage: Message = {
        id: Date.now().toString(),
        type: 'text',
        content: inputValue,
        sender: 'me',
        timestamp: new Date().toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit'
        })
      }
      setMessages([...messages, newMessage])
      setInputValue('')
    }
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div className="chat-header-left">
          <div className="chat-avatar">{friend.avatar}</div>
          <div className="chat-header-info">
            <div className="chat-name">{friend.name}</div>
            <div className="chat-status">
              <span className="status-indicator"></span>
              在线
            </div>
          </div>
        </div>
        <div className="chat-header-actions">
          {onClose && (
            <button className="header-btn" onClick={onClose} title="关闭">
              ×
            </button>
          )}
          <button className="header-btn">⋯</button>
        </div>
      </div>

      <div className="chat-messages">
        {messages.map((message, index) => (
          <div key={message.id}>
            {index > 0 &&
              messages[index - 1].timestamp !== message.timestamp && (
                <div className="message-timestamp">{message.timestamp}</div>
              )}
            {index === 0 && (
              <div className="message-timestamp">{message.timestamp}</div>
            )}
            <div
              className={`message ${
                message.sender === 'me' ? 'message-me' : 'message-friend'
              }`}
            >
              {message.type === 'video' ? (
                <div className="message-video">
                  <div className="video-preview">
                    <div className="video-play-icon">▶</div>
                  </div>
                  <div className="message-content">{message.content}</div>
                  <div className="message-reaction">
                    <span className="heart-icon">❤</span>
                    <span>点赞</span>
                  </div>
                </div>
              ) : (
                <div className="message-text">{message.content}</div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <div className="chat-input-wrapper">
          <input
            type="text"
            className="chat-input"
            placeholder="发送消息"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSend()
              }
            }}
          />
          <div className="chat-input-actions">
            <button className="input-action-btn">@</button>
            <button className="input-action-btn">😊</button>
            <button className="input-action-btn">📷</button>
            <button className="input-action-btn send-btn" onClick={handleSend}>
              ↑
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatWindow
