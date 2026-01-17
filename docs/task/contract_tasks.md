# 预测市场合约开发任务

> 基于 `docs/plan/contract.md` 需求规划

## 概述

开发一个面向舆情/娱乐八卦的预测市场合约，部署于 Monad testnet，充分利用其高 TPS 特性。

---

## 阶段 1：合约架构设计与基础框架

### 1.1 数据结构设计
- [x] 定义 `Market` 结构体
  - `id`: 市场唯一标识
  - `creator`: 创建者地址
  - `question`: 预测问题描述
  - `endTime`: 投注截止时间
  - `status`: 状态（Active/Resolved/Cancelled）
  - `outcome`: 结果（Yes/No）
  - `yesPredReserve/noPredReserve`: 资金池（PRED）
  - `yesShareReserve/noShareReserve`: 份额池（Yes/No）
  - `totalYesShares/totalNoShares`: 份额总量
  - `winningPredPool/totalWinningShares`: 结算奖池与份额
- [x] 定义用户仓位映射 `mapping(marketId => mapping(user => Position))`
- [x] 定义市场状态枚举 `MarketStatus { Active, Resolved, Cancelled }`
- [x] 引入 `PRED` 参与代币（ERC20）

### 1.2 事件定义（Events）
- [x] `MarketCreated(uint256 indexed marketId, address indexed creator, string question, uint256 endTime, uint256 initialYesPred, uint256 initialNoPred)`
- [x] `SharesBought(uint256 indexed marketId, address indexed user, bool isYes, uint256 predIn, uint256 sharesOut)`
- [x] `SharesSold(uint256 indexed marketId, address indexed user, bool isYes, uint256 sharesIn, uint256 predOut)`
- [x] `MarketResolved(uint256 indexed marketId, bool outcome)`
- [x] `WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount)`
- [x] `Comment(uint256 indexed marketId, address indexed user, string content)`
- [x] `Danmaku(uint256 indexed marketId, address indexed user, string content)`

### 1.3 基础合约框架
- [x] 创建 `PredictionMarket.sol` 主合约
- [x] 创建 `PredToken.sol` 参与代币
- [x] 实现 Ownable 权限控制（用于 agent 调用）
- [x] 定义合约常量（最小投注额、手续费率等）

**交付物**: `foundry/src/PredictionMarket.sol` 基础框架

---

## 阶段 2：市场管理功能

### 2.1 创建市场（Agent 接口）
- [x] `createMarket(string question, uint256 endTime, uint256 initialYesPred, uint256 initialNoPred)` 
  - 只有授权的 agent 地址可以调用
  - 注入初始流动性（PRED）
  - emit `MarketCreated` 事件
  - 返回新市场的 ID

### 2.2 结算市场（Agent 接口）
- [x] `resolveMarket(uint256 marketId, bool outcome)`
  - 只有授权的 agent 可以调用
  - 校验市场已过截止时间
  - emit `MarketResolved` 事件

### 2.3 取消市场
- [x] `cancelMarket(uint256 marketId)`
  - 特殊情况下取消市场，允许用户退款

**交付物**: 完整的市场生命周期管理

---

## 阶段 3：买卖份额与结算功能（Bonding Curve）

### 3.1 买入份额
- [x] `buyYes(uint256 marketId, uint256 predIn, uint256 minSharesOut)`
  - PRED 参与
  - 基于池子计算份额（bonding curve）
  - emit `SharesBought` 事件

- [x] `buyNo(uint256 marketId, uint256 predIn, uint256 minSharesOut)`
  - 同上逻辑

### 3.2 卖出份额
- [x] `sellYes(uint256 marketId, uint256 sharesIn, uint256 minPredOut)`
  - PRED 结算
  - emit `SharesSold` 事件

- [x] `sellNo(uint256 marketId, uint256 sharesIn, uint256 minPredOut)`
  - 同上逻辑

### 3.3 领取奖励
- [x] `claimWinnings(uint256 marketId)`
  - 冻结失败方向池子并转入胜方奖池
  - 赢家按份额比例领取奖池
  - emit `WinningsClaimed` 事件

### 3.4 退款（市场取消时）
- [x] `refund(uint256 marketId)`
  - 校验市场已取消
  - 按池子价格退还 PRED

**交付物**: 完整的投注和结算逻辑

---

## 阶段 4：社交功能（弹幕 & 评论）

### 4.1 弹幕上链
- [x] `sendDanmaku(uint256 marketId, string content)`
  - 轻量级交互，体现 Monad 高 TPS
  - emit `Danmaku` 事件

### 4.2 评论上链
- [x] `sendComment(uint256 marketId, string content)`
  - emit `Comment` 事件
  - 限制内容长度

### 4.3 演示效果增强
- [ ] 考虑批量弹幕功能 `batchDanmaku()` 展示高 TPS
- [ ] 统计弹幕/评论数量

**交付物**: 社交互动功能

---

## 阶段 5：Gas 优化与高性能适配

### 5.1 存储优化
- [ ] 使用 `uint128` 等更小类型减少存储槽
- [ ] 合理打包 struct 字段顺序
- [ ] 考虑使用 bitmap 存储多个布尔值

### 5.2 计算优化
- [ ] 避免循环中的 SLOAD
- [ ] 使用 unchecked 块减少溢出检查（安全情况下）
- [ ] 批量操作接口减少交易次数

### 5.3 Monad 特性适配
- [ ] 研究 Monad 特有的优化点
- [ ] 调整合约以利用并行执行特性

**交付物**: 优化后的合约代码

---

## 阶段 6：测试

### 6.1 单元测试
- [ ] 市场创建测试
- [ ] 投注功能测试
- [ ] 结算逻辑测试
- [ ] 边界条件测试
- [ ] 权限控制测试

### 6.2 集成测试
- [ ] 完整生命周期测试
- [ ] 多用户并发场景
- [ ] 异常流程测试

**交付物**: `foundry/test/PredictionMarket.t.sol`

---

## 阶段 7：部署与演示

### 7.1 部署脚本
- [ ] 编写 Foundry 部署脚本
- [ ] 配置 Monad testnet RPC

### 7.2 部署上线
- [ ] 部署到 Monad testnet
- [ ] 验证合约

### 7.3 演示准备
- [ ] 准备演示数据（热点事件）
- [ ] 模拟 agent 创建/结算市场
- [ ] 模拟用户投注和弹幕互动

**交付物**: 可演示的链上合约

---

## 里程碑时间线（建议）

| 阶段 | 预计时间 | 优先级 |
|------|----------|--------|
| 阶段 1 | 2h | P0 |
| 阶段 2 | 2h | P0 |
| 阶段 3 | 3h | P0 |
| 阶段 4 | 1h | P1 |
| 阶段 5 | 2h | P2 |
| 阶段 6 | 2h | P1 |
| 阶段 7 | 1h | P0 |

**总计**: 约 13 小时

---

## 技术栈

- **开发框架**: Foundry
- **语言**: Solidity ^0.8.20
- **依赖**: OpenZeppelin Contracts
- **网络**: Monad Testnet

---

## 注意事项

1. **可读性**: 代码注释清晰，函数命名语义化
2. **安全性**: 重入攻击防护、整数溢出检查
3. **演示效果**: 优先保证核心功能可演示，优化可后置
4. **Agent 友好**: 接口设计便于程序调用
