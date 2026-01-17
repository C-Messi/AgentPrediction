import './EventTimeline.css'

interface EventTimelineProps {
  eventId: string
}

interface TimelineItem {
  id: string
  date: string
  title: string
  description: string
  type: 'milestone' | 'update'
}

function EventTimeline({}: EventTimelineProps) {
  const timelineItems: TimelineItem[] = [
    {
      id: '1',
      date: '2024-01-15',
      title: '事件创建',
      description: '预测事件正式上线',
      type: 'milestone'
    },
    {
      id: '2',
      date: '2024-01-20',
      title: '重大进展',
      description: '相关新闻引发市场关注',
      type: 'update'
    },
    {
      id: '3',
      date: '2024-02-01',
      title: '价格波动',
      description: '预测价格出现明显上涨',
      type: 'update'
    },
    {
      id: '4',
      date: '2024-02-15',
      title: '关键节点',
      description: '接近预测截止日期',
      type: 'milestone'
    }
  ]

  return (
    <div className="event-timeline">
      <div className="timeline-header">
        <h3>事件发展脉络</h3>
      </div>
      <div className="timeline-chain">
        {timelineItems.map((item, index) => (
          <div key={item.id} className="timeline-chain-item">
            <div className="timeline-box">
              <div className="timeline-title">{item.title}</div>
              <div className="timeline-date">{item.date}</div>
            </div>
            {index < timelineItems.length - 1 && (
              <div className="chain-connector"></div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default EventTimeline
