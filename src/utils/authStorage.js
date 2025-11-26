// localStorage 中存储授权的 key
const STORAGE_KEY = 'erc3009_authorizations'

/**
 * 获取所有保存的授权
 */
export function getStoredAuthorizations() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return []
    
    const authorizations = JSON.parse(data)
    // 转换 BigInt 字符串回 BigInt
    return authorizations.map(auth => ({
      ...auth,
      value: BigInt(auth.value),
      validAfter: BigInt(auth.validAfter),
      validBefore: BigInt(auth.validBefore),
    }))
  } catch (err) {
    console.error('读取授权列表失败:', err)
    return []
  }
}

/**
 * 保存授权到 localStorage
 */
export function saveAuthorization(auth) {
  try {
    const authorizations = getStoredAuthorizations()
    
    // 检查是否已存在相同 nonce 的授权
    const exists = authorizations.some(a => a.nonce === auth.nonce)
    if (exists) {
      console.warn('授权已存在，跳过保存')
      return
    }
    
    // 将 BigInt 转换为字符串以便 JSON 序列化
    const authToSave = {
      ...auth,
      value: auth.value.toString(),
      validAfter: auth.validAfter.toString(),
      validBefore: auth.validBefore.toString(),
      savedAt: Date.now(),
    }
    
    authorizations.push(authToSave)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authorizations))
    
    return authToSave
  } catch (err) {
    console.error('保存授权失败:', err)
  }
}

/**
 * 删除指定 nonce 的授权
 */
export function removeAuthorization(nonce) {
  try {
    const authorizations = getStoredAuthorizations()
    const filtered = authorizations.filter(a => a.nonce !== nonce)
    
    // 重新序列化
    const toSave = filtered.map(auth => ({
      ...auth,
      value: auth.value.toString(),
      validAfter: auth.validAfter.toString(),
      validBefore: auth.validBefore.toString(),
    }))
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  } catch (err) {
    console.error('删除授权失败:', err)
  }
}

/**
 * 清除所有授权
 */
export function clearAllAuthorizations() {
  localStorage.removeItem(STORAGE_KEY)
}

/**
 * 获取指定钱包地址的授权
 */
export function getAuthorizationsByAddress(address) {
  const authorizations = getStoredAuthorizations()
  return authorizations.filter(
    a => a.from.toLowerCase() === address.toLowerCase()
  )
}

/**
 * 获取有效的授权（未过期）
 */
export function getValidAuthorizations(address) {
  const now = BigInt(Math.floor(Date.now() / 1000))
  const authorizations = address 
    ? getAuthorizationsByAddress(address)
    : getStoredAuthorizations()
    
  return authorizations.filter(auth => {
    const validAfter = BigInt(auth.validAfter)
    const validBefore = BigInt(auth.validBefore)
    return now >= validAfter && now < validBefore
  })
}

/**
 * 获取过期的授权
 */
export function getExpiredAuthorizations(address) {
  const now = BigInt(Math.floor(Date.now() / 1000))
  const authorizations = address 
    ? getAuthorizationsByAddress(address)
    : getStoredAuthorizations()
    
  return authorizations.filter(auth => {
    const validBefore = BigInt(auth.validBefore)
    return now >= validBefore
  })
}

/**
 * 清除过期的授权
 */
export function clearExpiredAuthorizations() {
  const now = BigInt(Math.floor(Date.now() / 1000))
  const authorizations = getStoredAuthorizations()
  
  const valid = authorizations.filter(auth => {
    const validBefore = BigInt(auth.validBefore)
    return now < validBefore
  })
  
  const toSave = valid.map(auth => ({
    ...auth,
    value: auth.value.toString(),
    validAfter: auth.validAfter.toString(),
    validBefore: auth.validBefore.toString(),
  }))
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  
  return authorizations.length - valid.length // 返回清除的数量
}

