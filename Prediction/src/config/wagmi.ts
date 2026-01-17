import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { defineChain } from 'viem'
import { http } from 'wagmi'

// Monad 测试网配置
const monadTestnet = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Monad',
    symbol: 'MON',
  },
  rpcUrls: {
    default: {
      http: ['https://testnet-rpc.monad.xyz'],
      webSocket: ['wss://testnet-rpc.monad.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Monad Vision',
      url: 'https://testnet.monadvision.com',
    },
  },
  testnet: true,
})

// 根据实际部署的网络配置
const chains = [monadTestnet] as const

export const config = getDefaultConfig({
  appName: 'Prediction Market',
  projectId: 'YOUR_PROJECT_ID', // 从 WalletConnect Cloud 获取，或者使用默认值
  chains,
  transports: {
    [monadTestnet.id]: http(),
  },
  ssr: false,
})
