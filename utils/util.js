/**
 * 格式化时间
 * @param {string|number} timestamp 时间戳或日期字符串
 * @returns {string} 格式化后的时间
 */
export function formatTime(timestamp) {
  if (!timestamp) return ''
  
  const date = new Date(timestamp)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  // 判断是否是今天
  if (date >= today) {
    return formatTimePart(date)
  }
  // 判断是否是昨天
  if (date >= yesterday && date < today) {
    return '昨天 ' + formatTimePart(date)
  }
  // 判断是否是今年
  if (date.getFullYear() === now.getFullYear()) {
    return `${date.getMonth() + 1}月${date.getDate()}日 ${formatTimePart(date)}`
  }
  // 其他情况
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${formatTimePart(date)}`
}

/**
 * 格式化时间部分（时:分）
 * @param {Date} date 日期对象
 * @returns {string} 格式化后的时间部分
 */
function formatTimePart(date) {
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * 防抖函数
 * @param {Function} fn 要执行的函数
 * @param {number} delay 延迟时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
export function debounce(fn, delay = 300) {
  let timer = null
  return function (...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}

/**
 * 节流函数
 * @param {Function} fn 要执行的函数
 * @param {number} delay 延迟时间（毫秒）
 * @returns {Function} 节流后的函数
 */
export function throttle(fn, delay = 300) {
  let lastTime = 0
  return function (...args) {
    const now = Date.now()
    if (now - lastTime >= delay) {
      fn.apply(this, args)
      lastTime = now
    }
  }
} 