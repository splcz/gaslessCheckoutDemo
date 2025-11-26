import { useConnection, useConnect, useDisconnect } from 'wagmi'

export function ConnectWallet() {
  const { address, isConnected, isConnecting } = useConnection()
  const { connect, connectors, isPending, error } = useConnect()
  const { disconnect } = useDisconnect()

  // 找到 WalletConnect connector
  const walletConnectConnector = connectors.find(c => c.id === 'walletConnect')

  if (isConnected) {
    return (
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/50 rounded-xl">
          <span className="text-emerald-400 text-sm font-mono">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </span>
        </div>
        <button
          onClick={() => disconnect()}
          className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 rounded-xl transition-all duration-200 text-sm font-medium"
        >
          断开连接
        </button>
      </div>
    )
  }

  const handleConnect = async () => {
    if (walletConnectConnector) {
      console.log('Connecting with WalletConnect...', walletConnectConnector)
      connect({ connector: walletConnectConnector })
    } else {
      console.error('WalletConnect connector not found. Available connectors:', connectors)
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleConnect}
        disabled={isConnecting || isPending || !walletConnectConnector}
        className="px-6 py-3 bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-medium transition-all duration-200 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isConnecting || isPending ? '连接中...' : '连接钱包'}
      </button>
      {error && (
        <p className="text-red-400 text-sm">{error.message}</p>
      )}
      {!walletConnectConnector && (
        <p className="text-yellow-400 text-sm">WalletConnect 正在初始化...</p>
      )}
    </div>
  )
}
