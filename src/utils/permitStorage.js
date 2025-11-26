// localStorage 中存储 Permit 的 key
const STORAGE_KEY = 'erc2612_permits'

/**
 * localStorage 只保存以下数据（链上无法获取的）：
 * - owner, spender, value, nonce, deadline (签名消息)
 * - v, r, s (签名数据)
 * - txHash (激活时的交易哈希，可选)
 * - savedAt (保存时间)
 * 
 * 以下数据从链上获取：
 * - 是否已激活：通过比较链上 nonces(owner) 与签名的 nonce
 * - 当前 allowance：通过 allowance(owner, spender)
 */

/**
 * 获取所有保存的 Permit（原始数据）
 */
export function getStoredPermits() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return []
    
    const permits = JSON.parse(data)
    // 转换 BigInt 字符串回 BigInt
    return permits.map(permit => ({
      ...permit,
      value: BigInt(permit.value),
      nonce: BigInt(permit.nonce),
      deadline: BigInt(permit.deadline),
    }))
  } catch (err) {
    console.error('读取 Permit 列表失败:', err)
    return []
  }
}

/**
 * 保存 Permit 到 localStorage（只保存签名数据）
 */
export function savePermit(permit) {
  try {
    const permits = getStoredPermits()
    
    // 使用 owner + nonce 作为唯一标识
    const id = `${permit.owner.toLowerCase()}_${permit.nonce.toString()}`
    const exists = permits.some(p => 
      `${p.owner.toLowerCase()}_${p.nonce.toString()}` === id
    )
    
    if (exists) {
      console.warn('Permit 已存在，跳过保存')
      return null
    }
    
    // 只保存必要的数据
    const permitToSave = {
      // 签名消息
      owner: permit.owner,
      spender: permit.spender,
      value: permit.value.toString(),
      nonce: permit.nonce.toString(),
      deadline: permit.deadline.toString(),
      // 签名数据
      v: permit.v,
      r: permit.r,
      s: permit.s,
      // 元数据
      savedAt: Date.now(),
      // 交易哈希（激活后填充）
      txHash: permit.txHash || null,
    }
    
    permits.push(permitToSave)
    
    const toSave = permits.map(p => ({
      ...p,
      value: p.value.toString(),
      nonce: p.nonce.toString(),
      deadline: p.deadline.toString(),
    }))
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
    
    return permitToSave
  } catch (err) {
    console.error('保存 Permit 失败:', err)
    return null
  }
}

/**
 * 更新 Permit（只能更新 txHash）
 */
export function updatePermitTxHash(owner, nonce, txHash) {
  try {
    const permits = getStoredPermits()
    const id = `${owner.toLowerCase()}_${nonce.toString()}`
    const index = permits.findIndex(p => 
      `${p.owner.toLowerCase()}_${p.nonce.toString()}` === id
    )
    
    if (index === -1) {
      console.warn('Permit 不存在')
      return false
    }
    
    permits[index].txHash = txHash
    
    const toSave = permits.map(p => ({
      ...p,
      value: p.value.toString(),
      nonce: p.nonce.toString(),
      deadline: p.deadline.toString(),
    }))
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
    return true
  } catch (err) {
    console.error('更新 Permit 失败:', err)
    return false
  }
}

/**
 * 删除指定 Permit
 */
export function removePermit(owner, nonce) {
  try {
    const permits = getStoredPermits()
    const id = `${owner.toLowerCase()}_${nonce.toString()}`
    const filtered = permits.filter(p => 
      `${p.owner.toLowerCase()}_${p.nonce.toString()}` !== id
    )
    
    const toSave = filtered.map(p => ({
      ...p,
      value: p.value.toString(),
      nonce: p.nonce.toString(),
      deadline: p.deadline.toString(),
    }))
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  } catch (err) {
    console.error('删除 Permit 失败:', err)
  }
}

/**
 * 清除所有 Permit
 */
export function clearAllPermits() {
  localStorage.removeItem(STORAGE_KEY)
}

/**
 * 获取指定钱包地址的 Permit
 */
export function getPermitsByAddress(address) {
  const permits = getStoredPermits()
  return permits.filter(
    p => p.owner.toLowerCase() === address.toLowerCase()
  )
}

/**
 * 清除过期的 Permit（基于 deadline）
 */
export function clearExpiredPermits() {
  const now = BigInt(Math.floor(Date.now() / 1000))
  const permits = getStoredPermits()
  
  const valid = permits.filter(permit => {
    const deadline = BigInt(permit.deadline)
    return now < deadline
  })
  
  const toSave = valid.map(p => ({
    ...p,
    value: p.value.toString(),
    nonce: p.nonce.toString(),
    deadline: p.deadline.toString(),
  }))
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  
  return permits.length - valid.length
}
