// ============ 多网络配置 ============

// 判断是否为开发环境
const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'

// Relayer API 地址：开发环境用本地，生产环境用 Vercel
const RELAYER_API = isDev ? 'http://localhost:3001' : 'https://gas-provider-relayer.vercel.app'

// 网络配置映射
export const NETWORK_CONFIG = {
  // Base 主网 (chainId: 8453)
  8453: {
    name: 'Base',
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    paymaster: '0x217fe9B8129b830D50Bcd51b0eD831E61f6b571e',
    relayerApi: RELAYER_API,
    explorer: 'https://basescan.org',
  },
  // Base Sepolia 测试网 (chainId: 84532)
  84532: {
    name: 'Base Sepolia',
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    paymaster: '0xE004eB206f7D26CD0E3d69eDB85814Cc137Ae9D9',
    relayerApi: RELAYER_API,
    explorer: 'https://sepolia.basescan.org',
  },
}

// 根据 chainId 获取配置
export function getNetworkConfig(chainId) {
  return NETWORK_CONFIG[chainId] || NETWORK_CONFIG[8453] // 默认 Base
}

// 根据 chainId 获取 USDC 地址
export function getUsdcAddress(chainId) {
  return getNetworkConfig(chainId).usdc
}

// 根据 chainId 获取 Paymaster 地址
export function getPaymasterAddress(chainId) {
  return getNetworkConfig(chainId).paymaster
}

// 根据 chainId 获取 Relayer API URL
export function getRelayerApiUrl(chainId) {
  return getNetworkConfig(chainId).relayerApi
}

// 根据 chainId 获取区块浏览器 URL
export function getExplorerUrl(chainId) {
  return getNetworkConfig(chainId).explorer
}

// 获取交易链接
export function getTxUrl(chainId, txHash) {
  return `${getExplorerUrl(chainId)}/tx/${txHash}`
}

// 获取地址链接
export function getAddressUrl(chainId, address) {
  return `${getExplorerUrl(chainId)}/address/${address}`
}

// 根据 chainId 获取 EIP-712 Domain
export function getUsdcDomain(chainId) {
  const config = getNetworkConfig(chainId)
  
  // Base Sepolia 测试网 USDC
  if (chainId === 84532) {
    return {
      name: 'USDC',  // Base Sepolia 测试 USDC 的 name
      version: '2',
      chainId: chainId,
      verifyingContract: config.usdc,
    }
  }
  
  // Base 主网 USDC
  return {
    name: 'USD Coin',
    version: '2',
    chainId: chainId,
    verifyingContract: config.usdc,
  }
}

// ============ 兼容旧代码的默认导出 ============
// 默认使用 Base 主网
const DEFAULT_CHAIN_ID = 8453

// USDC 合约地址（兼容旧代码）
export const USDC_ADDRESS = getUsdcAddress(DEFAULT_CHAIN_ID)

// 目标转账地址
export const TARGET_ADDRESS = '0xd1122c8c941fe716c8b0c57b832c90acb4401a05'

// USDC 精度
export const USDC_DECIMALS = 6

// ERC-3009 相关的 ABI
export const USDC_ABI = [
  // ERC-20 基础
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'name',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  // ERC-3009: transferWithAuthorization
  {
    name: 'transferWithAuthorization',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' },
    ],
    outputs: [],
  },
  // ERC-3009: receiveWithAuthorization
  {
    name: 'receiveWithAuthorization',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' },
    ],
    outputs: [],
  },
  // 检查授权状态
  {
    name: 'authorizationState',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'authorizer', type: 'address' },
      { name: 'nonce', type: 'bytes32' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  // DOMAIN_SEPARATOR
  {
    name: 'DOMAIN_SEPARATOR',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  // nonces (用于 permit)
  {
    name: 'nonces',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  // ERC-3009: cancelAuthorization - 取消授权
  {
    name: 'cancelAuthorization',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'authorizer', type: 'address' },
      { name: 'nonce', type: 'bytes32' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' },
    ],
    outputs: [],
  },
  // ERC-2612: permit - 额度授权
  {
    name: 'permit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' },
    ],
    outputs: [],
  },
  // ERC-20: allowance - 查询授权额度
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  // ERC-20: transferFrom - 代理转账
  {
    name: 'transferFrom',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
]

// EIP-712 类型定义 - TransferWithAuthorization
export const TRANSFER_WITH_AUTHORIZATION_TYPES = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
  ],
}

// EIP-712 类型定义 - ReceiveWithAuthorization
export const RECEIVE_WITH_AUTHORIZATION_TYPES = {
  ReceiveWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
  ],
}

// EIP-712 类型定义 - CancelAuthorization
export const CANCEL_AUTHORIZATION_TYPES = {
  CancelAuthorization: [
    { name: 'authorizer', type: 'address' },
    { name: 'nonce', type: 'bytes32' },
  ],
}

// EIP-712 类型定义 - Permit (ERC-2612)
export const PERMIT_TYPES = {
  Permit: [
    { name: 'owner', type: 'address' },
    { name: 'spender', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
}

// USDC 的 EIP-712 Domain（兼容旧代码，使用默认链）
export const USDC_DOMAIN = getUsdcDomain(DEFAULT_CHAIN_ID)

// Paymaster 合约地址（兼容旧代码）
// 使用合约地址后，钱包不再显示 "untrusted EOA" 警告
export const RELAYER_ADDRESS = getPaymasterAddress(DEFAULT_CHAIN_ID)

// 中继服务 API URL（兼容旧代码）
export const RELAYER_API_URL = getRelayerApiUrl(DEFAULT_CHAIN_ID)

// 支持的链 ID 列表
export const SUPPORTED_CHAIN_IDS = Object.keys(NETWORK_CONFIG).map(Number)

