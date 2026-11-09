import { useEffect, useState } from 'react'
import { loadPhoto } from '@/lib/db'

/**
 * 把 IndexedDB 里的照片变成可渲染的 objectURL。
 * 组件卸载或换图时负责 revoke，避免内存泄漏。
 */
export function usePhotoUrl(photoId: string | undefined): string | undefined {
  const [url, setUrl] = useState<string>()

  useEffect(() => {
    let revoked = false
    let objectUrl: string | undefined

    if (!photoId) {
      setUrl(undefined)
      return
    }

    loadPhoto(photoId)
      .then((photo) => {
        if (!photo || revoked) return
        objectUrl = URL.createObjectURL(photo.thumb)
        setUrl(objectUrl)
      })
      .catch(() => setUrl(undefined))

    return () => {
      revoked = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [photoId])

  return url
}
