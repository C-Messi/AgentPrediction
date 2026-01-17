import './EventCard.css'

interface EventCardProps {
  event: {
    id: string
    title: string
    description: string
    currentPrice: number
    change: number
    volume: number
  }
  onClick: () => void
}

function EventCard({ event, onClick }: EventCardProps) {
  const formatVolume = (vol: number) => {
    if (vol >= 1000000) {
      return `$${(vol / 1000000).toFixed(0)}m Vol.`
    } else if (vol >= 1000) {
      return `$${(vol / 1000).toFixed(0)}k Vol.`
    }
    return `$${vol} Vol.`
  }

  const handleYesClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    // Handle Yes button click
  }

  const handleNoClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    // Handle No button click
  }
  
  return (
    <div className="event-card" onClick={onClick}>
      <div className="event-content">
        <h3 className="event-title">{event.title}</h3>
        <div className="event-actions">
          <button className="event-btn event-btn-yes" onClick={handleYesClick}>Yes</button>
          <button className="event-btn event-btn-no" onClick={handleNoClick}>No</button>
        </div>
        <div className="event-market-data">
          {formatVolume(event.volume)} Daily
        </div>
      </div>
    </div>
  )
}

export default EventCard
