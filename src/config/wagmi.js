import { createConfig, http } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'
import { walletConnect, injected } from 'wagmi/connectors'

// 同时支持 Base 主网和 Base Sepolia 测试网
export const config = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    // MetaMask 等注入式钱包
    injected(),
    // WalletConnect
    walletConnect({
      projectId: 'd7de041163a1cac34071889f8b9f7968',
    }),
  ],
  transports: {
    [base.id]: http('https://mainnet.base.org'),
    [baseSepolia.id]: http('https://sepolia.base.org'),
  },
})

// 导出链配置供其他组件使用
export const SUPPORTED_CHAINS = {
  base,
  baseSepolia,
}
