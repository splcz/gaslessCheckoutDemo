import { useState, useEffect, useCallback, useMemo } from 'react'
import { useConnection, usePublicClient } from 'wagmi'
import { formatUnits } from 'viem'
import { 
  getPermitsByAddress, 
  removePermit, 
  clearExpiredPermits 
} from '../utils/permitStorage'
import { USDC_DECIMALS, USDC_ADDRESS, USDC_ABI, RELAYER_ADDRESS } from '../config/usdc'

export function PermitList({ onSelectPermit, selectedPermit, onRefresh }) {
  const { address } = useConnection()
  const publicClient = usePublicClient()
  const [currentTime, setCurrentTime] = useState(() => Math.floor(Date.now() / 1000))
  const [internalRefreshKey, setInternalRefreshKey] = useState(0)
  
  // 链上数据
  const [chainNonce, setChainNonce] = useState(null)
  const [chainAllowance, setChainAllowance] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  // 从链上获取 nonce 和 allowance
  const fetchChainData = useCallback(async () => {
    if (!address || !publicClient) return
    
    setIsLoading(true)
    try {
      const [nonce, allowance] = await Promise.all([
        publicClient.readContract({
          address: USDC_ADDRESS,
          abi: USDC_ABI,
          functionName: 'nonces',
          args: [address],
        }),
        publicClient.readContract({
          address: USDC_ADDRESS,
          abi: USDC_ABI,
          functionName: 'allowance',
          args: [address, RELAYER_ADDRESS],
        }),
      ])
      setChainNonce(nonce)
      setChainAllowance(allowance)
    } catch (err) {
      console.error('获取链上数据失败:', err)
    } finally {
      setIsLoading(false)
    }
  }, [address, publicClient])

  // 初始加载链上数据
  useEffect(() => {
    fetchChainData()
  }, [fetchChainData, onRefresh, internalRefreshKey])

  // 从 localStorage 获取 permits
  const permits = useMemo(() => {
    void internalRefreshKey
    void onRefresh
    if (!address) return []
    clearExpiredPermits()
    const stored = getPermitsByAddress(address)
    stored.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0))
    return stored
  }, [address, onRefresh, internalRefreshKey])

  // 判断 permit 状态（基于链上数据）
  const getPermitStatus = useCallback((permit) => {
    if (chainNonce === null) return 'loading'
    
    const permitNonce = BigInt(permit.nonce)
    const now = BigInt(currentTime)
    const deadline = BigInt(permit.deadline)
    
    // 已过期
    if (now >= deadline) {
      return 'expired'
    }
    
    // nonce 已被使用（签名已激活或已失效）
    if (permitNonce < chainNonce) {
      // 检查是否有 allowance（判断是激活还是被其他方式使用）
      if (chainAllowance && chainAllowance > 0n) {
        return 'activated'
      }
      return 'used' // nonce 已用但 allowance 为 0，可能已撤销
    }
    
    // nonce 未使用，签名待激活
    return 'pending'
  }, [chainNonce, chainAllowance, currentTime])

  // 刷新列表
  const loadPermits = useCallback(() => {
    setInternalRefreshKey(k => k + 1)
    fetchChainData()
  }, [fetchChainData])

  // 每分钟更新时间
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000))
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  // 获取剩余时间
  const getRemainingTime = useCallback((deadline) => {
    const remaining = Number(deadline) - currentTime
    if (remaining <= 0) return '已过期'
    const hours = Math.floor(remaining / 3600)
    const minutes = Math.floor((remaining % 3600) / 60)
    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days} 天`
    }
    if (hours > 0) return `${hours} 小时 ${minutes} 分钟`
    return `${minutes} 分钟`
  }, [currentTime])

  const handleSelect = (permit) => {
    const status = getPermitStatus(permit)
    // 只有待激活或已激活的可以选择
    if (status === 'pending' || status === 'activated') {
      onSelectPermit?.(permit)
    }
  }

  const handleRemove = (permit, e) => {
    e.stopPropagation()
    removePermit(permit.owner, permit.nonce)
    loadPermits()
    
    // 如果删除的是当前选中的，清除选择
    if (selectedPermit && 
        selectedPermit.owner.toLowerCase() === permit.owner.toLowerCase() &&
        selectedPermit.nonce.toString() === permit.nonce.toString()) {
      onSelectPermit?.(null)
    }
  }

  if (!address) return null

  if (permits.length === 0) {
    return (
      <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4">
        <h3 className="text-slate-300 font-medium mb-2">已保存的 Permit</h3>
        <p className="text-slate-500 text-sm">暂无保存的 Permit 签名</p>
      </div>
    )
  }

  const selectedId = selectedPermit 
    ? `${selectedPermit.owner.toLowerCase()}_${selectedPermit.nonce.toString()}`
    : null

  // 状态配置
  const statusConfig = {
    loading: { label: '加载中...', color: 'bg-slate-500/20 text-slate-400' },
    pending: { label: '待激活', color: 'bg-amber-500/20 text-amber-400' },
    activated: { label: '已激活', color: 'bg-emerald-500/20 text-emerald-400' },
    used: { label: '已失效', color: 'bg-red-500/20 text-red-400' },
    expired: { label: '已过期', color: 'bg-red-500/20 text-red-400' },
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold text-lg">已保存的 Permit</h3>
        <div className="flex items-center gap-2">
          {isLoading && (
            <svg className="animate-spin h-4 w-4 text-slate-400" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          <span className="text-slate-400 text-sm">{permits.length} 个</span>
        </div>
      </div>

      {/* 链上 allowance 显示 */}
      {chainAllowance !== null && chainAllowance > 0n && (
        <div className="mb-4 p-3 bg-emerald-900/20 border border-emerald-500/30 rounded-xl">
          <div className="flex justify-between items-center text-sm">
            <span className="text-emerald-400">链上已授权额度</span>
            <span className="text-emerald-300 font-mono font-semibold">
              {formatUnits(chainAllowance, USDC_DECIMALS)} USDC
            </span>
          </div>
        </div>
      )}

      <div className="space-y-3 max-h-80 overflow-y-auto">
        {permits.map((permit) => {
          const id = `${permit.owner.toLowerCase()}_${permit.nonce.toString()}`
          const status = getPermitStatus(permit)
          const isSelected = selectedId === id
          const canSelect = status === 'pending' || status === 'activated'
          const { label, color } = statusConfig[status]
          
          return (
            <div
              key={id}
              onClick={() => handleSelect(permit)}
              className={`
                relative p-4 rounded-xl border transition-all duration-200
                ${canSelect 
                  ? 'cursor-pointer hover:border-cyan-500/50' 
                  : 'opacity-50 cursor-not-allowed'
                }
                ${isSelected 
                  ? 'border-cyan-500 bg-cyan-500/10' 
                  : 'border-slate-600/50 bg-slate-900/50'
                }
              `}
            >
              {/* 顶部状态栏 */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {isSelected && (
                    <span className="text-cyan-400 text-xs font-medium">✓ 已选中</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* 状态标签（从链上判断） */}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${color}`}>
                    {label}
                  </span>
                  {/* 剩余时间 */}
                  {status !== 'expired' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                      {getRemainingTime(permit.deadline)}
                    </span>
                  )}
                </div>
              </div>

              {/* 金额 */}
              <div className="flex items-center justify-between">
                <span className="text-white font-semibold text-lg">
                  {formatUnits(permit.value, USDC_DECIMALS)} USDC
                </span>
                <button
                  onClick={(e) => handleRemove(permit, e)}
                  className="text-slate-500 hover:text-red-400 transition-colors p-1"
                  title="删除此 Permit"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              </div>

              {/* 详情 */}
              <div className="mt-2 text-xs text-slate-400 space-y-1">
                <div>有效至: {new Date(Number(permit.deadline) * 1000).toLocaleString()}</div>
                {permit.txHash && (
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500">交易:</span>
                    <a
                      href={`https://etherscan.io/tx/${permit.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-cyan-400 hover:text-cyan-300 font-mono truncate max-w-[180px]"
                      title={permit.txHash}
                    >
                      {permit.txHash.slice(0, 10)}...{permit.txHash.slice(-8)}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
