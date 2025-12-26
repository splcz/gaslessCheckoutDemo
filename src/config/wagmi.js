import { createConfig, http } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { walletConnect, injected } from 'wagmi/connectors'

// 同时支持主网和测试网
export const config = createConfig({
  chains: [mainnet, sepolia],
  connectors: [
    // MetaMask 等注入式钱包
    injected(),
    // WalletConnect
    walletConnect({
      projectId: 'd7de041163a1cac34071889f8b9f7968',
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http('https://eth-sepolia.g.alchemy.com/v2/JDtZbw6v54UHv874deptO'),
  },
})

// 导出链配置供其他组件使用
export const SUPPORTED_CHAINS = {
  mainnet,
  sepolia,
}
