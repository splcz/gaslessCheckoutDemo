// localStorage 中存储 Permit 的 key
const STORAGE_KEY = 'erc2612_permits'

/**
 * 获取所有保存的 Permit
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
 * 保存 Permit 到 localStorage
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
    
    // 将 BigInt 转换为字符串以便 JSON 序列化
    const permitToSave = {
      ...permit,
      id,
      value: permit.value.toString(),
      nonce: permit.nonce.toString(),
      deadline: permit.deadline.toString(),
      activated: permit.activated || false,
      savedAt: Date.now(),
    }
    
    permits.push(permitToSave)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(permits))
    
    return permitToSave
  } catch (err) {
    console.error('保存 Permit 失败:', err)
    return null
  }
}

/**
 * 更新 Permit 状态（如激活状态）
 */
export function updatePermit(id, updates) {
  try {
    const permits = getStoredPermits()
    const index = permits.findIndex(p => 
      `${p.owner.toLowerCase()}_${p.nonce.toString()}` === id
    )
    
    if (index === -1) {
      console.warn('Permit 不存在')
      return false
    }
    
    permits[index] = { ...permits[index], ...updates }
    
    // 重新序列化
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
export function removePermit(id) {
  try {
    const permits = getStoredPermits()
    const filtered = permits.filter(p => 
      `${p.owner.toLowerCase()}_${p.nonce.toString()}` !== id
    )
    
    // 重新序列化
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
 * 获取有效的 Permit（未过期）
 */
export function getValidPermits(address) {
  const now = BigInt(Math.floor(Date.now() / 1000))
  const permits = address 
    ? getPermitsByAddress(address)
    : getStoredPermits()
    
  return permits.filter(permit => {
    const deadline = BigInt(permit.deadline)
    return now < deadline
  })
}

/**
 * 获取已激活的 Permit
 */
export function getActivatedPermits(address) {
  const permits = getValidPermits(address)
  return permits.filter(p => p.activated)
}

/**
 * 获取待激活的 Permit
 */
export function getPendingPermits(address) {
  const permits = getValidPermits(address)
  return permits.filter(p => !p.activated)
}

/**
 * 清除过期的 Permit
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
  
  return permits.length - valid.length // 返回清除的数量
}

/**
 * 标记指定地址的所有已激活 Permit 为"已撤销"
 */
export function revokeActivatedPermits(address) {
  try {
    const permits = getStoredPermits()
    
    const updated = permits.map(p => {
      // 只处理指定地址的已激活 Permit
      if (p.owner.toLowerCase() === address.toLowerCase() && p.activated) {
        return { ...p, activated: false, revoked: true }
      }
      return p
    })
    
    // 重新序列化
    const toSave = updated.map(p => ({
      ...p,
      value: p.value.toString(),
      nonce: p.nonce.toString(),
      deadline: p.deadline.toString(),
    }))
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
    return true
  } catch (err) {
    console.error('撤销 Permit 状态更新失败:', err)
    return false
  }
}

