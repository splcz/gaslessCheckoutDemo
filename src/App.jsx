import { useState } from 'react'
import { useConnection } from 'wagmi'
import { ConnectWallet } from './components/ConnectWallet'
import { ERC3009Demo } from './components/ERC3009Demo'
import { PermitDemo } from './components/PermitDemo'

function App() {
  const { isConnected } = useConnection()
  const [activeTab, setActiveTab] = useState('erc3009')

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
            Gasless USDC Demo
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-md mx-auto">
            使用 ERC-3009 或 ERC-2612 实现无 Gas 转账
          </p>
        </header>

        {/* 兼容性提示横幅 */}
        <div className="max-w-lg mx-auto mb-6">
          <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl px-4 py-3 flex items-start gap-3">
            <span className="text-amber-400 mt-0.5 shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            <div className="text-sm space-y-1">
              <p className="text-amber-300 font-medium">兼容性说明（单个Layer2网络开发成本较低，当前不做多网络支持）</p>
              <ul className="text-amber-200/70 text-xs space-y-0.5 list-disc list-inside">
                <li>Demo当前仅支持 <strong className="text-amber-200">USDC</strong> 代币</li>
                <li>ERC-2612 当前仅支持 <strong className="text-amber-200">Base 主网</strong> 和 <strong className="text-amber-200">Base Sepolia 测试网</strong></li>
                <li>ERC-3009 当前仅在 <strong className="text-amber-200">Base 主网</strong> 上可用</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 连接钱包区域 */}
        <div className="flex justify-center mb-8">
          <ConnectWallet />
        </div>

        {/* Tab 切换 */}
        {isConnected && (
          <div className="flex justify-center mb-6">
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-1 flex gap-1">
              <button
                onClick={() => setActiveTab('erc3009')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === 'erc3009'
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                ERC-3009
                <span className="ml-2 text-xs opacity-70">单次授权</span>
              </button>
              <button
                onClick={() => setActiveTab('permit')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === 'permit'
                    ? 'bg-cyan-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                ERC-2612
                <span className="ml-2 text-xs opacity-70">额度授权</span>
              </button>
            </div>
          </div>
        )}

        {/* 主要内容 */}
        {isConnected && (
          <main className="animate-fade-in">
            {activeTab === 'erc3009' ? <ERC3009Demo /> : <PermitDemo />}
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
          <p>Gasless USDC Transfer Demo</p>
          <p className="mt-1 space-x-4">
            <a 
              href="https://eips.ethereum.org/EIPS/eip-3009" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-purple-500 hover:text-purple-400 transition-colors"
            >
              ERC-3009
            </a>
            <a 
              href="https://eips.ethereum.org/EIPS/eip-2612" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-cyan-500 hover:text-cyan-400 transition-colors"
            >
              ERC-2612
            </a>
          </p>
        </footer>
      </div>
    </div>
  )
}

export default App
