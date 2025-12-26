import { useCallback, useState } from 'react'
import { useSignTypedData, usePublicClient } from 'wagmi'
import { parseUnits } from 'viem'
import {
  USDC_ADDRESS,
  USDC_ABI,
  USDC_DECIMALS,
  PERMIT2_ADDRESS,
  PERMIT2_DOMAIN,
  PERMIT2_TRANSFER_TYPES,
  RELAYER_ADDRESS,
  RELAYER_API_URL,
} from '../config/usdc'

export function usePermit2() {
  const { signTypedDataAsync } = useSignTypedData()
  const publicClient = usePublicClient()
  
  const [isSigningLoading, setIsSigningLoading] = useState(false)
  const [isTransferLoading, setIsTransferLoading] = useState(false)
  const [error, setError] = useState(null)
  const [txHash, setTxHash] = useState(null)

  // 获取用户对 Permit2 的 USDC 授权额度
  const getPermit2Allowance = useCallback(async (owner) => {
    if (!publicClient || !owner) return 0n
    
    try {
      const allowance = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'allowance',
        args: [owner, PERMIT2_ADDRESS],
      })
      return allowance
    } catch (err) {
      console.error('获取 Permit2 allowance 失败:', err)
      return 0n
    }
  }, [publicClient])

  // 获取用户 USDC 余额
  const getBalance = useCallback(async (owner) => {
    if (!publicClient || !owner) return 0n
    
    try {
      const balance = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'balanceOf',
        args: [owner],
      })
      return balance
    } catch (err) {
      console.error('获取余额失败:', err)
      return 0n
    }
  }, [publicClient])

  // 签署 Permit2 并执行转账
  const signAndTransfer = useCallback(async ({
    owner,
    to,
    amount, // 人类可读的金额
    nonce, // 用户指定的 nonce
    deadline, // Unix 时间戳
  }) => {
    setIsSigningLoading(true)
    setError(null)
    setTxHash(null)
    
    try {
      const value = parseUnits(amount.toString(), USDC_DECIMALS)
      
      // 默认 1 小时后过期
      const actualDeadline = deadline || BigInt(Math.floor(Date.now() / 1000) + 3600)
      // nonce 从 0 开始，每次递增
      const actualNonce = BigInt(nonce || 0)

      const message = {
        permitted: {
          token: USDC_ADDRESS,
          amount: value,
        },
        spender: RELAYER_ADDRESS,
        nonce: actualNonce,
        deadline: actualDeadline,
      }

      // 使用 EIP-712 签名
      const signature = await signTypedDataAsync({
        domain: PERMIT2_DOMAIN,
        types: PERMIT2_TRANSFER_TYPES,
        primaryType: 'PermitTransferFrom',
        message,
      })

      setIsSigningLoading(false)
      setIsTransferLoading(true)

      // 发送到中继服务
      const response = await fetch(`${RELAYER_API_URL}/permit2/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          owner,
          to,
          amount: value.toString(),
          nonce: actualNonce.toString(),
          deadline: actualDeadline.toString(),
          signature,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Permit2 转账失败')
      }

      setTxHash(result.hash)
      setIsTransferLoading(false)

      return {
        ...result,
        nonce: actualNonce,
        deadline: actualDeadline,
        amount: value,
        amountFormatted: amount,
      }
    } catch (err) {
      console.error('Permit2 转账失败:', err)
      setError(err.message || 'Permit2 转账失败')
      setIsSigningLoading(false)
      setIsTransferLoading(false)
      throw err
    }
  }, [signTypedDataAsync])

  // 清除状态
  const clearState = useCallback(() => {
    setError(null)
    setTxHash(null)
  }, [])

  return {
    isSigningLoading,
    isTransferLoading,
    isLoading: isSigningLoading || isTransferLoading,
    error,
    txHash,
    getPermit2Allowance,
    getBalance,
    signAndTransfer,
    clearState,
    PERMIT2_ADDRESS,
    RELAYER_ADDRESS,
  }
}

