import './FriendsModal.css'

export interface Friend {
  id: string
  name: string
  avatar: string
  online: boolean
  unread?: number
}

const mockFriends: Friend[] = [
  { id: '1', name: '张三', avatar: '👤', online: true, unread: 3 },
  { id: '2', name: '李四', avatar: '👤', online: true },
  { id: '3', name: '王五', avatar: '👤', online: false },
  { id: '4', name: '赵六', avatar: '👤', online: true, unread: 1 }
]

interface FriendsModalProps {
  onFriendClick?: (friend: Friend) => void
}

function FriendsModal({ onFriendClick }: FriendsModalProps) {
  return (
    <div className="friends-modal">
      <div className="friends-list">
        {mockFriends.map((friend) => (
          <div
            key={friend.id}
            className="friend-item"
            onClick={() => onFriendClick?.(friend)}
          >
            <div className="friend-avatar">{friend.avatar}</div>
            <div className="friend-info">
              <div className="friend-name">{friend.name}</div>
              <div className={`friend-status ${friend.online ? 'online' : 'offline'}`}>
                {friend.online ? '在线' : '离线'}
              </div>
            </div>
            {friend.unread && friend.unread > 0 && (
              <div className="friend-unread">{friend.unread}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default FriendsModal
