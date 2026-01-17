import { useEffect, useRef, useState } from 'react'
import './DanmakuOverlay.css'

type DanmakuDensity = 'full' | 'half' | 'quarter'

interface DanmakuOverlayProps {
  messages: string[]
  density: DanmakuDensity
  displayArea: number // 显示区域百分比 0-100
}

function DanmakuOverlay({ messages, displayArea }: DanmakuOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeMessages, setActiveMessages] = useState<
    Array<{ id: number; text: string; top: number; duration: number }>
  >([])
  const timeoutRefs = useRef<Map<number, NodeJS.Timeout>>(new Map())

  // 根据显示区域百分比计算弹幕位置范围
  const getTopRange = (area: number) => {
    // displayArea 是百分比，转换为高度范围
    // 例如：100% = 5-95%, 50% = 5-50%, 25% = 5-25%
    const max = 5 + (area / 100) * 90 // 从5%到95%的范围
    return { min: 5, max: Math.min(max, 95) }
  }

  // 当显示区域改变时，清理所有现有弹幕
  useEffect(() => {
    // 清理所有现有的定时器
    timeoutRefs.current.forEach((timeout) => {
      clearTimeout(timeout)
    })
    timeoutRefs.current.clear()
    // 清空所有弹幕
    setActiveMessages([])
  }, [displayArea])

  useEffect(() => {
    if (messages.length === 0) return

    const newMessage = messages[messages.length - 1]
    const id = Date.now() + Math.random() // 确保唯一ID
    const range = getTopRange(displayArea)
    const top = Math.random() * (range.max - range.min) + range.min
    const duration = 8 + Math.random() * 4 // 8-12 seconds

    setActiveMessages((prev) => [...prev, { id, text: newMessage, top, duration }])

    // Remove message after animation
    const timeout = setTimeout(() => {
      setActiveMessages((prev) => prev.filter((msg) => msg.id !== id))
      timeoutRefs.current.delete(id)
    }, duration * 1000)
    
    timeoutRefs.current.set(id, timeout)

    // 清理函数
    return () => {
      if (timeoutRefs.current.has(id)) {
        clearTimeout(timeoutRefs.current.get(id))
        timeoutRefs.current.delete(id)
      }
    }
  }, [messages, displayArea])

  return (
    <div ref={containerRef} className="danmaku-overlay">
      {activeMessages.map((msg) => (
        <div
          key={msg.id}
          className="danmaku-item"
          style={{
            top: `${msg.top}%`,
            animationDuration: `${msg.duration}s`
          }}
        >
          {msg.text}
        </div>
      ))}
    </div>
  )
}

export default DanmakuOverlay
