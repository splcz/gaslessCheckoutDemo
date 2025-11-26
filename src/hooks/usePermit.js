import { useCallback, useState } from 'react'
import { useSignTypedData, usePublicClient } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import {
  USDC_ADDRESS,
  USDC_ABI,
  USDC_DOMAIN,
  USDC_DECIMALS,
  PERMIT_TYPES,
  RELAYER_ADDRESS,
  RELAYER_API_URL,
} from '../config/usdc'

export function usePermit() {
  const { signTypedDataAsync } = useSignTypedData()
  const publicClient = usePublicClient()
  
  const [permit, setPermit] = useState(null)
  const [isSigningLoading, setIsSigningLoading] = useState(false)
  const [isPermitLoading, setIsPermitLoading] = useState(false)
  const [isTransferLoading, setIsTransferLoading] = useState(false)
  const [error, setError] = useState(null)
  const [txHash, setTxHash] = useState(null)

  // 获取用户的 permit nonce
  const getNonce = useCallback(async (owner) => {
    if (!publicClient || !owner) return 0n
    
    try {
      const nonce = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'nonces',
        args: [owner],
      })
      return nonce
    } catch (err) {
      console.error('获取 nonce 失败:', err)
      return 0n
    }
  }, [publicClient])

  // 获取当前 allowance
  const getAllowance = useCallback(async (owner, spender = RELAYER_ADDRESS) => {
    if (!publicClient || !owner) return 0n
    
    try {
      const allowance = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'allowance',
        args: [owner, spender],
      })
      return allowance
    } catch (err) {
      console.error('获取 allowance 失败:', err)
      return 0n
    }
  }, [publicClient])

  // 签署 Permit 授权
  const signPermit = useCallback(async ({
    owner,
    spender = RELAYER_ADDRESS,
    amount, // 人类可读的金额
    deadline, // Unix 时间戳
  }) => {
    setIsSigningLoading(true)
    setError(null)
    
    try {
      const value = parseUnits(amount.toString(), USDC_DECIMALS)
      const nonce = await getNonce(owner)
      
      // 默认 1 小时后过期
      const actualDeadline = deadline || BigInt(Math.floor(Date.now() / 1000) + 3600)

      const message = {
        owner,
        spender,
        value,
        nonce,
        deadline: actualDeadline,
      }

      // 使用 EIP-712 签名
      const signature = await signTypedDataAsync({
        domain: USDC_DOMAIN,
        types: PERMIT_TYPES,
        primaryType: 'Permit',
        message,
      })

      // 解析签名
      const r = `0x${signature.slice(2, 66)}`
      const s = `0x${signature.slice(66, 130)}`
      const v = parseInt(signature.slice(130, 132), 16)

      const permitData = {
        owner,
        spender,
        value,
        nonce,
        deadline: actualDeadline,
        v,
        r,
        s,
        signature,
        // 保存人类可读的金额用于显示
        amountFormatted: amount,
      }

      setPermit(permitData)
      setIsSigningLoading(false)
      
      return permitData
    } catch (err) {
      console.error('Permit 签名失败:', err)
      setError(err.message || 'Permit 签名失败')
      setIsSigningLoading(false)
      throw err
    }
  }, [signTypedDataAsync, getNonce])

  // 发送 permit 到中继服务激活额度
  const activatePermit = useCallback(async (permitData = permit) => {
    if (!permitData) {
      setError('没有 permit 签名')
      return
    }

    setIsPermitLoading(true)
    setError(null)
    setTxHash(null)

    try {
      const response = await fetch(`${RELAYER_API_URL}/permit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          owner: permitData.owner,
          spender: permitData.spender,
          value: permitData.value.toString(),
          deadline: permitData.deadline.toString(),
          v: permitData.v,
          r: permitData.r,
          s: permitData.s,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '激活 permit 失败')
      }

      setTxHash(result.hash)
      setIsPermitLoading(false)

      return result
    } catch (err) {
      console.error('激活 permit 失败:', err)
      setError(err.message || '激活 permit 失败')
      setIsPermitLoading(false)
      throw err
    }
  }, [permit])

  // 通过中继服务执行转账（在已激活的额度内）
  const transferViaRelay = useCallback(async ({
    from,
    to,
    amount, // 人类可读的金额
  }) => {
    setIsTransferLoading(true)
    setError(null)
    setTxHash(null)

    try {
      const value = parseUnits(amount.toString(), USDC_DECIMALS)

      const response = await fetch(`${RELAYER_API_URL}/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to,
          value: value.toString(),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '转账失败')
      }

      setTxHash(result.hash)
      setIsTransferLoading(false)

      return result
    } catch (err) {
      console.error('中继转账失败:', err)
      setError(err.message || '中继转账失败')
      setIsTransferLoading(false)
      throw err
    }
  }, [])

  // 清除 permit
  const clearPermit = useCallback(() => {
    setPermit(null)
    setError(null)
    setTxHash(null)
  }, [])

  // 撤销授权（签署 value=0 的 permit 并激活）
  const revokePermit = useCallback(async (owner) => {
    setIsSigningLoading(true)
    setError(null)
    setTxHash(null)
    
    try {
      const nonce = await getNonce(owner)
      // 设置较长的过期时间
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600)

      const message = {
        owner,
        spender: RELAYER_ADDRESS,
        value: 0n,
        nonce,
        deadline,
      }

      // 使用 EIP-712 签名
      const signature = await signTypedDataAsync({
        domain: USDC_DOMAIN,
        types: PERMIT_TYPES,
        primaryType: 'Permit',
        message,
      })

      // 解析签名
      const r = `0x${signature.slice(2, 66)}`
      const s = `0x${signature.slice(66, 130)}`
      const v = parseInt(signature.slice(130, 132), 16)

      setIsSigningLoading(false)
      setIsPermitLoading(true)

      // 立即激活以撤销授权
      const response = await fetch(`${RELAYER_API_URL}/permit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          owner,
          spender: RELAYER_ADDRESS,
          value: '0',
          deadline: deadline.toString(),
          v,
          r,
          s,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '撤销授权失败')
      }

      setTxHash(result.hash)
      setIsPermitLoading(false)

      return result
    } catch (err) {
      console.error('撤销授权失败:', err)
      setError(err.message || '撤销授权失败')
      setIsSigningLoading(false)
      setIsPermitLoading(false)
      throw err
    }
  }, [signTypedDataAsync, getNonce])

  return {
    permit,
    isSigningLoading,
    isPermitLoading,
    isTransferLoading,
    error,
    txHash,
    getNonce,
    getAllowance,
    signPermit,
    activatePermit,
    transferViaRelay,
    revokePermit,
    clearPermit,
    RELAYER_ADDRESS,
  }
}

