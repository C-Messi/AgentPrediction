# 预测市场前端应用

基于 React + TypeScript + Web3 开发的具有社交属性的去中心化预测市场前端应用。

## 📖 项目概述

这是一个去中心化预测市场平台的前端应用，用户可以：
- 浏览和参与各种预测事件
- 通过 AMM (自动化做市商) 机制买卖 Yes/No 份额
- 实时查看价格走势图表
- 发送弹幕和评论进行社交互动
- 查看交易历史和持仓信息

## ✨ 功能特性

### 🏠 主页功能
- **市场列表**：网格布局展示所有预测市场
- **侧边栏**：关注事件、朋友列表、个人账户管理
- **市场统计**：实时显示市场总数，支持手动刷新
- **自动更新**：每5秒自动轮询新市场

### 📊 预测事件详情页
- **价格图表**：
  - 实时折线图显示 Yes 概率走势（使用 lightweight-charts）
  - 支持时间缩放和价格格式化显示
  - 自动记录每笔交易并更新图表
  
- **弹幕系统**：
  - 弹幕从右侧飞入，穿越整个图表区域
  - 支持四种显示模式：满屏、半屏、1/4屏、关闭
  - 弹幕设置面板（显示区域滑块和快捷按钮）
  - 用户弹幕统计和记录
  - 随机生成模拟弹幕增强活跃度
  
- **交易面板**：
  - Buy Yes / Buy No 功能
  - Sell Yes / Sell No 功能
  - 实时价格显示（基于 AMM 公式计算）
  - PRED 代币余额和授权管理
  - 用户持仓显示（Yes/No 份额）
  
- **事件时间线**：
  - 水平滚动的链式事件时间线
  - 展示事件发展脉络
  
- **评论系统**：
  - 发送评论到链上
  - 实时显示链上评论
  - 用户评论记录和统计
  - 随机生成模拟评论
  - 点赞功能

### 💬 社交功能
- **关注**：关注感兴趣的预测事件
- **朋友**：朋友列表和聊天窗口
- **我的账户**：查看个人资金和持仓

### 🔗 Web3 集成
- **钱包连接**：使用 RainbowKit 支持多种钱包
- **链上交互**：与 PredictionMarket 合约交互
- **事件监听**：实时监听链上事件（交易、评论、弹幕）
- **交易记录**：自动记录并展示每笔交易

## 🛠 技术栈

### 前端框架
- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **React Router** - 路由管理

### Web3 集成
- **RainbowKit** - 钱包连接 UI
- **wagmi** - React Hooks for Ethereum
- **viem** - 以太坊工具库

### UI 组件
- **Lightweight Charts** - 高性能金融图表
- **Framer Motion** - 动画库
- **React Icons** - 图标库

### 状态管理
- **React Hooks** (useState, useEffect, useRef)
- **@tanstack/react-query** - 数据获取和缓存

## 📁 项目结构

```
src/
├── components/              # 组件目录
│   ├── Sidebar.tsx          # 左侧功能栏
│   ├── EventCard.tsx        # 事件卡片（简化版：问题、Yes/No按钮、交易量）
│   ├── MarketListItem.tsx   # 市场列表项（从链上获取数据）
│   ├── Modal.tsx            # 浮窗组件
│   ├── ChartWithDanmaku.tsx # 价格图表 + 弹幕系统
│   ├── DanmakuOverlay.tsx   # 弹幕覆盖层
│   ├── DanmakuSettingsPanel.tsx # 弹幕设置面板
│   ├── BuySellPanel.tsx     # 交易面板
│   ├── EventTimeline.tsx    # 事件时间线
│   ├── CommentsSection.tsx  # 评论区域
│   ├── FollowingModal.tsx   # 关注模态框
│   ├── FriendsModal.tsx     # 朋友列表模态框
│   ├── ChatWindow.tsx       # 聊天窗口
│   └── MyAccountModal.tsx   # 我的账户模态框
├── pages/                   # 页面目录
│   ├── HomePage.tsx         # 主页
│   └── EventDetailPage.tsx  # 事件详情页
├── hooks/                   # 自定义 Hooks
│   ├── usePredictionMarket.ts # 预测市场合约交互
│   └── usePredToken.ts      # PRED 代币交互
├── config/                  # 配置文件
│   ├── contracts.ts         # 合约地址配置
│   ├── wagmi.ts             # wagmi 配置
│   └── README.md            # 配置说明文档
├── contracts/               # 合约 ABI
│   ├── PredictionMarketABI.ts # 预测市场 ABI
│   └── PredTokenABI.ts      # PRED 代币 ABI
├── App.tsx                  # 主应用组件
├── main.tsx                 # 应用入口
└── index.css                # 全局样式
```

## 🚀 安装和运行

### 前置要求
- Node.js >= 16.0.0
- npm >= 7.0.0
- 支持 Web3 的钱包（如 MetaMask）

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd Prediction
```

2. **安装依赖**
```bash
npm install
```

3. **配置 WalletConnect Project ID**
   - 访问 [WalletConnect Cloud](https://cloud.walletconnect.com/) 创建项目
   - 获取 Project ID
   - 在 `src/config/wagmi.ts` 中替换 `YOUR_PROJECT_ID`

4. **配置合约地址**
   - 确保 `src/config/contracts.ts` 中的合约地址正确
   - 当前配置的链：Monad 测试网 (Chain ID: 10143)

5. **启动开发服务器**
```bash
npm run dev
```

6. **构建生产版本**
```bash
npm run build
```

7. **预览生产构建**
```bash
npm run preview
```

## ⚙️ 配置说明

### 网络配置

当前支持 **Monad 测试网**：
- **Chain ID**: 10143
- **RPC URL**: `https://testnet-rpc.monad.xyz`
- **区块浏览器**: [Monad Vision](https://testnet.monadvision.com)
- **测试币水龙头**: [Monad Faucet](https://faucet.monad.xyz)

### 合约地址

在 `src/config/contracts.ts` 中配置：
```typescript
export const CONTRACTS = {
  PRED_TOKEN: '0x842346362B4b67a3F6155A86586254A3cd47cDD1',
  PREDICTION_MARKET: '0xB88ae24564251Ec870BF8E4c144B8C501dD403F3',
}
```

### 获取测试币

1. 访问 [Monad Faucet](https://faucet.monad.xyz)
2. 连接钱包地址
3. 领取测试 MON 代币用于支付 gas 费用
4. 确保钱包中有足够的 PRED 代币用于交易

## 📖 使用指南

### 连接钱包

1. 点击页面右上角的"连接钱包"按钮
2. 选择你的钱包（MetaMask、WalletConnect 等）
3. 确认连接并切换到 Monad 测试网

### 浏览市场

- 主页展示所有可用的预测市场
- 点击市场卡片进入详情页
- 查看市场问题、当前价格和交易量

### 参与预测

1. **买入份额**：
   - 在详情页点击 "Buy Yes" 或 "Buy No"
   - 输入 PRED 金额
   - 确认交易（首次需要授权 PRED 代币）

2. **卖出份额**：
   - 在交易面板查看你的持仓
   - 点击 "Sell Yes" 或 "Sell No"
   - 输入要卖出的份额数量
   - 确认交易

3. **查看价格**：
   - 实时折线图显示 Yes 概率走势
   - 每笔交易后自动更新价格和图表

### 社交互动

1. **发送弹幕**：
   - 在图表下方的输入框输入弹幕内容
   - 点击发送按钮
   - 弹幕会从右侧飞入图表区域
   - 可在设置中调整弹幕显示区域

2. **发表评论**：
   - 在评论区域输入评论内容
   - 点击"发送"按钮
   - 评论会实时显示在列表中

3. **查看统计**：
   - 弹幕统计：显示总弹幕数和我的弹幕数
   - 评论统计：显示总评论数和我的评论数

## 🔧 开发指南

### 价格计算

价格计算使用 AMM 公式（包含虚拟储备）：
```typescript
yesPrice = (yesPredReserve + VIRTUAL_PRED_RESERVE) / 
           (yesPredReserve + VIRTUAL_PRED_RESERVE + noPredReserve + VIRTUAL_PRED_RESERVE)
noPrice = 1 - yesPrice
```

其中：
- `VIRTUAL_PRED_RESERVE = 1000` PRED
- Yes 价格 + No 价格 = 1

### 交易记录

- 自动监听 `SharesBought` 和 `SharesSold` 事件
- 累计 PRED 交易量
- 交易后重新获取池子数据并更新价格
- 价格历史最多保留 200 个点

### 事件监听

应用使用 `useWatchContractEvent` 监听链上事件：
- `MarketCreated` - 新市场创建
- `SharesBought` - 买入份额
- `SharesSold` - 卖出份额
- `Danmaku` - 弹幕事件
- `Comment` - 评论事件

### 样式规范

- 使用 CSS Modules 组织样式
- 白色主题，简洁现代的设计风格
- 响应式布局，适配不同屏幕尺寸

## 📝 API 文档

详细的合约 API 文档请参考 `prediction_market_api.md`。

### 主要合约方法

#### 读取方法
- `marketCount()` - 获取市场总数
- `getMarketBasics(marketId)` - 获取市场基础信息
- `getMarketPools(marketId)` - 获取市场池子数据
- `positions(marketId, user)` - 获取用户持仓

#### 写入方法
- `buyYes(marketId, predIn, minSharesOut)` - 买入 Yes 份额
- `buyNo(marketId, predIn, minSharesOut)` - 买入 No 份额
- `sellYes(marketId, sharesIn, minPredOut)` - 卖出 Yes 份额
- `sellNo(marketId, sharesIn, minPredOut)` - 卖出 No 份额
- `sendDanmaku(marketId, content)` - 发送弹幕
- `sendComment(marketId, content)` - 发送评论

## 🐛 常见问题

### 1. 钱包连接失败
- 确保钱包已安装并解锁
- 检查是否切换到正确的网络（Monad 测试网）
- 清除浏览器缓存并重新连接

### 2. 交易失败
- 确保钱包中有足够的 MON 代币支付 gas 费用
- 首次交易前需要授权 PRED 代币
- 检查输入金额是否符合最小交易额要求

### 3. 价格不更新
- 确保网络连接正常
- 检查合约地址配置是否正确
- 查看浏览器控制台是否有错误信息

### 4. 弹幕/评论不显示
- 确保钱包已连接
- 检查交易是否成功（可在区块浏览器查看）
- 等待链上事件确认（可能需要几秒钟）

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📧 联系方式

如有问题或建议，请通过 Issue 联系我们。

---

**注意**：本项目目前运行在 Monad 测试网上，仅供测试使用。生产环境部署前请确保所有配置正确并完成充分测试。
