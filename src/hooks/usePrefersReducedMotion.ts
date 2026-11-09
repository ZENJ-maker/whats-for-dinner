import { useEffect, useState } from 'react'

/** 尊重系统的「减少动态效果」设置：晕动症用户不该被强制看 5 圈旋转 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(query.matches)
    const handler = (event: MediaQueryListEvent) => setReduced(event.matches)
    query.addEventListener('change', handler)
    return () => query.removeEventListener('change', handler)
  }, [])

  return reduced
}
