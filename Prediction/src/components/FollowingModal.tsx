import { useNavigate } from 'react-router-dom'
import './FollowingModal.css'

const mockFollowingEvents = [
  { id: '1', title: '比特币年底能否突破10万美元？', price: 0.65 },
  { id: '2', title: 'OpenAI GPT-5是否会在2024年发布？', price: 0.42 }
]

function FollowingModal() {
  const navigate = useNavigate()

  return (
    <div className="following-modal">
      {mockFollowingEvents.length === 0 ? (
        <div className="empty-state">
          <p>还没有关注的预测事件</p>
        </div>
      ) : (
        <div className="following-list">
          {mockFollowingEvents.map((event) => (
            <div
              key={event.id}
              className="following-item"
              onClick={() => navigate(`/event/${event.id}`)}
            >
              <div className="following-item-content">
                <h4>{event.title}</h4>
                <div className="following-price">价格: {event.price}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default FollowingModal
