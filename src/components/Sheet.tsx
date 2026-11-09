import { useEffect, type ReactNode } from 'react'

interface SheetProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

/** 底部弹出面板：手机上比居中弹窗顺手，也方便键盘弹起时不被遮住 */
export function Sheet({ open, title, onClose, children, footer }: SheetProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="关闭"
        onClick={onClose}
        className="absolute inset-0 bg-ink/35"
      />
      <div className="relative mx-auto flex max-h-[88dvh] w-full max-w-md flex-col rounded-t-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-sm text-muted"
          >
            关闭
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <div className="border-t border-line px-5 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">{footer}</div> : null}
      </div>
    </div>
  )
}
