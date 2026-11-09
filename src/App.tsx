import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { BottomNav } from '@/components/BottomNav'
import { AiKitchen } from '@/pages/AiKitchen'
import { Dishes } from '@/pages/Dishes'
import { Home } from '@/pages/Home'
import { Pantry } from '@/pages/Pantry'
import { Settings } from '@/pages/Settings'
import { Spin } from '@/pages/Spin'
import { useKitchenStore } from '@/stores/useKitchenStore'

export default function App() {
  const hydrated = useKitchenStore((s) => s.hydrated)
  const storageWarning = useKitchenStore((s) => s.storageWarning)
  const hydrate = useKitchenStore((s) => s.hydrate)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  return (
    <div className="app-shell mx-auto flex w-full max-w-md flex-col bg-cream">
      {storageWarning ? (
        <div className="bg-brand-soft px-4 py-2 text-xs text-brand-dark">{storageWarning}</div>
      ) : null}

      <main className="flex-1">
        {hydrated ? (
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/spin" element={<Spin />} />
            <Route path="/dishes" element={<Dishes />} />
            <Route path="/pantry" element={<Pantry />} />
            <Route path="/ai" element={<AiKitchen />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        ) : (
          <div className="flex h-[60dvh] items-center justify-center text-sm text-muted">正在翻冰箱…</div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
