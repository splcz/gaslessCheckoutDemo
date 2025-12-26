import { useConnection, useConnect, useDisconnect } from 'wagmi'
import { SUPPORTED_CHAIN_IDS, NETWORK_CONFIG } from '../config/usdc'

export function ConnectWallet() {
  const { address, isConnected, isConnecting, chain } = useConnection()
  const { connect, connectors, isPending, error } = useConnect()
  const { disconnect } = useDisconnect()

  // 找到可用的 connectors
  const injectedConnector = connectors.find(c => c.id === 'injected')
  const walletConnectConnector = connectors.find(c => c.id === 'walletConnect')

  if (isConnected) {
    // 检查链是否在支持列表中
    const isSupportedChain = SUPPORTED_CHAIN_IDS.includes(chain?.id)
    const networkConfig = NETWORK_CONFIG[chain?.id]

    return (
      <div className="flex flex-col items-center gap-3">
        {!isSupportedChain && (
          <div className="px-4 py-2 bg-yellow-500/20 border border-yellow-500/50 rounded-xl">
            <span className="text-yellow-400 text-sm">
              ⚠️ 不支持的网络，请切换到 Mainnet 或 Sepolia
            </span>
          </div>
        )}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className={`px-4 py-2 rounded-xl ${
            isSupportedChain 
              ? 'bg-emerald-500/20 border border-emerald-500/50' 
              : 'bg-yellow-500/20 border border-yellow-500/50'
          }`}>
            <span className={`text-sm font-mono ${isSupportedChain ? 'text-emerald-400' : 'text-yellow-400'}`}>
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </span>
            <span className={`text-xs ml-2 ${isSupportedChain ? 'text-slate-400' : 'text-yellow-300'}`}>
              ({networkConfig?.name || chain?.name || 'Unknown'})
            </span>
          </div>
          <button
            onClick={() => disconnect()}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 rounded-xl transition-all duration-200 text-sm font-medium"
          >
            断开连接
          </button>
        </div>
      </div>
    )
  }

  const handleConnect = async (connector) => {
    console.log('Connecting with:', connector.name)
    connect({ connector })
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-slate-400 text-sm mb-2">
        支持网络: <span className="text-cyan-400">Mainnet</span> / <span className="text-purple-400">Sepolia</span>
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {/* MetaMask / 注入式钱包 */}
        {injectedConnector && (
          <button
            onClick={() => handleConnect(injectedConnector)}
            disabled={isConnecting || isPending}
            className="px-6 py-3 bg-linear-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white rounded-xl font-medium transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConnecting || isPending ? '连接中...' : '🦊 MetaMask'}
          </button>
        )}
        {/* WalletConnect */}
        {walletConnectConnector && (
          <button
            onClick={() => handleConnect(walletConnectConnector)}
            disabled={isConnecting || isPending}
            className="px-6 py-3 bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-medium transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConnecting || isPending ? '连接中...' : '🔗 WalletConnect'}
          </button>
        )}
      </div>
      {error && (
        <p className="text-red-400 text-sm">{error.message}</p>
      )}
    </div>
  )
}
