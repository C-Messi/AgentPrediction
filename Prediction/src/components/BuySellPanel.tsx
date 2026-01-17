import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useBuyYes, useBuyNo, useSellYes, useSellNo, useMarketPools, useUserPosition } from '../hooks/usePredictionMarket'
import { useApprovePredToken, usePredTokenAllowance, usePredTokenBalance } from '../hooks/usePredToken'
import { CONTRACTS } from '../config/contracts'
import { formatUnits, parseUnits } from 'viem'
import './BuySellPanel.css'

// 合约常量
const VIRTUAL_PRED_RESERVE = 1000 // 1000 PRED (1_000e18)

interface BuySellPanelProps {
  event: {
    id: string
    title: string
    currentPrice: number
  }
}

function BuySellPanel({ event }: BuySellPanelProps) {
  const { isConnected } = useAccount()
  const marketId = parseInt(event.id) || 0
  const [action, setAction] = useState<'buy' | 'sell'>('buy')
  const [side, setSide] = useState<'yes' | 'no'>('yes')
  const [amount, setAmount] = useState('')
  
  const { pools, refetch: refetchPools } = useMarketPools(marketId)
  const { position, refetch: refetchPosition } = useUserPosition(marketId)
  const { balance, refetch: refetchBalance } = usePredTokenBalance()
  const { allowance: tokenAllowance, refetch: refetchAllowance } = usePredTokenAllowance(
    CONTRACTS.PREDICTION_MARKET
  )
  
  const { approve, isPending: isApproving } = useApprovePredToken()
  const { buyYes, isPending: isBuyingYes, isConfirmed: isBoughtYes } = useBuyYes()
  const { buyNo, isPending: isBuyingNo, isConfirmed: isBoughtNo } = useBuyNo()
  const { sellYes, isPending: isSellingYes, isConfirmed: isSoldYes } = useSellYes()
  const { sellNo, isPending: isSellingNo, isConfirmed: isSoldNo } = useSellNo()

  // 计算当前价格（Yes和No）- 根据合约 AMM 公式
  // 使用虚拟储备计算：yesPrice = (yesPredReserve + VIRTUAL_PRED_RESERVE) / (yesPredReserve + VIRTUAL_PRED_RESERVE + noPredReserve + VIRTUAL_PRED_RESERVE)
  // noPrice = 1 - yesPrice
  const prices = pools 
    ? (() => {
        const yesPredReserve = Number(formatUnits(pools.yesPredReserve, 18))
        const noPredReserve = Number(formatUnits(pools.noPredReserve, 18))
        const yesWithVirtual = yesPredReserve + VIRTUAL_PRED_RESERVE
        const noWithVirtual = noPredReserve + VIRTUAL_PRED_RESERVE
        const totalWithVirtual = yesWithVirtual + noWithVirtual
        const yesPrice = totalWithVirtual > 0 ? yesWithVirtual / totalWithVirtual : 0.5
        const noPrice = 1 - yesPrice
        return { yes: yesPrice, no: noPrice }
      })()
    : { yes: event.currentPrice, no: 1 - event.currentPrice }

  // 根据选择的side获取当前价格
  const currentPrice = side === 'yes' ? prices.yes : prices.no

  // 获取用户持仓
  const userYesShares = position?.yesShares ? Number(formatUnits(position.yesShares, 18)) : 0
  const userNoShares = position?.noShares ? Number(formatUnits(position.noShares, 18)) : 0

  // 交易确认后刷新数据
  useEffect(() => {
    if (isBoughtYes || isBoughtNo || isSoldYes || isSoldNo) {
      refetchPools()
      refetchPosition()
      refetchBalance()
    }
  }, [isBoughtYes, isBoughtNo, isSoldYes, isSoldNo, refetchPools, refetchPosition, refetchBalance])

  // 计算预估得到的份额 - 根据合约 _buyShares 公式
  // k = (predReserve + VIRTUAL_PRED_RESERVE) * shareReserve
  // newPredReserve = predReserve + predIn
  // newShareReserve = k / (newPredReserve + VIRTUAL_PRED_RESERVE)
  // sharesOut = shareReserve - newShareReserve
  const calculateSharesOut = (predIn: number, isYes: boolean): number => {
    if (!pools || !predIn) return 0
    const predReserve = isYes 
      ? Number(formatUnits(pools.yesPredReserve, 18))
      : Number(formatUnits(pools.noPredReserve, 18))
    const shareReserve = isYes
      ? Number(formatUnits(pools.yesShareReserve, 18))
      : Number(formatUnits(pools.noShareReserve, 18))
    
    // 使用合约的 AMM 公式（包含虚拟储备）
    const k = (predReserve + VIRTUAL_PRED_RESERVE) * shareReserve
    const newPredReserve = predReserve + predIn
    const newShareReserve = k / (newPredReserve + VIRTUAL_PRED_RESERVE)
    const sharesOut = shareReserve - newShareReserve
    
    return Math.max(0, sharesOut) // 确保不为负数
  }

  // 计算卖出得到的PRED - 根据合约 _sellShares 公式
  // k = (predReserve + VIRTUAL_PRED_RESERVE) * shareReserve
  // newShareReserve = shareReserve + sharesIn
  // nextPredWithVirtual = k / newShareReserve
  // newPredReserve = nextPredWithVirtual - VIRTUAL_PRED_RESERVE
  // predOut = predReserve - newPredReserve
  const calculatePredOut = (sharesIn: number, isYes: boolean): number => {
    if (!pools || !sharesIn) return 0
    const predReserve = isYes 
      ? Number(formatUnits(pools.yesPredReserve, 18))
      : Number(formatUnits(pools.noPredReserve, 18))
    const shareReserve = isYes
      ? Number(formatUnits(pools.yesShareReserve, 18))
      : Number(formatUnits(pools.noShareReserve, 18))
    
    // 使用合约的 AMM 公式（包含虚拟储备）
    const k = (predReserve + VIRTUAL_PRED_RESERVE) * shareReserve
    const newShareReserve = shareReserve + sharesIn
    const nextPredWithVirtual = k / newShareReserve
    
    // 检查是否有足够的流动性
    if (nextPredWithVirtual <= VIRTUAL_PRED_RESERVE) {
      return 0
    }
    
    const newPredReserve = nextPredWithVirtual - VIRTUAL_PRED_RESERVE
    
    // 确保 newPredReserve < predReserve
    if (newPredReserve >= predReserve) {
      return 0
    }
    
    const predOut = predReserve - newPredReserve
    
    return Math.max(0, predOut) // 确保不为负数
  }

  const handleSubmit = async () => {
    if (!isConnected) {
      alert('请先连接钱包')
      return
    }

    if (!amount || parseFloat(amount) <= 0) {
      alert('请输入有效金额')
      return
    }

    const amountBigInt = parseUnits(amount, 18)
    const balanceBigInt = parseUnits(balance, 18)

    if (action === 'buy') {
      // 检查余额
      if (amountBigInt > balanceBigInt) {
        alert('PRED余额不足')
        return
      }

      // 检查授权
      const allowanceBigInt = parseUnits(tokenAllowance, 18)
      if (amountBigInt > allowanceBigInt) {
        // 需要授权
        await approve(CONTRACTS.PREDICTION_MARKET, amount)
        await refetchAllowance()
        return
      }

      // minSharesOut 设为 0，不考虑滑点
      const minSharesOut = '0'

      if (side === 'yes') {
        await buyYes(marketId, amount, minSharesOut)
      } else {
        await buyNo(marketId, amount, minSharesOut)
      }
    } else {
      // 卖出
      const availableShares = side === 'yes' ? userYesShares : userNoShares
      if (parseFloat(amount) > availableShares) {
        alert(`${side === 'yes' ? 'Yes' : 'No'} 份额不足`)
        return
      }

      // 计算最小PRED - 使用合约公式计算，minPredOut 设为 0（不考虑滑点）
      const minPredOut = '0'

      if (side === 'yes') {
        await sellYes(marketId, amount, minPredOut)
      } else {
        await sellNo(marketId, amount, minPredOut)
      }
    }
  }

  const isLoading = isApproving || isBuyingYes || isBuyingNo || isSellingYes || isSellingNo

  return (
    <div className="buy-sell-panel">
      <div className="panel-header">
        <h3>Buy / Sell</h3>
      </div>
      
      {!isConnected ? (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <ConnectButton />
        </div>
      ) : (
        <>
          <div className="balance-info" style={{ padding: '12px', fontSize: '14px', color: '#666' }}>
            <div>PRED余额: {parseFloat(balance).toFixed(4)}</div>
            {action === 'sell' && (
              <div>
                {side === 'yes' ? 'Yes' : 'No'}持仓: {side === 'yes' ? userYesShares.toFixed(4) : userNoShares.toFixed(4)}
              </div>
            )}
          </div>
          
          <div className="action-tabs">
            <button
              className={`action-tab ${action === 'buy' ? 'active buy' : ''}`}
              onClick={() => setAction('buy')}
            >
              买入
            </button>
            <button
              className={`action-tab ${action === 'sell' ? 'active sell' : ''}`}
              onClick={() => setAction('sell')}
            >
              卖出
            </button>
          </div>

          <div className="side-tabs" style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button
              className={`action-tab ${side === 'yes' ? 'active buy' : ''}`}
              onClick={() => setSide('yes')}
              style={{ flex: 1 }}
            >
              Yes
            </button>
            <button
              className={`action-tab ${side === 'no' ? 'active sell' : ''}`}
              onClick={() => setSide('no')}
              style={{ flex: 1 }}
            >
              No
            </button>
          </div>

          <div className="panel-form">
            <div className="form-group">
              <label>{side === 'yes' ? 'Yes' : 'No'} 当前价格</label>
              <div style={{ padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                {(currentPrice * 100).toFixed(2)}%
              </div>
              <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                Yes: {(prices.yes * 100).toFixed(2)}% | No: {(prices.no * 100).toFixed(2)}%
              </div>
            </div>
            <div className="form-group">
              <label>{action === 'buy' ? 'PRED金额' : '份额数量'}</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={action === 'buy' ? '输入PRED数量' : '输入份额数量'}
                step="0.0001"
                min="0"
              />
            </div>
            {amount && (
              <div className="form-summary">
                <div className="summary-row">
                  <span>{action === 'buy' ? '预估得到份额' : '预估得到PRED'}</span>
                  <span>
                    {action === 'buy'
                      ? calculateSharesOut(parseFloat(amount), side === 'yes').toFixed(4)
                      : calculatePredOut(parseFloat(amount), side === 'yes').toFixed(4)}
                  </span>
                </div>
              </div>
            )}
            <button
              className={`submit-btn ${action === 'buy' ? 'buy' : 'sell'}`}
              onClick={handleSubmit}
              disabled={isLoading || !amount}
            >
              {isLoading 
                ? '处理中...' 
                : isApproving 
                  ? '授权中...'
                  : action === 'buy' 
                    ? `买入 ${side.toUpperCase()}` 
                    : `卖出 ${side.toUpperCase()}`}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default BuySellPanel
