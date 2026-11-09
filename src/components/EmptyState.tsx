import type { ReactNode } from 'react'

interface EmptyStateProps {
  emoji: string
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ emoji, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-8 py-14 text-center">
      <div className="text-4xl">{emoji}</div>
      <h3 className="mt-1 text-base font-semibold">{title}</h3>
      <p className="text-sm leading-relaxed text-muted">{description}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  )
}
