import { useState, useEffect, useCallback } from 'react'
import { useConnection, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { formatUnits, parseUnits, maxUint256 } from 'viem'
import { usePermit2 } from '../hooks/usePermit2'
import { TARGET_ADDRESS, USDC_DECIMALS, USDC_ADDRESS, USDC_ABI, PERMIT2_ADDRESS } from '../config/usdc'

export function Permit2Demo() {
  const { address, isConnected } = useConnection()
  const {
    isSigningLoading,
    isTransferLoading,
    isLoading,
    error,
    txHash,
    getPermit2Allowance,
    getBalance,
    signAndTransfer,
    clearState,
    RELAYER_ADDRESS,
  } = usePermit2()

  const [balance, setBalance] = useState(0n)
  const [permit2Allowance, setPermit2Allowance] = useState(0n)
  const [transferAmount, setTransferAmount] = useState('1')
  const [nonce, setNonce] = useState('0')
  const [validityHours, setValidityHours] = useState('1')
  const [txHistory, setTxHistory] = useState([])

  // approve USDC 给 Permit2
  const { 
    writeContract: approvePermit2, 
    data: approveHash,
    isPending: isApproving,
  } = useWriteContract()

  const { isLoading: isApproveConfirming, isSuccess: isApproveConfirmed } = useWaitForTransactionReceipt({
    hash: approveHash,
  })

  // 获取余额和 Permit2 allowance
  const refreshData = useCallback(async () => {
    if (address) {
      const [bal, allowance] = await Promise.all([
        getBalance(address),
        getPermit2Allowance(address),
      ])
      setBalance(bal)
      setPermit2Allowance(allowance)
    }
  }, [address, getBalance, getPermit2Allowance])

  useEffect(() => {
    refreshData()
  }, [refreshData, txHash, isApproveConfirmed])

  // 授权 USDC 给 Permit2
  const handleApprovePermit2 = async () => {
    try {
      approvePermit2({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [PERMIT2_ADDRESS, maxUint256],
      })
    } catch (err) {
      console.error('授权失败:', err)
    }
  }

  // 执行 Permit2 转账
  const handleTransfer = async () => {
    try {
      const deadline = BigInt(Math.floor(Date.now() / 1000) + parseInt(validityHours) * 3600)
      const result = await signAndTransfer({
        owner: address,
        to: TARGET_ADDRESS,
        amount: transferAmount,
        nonce,
        deadline,
      })
      
      // 添加到历史记录
      setTxHistory(prev => [{
        hash: result.hash,
        amount: transferAmount,
        to: TARGET_ADDRESS,
        timestamp: Date.now(),
        nonce,
      }, ...prev.slice(0, 4)])
      
      // 递增 nonce
      setNonce(prev => (parseInt(prev) + 1).toString())
      
      // 刷新数据
      await refreshData()
    } catch (err) {
      console.error('转账失败:', err)
    }
  }

  if (!isConnected) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-400">请先连接钱包</p>
      </div>
    )
  }

  const formattedBalance = formatUnits(balance, USDC_DECIMALS)
  const formattedAllowance = formatUnits(permit2Allowance, USDC_DECIMALS)
  const needsApproval = permit2Allowance === 0n
  const hasEnoughAllowance = permit2Allowance >= parseUnits(transferAmount || '0', USDC_DECIMALS)

  return (
    <div className="w-full max-w-lg mx-auto space-y-6">
      {/* 余额和 Permit2 状态 */}
      <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-full">
            ✅ 推荐
          </span>
          <span className="text-slate-400 text-sm">Permit2 - 行业标准，已审计</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-slate-400 text-sm font-medium mb-1">USDC 余额</h3>
            <p className="text-2xl font-bold text-white">
              {parseFloat(formattedBalance).toLocaleString()}
            </p>
          </div>
          <div>
            <h3 className="text-slate-400 text-sm font-medium mb-1">Permit2 授权</h3>
            <p className={`text-2xl font-bold ${needsApproval ? 'text-orange-400' : 'text-emerald-400'}`}>
              {needsApproval ? '未授权' : '✓ 已授权'}
            </p>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t border-slate-700/50">
          <p className="text-xs text-slate-500">
            Permit2 合约: {PERMIT2_ADDRESS.slice(0, 10)}...{PERMIT2_ADDRESS.slice(-8)}
          </p>
        </div>
      </div>

      {/* 步骤 1: 授权 Permit2（如需要）*/}
      {needsApproval && (
        <div className="bg-orange-900/30 backdrop-blur border border-orange-500/30 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-sm flex items-center justify-center font-bold">1</span>
            <h3 className="text-orange-400 font-semibold">首次使用：授权 Permit2</h3>
          </div>
          
          <p className="text-slate-400 text-sm">
            需要先授权 USDC 给 Permit2 合约（一次性操作，链上交易）
          </p>

          <button
            onClick={handleApprovePermit2}
            disabled={isApproving || isApproveConfirming}
            className="w-full px-6 py-3 bg-linear-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl font-medium transition-all duration-200 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isApproving ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                请在钱包中确认...
              </span>
            ) : isApproveConfirming ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                等待确认...
              </span>
            ) : '授权 USDC 给 Permit2（需付 Gas）'}
          </button>

          <p className="text-xs text-slate-500 text-center">
            ⚠️ 这是唯一需要用户付 Gas 的操作，之后所有转账都是 Gasless
          </p>
        </div>
      )}

      {/* 步骤 2: Permit2 转账 */}
      <div className={`bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-6 space-y-4 ${needsApproval ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="flex items-center gap-2">
          <span className={`w-6 h-6 rounded-full text-white text-sm flex items-center justify-center font-bold ${needsApproval ? 'bg-slate-600' : 'bg-emerald-500'}`}>
            {needsApproval ? '2' : '✓'}
          </span>
          <h3 className="text-white font-semibold">Permit2 Gasless 转账</h3>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-slate-400 text-sm mb-1">转账金额 (USDC)</label>
            <input
              type="number"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
              placeholder="输入转账金额"
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-sm mb-1">目标地址</label>
            <div className="px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-slate-400 text-sm font-mono break-all">
              {TARGET_ADDRESS}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 text-sm mb-1">Nonce</label>
              <input
                type="number"
                value={nonce}
                onChange={(e) => setNonce(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                placeholder="0"
                min="0"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-1">有效期 (小时)</label>
              <input
                type="number"
                value={validityHours}
                onChange={(e) => setValidityHours(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                placeholder="1"
                min="1"
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleTransfer}
          disabled={isLoading || !transferAmount || parseFloat(transferAmount) <= 0 || needsApproval}
          className="w-full px-6 py-3 bg-linear-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white rounded-xl font-medium transition-all duration-200 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSigningLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              ⏳ 请在钱包中签名...
            </span>
          ) : isTransferLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              📡 正在广播上链...
            </span>
          ) : '🚀 Gasless 转账（签名即转账）'}
        </button>

        <p className="text-xs text-emerald-400 text-center">
          ✨ 用户签名后直接完成转账，无需额外操作
        </p>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400 text-sm">{error}</p>
          <button
            onClick={clearState}
            className="text-red-300 text-xs mt-2 hover:underline"
          >
            清除错误
          </button>
        </div>
      )}

      {/* 交易成功提示 */}
      {txHash && (
        <div className="bg-emerald-900/30 border border-emerald-500/30 rounded-xl p-4">
          <p className="text-emerald-400 text-sm mb-2">✅ 交易已确认！</p>
          <a
            href={`https://etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 text-sm font-mono break-all underline"
          >
            {txHash}
          </a>
        </div>
      )}

      {/* 交易历史 */}
      {txHistory.length > 0 && (
        <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4">
          <h4 className="text-slate-300 font-medium mb-3">最近交易</h4>
          <div className="space-y-2">
            {txHistory.map((tx, index) => (
              <div key={tx.hash} className="flex items-center justify-between text-sm">
                <span className="text-slate-400">
                  {tx.amount} USDC → {tx.to.slice(0, 8)}...
                </span>
                <a
                  href={`https://etherscan.io/tx/${tx.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 text-xs font-mono"
                >
                  {tx.hash.slice(0, 10)}...
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 说明信息 */}
      <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4 space-y-4">
        <div>
          <h4 className="text-slate-300 font-medium mb-2">关于 Permit2</h4>
          <ul className="text-slate-400 text-sm space-y-1.5 list-disc list-inside">
            <li>
              <a href="https://github.com/Uniswap/permit2" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">Permit2</a> 
              {' '}是 Uniswap 开发的行业标准合约，已通过多次安全审计
            </li>
            <li>被 100+ 个 DeFi 协议采用（1inch, Cowswap, Matcha 等）</li>
            <li>用户只需授权一次 Permit2，之后所有转账都是 Gasless</li>
            <li>每次转账只需一次签名，签名即完成转账</li>
          </ul>
        </div>

        <div>
          <h4 className="text-slate-300 font-medium mb-2">Permit2 vs ERC-2612 Permit 对比</h4>
          <div className="text-slate-400 text-sm space-y-1.5">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-slate-500">特性</div>
              <div className="text-emerald-400">Permit2 ✓</div>
              <div className="text-cyan-400">ERC-2612</div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>钱包警告</div>
              <div>❌ 无警告</div>
              <div>⚠️ EOA 警告</div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>安全审计</div>
              <div>✅ 多次审计</div>
              <div>取决于实现</div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>行业标准</div>
              <div>✅ 100+ 协议</div>
              <div>部分支持</div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>用户体验</div>
              <div>签名即转账</div>
              <div>签名+激活</div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-slate-300 font-medium mb-2">Nonce 说明</h4>
          <ul className="text-slate-400 text-sm space-y-1.5 list-disc list-inside">
            <li>Permit2 的 nonce 从 0 开始递增</li>
            <li>每个地址独立计数，用于防止签名重放</li>
            <li>如果签名失败，可能需要检查 nonce 是否正确</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

