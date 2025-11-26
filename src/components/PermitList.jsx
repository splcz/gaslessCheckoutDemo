import { useState, useEffect, useCallback, useMemo } from 'react'
import { useConnection } from 'wagmi'
import { formatUnits } from 'viem'
import { 
  getPermitsByAddress, 
  removePermit, 
  clearExpiredPermits 
} from '../utils/permitStorage'
import { USDC_DECIMALS } from '../config/usdc'

// 辅助函数：获取并排序 permits
function getAndSortPermits(address) {
  if (!address) return []
  clearExpiredPermits()
  const stored = getPermitsByAddress(address)
  stored.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0))
  return stored
}

export function PermitList({ onSelectPermit, selectedPermit, onRefresh }) {
  const { address } = useConnection()
  const [currentTime, setCurrentTime] = useState(() => Math.floor(Date.now() / 1000))
  const [internalRefreshKey, setInternalRefreshKey] = useState(0)
  
  // 使用 useMemo 计算 permits，当 address、onRefresh 或 internalRefreshKey 变化时重新计算
  const permits = useMemo(() => {
    // 这些依赖变化时会触发重新计算
    void internalRefreshKey
    void onRefresh
    return getAndSortPermits(address)
  }, [address, onRefresh, internalRefreshKey])

  // 刷新列表（用于删除后刷新）
  const loadPermits = useCallback(() => {
    setInternalRefreshKey(k => k + 1)
  }, [])

  // 每分钟更新时间
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000))
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  // 检查是否有效
  const isValid = useCallback((permit) => {
    return currentTime < Number(permit.deadline)
  }, [currentTime])

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
    // 只有有效且未撤销的 Permit 才能选择
    const valid = isValid(permit)
    if (valid && !permit.revoked) {
      onSelectPermit?.(permit)
    }
  }

  const handleRemove = (permit, e) => {
    e.stopPropagation()
    const id = `${permit.owner.toLowerCase()}_${permit.nonce.toString()}`
    removePermit(id)
    loadPermits()
    
    // 如果删除的是当前选中的，清除选择
    if (selectedPermit && 
        `${selectedPermit.owner.toLowerCase()}_${selectedPermit.nonce.toString()}` === id) {
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

  return (
    <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold text-lg">已保存的 Permit</h3>
        <span className="text-slate-400 text-sm">{permits.length} 个</span>
      </div>

      <div className="space-y-3 max-h-80 overflow-y-auto">
        {permits.map((permit) => {
          const id = `${permit.owner.toLowerCase()}_${permit.nonce.toString()}`
          const valid = isValid(permit)
          const isSelected = selectedId === id
          const isRevoked = permit.revoked
          // 有效且未撤销的都可以选择（待激活的进入激活流程，已激活的用于转账）
          const canSelect = valid && !isRevoked
          
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
                  {/* 撤销状态 */}
                  {isRevoked ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                      已撤销
                    </span>
                  ) : (
                    /* 激活状态 */
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      permit.activated 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {permit.activated ? '已激活' : '待激活'}
                    </span>
                  )}
                  {/* 有效期状态 */}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    valid 
                      ? 'bg-blue-500/20 text-blue-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {valid ? getRemainingTime(permit.deadline) : '已过期'}
                  </span>
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
              <div className="mt-2 text-xs text-slate-400">
                <span>有效至: {new Date(Number(permit.deadline) * 1000).toLocaleString()}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
