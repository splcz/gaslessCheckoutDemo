import { useCallback, useState } from 'react'
import { useSignTypedData, usePublicClient, useWalletClient } from 'wagmi'
import { parseUnits, toHex } from 'viem'
import {
  USDC_ADDRESS,
  USDC_ABI,
  USDC_DOMAIN,
  USDC_DECIMALS,
  TRANSFER_WITH_AUTHORIZATION_TYPES,
  CANCEL_AUTHORIZATION_TYPES,
  TARGET_ADDRESS,
} from '../config/usdc'
import { saveAuthorization } from '../utils/authStorage'

// 生成随机 nonce (32 bytes)
export function generateNonce() {
  const randomBytes = new Uint8Array(32)
  crypto.getRandomValues(randomBytes)
  return toHex(randomBytes)
}

export function useERC3009() {
  const { signTypedDataAsync } = useSignTypedData()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  
  const [authorization, setAuthorization] = useState(null)
  const [isSigningLoading, setIsSigningLoading] = useState(false)
  const [isTransferLoading, setIsTransferLoading] = useState(false)
  const [isRelayLoading, setIsRelayLoading] = useState(false)
  const [isCancelLoading, setIsCancelLoading] = useState(false)
  const [error, setError] = useState(null)
  const [txHash, setTxHash] = useState(null)

  // 获取 USDC 余额
  const getBalance = useCallback(async (address) => {
    if (!publicClient || !address) return 0n
    
    try {
      const balance = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'balanceOf',
        args: [address],
      })
      return balance
    } catch (err) {
      console.error('获取余额失败:', err)
      return 0n
    }
  }, [publicClient])

  // 签署 transferWithAuthorization
  const signTransferAuthorization = useCallback(async ({
    from,
    to = TARGET_ADDRESS,
    amount, // 人类可读的金额，如 "10" 表示 10 USDC
    validAfter = 0, // 立即生效
    validBefore, // 过期时间戳
  }) => {
    setIsSigningLoading(true)
    setError(null)
    
    try {
      const value = parseUnits(amount.toString(), USDC_DECIMALS)
      const nonce = generateNonce()
      
      // 如果没有指定过期时间，默认1小时后过期
      const actualValidBefore = validBefore || Math.floor(Date.now() / 1000) + 3600

      const message = {
        from,
        to,
        value,
        validAfter: BigInt(validAfter),
        validBefore: BigInt(actualValidBefore),
        nonce,
      }

      // 使用 EIP-712 签名
      const signature = await signTypedDataAsync({
        domain: USDC_DOMAIN,
        types: TRANSFER_WITH_AUTHORIZATION_TYPES,
        primaryType: 'TransferWithAuthorization',
        message,
      })

      // 解析签名
      const r = `0x${signature.slice(2, 66)}`
      const s = `0x${signature.slice(66, 130)}`
      const v = parseInt(signature.slice(130, 132), 16)

      const authData = {
        from,
        to,
        value,
        validAfter: BigInt(validAfter),
        validBefore: BigInt(actualValidBefore),
        nonce,
        v,
        r,
        s,
        signature,
      }

      // 保存到 localStorage
      saveAuthorization(authData)
      
      setAuthorization(authData)
      setIsSigningLoading(false)
      
      return authData
    } catch (err) {
      console.error('签名失败:', err)
      setError(err.message || '签名失败')
      setIsSigningLoading(false)
      throw err
    }
  }, [signTypedDataAsync])

  // 执行 transferWithAuthorization
  // 注意：这需要调用者支付 gas 费用
  const executeTransfer = useCallback(async (auth = authorization) => {
    if (!auth) {
      setError('没有授权签名')
      return
    }

    if (!walletClient) {
      setError('钱包未连接')
      return
    }

    setIsTransferLoading(true)
    setError(null)
    setTxHash(null)

    try {
      // 调用 transferWithAuthorization
      const hash = await walletClient.writeContract({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'transferWithAuthorization',
        args: [
          auth.from,
          auth.to,
          auth.value,
          auth.validAfter,
          auth.validBefore,
          auth.nonce,
          auth.v,
          auth.r,
          auth.s,
        ],
      })

      setTxHash(hash)
      
      // 等待交易确认
      const receipt = await publicClient.waitForTransactionReceipt({ hash })
      
      setIsTransferLoading(false)
      setAuthorization(null) // 清除已使用的授权
      
      return receipt
    } catch (err) {
      console.error('转账失败:', err)
      setError(err.message || '转账失败')
      setIsTransferLoading(false)
      throw err
    }
  }, [authorization, walletClient, publicClient])

  // 检查授权是否已被使用
  const checkAuthorizationUsed = useCallback(async (authorizer, nonce) => {
    if (!publicClient) return false
    
    try {
      const used = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'authorizationState',
        args: [authorizer, nonce],
      })
      return used
    } catch (err) {
      console.error('检查授权状态失败:', err)
      return false
    }
  }, [publicClient])
  
  // 通过中继服务执行转账 (Gasless)
  const executeTransferViaRelay = useCallback(async (auth = authorization, relayUrl = 'https://gas-provider-relayer.vercel.app') => {
    if (!auth) {
      setError('没有授权签名')
      return
    }

    setIsRelayLoading(true)
    setError(null)
    setTxHash(null)

    try {
      console.log('发送到中继服务...', auth)
      
      const response = await fetch(`${relayUrl}/relay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: auth.from,
          to: auth.to,
          value: auth.value.toString(),
          validAfter: auth.validAfter.toString(),
          validBefore: auth.validBefore.toString(),
          nonce: auth.nonce,
          v: auth.v,
          r: auth.r,
          s: auth.s,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '中继服务执行失败')
      }

      setTxHash(result.hash)
      setIsRelayLoading(false)
      setAuthorization(null) // 清除已使用的授权

      return result
    } catch (err) {
      console.error('中继转账失败:', err)
      setError(err.message || '中继转账失败')
      setIsRelayLoading(false)
      throw err
    }
  }, [authorization])

  // 取消授权 - 用户可以在授权被使用之前取消它
  // 注意：这需要用户自己调用，需要支付 gas
  const cancelAuthorization = useCallback(async (auth = authorization) => {
    if (!auth) {
      setError('没有授权可以取消')
      return
    }

    if (!walletClient) {
      setError('钱包未连接')
      return
    }

    setIsCancelLoading(true)
    setError(null)

    try {
      // 签署取消授权消息
      const cancelMessage = {
        authorizer: auth.from,
        nonce: auth.nonce,
      }

      const cancelSignature = await signTypedDataAsync({
        domain: USDC_DOMAIN,
        types: CANCEL_AUTHORIZATION_TYPES,
        primaryType: 'CancelAuthorization',
        message: cancelMessage,
      })

      // 解析签名
      const r = `0x${cancelSignature.slice(2, 66)}`
      const s = `0x${cancelSignature.slice(66, 130)}`
      const v = parseInt(cancelSignature.slice(130, 132), 16)

      // 调用 cancelAuthorization
      const hash = await walletClient.writeContract({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'cancelAuthorization',
        args: [auth.from, auth.nonce, v, r, s],
      })

      setTxHash(hash)

      // 等待交易确认
      await publicClient.waitForTransactionReceipt({ hash })

      setIsCancelLoading(false)
      setAuthorization(null) // 清除已取消的授权

      return hash
    } catch (err) {
      console.error('取消授权失败:', err)
      setError(err.message || '取消授权失败')
      setIsCancelLoading(false)
      throw err
    }
  }, [authorization, walletClient, publicClient, signTypedDataAsync])

  // 清除授权（仅在前端清除，不影响链上状态）
  const clearAuthorization = useCallback(() => {
    setAuthorization(null)
    setError(null)
    setTxHash(null)
  }, [])

  return {
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
    checkAuthorizationUsed,
    clearAuthorization,
  }
}

