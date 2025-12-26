import { useState, useEffect, useCallback } from 'react'
import { useConnection } from 'wagmi'
import { formatUnits } from 'viem'
import { useERC3009 } from '../hooks/useERC3009'
import { AuthorizationList } from './AuthorizationList'
import { TARGET_ADDRESS, USDC_DECIMALS, getTxUrl } from '../config/usdc'
import { removeAuthorization } from '../utils/authStorage'

export function ERC3009Demo() {
  const { address, isConnected, chain } = useConnection()
  const chainId = chain?.id || 11155111 // 默认 Sepolia
  const {
    authorization,
    isSigningLoading,
    isTransferLoading,
    isRelayLoading,
    isCancelLoading,
    error,
    txHash,
    getBalance,
    signTransferAuthorization,
    executeTransfer,
    executeTransferViaRelay,
    cancelAuthorization,
    clearAuthorization,
  } = useERC3009()

  const [balance, setBalance] = useState(0n)
  const [amount, setAmount] = useState('1')
  const [validityHours, setValidityHours] = useState('1')
  const [selectedAuth, setSelectedAuth] = useState(null)
  const [listKey, setListKey] = useState(0) // 用于刷新列表

  // 获取余额
  useEffect(() => {
    if (address) {
      getBalance(address).then(setBalance)
    }
  }, [address, getBalance, txHash])

  // 当新签名完成时，刷新列表
  useEffect(() => {
    if (authorization) {
      setListKey(k => k + 1)
    }
  }, [authorization])

  // 处理签名
  const handleSign = async () => {
    try {
      const validBefore = Math.floor(Date.now() / 1000) + parseInt(validityHours) * 3600
      await signTransferAuthorization({
        from: address,
        to: TARGET_ADDRESS,
        amount,
        validBefore,
      })
    } catch (err) {
      console.error('签名失败:', err)
    }
  }

  // 处理转账 - 使用选中的授权或当前授权
  const handleTransfer = async () => {
    const authToUse = selectedAuth || authorization
    if (!authToUse) return
    
    try {
      await executeTransfer(authToUse)
      // 转账成功后，从 localStorage 删除并刷新列表
      removeAuthorization(authToUse.nonce)
      setSelectedAuth(null)
      setListKey(k => k + 1)
    } catch (err) {
      console.error('转账失败:', err)
    }
  }

  // 处理取消授权
  const handleCancel = async () => {
    const authToUse = selectedAuth || authorization
    if (!authToUse) return
    
    try {
      await cancelAuthorization(authToUse)
      // 取消成功后，从 localStorage 删除并刷新列表
      removeAuthorization(authToUse.nonce)
      setSelectedAuth(null)
      setListKey(k => k + 1)
    } catch (err) {
      console.error('取消授权失败:', err)
    }
  }

  // 通过中继服务转账 (Gasless)
  const handleRelayTransfer = async () => {
    const authToUse = selectedAuth || authorization
    if (!authToUse) return
    
    try {
      await executeTransferViaRelay(authToUse)
      // 转账成功后，从 localStorage 删除并刷新列表
      removeAuthorization(authToUse.nonce)
      setSelectedAuth(null)
      setListKey(k => k + 1)
    } catch (err) {
      console.error('中继转账失败:', err)
    }
  }

  // 处理从列表选择授权
  const handleSelectAuth = useCallback((auth) => {
    setSelectedAuth(auth)
    // 如果选择了列表中的授权，清除当前新签名的授权状态
    if (auth) {
      clearAuthorization()
    }
  }, [clearAuthorization])

  if (!isConnected) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-400">请先连接钱包</p>
      </div>
    )
  }

  const formattedBalance = formatUnits(balance, USDC_DECIMALS)
  const activeAuth = selectedAuth || authorization

  return (
    <div className="w-full max-w-lg mx-auto space-y-6">
      {/* 余额显示 */}
      <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-6">
        <h3 className="text-slate-400 text-sm font-medium mb-2">USDC 余额</h3>
        <p className="text-3xl font-bold text-white">
          {parseFloat(formattedBalance).toLocaleString()} <span className="text-lg text-slate-400">USDC</span>
        </p>
      </div>

      {/* 已保存的授权列表 */}
      <AuthorizationList 
        key={listKey}
        onSelectAuth={handleSelectAuth}
        selectedAuth={selectedAuth}
      />

      {/* 签名设置 */}
      <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-6 space-y-4">
        <h3 className="text-white font-semibold text-lg">新建授权签名</h3>
        
        <div className="space-y-3">
          <div>
            <label className="block text-slate-400 text-sm mb-1">转账金额 (USDC)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 transition-colors"
              placeholder="输入金额"
              min="0"
              step="0.01"
            />
          </div>
          
          <div>
            <label className="block text-slate-400 text-sm mb-1">有效期 (小时)</label>
            <input
              type="number"
              value={validityHours}
              onChange={(e) => setValidityHours(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 transition-colors"
              placeholder="有效期小时数"
              min="1"
            />
          </div>
          
          <div>
            <label className="block text-slate-400 text-sm mb-1">目标地址</label>
            <div className="px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-slate-400 text-sm font-mono break-all">
              {TARGET_ADDRESS}
            </div>
          </div>
        </div>

        <button
          onClick={handleSign}
          disabled={isSigningLoading || !amount || parseFloat(amount) <= 0}
          className="w-full px-6 py-3 bg-linear-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-medium transition-all duration-200 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSigningLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              签名中...
            </span>
          ) : '签名授权（仅保存到浏览器缓存）'}
        </button>
      </div>

      {/* 当前选中/新签名的授权操作 */}
      {activeAuth && (
        <div className={`backdrop-blur border rounded-2xl p-6 space-y-4 ${
          selectedAuth 
            ? 'bg-purple-900/30 border-purple-500/30' 
            : 'bg-emerald-900/30 border-emerald-500/30'
        }`}>
          <div className="flex items-center justify-between">
            <h3 className={`font-semibold ${selectedAuth ? 'text-purple-400' : 'text-emerald-400'}`}>
              {selectedAuth ? '📋 已选择授权' : '✓ 新授权已签名'}
            </h3>
            <button
              onClick={() => {
                setSelectedAuth(null)
                clearAuthorization()
              }}
              className="text-slate-400 hover:text-white text-sm"
            >
              清除选择
            </button>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">金额</span>
              <span className="text-white font-mono">
                {formatUnits(activeAuth.value, USDC_DECIMALS)} USDC
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">有效至</span>
              <span className="text-white font-mono">
                {new Date(Number(activeAuth.validBefore) * 1000).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">目标地址</span>
              <span className="text-white font-mono text-xs">
                {activeAuth.to.slice(0, 10)}...{activeAuth.to.slice(-8)}
              </span>
            </div>
          </div>

          {/* Gasless 转账 - 通过中继服务 */}
          <button
            onClick={handleRelayTransfer}
            disabled={isTransferLoading || isRelayLoading || isCancelLoading}
            className="w-full px-6 py-3 bg-linear-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-xl font-medium transition-all duration-200 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRelayLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                中继转账中...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                🚀 Gasless 转账（通过中继服务）
              </span>
            )}
          </button>
          
          <p className="text-xs text-emerald-400 text-center">
            ✨ 用户无需支付 Gas，由中继服务代付
          </p>

          <div className="border-t border-slate-600/50 pt-4 mt-2">
            <p className="text-xs text-slate-500 text-center mb-3">或者自己支付 Gas：</p>
            <div className="flex gap-3">
              <button
                onClick={handleTransfer}
                disabled={isTransferLoading || isRelayLoading || isCancelLoading}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTransferLoading ? '转账中...' : '自己执行转账'}
              </button>
              
              <button
                onClick={handleCancel}
                disabled={isTransferLoading || isRelayLoading || isCancelLoading}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-orange-400 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCancelLoading ? '取消中...' : '取消授权'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* 交易成功提示 */}
      {txHash && (
        <div className="bg-emerald-900/30 border border-emerald-500/30 rounded-xl p-4">
          <p className="text-emerald-400 text-sm mb-2">交易已提交！</p>
          <a
            href={getTxUrl(chainId, txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 text-sm font-mono break-all underline"
          >
            {txHash}
          </a>
        </div>
      )}

      {/* 说明信息 */}
      <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4">
        <h4 className="text-slate-300 font-medium mb-2">关于 ERC-3009</h4>
        <ul className="text-slate-400 text-sm space-y-1 list-disc list-inside">
          <li>ERC-3009 允许用户签署链下授权（不消耗 Gas）</li>
          <li>授权签名后，持有签名的人可以提交交易执行转账</li>
          <li>签名包含有效期限制，过期后授权自动失效</li>
          <li>每个签名有唯一 nonce，只能使用一次</li>
          <li><strong className="text-cyan-400">授权保存在浏览器 localStorage</strong>，有效期内可随时使用</li>
        </ul>
        
        <h4 className="text-slate-300 font-medium mt-4 mb-2">关于取消授权</h4>
        <ul className="text-slate-400 text-sm space-y-1 list-disc list-inside">
          <li><strong className="text-emerald-400">签名未泄露</strong>：直接忽略即可，等过期自动失效，无需任何操作</li>
          <li><strong className="text-orange-400">签名已泄露</strong>：需链上调用 cancelAuthorization，将该 nonce 标记为"已使用"，使签名作废（需 Gas）</li>
        </ul>
      </div>
    </div>
  )
}
