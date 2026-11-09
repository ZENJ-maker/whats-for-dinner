import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { EmptyState } from '@/components/EmptyState'
import { usePhotoUrl } from '@/hooks/usePhotoUrl'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { matchAll } from '@/lib/match'
import { sortMatches } from '@/lib/sort'
import { SORT_LABELS, type DishWithMatch, type SortMode } from '@/lib/types'
import {
  MAX_WHEEL_SLICES,
  pickRandomIndex,
  rotationForIndex,
  winnerIndex,
} from '@/lib/wheel'
import { useKitchenStore } from '@/stores/useKitchenStore'

const TRANSITION = 'transform 4.2s cubic-bezier(.17,.67,.12,1)'

export function Spin() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const dishes = useKitchenStore((s) => s.dishes)
  const ingredients = useKitchenStore((s) => s.ingredients)
  const setTonight = useKitchenStore((s) => s.setTonight)
  const tonightId = useKitchenStore((s) => s.tonightDishId)
  const reduced = usePrefersReducedMotion()

  const mode = (params.get('mode') as SortMode) ?? 'pantry'
  const onlyCanCook = params.get('only') !== '0'

  const slices = useMemo(() => {
    const all = sortMatches(matchAll(dishes, ingredients.map((item) => item.name)), mode)
    const pool = onlyCanCook ? all.filter((item) => item.canCook) : all
    return pool.slice(0, MAX_WHEEL_SLICES)
  }, [dishes, ingredients, mode, onlyCanCook])

  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<DishWithMatch | null>(null)
  const [excludeLast, setExcludeLast] = useState(true)

  const spin = () => {
    if (spinning || slices.length === 0) return

    const candidates =
      excludeLast && slices.length > 1 && result
        ? slices.filter((item) => item.dish.id !== result.dish.id)
        : slices
    const picked = candidates[pickRandomIndex(candidates.length)]
    const index = slices.findIndex((item) => item.dish.id === picked.dish.id)

    if (reduced) {
      setResult(picked)
      return
    }

    setSpinning(true)
    setResult(null)
    const jitter = (Math.random() - 0.5) * 0.6
    setRotation((current) => rotationForIndex(index, slices.length, current, 5, jitter))
  }

  const handleTransitionEnd = () => {
    if (!spinning) return
    setSpinning(false)
    const index = winnerIndex(rotation, slices.length)
    setResult(slices[index] ?? null)
  }

  if (slices.length === 0) {
    return (
      <div className="pt-16">
        <EmptyState
          title="没有可以抽的菜"
          description={
            onlyCanCook
              ? '现有食材还凑不出菜，先去补食材，或者把菜品库填起来。'
              : '菜品库还是空的，先录几道菜吧。'
          }
          action={
            <Link to="/pantry" className="rounded-full bg-brand px-4 py-2 text-sm text-white">
              去补食材
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="pb-24">
      <header className="flex items-center justify-between px-4 pt-3">
        <Link to="/" className="rounded-full border border-line bg-white px-3 py-1.5 text-sm">
          ← 返回
        </Link>
        <span className="text-sm font-semibold">抽一道</span>
        <span className="w-16 text-right text-xs text-muted">{slices.length} 道候选</span>
      </header>

      <p className="mt-3 px-4 text-center text-xs text-muted">
        {SORT_LABELS[mode]}排序{onlyCanCook ? ' · 只能做现有食材的菜' : ''}
      </p>

      <div className="mt-4 px-5">
        <div className="relative mx-auto aspect-square w-full max-w-[340px]">
          <div className="absolute inset-0 rounded-full border-[6px] border-cream-deep bg-white shadow-[inset_0_2px_18px_rgba(43,33,24,0.06)]" />

          {/* 指针 */}
          <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1">
            <div className="h-0 w-0 border-x-[9px] border-t-[16px] border-x-transparent border-t-brand drop-shadow" />
          </div>

          <div
            className="absolute inset-0"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? TRANSITION : 'none',
            }}
            onTransitionEnd={handleTransitionEnd}
          >
            <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full" aria-hidden>
              {slices.map((_, index) => {
                const step = 360 / slices.length
                const start = index * step
                const end = start + step
                const p = (angle: number, radius: number) => {
                  const rad = ((angle - 90) * Math.PI) / 180
                  return [100 + radius * Math.cos(rad), 100 + radius * Math.sin(rad)] as const
                }
                const [x1, y1] = p(start, 98)
                const [x2, y2] = p(end, 98)
                const large = step > 180 ? 1 : 0
                return (
                  <path
                    key={index}
                    d={`M 100 100 L ${x1} ${y1} A 98 98 0 ${large} 1 ${x2} ${y2} Z`}
                    fill={index % 2 === 0 ? '#FDF1E7' : '#FBE3D6'}
                    stroke="#FFF8F2"
                    strokeWidth="0.6"
                  />
                )
              })}
            </svg>

            {slices.map((item, index) => {
              const step = 360 / slices.length
              const angle = (index + 0.5) * step
              const rad = ((angle - 90) * Math.PI) / 180
              const x = 50 + 39 * Math.cos(rad)
              const y = 50 + 39 * Math.sin(rad)
              return (
                <div
                  key={item.dish.id}
                  className="absolute w-[64px] -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${x}%`, top: `${y}%` }}
                >
                  {/* 反向旋转：转盘转的时候菜名始终正着 */}
                  <div
                    className="flex flex-col items-center"
                    style={{
                      transform: `rotate(${-rotation}deg)`,
                      transition: spinning ? TRANSITION : 'none',
                    }}
                  >
                    <WheelSlot dish={item.dish} />
                    <span className="mt-1 max-w-[64px] truncate rounded-full bg-white/80 px-1 text-[10px] leading-4 text-ink-soft">
                      {item.dish.name}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="pointer-events-none absolute left-1/2 top-1/2 flex h-[92px] w-[92px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-line bg-cream text-center shadow-inner">
            <span className="text-[11px] text-muted">今晚</span>
            <span className="text-sm font-bold text-brand">吃啥</span>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3 px-5">
        <button
          type="button"
          onClick={spin}
          disabled={spinning}
          className={`w-full rounded-2xl py-4 text-base font-semibold shadow-lg transition-transform active:scale-[0.99] ${
            spinning ? 'bg-line text-muted' : 'bg-brand text-white shadow-brand/25'
          }`}
        >
          {spinning ? '转起来了…' : reduced ? '直接抽一道' : '转一下'}
        </button>

        <label className="flex items-center justify-center gap-1.5 text-xs text-muted">
          <input
            type="checkbox"
            checked={excludeLast}
            onChange={(event) => setExcludeLast(event.target.checked)}
            className="h-3.5 w-3.5 accent-[#e4572e]"
          />
          别抽到刚才那道
        </label>

        {slices.length >= MAX_WHEEL_SLICES ? (
          <p className="text-center text-[11px] text-muted">
            盘上只放得下 {MAX_WHEEL_SLICES} 道，多出来的回列表里看
          </p>
        ) : null}
      </div>

      {result ? (
        <ResultCard
          match={result}
          isTonight={result.dish.id === tonightId}
          onCook={() => {
            setTonight(result.dish.id)
            navigate('/')
          }}
          onAgain={() => spin()}
          onClose={() => setResult(null)}
        />
      ) : null}
    </div>
  )
}

function WheelSlot({ dish }: { dish: DishWithMatch['dish'] }) {
  const url = usePhotoUrl(dish.photoId)
  return (
    <div className="h-[46px] w-[46px] overflow-hidden rounded-full border-2 border-white bg-cream-deep shadow-sm">
      {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : null}
    </div>
  )
}

interface ResultCardProps {
  match: DishWithMatch
  isTonight: boolean
  onCook: () => void
  onAgain: () => void
  onClose: () => void
}

function ResultCard({ match, isTonight, onCook, onAgain, onClose }: ResultCardProps) {
  const { dish } = match
  const url = usePhotoUrl(dish.photoId)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 px-3 pb-3">
      <div
        role="dialog"
        aria-live="polite"
        aria-label={`抽中了${dish.name}`}
        className="w-full max-w-md rounded-3xl bg-white p-5 pb-[max(20px,env(safe-area-inset-bottom))] shadow-2xl"
      >
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-cream-deep">
            {url ? (
              <img src={url} alt={dish.name} className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-brand">抽中了</p>
            <h2 className="truncate text-xl font-bold">{dish.name}</h2>
            <p className="mt-1 text-xs text-muted">
              {dish.minutes} 分钟 · {dish.difficulty}
              {dish.flavor ? ` · ${dish.flavor}` : ''}
            </p>
          </div>
        </div>

        {dish.steps.length ? (
          <ol className="mt-4 space-y-1.5 rounded-2xl bg-cream px-4 py-3 text-[13px] leading-relaxed text-ink-soft">
            {dish.steps.map((step, index) => (
              <li key={index} className="flex gap-2">
                <span className="text-brand">{index + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        ) : null}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onAgain}
            className="flex-1 rounded-xl border border-line py-3 text-sm text-ink-soft"
          >
            再抽一次
          </button>
          <button
            type="button"
            onClick={onCook}
            className="flex-[1.4] rounded-xl bg-brand py-3 text-sm font-semibold text-white"
          >
            {isTonight ? '就是它了' : '就做它'}
          </button>
        </div>
        <button type="button" onClick={onClose} className="mt-2 w-full py-2 text-xs text-muted">
          先不看结果
        </button>
      </div>
    </div>
  )
}
