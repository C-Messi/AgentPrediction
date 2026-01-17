import { useMarketBasics, useMarketPools } from '../hooks/usePredictionMarket'
import { formatUnits } from 'viem'
import EventCard from './EventCard'

interface MarketListItemProps {
  marketId: number
  onClick: (marketId: number) => void
}

function MarketListItem({ marketId, onClick }: MarketListItemProps) {
  const { basics, isLoading: basicsLoading } = useMarketBasics(marketId)
  const { pools, isLoading: poolsLoading } = useMarketPools(marketId)

  if (basicsLoading || poolsLoading || !basics || !pools) {
    return null // 或者返回加载占位符
  }

  // 计算 Yes 概率（当前价格）- 根据合约 AMM 公式（包含虚拟储备）
  const VIRTUAL_PRED_RESERVE = 1000 // 1000 PRED (1_000e18)
  const yesPredReserve = Number(formatUnits(pools.yesPredReserve, 18))
  const noPredReserve = Number(formatUnits(pools.noPredReserve, 18))
  const yesWithVirtual = yesPredReserve + VIRTUAL_PRED_RESERVE
  const noWithVirtual = noPredReserve + VIRTUAL_PRED_RESERVE
  const totalWithVirtual = yesWithVirtual + noWithVirtual
  const currentPrice = totalWithVirtual > 0 
    ? yesWithVirtual / totalWithVirtual 
    : 0.5

  // 计算交易量（总 PRED 储备）
  const volume = yesPredReserve + noPredReserve

  // 暂时设置变化为 0，实际可以从历史数据计算
  const change = 0

  const event = {
    id: marketId.toString(),
    title: basics.question,
    description: basics.question,
    currentPrice,
    change,
    volume,
  }

  return (
    <EventCard
      event={event}
      onClick={() => onClick(marketId)}
    />
  )
}

export default MarketListItem
