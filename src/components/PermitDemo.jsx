import { useState, useEffect, useCallback } from 'react'
import { useConnection } from 'wagmi'
import { formatUnits, parseUnits } from 'viem'
import { usePermit } from '../hooks/usePermit'
import { TARGET_ADDRESS, USDC_DECIMALS, USDC_ADDRESS, USDC_ABI } from '../config/usdc'
import { usePublicClient } from 'wagmi'
import { PermitList } from './PermitList'
import { savePermit, updatePermitTxHash } from '../utils/permitStorage'

export function PermitDemo() {
  const { address, isConnected } = useConnection()
  const publicClient = usePublicClient()
  const {
    isSigningLoading,
    isPermitLoading,
    isTransferLoading,
    error,
    txHash,
    getAllowance,
    signPermit,
    activatePermit,
    transferViaRelay,
    revokePermit,
    clearPermit,
    RELAYER_ADDRESS,
  } = usePermit()

  const [balance, setBalance] = useState(0n)
  const [allowance, setAllowance] = useState(0n)
  const [permitAmount, setPermitAmount] = useState('10')
  const [transferAmount, setTransferAmount] = useState('1')
  const [validityHours, setValidityHours] = useState('24')
  
  // 步骤状态：'sign' = 签名阶段, 'activate' = 激活阶段
  const [permitStep, setPermitStep] = useState('sign')
  
  // 当前待激活的 permit（刚签名的或从列表选择的）
  const [currentPermit, setCurrentPermit] = useState(null)
  
  // 用于触发列表刷新
  const [listRefreshKey, setListRefreshKey] = useState(0)
  
  // 从列表选中的 permit（用于转账）
  const [selectedPermit, setSelectedPermit] = useState(null)

  // 获取余额和 allowance
  useEffect(() => {
    if (address && publicClient) {
      // 获取余额
      publicClient.readContract({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'balanceOf',
        args: [address],
      }).then(setBalance).catch(console.error)
      
      // 获取 allowance
      getAllowance(address).then(setAllowance).catch(console.error)
    }
  }, [address, publicClient, getAllowance, txHash])

  // 刷新 allowance
  const refreshAllowance = async () => {
    if (address) {
      const newAllowance = await getAllowance(address)
      setAllowance(newAllowance)
    }
  }

  // 刷新列表
  const refreshList = useCallback(() => {
    setListRefreshKey(prev => prev + 1)
  }, [])

  // 签署 Permit
  const handleSignPermit = async () => {
    try {
      const deadline = BigInt(Math.floor(Date.now() / 1000) + parseInt(validityHours) * 3600)
      const newPermit = await signPermit({
        owner: address,
        spender: RELAYER_ADDRESS,
        amount: permitAmount,
        deadline,
      })
      
      // 保存到 localStorage
      savePermit({
        ...newPermit,
        activated: false,
      })
      
      // 设置为当前待激活的 permit
      setCurrentPermit(newPermit)
      
      // 刷新列表
      refreshList()
      
      // 进入激活步骤
      setPermitStep('activate')
    } catch (err) {
      console.error('Permit 签名失败:', err)
    }
  }

  // 激活 Permit
  const handleActivatePermit = async () => {
    if (!currentPermit) return
    
    try {
      const result = await activatePermit(currentPermit)
      await refreshAllowance()
      
      // 只保存交易哈希到 localStorage（状态从链上获取）
      if (result?.hash) {
        updatePermitTxHash(currentPermit.owner, currentPermit.nonce, result.hash)
      }
      
      // 刷新列表（会重新从链上获取状态）
      refreshList()
      
      // 回到签名步骤
      clearPermit()
      setCurrentPermit(null)
      setPermitStep('sign')
    } catch (err) {
      console.error('激活 Permit 失败:', err)
    }
  }

  // 从列表选择一个 permit
  // PermitList 已经根据链上状态过滤了，只有 pending 和 activated 的才能选择
  const handleSelectForActivation = (permit) => {
    if (!permit) return
    
    // 如果有 txHash，说明已经激活过，选中用于转账
    // 否则进入激活流程
    if (permit.txHash) {
      setSelectedPermit(permit)
    } else {
      setCurrentPermit(permit)
      setPermitStep('activate')
    }
  }

  // 取消激活，回到签名步骤
  const handleCancelActivate = () => {
    clearPermit()
    setCurrentPermit(null)
    setPermitStep('sign')
  }

  // 执行转账
  const handleTransfer = async () => {
    try {
      await transferViaRelay({
        from: address,
        to: TARGET_ADDRESS,
        amount: transferAmount,
      })
      await refreshAllowance()
      refreshList()
    } catch (err) {
      console.error('转账失败:', err)
    }
  }

  // 撤销授权
  const handleRevokePermit = async () => {
    setSelectedPermit(null)
    
    try {
      await revokePermit(address)
      await refreshAllowance()
      // 刷新列表（会重新从链上获取状态，allowance 变为 0）
      refreshList()
    } catch (err) {
      console.error('撤销授权失败:', err)
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
  const formattedAllowance = formatUnits(allowance, USDC_DECIMALS)

  return (
    <div className="w-full max-w-lg mx-auto space-y-6">
      {/* 余额和额度显示 */}
      <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-slate-400 text-sm font-medium mb-1">USDC 余额</h3>
            <p className="text-2xl font-bold text-white">
              {parseFloat(formattedBalance).toLocaleString()}
            </p>
          </div>
          <div>
            <h3 className="text-slate-400 text-sm font-medium mb-1">已授权额度</h3>
            <p className="text-2xl font-bold text-emerald-400">
              {parseFloat(formattedAllowance).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-slate-500">
            授权给中继: {RELAYER_ADDRESS.slice(0, 10)}...{RELAYER_ADDRESS.slice(-8)}
          </p>
          {allowance > 0n && (
            <button
              onClick={handleRevokePermit}
              disabled={isSigningLoading || isPermitLoading}
              className="text-xs text-orange-400 hover:text-orange-300 transition-colors disabled:opacity-50"
              title="需要钱包签名确认，Gas 由中继代付"
            >
              {isSigningLoading 
                ? '⏳ 请在钱包中确认签名...' 
                : isPermitLoading 
                  ? '📡 正在广播上链...' 
                  : '撤销授权'}
            </button>
          )}
        </div>
      </div>

      {/* Permit 流程卡片 */}
      <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-6 space-y-4">
        {/* 步骤指示器 */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className={`flex items-center gap-2 ${permitStep === 'sign' ? 'opacity-100' : 'opacity-40'}`}>
            <span className={`w-6 h-6 rounded-full text-white text-sm flex items-center justify-center font-bold ${
              permitStep === 'sign' ? 'bg-purple-500' : 'bg-slate-600'
            }`}>1</span>
            <span className={`text-sm ${permitStep === 'sign' ? 'text-purple-400' : 'text-slate-500'}`}>签名</span>
          </div>
          <div className="w-8 h-px bg-slate-600" />
          <div className={`flex items-center gap-2 ${permitStep === 'activate' ? 'opacity-100' : 'opacity-40'}`}>
            <span className={`w-6 h-6 rounded-full text-white text-sm flex items-center justify-center font-bold ${
              permitStep === 'activate' ? 'bg-emerald-500' : 'bg-slate-600'
            }`}>2</span>
            <span className={`text-sm ${permitStep === 'activate' ? 'text-emerald-400' : 'text-slate-500'}`}>激活</span>
          </div>
        </div>

        {/* 步骤 1: 签署 Permit */}
        {permitStep === 'sign' && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-white font-semibold text-lg text-center">签署 ERC-2612 Permit 授权</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-slate-400 text-sm mb-1">授权额度 (USDC)</label>
                <input
                  type="number"
                  value={permitAmount}
                  onChange={(e) => setPermitAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 transition-colors"
                  placeholder="输入授权额度"
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
            </div>

            <button
              onClick={handleSignPermit}
              disabled={isSigningLoading || !permitAmount || parseFloat(permitAmount) <= 0}
              className="w-full px-6 py-3 bg-linear-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white rounded-xl font-medium transition-all duration-200 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSigningLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  ⏳ 请在钱包中确认签名...
                </span>
              ) : '签署 Permit（链下，0 Gas）'}
            </button>

            <p className="text-xs text-slate-500 text-center">
              需要钱包签名确认（不消耗 Gas），签名后保存到本地
            </p>
          </div>
        )}

        {/* 步骤 2: 激活 Permit */}
        {permitStep === 'activate' && currentPermit && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-white font-semibold text-lg text-center">激活 Permit</h3>
            
            <div className="bg-slate-900/50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">授权额度</span>
                <span className="text-white font-mono font-semibold">
                  {currentPermit.amountFormatted || formatUnits(currentPermit.value, USDC_DECIMALS)} USDC
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">有效至</span>
                <span className="text-white font-mono">
                  {new Date(Number(currentPermit.deadline) * 1000).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">授权给</span>
                <span className="text-slate-300 font-mono text-xs">
                  {RELAYER_ADDRESS.slice(0, 10)}...{RELAYER_ADDRESS.slice(-6)}
                </span>
              </div>
            </div>

            <button
              onClick={handleActivatePermit}
              disabled={isPermitLoading}
              className="w-full px-6 py-3 bg-linear-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white rounded-xl font-medium transition-all duration-200 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPermitLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  📡 正在广播上链...
                </span>
              ) : '激活额度（中继代付 Gas）'}
            </button>

            <button
              onClick={handleCancelActivate}
              disabled={isPermitLoading}
              className="w-full px-4 py-2 text-slate-400 hover:text-white text-sm transition-colors"
            >
              ← 返回
            </button>

            <p className="text-xs text-emerald-400 text-center">
              ✨ 激活后，额度生效，可进行转账
            </p>
          </div>
        )}
      </div>

      {/* Permit 列表 */}
      <PermitList 
        onSelectPermit={handleSelectForActivation}
        selectedPermit={selectedPermit}
        onRefresh={listRefreshKey}
      />

      {/* 额度内转账（选中已激活的 Permit 时显示） */}
      {selectedPermit && (
        <div className="bg-cyan-900/30 backdrop-blur border border-cyan-500/30 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-cyan-500 text-white text-sm flex items-center justify-center font-bold">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </span>
              <h3 className="text-cyan-400 font-semibold">额度内转账</h3>
            </div>
            <button
              onClick={() => setSelectedPermit(null)}
              className="text-slate-400 hover:text-white text-sm"
            >
              取消选择
            </button>
          </div>

          {/* 选中的 Permit 信息 */}
          <div className="bg-slate-800/50 rounded-xl p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">已选中 Permit 额度</span>
              <span className="text-white font-mono font-semibold">
                {formatUnits(selectedPermit.value, USDC_DECIMALS)} USDC
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">链上可用额度</span>
              <span className="text-emerald-400 font-mono font-semibold">
                {parseFloat(formattedAllowance).toLocaleString()} USDC
              </span>
            </div>
          </div>
          
          <div>
            <label className="block text-slate-400 text-sm mb-1">转账金额 (USDC)</label>
            <input
              type="number"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
              placeholder="输入转账金额"
              min="0"
              step="0.01"
              max={formattedAllowance}
            />
          </div>

          <div>
            <label className="block text-slate-400 text-sm mb-1">目标地址</label>
            <div className="px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-slate-400 text-sm font-mono break-all">
              {TARGET_ADDRESS}
            </div>
          </div>

          <button
            onClick={handleTransfer}
            disabled={isTransferLoading || !transferAmount || parseFloat(transferAmount) <= 0 || parseUnits(transferAmount, USDC_DECIMALS) > allowance}
            className="w-full px-6 py-3 bg-linear-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-medium transition-all duration-200 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTransferLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                📡 正在广播上链...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                🚀 Gasless 转账（用户无需操作）
              </span>
            )}
          </button>

          <p className="text-xs text-cyan-400 text-center">
            ✨ 在已授权额度内，用户无需任何操作，中继直接执行转账
          </p>
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
            href={`https://etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 text-sm font-mono break-all underline"
          >
            {txHash}
          </a>
        </div>
      )}

      {/* 说明信息 */}
      <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4 space-y-4">
        <div>
          <h4 className="text-slate-300 font-medium mb-2">关于 ERC-2612 Permit</h4>
          <ul className="text-slate-400 text-sm space-y-1.5 list-disc list-inside">
            <li>
              <a href="https://eips.ethereum.org/EIPS/eip-2612" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">ERC-2612</a> 
              {' '}是对 ERC-20 的扩展，允许通过签名（而非链上交易）来授权代币支出
            </li>
            <li>传统的 <code className="text-pink-400 bg-slate-800 px-1 rounded">approve()</code> 需要一次链上交易（用户付 Gas）</li>
            <li>Permit 签名是<strong className="text-emerald-400">链下操作（0 Gas）</strong>，签名后由他人提交上链</li>
            <li>签名后设置链上 <code className="text-pink-400 bg-slate-800 px-1 rounded">allowance</code>，授权 spender 可调用 <code className="text-pink-400 bg-slate-800 px-1 rounded">transferFrom()</code></li>
          </ul>
        </div>

        <div>
          <h4 className="text-slate-300 font-medium mb-2">ERC-2612 vs ERC-3009 对比</h4>
          <div className="text-slate-400 text-sm space-y-1.5">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-slate-500">特性</div>
              <div className="text-purple-400">ERC-3009</div>
              <div className="text-cyan-400">ERC-2612</div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>授权方式</div>
              <div>单次转账授权</div>
              <div>额度授权</div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>使用次数</div>
              <div>一次性</div>
              <div>额度内多次</div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>适用场景</div>
              <div>一次性大额转账</div>
              <div>订阅/多次小额</div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-slate-300 font-medium mb-2">撤销授权</h4>
          <ul className="text-slate-400 text-sm space-y-1.5 list-disc list-inside">
            <li>点击<strong className="text-orange-400">「撤销授权」</strong>可将 allowance 设为 0</li>
            <li>撤销原理：签署一个 <code className="text-pink-400 bg-slate-800 px-1 rounded">value=0</code> 的 Permit 并激活</li>
            <li><strong className="text-amber-400">需要钱包签名确认</strong>（弹出钱包授权请求）</li>
            <li>Gas 费用由中继代付，用户无需持有 ETH</li>
            <li>撤销后，中继无法再代为转账，直到重新授权</li>
          </ul>
        </div>

        <div>
          <h4 className="text-slate-300 font-medium mb-2">安全提示</h4>
          <ul className="text-slate-400 text-sm space-y-1.5 list-disc list-inside">
            <li><strong className="text-amber-400">签名前确认 spender 地址</strong>：只授权给信任的地址</li>
            <li>设置合理的授权额度，避免授权过大金额</li>
            <li>不再使用时及时撤销授权</li>
            <li>Permit 签名有 deadline 过期时间，过期后签名失效</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
