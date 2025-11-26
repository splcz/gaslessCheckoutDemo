import { useState, useEffect, useCallback } from 'react'
import { useConnection } from 'wagmi'
import { formatUnits } from 'viem'
import { 
  getAuthorizationsByAddress, 
  removeAuthorization, 
  clearExpiredAuthorizations 
} from '../utils/authStorage'
import { USDC_DECIMALS } from '../config/usdc'

export function AuthorizationList({ onSelectAuth, isLoading, selectedAuth }) {
  const { address } = useConnection()
  const [authorizations, setAuthorizations] = useState([])

  // 加载授权列表
  const loadAuthorizations = useCallback(() => {
    if (!address) {
      setAuthorizations([])
      return
    }
    
    // 先清理过期的授权
    clearExpiredAuthorizations()
    
    // 获取当前地址的授权
    const auths = getAuthorizationsByAddress(address)
    setAuthorizations(auths)
  }, [address])

  // 初始加载和定时刷新
  useEffect(() => {
    loadAuthorizations()
    
    // 每30秒刷新一次列表
    const interval = setInterval(loadAuthorizations, 30000)
    return () => clearInterval(interval)
  }, [loadAuthorizations])

  // 检查授权是否有效
  const isValid = (auth) => {
    const now = BigInt(Math.floor(Date.now() / 1000))
    return now >= auth.validAfter && now < auth.validBefore
  }

  // 获取剩余时间
  const getRemainingTime = (validBefore) => {
    const now = Math.floor(Date.now() / 1000)
    const remaining = Number(validBefore) - now
    
    if (remaining <= 0) return '已过期'
    
    const hours = Math.floor(remaining / 3600)
    const minutes = Math.floor((remaining % 3600) / 60)
    
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`
    }
    return `${minutes}分钟`
  }

  // 当前选中的 nonce
  const selectedNonce = selectedAuth?.nonce || null

  // 选择授权
  const handleSelect = (auth) => {
    onSelectAuth?.(auth)
  }

  // 删除授权
  const handleRemove = (nonce, e) => {
    e.stopPropagation()
    removeAuthorization(nonce)
    loadAuthorizations()
    if (selectedNonce === nonce) {
      onSelectAuth?.(null)
    }
  }

  if (!address) {
    return null
  }

  if (authorizations.length === 0) {
    return (
      <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4">
        <h3 className="text-slate-300 font-medium mb-2">已保存的授权</h3>
        <p className="text-slate-500 text-sm">暂无保存的授权签名</p>
      </div>
    )
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold text-lg">已保存的授权</h3>
        <span className="text-slate-400 text-sm">{authorizations.length} 个</span>
      </div>

      <div className="space-y-3 max-h-80 overflow-y-auto">
        {authorizations.map((auth) => {
          const valid = isValid(auth)
          const isSelected = selectedNonce === auth.nonce
          
          return (
            <div
              key={auth.nonce}
              onClick={() => valid && handleSelect(auth)}
              className={`
                relative p-4 rounded-xl border transition-all duration-200
                ${valid 
                  ? 'cursor-pointer hover:border-purple-500/50' 
                  : 'opacity-50 cursor-not-allowed'
                }
                ${isSelected 
                  ? 'border-purple-500 bg-purple-500/10' 
                  : 'border-slate-600/50 bg-slate-900/50'
                }
              `}
            >
              <div className="space-y-2">
                {/* 金额和状态标签 */}
                <div className="flex items-center justify-between">
                  <span className="text-white font-semibold text-lg">
                    {formatUnits(auth.value, USDC_DECIMALS)} USDC
                  </span>
                  <div className="flex items-center gap-2">
                    {isSelected && (
                      <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-400">
                        已选中
                      </span>
                    )}
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      valid 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {valid ? '有效' : '已过期'}
                    </span>
                  </div>
                </div>

                {/* 目标地址 */}
                <div className="text-slate-400 text-xs">
                  <span className="text-slate-500">转账至: </span>
                  <span className="font-mono">{auth.to.slice(0, 10)}...{auth.to.slice(-8)}</span>
                </div>

                {/* 剩余时间 */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    剩余: <span className={valid ? 'text-cyan-400' : 'text-red-400'}>
                      {getRemainingTime(auth.validBefore)}
                    </span>
                  </span>
                  
                  {/* 删除按钮 */}
                  <button
                    onClick={(e) => handleRemove(auth.nonce, e)}
                    className="text-slate-500 hover:text-red-400 transition-colors"
                    title="删除此授权"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                {/* Nonce (调试用) */}
                <div className="text-slate-600 text-xs font-mono truncate" title={auth.nonce}>
                  nonce: {auth.nonce.slice(0, 18)}...
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 提示 */}
      <p className="text-xs text-slate-500 mt-4 text-center">
        点击选择一个有效授权，然后执行 Gasless 转账
      </p>
    </div>
  )
}

