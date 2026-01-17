# 开发者指南

本文档提供更详细的技术实现说明，适合开发人员参考。

## 🏗️ 架构设计

### 组件架构

```
App (根组件)
├── WagmiConfig (Web3 Provider)
│   └── RainbowKitProvider (钱包 UI Provider)
│       └── Router (路由)
│           ├── HomePage (主页)
│           │   ├── Sidebar (侧边栏)
│           │   ├── MarketListItem[] (市场列表)
│           │   └── Modals (各种模态框)
│           └── EventDetailPage (详情页)
│               ├── ChartWithDanmaku (图表+弹幕)
│               │   ├── DanmakuOverlay (弹幕层)
│               │   └── DanmakuSettingsPanel (设置面板)
│               ├── BuySellPanel (交易面板)
│               ├── EventTimeline (时间线)
│               └── CommentsSection (评论区域)
```

### 数据流

1. **链上数据获取**：
   ```
   合约 → wagmi hooks → React组件 → UI显示
   ```

2. **用户交互**：
   ```
   用户操作 → React组件 → wagmi hooks → 合约交易 → 链上事件 → React组件更新
   ```

3. **实时更新**：
   ```
   链上事件 → useWatchContractEvent → React组件状态更新 → UI重新渲染
   ```

## 🔧 核心功能实现

### 1. 价格计算

价格计算基于 AMM 公式，包含虚拟储备以平滑曲线：

```typescript
// 计算 Yes 价格
const calculateCurrentPrice = (pools: MarketPools | null): number => {
  if (!pools) return 0.5
  
  const yesPredReserve = Number(formatUnits(pools.yesPredReserve, 18))
  const noPredReserve = Number(formatUnits(pools.noPredReserve, 18))
  const yesWithVirtual = yesPredReserve + VIRTUAL_PRED_RESERVE // 1000 PRED
  const noWithVirtual = noPredReserve + VIRTUAL_PRED_RESERVE
  const totalWithVirtual = yesWithVirtual + noWithVirtual
  
  return totalWithVirtual > 0 ? yesWithVirtual / totalWithVirtual : 0.5
}
```

**公式说明**：
- Yes 价格 = (Yes池子PRED + 虚拟储备) / (总PRED + 2×虚拟储备)
- No 价格 = 1 - Yes 价格
- 虚拟储备确保初始价格不为 0 或 1，提供流动性

### 2. 交易记录和价格更新

交易监听机制：

```typescript
// 监听买入事件
useWatchSharesBought((eventData) => {
  if (eventData.marketId === marketId) {
    const predIn = Number(formatUnits(eventData.predIn, 18))
    
    // 累计PRED交易量
    setTotalPred((prev) => prev + predIn)
    
    // 延迟重新获取池子数据
    setTimeout(async () => {
      await refetchPools()
      // 等待池子数据更新后，价格会自动重新计算
    }, 2000)
  }
})
```

**更新流程**：
1. 监听交易事件
2. 累计交易量
3. 延迟 2 秒（等待链上状态更新）
4. 重新获取池子数据
5. 根据新池子数据计算价格
6. 更新价格历史
7. 图表自动刷新

### 3. 弹幕系统

#### 弹幕生成

```typescript
// 随机生成弹幕
const generateRandomDanmaku = (): string => {
  const templates = [
    '我觉得Yes会赢！',
    'No的可能性更大',
    // ... 更多模板
  ]
  return templates[Math.floor(Math.random() * templates.length)]
}
```

#### 弹幕动画

使用 CSS 动画实现从右到左的移动效果：

```css
@keyframes danmaku-move {
  0% {
    left: 100%;
    transform: translateX(0);
  }
  100% {
    left: 0;
    transform: translateX(-100%);
  }
}
```

**关键点**：
- `left: 100%` 让弹幕从容器右侧外开始
- `transform: translateX(-100%)` 确保弹幕完全移出左侧
- 动画时长 8-12 秒，根据弹幕长度调整

#### 弹幕密度控制

通过 `displayArea` 参数控制弹幕显示区域：

```typescript
const getTopRange = (area: number) => {
  // area: 0-100 百分比
  const max = 5 + (area / 100) * 90 // 从5%到95%
  return { min: 5, max: Math.min(max, 95) }
}
```

- **满屏** (100%)：5%-95%
- **半屏** (50%)：5%-50%
- **1/4屏** (25%)：5%-25%
- **关闭** (0%)：不显示弹幕

### 4. 图表集成

使用 `lightweight-charts` 库：

```typescript
const chart = createChart(container, {
  layout: {
    background: { type: ColorType.Solid, color: '#ffffff' },
    textColor: '#666666'
  },
  timeScale: {
    timeVisible: true,
    secondsVisible: false
  },
  rightPriceScale: {
    scaleMargins: { top: 0.1, bottom: 0.1 }
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
```

**数据格式**：
```typescript
{ time: UnixTimestamp, value: number } // value 是 0-1 之间的概率
```

### 5. 链上事件监听

使用 `useWatchContractEvent` 监听事件：

```typescript
export function useWatchDanmaku(marketId: number | bigint, onEvent: (data: any) => void) {
  useWatchContractEvent({
    address: CONTRACTS.PREDICTION_MARKET,
    abi: PREDICTION_MARKET_ABI,
    eventName: 'Danmaku',
    onLogs: (logs) => {
      logs.forEach((log) => {
        if (log.args) {
          const eventMarketId = Number(log.args.marketId)
          if (eventMarketId === Number(marketId)) {
            onEvent({
              marketId: eventMarketId,
              user: log.args.user,
              content: log.args.content,
              log: log
            })
          }
        }
      })
    },
  })
}
```

**注意事项**：
- 过滤特定市场的事件（通过 `marketId` 比对）
- 避免重复处理（使用交易 hash 或时间戳）
- 处理事件数据时进行类型转换

## 📦 Hooks 详解

### useMarketPools

获取市场池子数据：

```typescript
export function useMarketPools(marketId: number | bigint) {
  const { data, isLoading, refetch } = useReadContract({
    address: CONTRACTS.PREDICTION_MARKET,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'getMarketPools',
    args: [BigInt(marketId)],
  })
  
  return {
    pools: data ? parseMarketPools(data) : null,
    isLoading,
    refetch
  }
}
```

### useBuyYes / useBuyNo

买入份额：

```typescript
export function useBuyYes() {
  const { writeContractAsync, isPending } = useWriteContract()
  
  const buyYes = async (marketId: number, predIn: bigint) => {
    return await writeContractAsync({
      address: CONTRACTS.PREDICTION_MARKET,
      abi: PREDICTION_MARKET_ABI,
      functionName: 'buyYes',
      args: [BigInt(marketId), predIn, 0n], // minSharesOut = 0
    })
  }
  
  return { buyYes, isPending }
}
```

**流程**：
1. 检查代币授权（allowance）
2. 如果不足，先调用 `approve`
3. 调用 `buyYes` / `buyNo`
4. 等待交易确认
5. 监听 `SharesBought` 事件更新 UI

## 🎨 样式和主题

### 颜色方案

```css
/* 主要颜色 */
--primary-color: #1677ff;      /* 主要操作按钮 */
--text-color: #333333;         /* 主要文本 */
--text-secondary: #666666;     /* 次要文本 */
--border-color: #e5e5e5;       /* 边框 */
--background: #ffffff;         /* 背景 */
--hover-color: #f5f5f5;        /* 悬停背景 */
```

### 响应式设计

- 移动端：侧边栏自动收起，使用汉堡菜单
- 平板：适配中等屏幕尺寸
- 桌面：完整布局，侧边栏固定显示

## 🧪 测试建议

### 单元测试

建议使用 `@testing-library/react` 测试组件：

```typescript
import { render, screen } from '@testing-library/react'
import { ChartWithDanmaku } from './ChartWithDanmaku'

test('renders chart container', () => {
  render(<ChartWithDanmaku marketId={1} pools={mockPools} />)
  const chartContainer = screen.getByTestId('chart-container')
  expect(chartContainer).toBeInTheDocument()
})
```

### 集成测试

测试 Web3 交互：
- Mock `wagmi` hooks
- 测试交易流程
- 测试事件监听

### E2E 测试

使用 Cypress 或 Playwright：
- 测试完整的用户流程
- 测试钱包连接
- 测试交易流程

## 🐛 调试技巧

### 1. 查看链上数据

```typescript
// 在浏览器控制台
const pools = await publicClient.readContract({
  address: CONTRACTS.PREDICTION_MARKET,
  abi: PREDICTION_MARKET_ABI,
  functionName: 'getMarketPools',
  args: [BigInt(1)],
})
console.log('Market Pools:', pools)
```

### 2. 监听所有事件

```typescript
// 临时添加调试代码
useWatchContractEvent({
  address: CONTRACTS.PREDICTION_MARKET,
  abi: PREDICTION_MARKET_ABI,
  eventName: 'SharesBought',
  onLogs: (logs) => {
    console.log('SharesBought events:', logs)
  },
})
```

### 3. 检查价格计算

```typescript
// 在组件中添加调试
useEffect(() => {
  if (pools) {
    const price = calculateCurrentPrice(pools)
    console.log('Current Price:', price)
    console.log('Pools:', pools)
  }
}, [pools])
```

## 📚 参考资料

- [wagmi 文档](https://wagmi.sh/)
- [RainbowKit 文档](https://www.rainbowkit.com/)
- [viem 文档](https://viem.sh/)
- [Lightweight Charts 文档](https://tradingview.github.io/lightweight-charts/)
- [React 文档](https://react.dev/)

## 🔄 更新日志

### v0.1.0 (当前版本)
- ✅ 基础功能实现
- ✅ Web3 集成
- ✅ 交易功能
- ✅ 弹幕和评论系统
- ✅ 价格图表
- ✅ 社交功能

## 🚀 性能优化建议

1. **数据缓存**：使用 `@tanstack/react-query` 缓存合约数据
2. **防抖节流**：对频繁触发的操作进行防抖处理
3. **虚拟滚动**：评论列表很长时使用虚拟滚动
4. **懒加载**：非首屏组件使用懒加载
5. **代码分割**：使用动态导入减少初始包大小

---

如有更多问题，请查看 [README.md](../README.md) 或提交 Issue。
