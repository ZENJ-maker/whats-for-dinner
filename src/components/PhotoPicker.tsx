import { useEffect, useRef, useState } from 'react'

interface PhotoPickerProps {
  file: File | null
  existingUrl?: string
  onChange: (file: File | null, removed: boolean) => void
}

/** 拍照或选图，选完立刻看到预览 */
export function PhotoPicker({ file, existingUrl, onChange }: PhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string>()

  useEffect(() => {
    if (!file) {
      setPreview(undefined)
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const shown = preview ?? existingUrl

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-dashed border-line bg-cream-deep text-xs text-muted"
      >
        {shown ? (
          <img src={shown} alt="菜品封面预览" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full flex-col items-center justify-center gap-1">
            拍照 / 选图
          </span>
        )}
      </button>

      <div className="text-xs leading-relaxed text-muted">
        <p>成品菜的照片会作为这道菜的封面。</p>
        <p>图片会自动压缩后再保存，不占太多空间。</p>
        {shown ? (
          <button
            type="button"
            className="mt-1 text-brand"
            onClick={() => {
              onChange(null, true)
              if (inputRef.current) inputRef.current.value = ''
            }}
          >
            移除封面
          </button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          const picked = event.target.files?.[0] ?? null
          if (picked) onChange(picked, false)
        }}
      />
    </div>
  )
}
