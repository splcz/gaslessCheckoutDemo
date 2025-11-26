import { createConfig, http } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { walletConnect } from 'wagmi/connectors'

export const config = createConfig({
  chains: [mainnet],
  connectors: [
    walletConnect({
      projectId: 'd7de041163a1cac34071889f8b9f7968',
    }),
  ],
  transports: {
    [mainnet.id]: http(),
  },
})
