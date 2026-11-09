import { useEffect, useState, type FormEvent } from 'react'
import { PhotoPicker } from './PhotoPicker'
import { usePhotoUrl } from '@/hooks/usePhotoUrl'
import { DIFFICULTIES, type Difficulty, type Dish } from '@/lib/types'
import type { DishInput } from '@/stores/useKitchenStore'

interface DishFormProps {
  initial?: Dish
  submitting?: boolean
  onSubmit: (input: DishInput) => void
}

const inputClass =
  'w-full rounded-xl border border-line bg-cream/60 px-3 py-2 text-sm outline-none placeholder:text-muted/70 focus:border-brand/60'

export function DishForm({ initial, submitting, onSubmit }: DishFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [ingredients, setIngredients] = useState(initial?.ingredients.join('、') ?? '')
  const [seasonings, setSeasonings] = useState(initial?.seasonings.join('、') ?? '')
  const [minutes, setMinutes] = useState(String(initial?.minutes ?? 15))
  const [difficulty, setDifficulty] = useState<Difficulty>(initial?.difficulty ?? '简单')
  const [steps, setSteps] = useState(initial?.steps.join('\n') ?? '')
  const [tags, setTags] = useState(initial?.tags.join('、') ?? '')
  const [flavor, setFlavor] = useState(initial?.flavor ?? '')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [error, setError] = useState('')

  const existingPhoto = usePhotoUrl(removePhoto ? undefined : initial?.photoId)

  useEffect(() => {
    setError('')
  }, [name])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) {
      setError('先给它起个名字')
      return
    }
    const parsedMinutes = Number(minutes)
    if (!Number.isFinite(parsedMinutes) || parsedMinutes <= 0) {
      setError('时长要填个正数（分钟）')
      return
    }
    onSubmit({
      name: name.trim(),
      ingredients,
      seasonings,
      minutes: parsedMinutes,
      difficulty,
      steps,
      tags,
      flavor,
      photoFile,
      removePhoto,
    })
  }

  return (
    <form id="dish-form" onSubmit={submit} className="space-y-4">
      <PhotoPicker
        file={photoFile}
        existingUrl={existingPhoto}
        onChange={(file, removed) => {
          setPhotoFile(file)
          if (removed) setRemovePhoto(true)
        }}
      />

      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-ink-soft">菜名</span>
        <input
          className={inputClass}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="例如：番茄虾仁"
          autoFocus
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-ink-soft">需要多久（分钟）</span>
          <input
            className={inputClass}
            value={minutes}
            onChange={(event) => setMinutes(event.target.value)}
            inputMode="numeric"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-ink-soft">难度</span>
          <select
            className={inputClass}
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value as Difficulty)}
          >
            {DIFFICULTIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-ink-soft">
          主料 <span className="text-muted">（用顿号或逗号分隔，用来和家里的食材匹配）</span>
        </span>
        <input
          className={inputClass}
          value={ingredients}
          onChange={(event) => setIngredients(event.target.value)}
          placeholder="番茄、虾仁"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-ink-soft">
          调料 <span className="text-muted">（可留空，不参与缺料判断）</span>
        </span>
        <input
          className={inputClass}
          value={seasonings}
          onChange={(event) => setSeasonings(event.target.value)}
          placeholder="盐、糖、生抽"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-ink-soft">做法（一行一步）</span>
        <textarea
          className={`${inputClass} min-h-24 resize-y`}
          value={steps}
          onChange={(event) => setSteps(event.target.value)}
          placeholder={'虾仁用料酒腌 10 分钟\n番茄切块炒出汁\n下虾仁翻炒至变色'}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-ink-soft">口味</span>
          <input
            className={inputClass}
            value={flavor}
            onChange={(event) => setFlavor(event.target.value)}
            placeholder="家常、酸甜…"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-ink-soft">标签</span>
          <input
            className={inputClass}
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="荤菜、快手"
          />
        </label>
      </div>

      {error ? <p className="text-xs text-brand-dark">{error}</p> : null}

      <button type="submit" disabled={submitting} className="hidden" aria-hidden />
    </form>
  )
}
