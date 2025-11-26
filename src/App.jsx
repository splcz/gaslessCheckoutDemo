import { useConnection } from 'wagmi'
import { ConnectWallet } from './components/ConnectWallet'
import { ERC3009Demo } from './components/ERC3009Demo'

function App() {
  const { isConnected } = useConnection()

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* 背景装饰 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative container mx-auto px-4 py-8 sm:py-12">
        {/* 头部 */}
        <header className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-linear-to-r from-purple-400 via-pink-400 to-cyan-400 mb-3">
            ERC-3009 Demo
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-md mx-auto">
            Gasless USDC Transfer with Authorization
          </p>
        </header>

        {/* 连接钱包区域 */}
        <div className="flex justify-center mb-8">
          <ConnectWallet />
        </div>

        {/* 主要内容 */}
        {isConnected && (
          <main className="animate-fade-in">
            <ERC3009Demo />
          </main>
        )}

        {/* 未连接时的提示 */}
        {!isConnected && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-800/50 border border-slate-700/50 mb-4">
              <svg className="w-10 h-10 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
              </svg>
            </div>
            <p className="text-slate-400 mb-2">请连接你的钱包开始使用</p>
          </div>
        )}

        {/* 页脚 */}
        <footer className="mt-12 text-center text-slate-500 text-xs">
          <p>ERC-3009: Transfer With Authorization</p>
          <p className="mt-1">
            <a 
              href="https://eip.tools/eip/3009" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-cyan-500 hover:text-cyan-400 transition-colors"
            >
              查看 ERC-3009 规范
            </a>
          </p>
        </footer>
      </div>
    </div>
  )
}

export default App
