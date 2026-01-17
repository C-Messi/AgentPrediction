# Agent 操作接口文档

面向管理员/Agent 的操作指南，涵盖创建市场、结算、取消、以及前置准备。

---

## 角色与权限

- **Owner**: 可设置/取消 Agent
- **Agent**: 可创建市场、结算、取消

相关合约方法：
- `PredictionMarket.setAgent(address agent, bool enabled)` (Owner)
- `PredictionMarket.createMarket(...)` (Agent)
- `PredictionMarket.resolveMarket(...)` (Agent)
- `PredictionMarket.cancelMarket(...)` (Agent)

---

## 前置准备

1) **部署合约**
- 部署 `PredToken`（PRED）
- 部署 `PredictionMarket`，传入 PRED 地址

2) **设置 Agent**
- Owner 调用 `setAgent(agent, true)`

3) **准备 PRED**
- Agent 持有足够 PRED 作为初始流动性

---

## 1. 创建市场（Create Market）

### 接口
`createMarket(string question, uint256 endTime, uint256 initialYesPred, uint256 initialNoPred) -> uint256`

### 说明
- 必须是 Agent 地址调用
- 需要先 `approve` 足量 PRED
- 会初始化 Yes/No 交易池，保证前期流动性

### 推荐流程
1. `PredToken.approve(PredictionMarket, initialYesPred + initialNoPred)`
2. 调用 `createMarket(...)`
3. 监听 `MarketCreated`

### 关键事件
`MarketCreated(marketId, creator, question, endTime, initialYesPred, initialNoPred)`

---

## 2. 结算市场（Resolve Market）

### 接口
`resolveMarket(uint256 marketId, bool outcome)`

### 说明
- 必须是 Agent 调用
- 需保证 `endTime` 已到
- 会冻结 Yes/No 池子，并合并成奖池

### 推荐流程
1. 校验已过 `endTime`
2. 调用 `resolveMarket(marketId, outcome)`
3. 监听 `MarketResolved`

### 关键事件
`MarketResolved(marketId, outcome)`

---

## 3. 取消市场（Cancel Market）

### 接口
`cancelMarket(uint256 marketId)`

### 说明
- 必须是 Agent 调用
- 用于异常情况（如事件失效）
- 用户可按池子价格退款

### 推荐流程
1. 调用 `cancelMarket(marketId)`
2. 监听 `MarketCancelled`

### 关键事件
`MarketCancelled(marketId)`

---

## 4. 常见操作示例

### 创建市场示例（伪代码）
```
// agent account
pred.approve(market, 20_000e18)
market.createMarket(
  "Will X happen?",
  now + 2 days,
  10_000e18,
  10_000e18
)
```

### 结算市场示例
```
market.resolveMarket(marketId, true)  // true = Yes
```

---

## 5. 注意事项

- 初始流动性越大，前期价格越稳定
- 结算后禁止继续买卖
- 取消后用户需主动调用 `refund`
