import { useParams, useNavigate } from 'react-router-dom'
import { formatUnits } from 'viem'
import ChartWithDanmaku from '../components/ChartWithDanmaku'
import BuySellPanel from '../components/BuySellPanel'
import EventTimeline from '../components/EventTimeline'
import CommentsSection from '../components/CommentsSection'
import { useMarketBasics, useMarketPools } from '../hooks/usePredictionMarket'
import './EventDetailPage.css'

function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const marketId = parseInt(id || '0')

  const { basics, isLoading: basicsLoading } = useMarketBasics(marketId)
  const { pools, isLoading: poolsLoading } = useMarketPools(marketId)

  // 计算当前价格 - 根据合约 AMM 公式（包含虚拟储备）
  const VIRTUAL_PRED_RESERVE = 1000 // 1000 PRED (1_000e18)
  const currentPrice = pools
    ? (() => {
        const yesPredReserve = Number(formatUnits(pools.yesPredReserve, 18))
        const noPredReserve = Number(formatUnits(pools.noPredReserve, 18))
        const yesWithVirtual = yesPredReserve + VIRTUAL_PRED_RESERVE
        const noWithVirtual = noPredReserve + VIRTUAL_PRED_RESERVE
        const totalWithVirtual = yesWithVirtual + noWithVirtual
        return totalWithVirtual > 0 ? yesWithVirtual / totalWithVirtual : 0.5
      })()
    : 0

  if (basicsLoading || poolsLoading || !basics) {
    return (
      <div className="event-detail-page">
        <div style={{ padding: '40px', textAlign: 'center' }}>
          加载中...
        </div>
      </div>
    )
  }

  const event = {
    id: marketId.toString(),
    title: basics.question,
    currentPrice,
  }

  return (
    <div className="event-detail-page">
      <button className="back-button" onClick={() => navigate('/')}>
        ← 返回
      </button>
      <div className="event-detail-header">
        <div className="header-top">
          <div className="event-avatar">👤</div>
          <h1>{basics.question}</h1>
          <div className="header-actions">
            <button className="icon-btn">🔗</button>
            <button className="icon-btn">🔖</button>
          </div>
        </div>
        <div className="probability-display">
          <span className="probability-value">{Math.round(currentPrice * 100)}% chance</span>
          {basics.status === 1 && (
            <span className="probability-status">
              {basics.outcome ? '✓ Resolved: Yes' : '✓ Resolved: No'}
            </span>
          )}
          {basics.status === 2 && (
            <span className="probability-status">✗ Cancelled</span>
          )}
          {basics.status === 0 && (
            <span className="probability-status">● Active</span>
          )}
        </div>
      </div>
      <div className="event-detail-content">
        <div className="event-left">
          <ChartWithDanmaku 
            eventId={event.id} 
            marketId={marketId}
            pools={pools}
            basics={basics}
          />
          <CommentsSection eventId={event.id} />
        </div>
        <div className="event-right">
          <BuySellPanel event={event} />
          <EventTimeline eventId={event.id} />
        </div>
      </div>
    </div>
  )
}

export default EventDetailPage
