import { useEffect, useRef, useState } from 'react'
import { createChart, IChartApi, ColorType } from 'lightweight-charts'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useSendDanmaku, useWatchDanmaku, useWatchSharesBought, useWatchSharesSold, useMarketPools, MarketBasics, MarketPools } from '../hooks/usePredictionMarket'
import { formatUnits } from 'viem'
import DanmakuOverlay from './DanmakuOverlay'
import DanmakuSettingsPanel from './DanmakuSettingsPanel'
import './ChartWithDanmaku.css'

interface ChartWithDanmakuProps {
  eventId: string
  marketId: number
  pools: MarketPools | null
  basics: MarketBasics | null
}

type DanmakuDensity = 'full' | 'half' | 'quarter' | 'off'

function ChartWithDanmaku({ eventId, marketId, pools, basics }: ChartWithDanmakuProps) {
  const { address, isConnected } = useAccount()
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const lineSeriesRef = useRef<ReturnType<IChartApi['addLineSeries']> | null>(null)
  const [danmakuMessages, setDanmakuMessages] = useState<Array<{ user: string; content: string; isMine?: boolean }>>([])
  const [userDanmakuMessages, setUserDanmakuMessages] = useState<Array<{ user: string; content: string; timestamp: number }>>([]) // 记录用户自己发送的弹幕
  const [displayArea, setDisplayArea] = useState(100) // 显示区域百分比 0-100
  const [danmakuInput, setDanmakuInput] = useState('')
  const [viewerCount] = useState(Math.floor(Math.random() * 50000) + 10000) // 模拟观众数
  const [showDanmakuSettings, setShowDanmakuSettings] = useState(false)
  const [priceHistory, setPriceHistory] = useState<Array<{ time: number; value: number; totalPred?: number }>>([])
  const [totalPred, setTotalPred] = useState<number>(0) // 累计PRED交易量
  const settingsButtonRef = useRef<HTMLSpanElement>(null)
  const settingsPanelRef = useRef<HTMLDivElement>(null)
  const totalDanmakuCount = danmakuMessages.length
  
  // 重新获取池子数据
  const { pools: currentPools, refetch: refetchPools } = useMarketPools(marketId)
  const activePools = currentPools || pools
  
  const { sendDanmaku, isPending: isSendingDanmaku } = useSendDanmaku()
  
  // 计算当前 Yes 概率 - 根据合约 AMM 公式（包含虚拟储备）
  const VIRTUAL_PRED_RESERVE = 1000 // 1000 PRED (1_000e18)
  const calculateCurrentPrice = (pools: MarketPools | null): number => {
    if (!pools) return 0.5
    const yesPredReserve = Number(formatUnits(pools.yesPredReserve, 18))
    const noPredReserve = Number(formatUnits(pools.noPredReserve, 18))
    const yesWithVirtual = yesPredReserve + VIRTUAL_PRED_RESERVE
    const noWithVirtual = noPredReserve + VIRTUAL_PRED_RESERVE
    const totalWithVirtual = yesWithVirtual + noWithVirtual
    return totalWithVirtual > 0 ? yesWithVirtual / totalWithVirtual : 0.5
  }
  
  // 随机生成弹幕内容
  const generateRandomDanmaku = (): string => {
    const danmakuTemplates = [
      '我觉得Yes会赢！',
      'No的可能性更大',
      '这波看好Yes',
      '感觉No稳了',
      'Yes冲啊！',
      'No必胜！',
      'Yes概率好高',
      'No太明显了',
      'Yes肯定赢',
      'No没悬念',
      'Yes值得押注',
      'No看起来不错',
      'Yes机会来了',
      'No稳赢',
      'Yes加油！',
      'No更有可能',
      '这价格Yes值了',
      'No更合理',
      'Yes潜力巨大',
      'No确定性高',
      '看好Yes！',
      '支持No！',
      'Yes会涨的',
      'No要赢了',
      'Yes概率上升中',
      'No趋势明显',
    ]
    return danmakuTemplates[Math.floor(Math.random() * danmakuTemplates.length)]
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

  // 随机生成弹幕（模拟其他用户）
  useEffect(() => {
    // 初始加载时生成一些随机弹幕
    const generateInitialDanmaku = () => {
      const initialCount = Math.floor(Math.random() * 5) + 3 // 3-7条
      const initialDanmaku: Array<{ user: string; content: string }> = []
      
      for (let i = 0; i < initialCount; i++) {
        const address = generateRandomAddress()
        const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`
        initialDanmaku.push({
          user: shortAddress,
          content: generateRandomDanmaku()
        })
      }
      
      setDanmakuMessages(initialDanmaku)
    }

    if (danmakuMessages.length === 0) {
      generateInitialDanmaku()
    }

    // 定时随机生成新弹幕（每5-15秒一条）
    const intervalId = setInterval(() => {
      const shouldGenerate = Math.random() > 0.3 // 70%概率生成
      if (shouldGenerate && displayArea > 0) {
        const address = generateRandomAddress()
        const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`
        const newDanmaku: { user: string; content: string; isMine?: boolean } = {
          user: shortAddress,
          content: generateRandomDanmaku(),
          isMine: false
        }
        
        setDanmakuMessages((prev) => {
          // 避免重复
          const lastMsg = prev[prev.length - 1]
          if (lastMsg && lastMsg.content === newDanmaku.content && lastMsg.user === newDanmaku.user) {
            return prev
          }
          // 最多保留50条弹幕
          const updated = [...prev, newDanmaku]
          return updated.slice(-50)
        })
      }
    }, Math.random() * 10000 + 5000) // 5-15秒

    return () => {
      clearInterval(intervalId)
    }
  }, [displayArea, danmakuMessages.length])

  // 监听链上弹幕事件
  // 根据 API: Danmaku(uint256 marketId, address user, string content)
  useWatchDanmaku(marketId, (eventData) => {
    if (eventData.user && eventData.content) {
      // 格式化用户地址显示（只显示前6位和后4位）
      const userAddress = eventData.user as string
      const shortAddress = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`
      const isCurrentUser = address && userAddress.toLowerCase() === address.toLowerCase()
      
      // 如果是用户自己的弹幕，更新用户弹幕记录
      if (isCurrentUser && address) {
        const timestamp = Date.now()
        setUserDanmakuMessages((prev) => {
          // 避免重复
          const exists = prev.find(d => 
            d.content === eventData.content && 
            d.user === shortAddress &&
            Date.now() - d.timestamp < 2000 // 2秒内的相同弹幕视为重复
          )
          if (exists) return prev
          return [{ user: shortAddress, content: eventData.content, timestamp }, ...prev].slice(0, 50)
        })
      }
      
      // 添加到弹幕列表
      setDanmakuMessages((prev) => {
        // 避免重复添加相同的弹幕（检查最后一条是否相同）
        const lastMsg = prev[prev.length - 1]
        if (lastMsg && lastMsg.content === eventData.content && lastMsg.user === shortAddress) {
          // 如果是链上事件且是用户自己的，更新isMine标识
          if (isCurrentUser && !lastMsg.isMine) {
            return prev.map((msg, idx) => 
              idx === prev.length - 1 ? { ...msg, isMine: true } : msg
            )
          }
          return prev
        }
        // 最多保留50条弹幕
        const updated = [...prev, { user: shortAddress, content: eventData.content, isMine: isCurrentUser }]
        return updated.slice(-50)
      })
    }
  })

  // 记录已处理的交易hash，避免重复处理同一笔交易
  const processedTradesRef = useRef<Set<string>>(new Set())
  const tradeProcessingRef = useRef<boolean>(false)

  // 处理交易并更新价格历史
  const updatePriceAfterTrade = (predAmount: number, tradeHash: string) => {
    // 检查是否已处理过这笔交易
    if (processedTradesRef.current.has(tradeHash)) return
    processedTradesRef.current.add(tradeHash)
    
    // 只保留最近100笔交易的hash，避免内存泄漏
    if (processedTradesRef.current.size > 100) {
      const oldestHash = Array.from(processedTradesRef.current)[0]
      processedTradesRef.current.delete(oldestHash)
    }
    
    // 累计PRED交易量
    setTotalPred((prev) => {
      const newTotal = prev + predAmount
      return newTotal
    })
    
    // 延迟重新获取池子数据，等待链上状态更新
    setTimeout(async () => {
      if (tradeProcessingRef.current) return
      tradeProcessingRef.current = true
      
      try {
        // 重新获取池子数据
        await refetchPools()
        
        // 等待池子数据更新
        await new Promise(resolve => setTimeout(resolve, 1500))
      } catch (error) {
        console.error('Failed to refetch pools after trade:', error)
      } finally {
        tradeProcessingRef.current = false
      }
    }, 2000)
  }

  // 监听买入事件
  useWatchSharesBought((eventData) => {
    if (eventData.marketId === marketId && eventData.predIn) {
      const predIn = Number(formatUnits(eventData.predIn, 18))
      // 使用blockNumber和logIndex组合作为唯一标识，如果没有则使用时间戳
      const log = eventData.log || {}
      const blockNumber = (log as any).blockNumber || 0
      const logIndex = (log as any).logIndex || 0
      const transactionHash = (log as any).transactionHash || ''
      const tradeHash = transactionHash || `${blockNumber}-${logIndex}-${Date.now()}`
      
      // 更新累计PRED和触发池子数据刷新
      updatePriceAfterTrade(predIn, tradeHash)
      
      console.log(`买入交易: ${predIn} PRED, Market: ${marketId}, Hash: ${tradeHash}`)
    }
  })

  // 监听卖出事件
  useWatchSharesSold((eventData) => {
    if (eventData.marketId === marketId && eventData.predOut) {
      const predOut = Number(formatUnits(eventData.predOut, 18))
      // 使用blockNumber和logIndex组合作为唯一标识，如果没有则使用时间戳
      const log = eventData.log || {}
      const blockNumber = (log as any).blockNumber || 0
      const logIndex = (log as any).logIndex || 0
      const transactionHash = (log as any).transactionHash || ''
      const tradeHash = transactionHash || `${blockNumber}-${logIndex}-${Date.now()}`
      
      // 更新累计PRED和触发池子数据刷新
      updatePriceAfterTrade(predOut, tradeHash)
      
      console.log(`卖出交易: ${predOut} PRED, Market: ${marketId}, Hash: ${tradeHash}`)
    }
  })

  // 监听池子数据变化，更新价格历史
  useEffect(() => {
    if (!activePools) return
    
    const currentPrice = calculateCurrentPrice(activePools)
    const now = Math.floor(Date.now() / 1000)
    
    // 检查是否需要更新价格历史
    setPriceHistory((prev) => {
      if (prev.length === 0) {
        // 初始化价格历史
        const yesPredReserve = Number(formatUnits(activePools.yesPredReserve, 18))
        const noPredReserve = Number(formatUnits(activePools.noPredReserve, 18))
        const initialTotalPred = yesPredReserve + noPredReserve
        const createTime = basics ? Number(basics.endTime) - 365 * 24 * 3600 : now - 86400
        
        return [
          { time: createTime, value: currentPrice, totalPred: initialTotalPred },
          { time: now, value: currentPrice, totalPred: initialTotalPred }
        ]
      }
      
      const lastEntry = prev[prev.length - 1]
      const lastPrice = lastEntry?.value || 0
      
      // 如果价格变化超过0.1%或距离上次更新超过3秒，才添加新点
      const priceChanged = Math.abs(currentPrice - lastPrice) > 0.001
      const timePassed = now - (lastEntry?.time || 0) > 3
      
      if (priceChanged || timePassed) {
        // 使用最新的totalPred，如果没有则从池子计算
        let newTotalPred = totalPred
        if (newTotalPred === 0) {
          const yesPredReserve = Number(formatUnits(activePools.yesPredReserve, 18))
          const noPredReserve = Number(formatUnits(activePools.noPredReserve, 18))
          newTotalPred = yesPredReserve + noPredReserve
        } else {
          // 使用历史记录中的totalPred加上新的变化
          newTotalPred = lastEntry?.totalPred || totalPred
        }
        
        // 避免重复添加相同时间点的数据
        if (lastEntry && lastEntry.time === now) {
          return prev.map((entry, idx) => 
            idx === prev.length - 1 
              ? { time: now, value: currentPrice, totalPred: newTotalPred } 
              : entry
          )
        }
        
        const newHistory = [...prev, { time: now, value: currentPrice, totalPred: newTotalPred }]
        // 只保留最近200个点
        return newHistory.slice(-200)
      }
      
      return prev
    })
  }, [activePools])

  // 初始化时添加当前价格点
  useEffect(() => {
    if (activePools && priceHistory.length === 0) {
      const currentPrice = calculateCurrentPrice(activePools)
      const now = Math.floor(Date.now() / 1000)
      const createTime = basics ? Number(basics.endTime) - 365 * 24 * 3600 : now - 86400
      
      // 计算初始累计PRED（Yes和No池子的总和）
      const yesPredReserve = Number(formatUnits(activePools.yesPredReserve, 18))
      const noPredReserve = Number(formatUnits(activePools.noPredReserve, 18))
      const initialTotalPred = yesPredReserve + noPredReserve
      
      setTotalPred(initialTotalPred)
      setPriceHistory([
        { time: createTime, value: currentPrice, totalPred: initialTotalPred },
        { time: now, value: currentPrice, totalPred: initialTotalPred }
      ])
    }
  }, [activePools, basics, priceHistory.length])
  
  // 根据显示区域计算密度类型
  const getDensityFromArea = (area: number): DanmakuDensity => {
    if (area === 0) return 'off'
    if (area === 100) return 'full'
    if (area === 50) return 'half'
    if (area === 25) return 'quarter'
    // 根据范围判断最接近的类型
    if (area > 75) return 'full'
    if (area > 37.5) return 'half'
    return 'quarter'
  }
  
  const danmakuDensity = getDensityFromArea(displayArea)

  useEffect(() => {
    if (!chartContainerRef.current) return

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#666666'
      },
      grid: {
        vertLines: { color: '#f0f0f0' },
        horzLines: { color: '#f0f0f0' }
      },
      width: chartContainerRef.current.clientWidth,
      height: 500,
      timeScale: {
        timeVisible: true,
        secondsVisible: false
      },
      rightPriceScale: {
        borderColor: '#e5e5e5',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1
        }
      },
      localization: {
        priceFormatter: (price: number) => {
          return (price * 100).toFixed(1) + '%'
        }
      }
    })

    const lineSeries = chart.addLineSeries({
      color: '#1677ff',
      lineWidth: 2
    })
    lineSeriesRef.current = lineSeries

    // 初始化价格历史：如果有池子数据，添加当前价格点
    const initializePriceData = () => {
      const currentPrice = calculateCurrentPrice(activePools)
      if (currentPrice > 0 && activePools && basics) {
        // 使用市场创建时间作为起始点，当前时间作为结束点
        const createTime = Number(basics.endTime) - 365 * 24 * 3600 // 假设一年前创建
        const now = Math.floor(Date.now() / 1000)
        
        // 如果有历史数据，使用历史数据；否则创建初始数据点
        if (priceHistory.length > 0) {
          lineSeries.setData(priceHistory.map(d => ({ time: d.time as any, value: d.value })))
        } else {
          const yesPredReserve = Number(formatUnits(activePools.yesPredReserve, 18))
          const noPredReserve = Number(formatUnits(activePools.noPredReserve, 18))
          const initialTotalPred = yesPredReserve + noPredReserve
          
          const initialData = [
            { time: createTime, value: currentPrice, totalPred: initialTotalPred },
            { time: now, value: currentPrice, totalPred: initialTotalPred }
          ]
          
          lineSeries.setData(initialData.map(d => ({ time: d.time as any, value: d.value })))
          
          if (priceHistory.length === 0) {
            setPriceHistory(initialData)
            setTotalPred(initialTotalPred)
          }
        }
      }
    }

    initializePriceData()

    chartRef.current = chart

    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth
        })
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [eventId, marketId])

  // 当价格历史更新时，更新图表
  useEffect(() => {
    if (lineSeriesRef.current && priceHistory.length > 0) {
      // 使用价格历史数据更新图表
      const chartData = priceHistory.map(d => ({ time: d.time as any, value: d.value }))
      lineSeriesRef.current.setData(chartData)
    }
  }, [priceHistory])

  const handleSendDanmaku = async () => {
    if (!isConnected) {
      alert('请先连接钱包')
      return
    }
    
    if (!danmakuInput.trim() || displayArea === 0) return

    const danmakuContent = danmakuInput.trim()
    
    try {
      // 先本地添加用户弹幕（乐观更新）
      if (address) {
        const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`
        const timestamp = Date.now()
        const userDanmaku = {
          user: shortAddress,
          content: danmakuContent,
          isMine: true
        }
        
        // 添加到用户弹幕记录
        setUserDanmakuMessages((prev) => {
          // 避免重复
          const exists = prev.find(d => 
            d.content === danmakuContent && 
            d.user === shortAddress &&
            Date.now() - d.timestamp < 1000 // 1秒内的相同弹幕视为重复
          )
          if (exists) return prev
          return [{ user: shortAddress, content: danmakuContent, timestamp }, ...prev].slice(0, 50) // 最多保留50条用户弹幕
        })
        
        // 添加到弹幕列表
        setDanmakuMessages((prev) => {
          // 避免重复
          const lastMsg = prev[prev.length - 1]
          if (lastMsg && lastMsg.content === danmakuContent && lastMsg.user === shortAddress && lastMsg.isMine) {
            return prev
          }
          // 最多保留50条弹幕
          const updated = [...prev, userDanmaku]
          return updated.slice(-50)
        })
      }
      
      // 发送到链上
      await sendDanmaku(marketId, danmakuContent)
      setDanmakuInput('')
      
      // 链上事件会自动更新弹幕列表（通过 useWatchDanmaku）
    } catch (error) {
      console.error('发送弹幕失败:', error)
      // 如果发送失败，移除乐观更新的弹幕
      if (address) {
        const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`
        setDanmakuMessages((prev) => prev.filter(d => 
          !(d.user === shortAddress && d.content === danmakuContent && d.isMine)
        ))
      }
    }
  }

  // 处理鼠标离开设置面板区域
  useEffect(() => {
    if (!showDanmakuSettings) return

    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        settingsPanelRef.current &&
        settingsButtonRef.current &&
        !settingsPanelRef.current.contains(target) &&
        !settingsButtonRef.current.contains(target)
      ) {
        setShowDanmakuSettings(false)
      }
    }

    // 延迟添加监听，避免立即触发
    const timer = setTimeout(() => {
      document.addEventListener('mousemove', handleMouseMove)
    }, 200)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousemove', handleMouseMove)
    }
  }, [showDanmakuSettings])

  return (
    <div className="chart-with-danmaku">
      <div className="chart-container" ref={chartContainerRef}>
        {danmakuDensity !== 'off' && (
          <DanmakuOverlay 
            messages={danmakuMessages.map(d => d.content)} 
            density={danmakuDensity}
            displayArea={displayArea}
          />
        )}
      </div>
      <div className="danmaku-footer">
        <div className="danmaku-stats">
          <span className="viewer-count">
            {(viewerCount / 10000).toFixed(1)}万+人正在看
          </span>
          <span className="danmaku-count">
            已装填{totalDanmakuCount} 条弹幕
          </span>
          {userDanmakuMessages.length > 0 && (
            <span className="user-danmaku-count" style={{ marginLeft: '10px', color: '#1677ff', fontWeight: '500' }}>
              我的弹幕: {userDanmakuMessages.length}
            </span>
          )}
        </div>
        <div className="danmaku-toggle-icons">
          <span 
            className={`danmaku-icon ${displayArea > 0 ? 'active' : ''}`}
            onClick={() => setDisplayArea(displayArea > 0 ? 0 : 100)}
            title={displayArea > 0 ? '关闭弹幕' : '开启弹幕'}
          >
            📺
          </span>
          <span 
            ref={settingsButtonRef}
            className={`danmaku-icon ${showDanmakuSettings ? 'active' : ''}`}
            onClick={() => setShowDanmakuSettings(!showDanmakuSettings)}
            title="弹幕设置"
          >
            📺
          </span>
          {showDanmakuSettings && (
            <div 
              ref={settingsPanelRef}
              className="danmaku-settings-popover"
            >
              <DanmakuSettingsPanel 
                displayArea={displayArea}
                onDisplayAreaChange={setDisplayArea}
              />
            </div>
          )}
        </div>
        <div className="danmaku-input-area">
          <div className="danmaku-input-wrapper">
            <span className="danmaku-input-icon">A</span>
            {!isConnected ? (
              <div style={{ padding: '8px', fontSize: '14px', color: '#999' }}>
                请先连接钱包以发送弹幕
              </div>
            ) : (
              <input
                type="text"
                className="danmaku-input"
                placeholder={displayArea === 0 ? '已关闭弹幕' : '发个友善的弹幕见证当下弹幕礼仪 >'}
                value={danmakuInput}
                onChange={(e) => setDanmakuInput(e.target.value)}
                disabled={displayArea === 0 || isSendingDanmaku}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && danmakuInput.trim() && displayArea > 0 && !isSendingDanmaku) {
                    handleSendDanmaku()
                  }
                }}
              />
            )}
          </div>
          {!isConnected ? (
            <ConnectButton />
          ) : (
            <button
              className="danmaku-send-btn"
              onClick={handleSendDanmaku}
              disabled={displayArea === 0 || !danmakuInput.trim() || isSendingDanmaku}
            >
              {isSendingDanmaku ? '发送中...' : '发送'}
            </button>
          )}
        </div>
      </div>

    </div>
  )
}

export default ChartWithDanmaku
