import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { usePublicClient } from 'wagmi'
import { CONTRACTS } from '../config/contracts'
import { PREDICTION_MARKET_ABI } from '../contracts/PredictionMarketABI'
import Sidebar from '../components/Sidebar'
import Modal from '../components/Modal'
import FollowingModal from '../components/FollowingModal'
import FriendsModal, { Friend } from '../components/FriendsModal'
import MyAccountModal from '../components/MyAccountModal'
import ChatWindow from '../components/ChatWindow'
import { 
  useMarketCount
} from '../hooks/usePredictionMarket'
import MarketListItem from '../components/MarketListItem'
import './HomePage.css'

// 轮询间隔（毫秒）
const POLL_INTERVAL = 5000 // 5秒

function HomePage() {
  const navigate = useNavigate()
  const publicClient = usePublicClient()
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [chatFriend, setChatFriend] = useState<Friend | null>(null)
  const [marketIds, setMarketIds] = useState<number[]>([])
  const previousCountRef = useRef<number>(0)
  const loadedMarketIdsRef = useRef<Set<number>>(new Set())

  const { count: marketCount, refetch: refetchMarketCount } = useMarketCount()

  // 批量查询市场基础信息
  const fetchMarketBasics = async (marketIds: number[]) => {
    if (!publicClient || marketIds.length === 0) return []

    try {
      const results = await Promise.all(
        marketIds.map(async (marketId) => {
          try {
            const data = await publicClient.readContract({
              address: CONTRACTS.PREDICTION_MARKET,
              abi: PREDICTION_MARKET_ABI,
              functionName: 'getMarketBasics',
              args: [BigInt(marketId)],
            })
            return {
              marketId,
              basics: {
                creator: data[0],
                question: data[1],
                endTime: data[2],
                status: data[3],
                outcome: data[4],
              },
            }
          } catch (error) {
            console.error(`Failed to fetch market ${marketId}:`, error)
            return null
          }
        })
      )
      return results.filter((r): r is NonNullable<typeof r> => r !== null)
    } catch (error) {
      console.error('Failed to fetch markets:', error)
      return []
    }
  }

  // 检查并加载缺失或新增的市场
  useEffect(() => {
    if (!publicClient) return

    const currentCount = marketCount || 0
    const previousCount = previousCountRef.current
    const loadedIds = loadedMarketIdsRef.current

    // 找出需要加载的市场ID（排除已加载的）
    let marketIdsToLoad: number[] = []

    if (currentCount > previousCount) {
      // 如果总数量增加，查询新增的市场（从 previousCount+1 到 currentCount）
      // marketId 从 1 开始
      const newMarketIds: number[] = []
      for (let i = previousCount + 1; i <= currentCount; i++) {
        if (!loadedIds.has(i)) {
          newMarketIds.push(i)
        }
      }
      marketIdsToLoad = newMarketIds
      previousCountRef.current = currentCount
      if (marketIdsToLoad.length > 0) {
        console.log(`发现 ${marketIdsToLoad.length} 个新市场:`, marketIdsToLoad)
      }
    } else if (currentCount > 0) {
      // 初始化：如果从未加载过，加载所有市场
      // marketId 从 1 开始，所以是从 1 到 currentCount
      if (previousCountRef.current === 0 && loadedIds.size === 0) {
        marketIdsToLoad = Array.from({ length: currentCount }, (_, i) => i + 1)
        previousCountRef.current = currentCount
        console.log(`初始化加载 ${marketIdsToLoad.length} 个市场:`, marketIdsToLoad)
      } else {
        // 检查是否有缺失的市场（1 到 currentCount 中未加载的）
        const missingIds: number[] = []
        for (let i = 1; i <= currentCount; i++) {
          if (!loadedIds.has(i)) {
            missingIds.push(i)
          }
        }
        
        if (missingIds.length > 0) {
          marketIdsToLoad = missingIds
          console.log(`发现 ${missingIds.length} 个缺失的市场:`, marketIdsToLoad)
        }
      }
    }

    // 如果有需要加载的市场，批量查询
    if (marketIdsToLoad.length > 0) {
      fetchMarketBasics(marketIdsToLoad).then((fetchedMarkets) => {
        // 只添加成功查询到的市场
        if (fetchedMarkets.length > 0) {
          const validMarketIds = fetchedMarkets.map((m) => m.marketId)
          
          // 更新已加载的市场ID集合
          validMarketIds.forEach(id => loadedIds.add(id))
          
          setMarketIds((prev) => {
            const combined = [...validMarketIds, ...prev]
            // 去重并排序（最新的在前）
            const unique = Array.from(new Set(combined))
            return unique.sort((a, b) => b - a)
          })
        }
      })
    }
  }, [publicClient, marketCount])

  // 轮询检查新市场
  useEffect(() => {
    if (!publicClient) return

    // 设置定时器定期检查
    const intervalId = setInterval(() => {
      refetchMarketCount()
    }, POLL_INTERVAL)

    return () => {
      clearInterval(intervalId)
    }
  }, [publicClient, refetchMarketCount])


  const handleSidebarClick = (type: string) => {
    setActiveModal(type)
  }

  const handleCloseModal = () => {
    setActiveModal(null)
  }

  const handleEventClick = (eventId: string) => {
    navigate(`/event/${eventId}`)
  }

  const handleFriendClick = (friend: Friend) => {
    setActiveModal(null)
    setChatFriend(friend)
  }

  const handleCloseChat = () => {
    setChatFriend(null)
  }

  return (
    <div className="home-page">
      <Sidebar onItemClick={handleSidebarClick} />
      <div className="top-nav">
        <div className="nav-left">
          <span className="logo">预测市场</span>
        </div>
        <div className="nav-center">
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input type="text" placeholder="搜索你感兴趣的预测事件" />
          </div>
        </div>
        <div className="nav-right">
          <ConnectButton />
          <button 
            className="nav-btn market-count-btn" 
            onClick={() => refetchMarketCount()}
            title="点击刷新市场数量"
          >
            市场总数: {marketCount}
          </button>
          <button className="nav-btn">投稿</button>
          <button className="nav-btn">通知</button>
        </div>
      </div>
      <div className="category-bar">
        <div className="category-item active">全部</div>
        <div className="category-item">科技</div>
        <div className="category-item">金融</div>
        <div className="category-item">体育</div>
        <div className="category-item">娱乐</div>
        <div className="category-item">政治</div>
        <div className="category-item">其他</div>
      </div>
      <div className="home-content">
        {marketCount === 0 ? (
          <div style={{ 
            padding: '40px', 
            textAlign: 'center', 
            color: '#999',
            fontSize: '16px' 
          }}>
            暂无市场，等待新市场创建...
          </div>
        ) : (
          <div className="events-feed">
            {marketIds.map((marketId) => (
              <MarketListItem
                key={marketId}
                marketId={marketId}
                onClick={(id) => handleEventClick(id.toString())}
              />
            ))}
          </div>
        )}
      </div>

      {activeModal === 'following' && (
        <Modal onClose={handleCloseModal} title="关注的预测事件">
          <FollowingModal />
        </Modal>
      )}

      {activeModal === 'friends' && (
        <Modal onClose={handleCloseModal} title="朋友">
          <FriendsModal onFriendClick={handleFriendClick} />
        </Modal>
      )}

      {activeModal === 'my' && (
        <Modal onClose={handleCloseModal} title="我的">
          <MyAccountModal />
        </Modal>
      )}

      {chatFriend && (
        <Modal onClose={handleCloseChat} className="chat-modal-wrapper">
          <ChatWindow friend={chatFriend} onClose={handleCloseChat} />
        </Modal>
      )}
    </div>
  )
}

export default HomePage
