# PredictionMarket Frontend API

面向前端的合约接口文档（PredictionMarket + PredToken）。

## 合约地址

- `PRED` 代币: 0x842346362B4b67a3F6155A86586254A3cd47cDD1
- `PredictionMarket`: 0xB88ae24564251Ec870BF8E4c144B8C501dD403F3

---

## PredToken (ERC20)

### 读方法
- `name() -> string`
- `symbol() -> string`
- `decimals() -> uint8` (默认 18)
- `totalSupply() -> uint256`
- `balanceOf(address account) -> uint256`
- `allowance(address owner, address spender) -> uint256`

### 写方法
- `approve(address spender, uint256 amount) -> bool`
- `transfer(address to, uint256 amount) -> bool`
- `transferFrom(address from, address to, uint256 amount) -> bool`

---

## PredictionMarket

### 角色
- **Owner**: 管理 agent 列表
- **Agent**: 创建/结算/取消市场
- **User**: 买卖 Yes/No 份额、领奖、发弹幕/评论

### 常量
- `MIN_TRADE` 最小交易额（PRED）
- `INITIAL_SHARE_RESERVE` 初始份额池规模
- `VIRTUAL_PRED_RESERVE` 虚拟 PRED 储备（平滑曲线）
- `MAX_COMMENT_LENGTH` 评论长度上限
- `MAX_DANMAKU_LENGTH` 弹幕长度上限

---

## 读方法

### `predToken() -> address`
返回 PRED 代币地址。

### `marketCount() -> uint256`
市场数量。

### `markets(uint256 marketId) -> Market`
Solidity 自动生成的 struct getter（字段多，前端建议用下面两个分拆接口）。

### `getMarketBasics(uint256 marketId)`
返回市场基础信息：
- `creator: address`
- `question: string`
- `endTime: uint256`
- `status: uint8` (0=Active,1=Resolved,2=Cancelled)
- `outcome: bool` (Resolved 时有效)

### `getMarketPools(uint256 marketId)`
返回池子数据：
- `yesPredReserve: uint256`
- `yesShareReserve: uint256`
- `noPredReserve: uint256`
- `noShareReserve: uint256`
- `totalYesShares: uint256`
- `totalNoShares: uint256`
- `winningPredPool: uint256`
- `totalWinningShares: uint256`

### `positions(uint256 marketId, address user) -> Position`
返回用户持仓：
- `yesShares: uint128`
- `noShares: uint128`
- `claimed: bool`
- `refunded: bool`

### `agents(address) -> bool`
是否为 agent。

---

## 写方法（Agent）

### `setAgent(address agent, bool enabled)`
Owner 设置 agent。

### `createMarket(string question, uint256 endTime, uint256 initialYesPred, uint256 initialNoPred) -> uint256`
创建市场并注入初始流动性（PRED）。
- 需要 agent 先 `approve` PRED 给 `PredictionMarket`
- 返回 `marketId`

### `resolveMarket(uint256 marketId, bool outcome)`
结算市场，冻结池子并合并奖池。

### `cancelMarket(uint256 marketId)`
取消市场（用户可退款）。

---

## 写方法（User）

### `buyYes(uint256 marketId, uint256 predIn, uint256 minSharesOut) -> uint256`
用 PRED 买 Yes 份额。
- `predIn` 为支付 PRED
- `minSharesOut` 用于防止滑点

### `buyNo(uint256 marketId, uint256 predIn, uint256 minSharesOut) -> uint256`
用 PRED 买 No 份额。

### `sellYes(uint256 marketId, uint256 sharesIn, uint256 minPredOut) -> uint256`
卖出 Yes 份额换回 PRED。

### `sellNo(uint256 marketId, uint256 sharesIn, uint256 minPredOut) -> uint256`
卖出 No 份额换回 PRED。

### `claimWinnings(uint256 marketId)`
市场结算后，赢家按份额比例领取奖池。

### `refund(uint256 marketId)`
市场取消后，按池子价格退回 PRED。

### `sendDanmaku(uint256 marketId, string content)`
发送弹幕（长度限制）。

### `sendComment(uint256 marketId, string content)`
发送评论（长度限制）。

---

## 事件（Events）

### `MarketCreated`
```
MarketCreated(
  uint256 marketId,
  address creator,
  string question,
  uint256 endTime,
  uint256 initialYesPred,
  uint256 initialNoPred
)
```

### `SharesBought`
```
SharesBought(
  uint256 marketId,
  address user,
  bool isYes,
  uint256 predIn,
  uint256 sharesOut
)
```

### `SharesSold`
```
SharesSold(
  uint256 marketId,
  address user,
  bool isYes,
  uint256 sharesIn,
  uint256 predOut
)
```

### `MarketResolved`
```
MarketResolved(uint256 marketId, bool outcome)
```

### `MarketCancelled`
```
MarketCancelled(uint256 marketId)
```

### `WinningsClaimed`
```
WinningsClaimed(uint256 marketId, address user, uint256 amount)
```

### `Refunded`
```
Refunded(uint256 marketId, address user, uint256 amount)
```

### `Comment`
```
Comment(uint256 marketId, address user, string content)
```

### `Danmaku`
```
Danmaku(uint256 marketId, address user, string content)
```

---

## 前端交互流程建议

### 1) 创建市场（Agent）
1. Agent `approve(PRED, PredictionMarket, initialYesPred + initialNoPred)`
2. 调用 `createMarket`
3. 监听 `MarketCreated`

### 2) 买入 Yes/No 份额
1. 用户 `approve(PRED, PredictionMarket, predIn)`
2. 调用 `buyYes`/`buyNo`
3. 监听 `SharesBought`

### 3) 卖出 Yes/No 份额
1. 调用 `sellYes`/`sellNo`
2. 监听 `SharesSold`

### 4) 结算与领奖
1. Agent 调用 `resolveMarket`
2. 赢家调用 `claimWinnings`
3. 监听 `WinningsClaimed`

### 5) 取消与退款
1. Agent 调用 `cancelMarket`
2. 用户调用 `refund`
3. 监听 `Refunded`

---

## 注意事项

- 所有金额均为 `PRED`，默认 `18` 位小数
- 交易接口带滑点参数，前端建议先读取池子再估算报价
- 市场结算后不再允许买卖
