# 配置文件说明

## WalletConnect Project ID

在使用 RainbowKit 之前，你需要：

1. 访问 [WalletConnect Cloud](https://cloud.walletconnect.com/) 创建一个账户
2. 创建一个新项目并获取 Project ID
3. 在 `src/config/wagmi.ts` 中将 `YOUR_PROJECT_ID` 替换为实际的 Project ID

或者，如果你只是在本地开发，可以使用默认值，但可能会遇到一些限制。

## 网络配置

当前配置支持以下网络：
- **Monad 测试网** (Chain ID: 10143)
  - RPC URL: `https://testnet-rpc.monad.xyz`
  - WebSocket: `wss://testnet-rpc.monad.xyz`
  - 区块浏览器: [Monad Vision](https://testnet.monadvision.com)
  - 测试币水龙头: [Faucet](https://faucet.monad.xyz)

如果需要添加其他网络，可以在 `src/config/wagmi.ts` 中修改 `chains` 数组和 `transports` 配置。

## 合约地址

在 `src/config/contracts.ts` 中配置了合约地址：
- `PRED_TOKEN`: PRED 代币合约地址
- `PREDICTION_MARKET`: 预测市场合约地址
- `CHAIN_ID`: 当前链 ID (10143 - Monad 测试网)

确保这些地址与你在 Monad 测试网上部署的地址一致。

## 获取测试币

1. 访问 [Monad Faucet](https://faucet.monad.xyz)
2. 连接你的钱包地址
3. 领取测试 MON 代币用于交易
