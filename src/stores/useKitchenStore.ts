import { create } from 'zustand'
import * as db from '@/lib/db'
import { normalizeList } from '@/lib/name'
import { compressImage } from '@/lib/image'
import type { AiDish, Difficulty, Dish } from '@/lib/types'

const TONIGHT_KEY = 'wfh.tonight'

export interface DishInput {
  name: string
  ingredients: string
  seasonings: string
  minutes: number
  difficulty: Difficulty
  steps: string
  tags: string
  flavor: string
  photoFile?: File | null
  removePhoto?: boolean
}

interface KitchenState {
  dishes: Dish[]
  ingredients: { id: string; name: string; amount?: string; addedAt: number }[]
  tonightDishId: string | null
  hydrated: boolean
  storageWarning: string | null
  hydrate: () => Promise<void>
  addDish: (input: DishInput) => Promise<Dish>
  updateDish: (id: string, input: DishInput) => Promise<void>
  removeDish: (id: string) => Promise<void>
  addIngredient: (name: string) => Promise<void>
  removeIngredient: (id: string) => Promise<void>
  clearPantry: () => Promise<void>
  setTonight: (id: string | null) => void
  importAiDishes: (items: AiDish[]) => Promise<number>
}

const stepsToArray = (raw: string) =>
  raw
    .split(/\n+/)
    .map((s) => s.replace(/^\s*\d+[.、)]\s*/, '').trim())
    .filter(Boolean)

function buildDish(id: string, input: DishInput, photoId?: string, createdAt = Date.now()): Dish {
  return {
    id,
    name: input.name.trim(),
    photoId,
    ingredients: normalizeList(input.ingredients),
    seasonings: normalizeList(input.seasonings),
    minutes: Number.isFinite(input.minutes) ? Math.max(1, Math.round(input.minutes)) : 15,
    difficulty: input.difficulty,
    steps: stepsToArray(input.steps),
    flavor: input.flavor.trim() || undefined,
    tags: normalizeList(input.tags),
    source: 'self',
    createdAt,
  }
}

async function persistPhoto(file: File): Promise<string> {
  const compressed = await compressImage(file)
  const id = crypto.randomUUID()
  await db.savePhoto({ id, ...compressed, createdAt: Date.now() })
  return id
}

export const useKitchenStore = create<KitchenState>()((set, get) => ({
  dishes: [],
  ingredients: [],
  tonightDishId: typeof localStorage !== 'undefined' ? localStorage.getItem(TONIGHT_KEY) : null,
  hydrated: false,
  storageWarning: null,

  hydrate: async () => {
    if (!db.isIndexedDBAvailable()) {
      set({
        hydrated: true,
        storageWarning: '当前浏览器不支持本地数据库，数据只在本次打开期间有效。',
      })
      return
    }
    try {
      const [dishes, ingredients] = await Promise.all([db.loadDishes(), db.loadIngredients()])
      const sorted = dishes.sort((a, b) => b.createdAt - a.createdAt)
      const tonight = get().tonightDishId
      set({
        dishes: sorted,
        ingredients: ingredients.sort((a, b) => a.addedAt - b.addedAt),
        hydrated: true,
        storageWarning: null,
        tonightDishId: tonight && sorted.some((d) => d.id === tonight) ? tonight : null,
      })
    } catch {
      set({
        hydrated: true,
        storageWarning: '本地数据读取失败，可能是浏览器隐私模式导致的。',
      })
    }
  },

  addDish: async (input) => {
    const photoId = input.photoFile ? await persistPhoto(input.photoFile) : undefined
    const dish = buildDish(crypto.randomUUID(), input, photoId)
    await db.saveDish(dish)
    set({ dishes: [dish, ...get().dishes] })
    return dish
  },

  updateDish: async (id, input) => {
    const existing = get().dishes.find((d) => d.id === id)
    if (!existing) return
    let photoId = existing.photoId
    if (input.removePhoto) photoId = undefined
    if (input.photoFile) photoId = await persistPhoto(input.photoFile)
    const next = buildDish(id, input, photoId, existing.createdAt)
    await db.saveDish(next)
    set({ dishes: get().dishes.map((d) => (d.id === id ? next : d)) })
  },

  removeDish: async (id) => {
    await db.deleteDish(id)
    const wasTonight = get().tonightDishId === id
    if (wasTonight) localStorage.removeItem(TONIGHT_KEY)
    set({
      dishes: get().dishes.filter((d) => d.id !== id),
      tonightDishId: wasTonight ? null : get().tonightDishId,
    })
  },

  addIngredient: async (raw) => {
    const names = normalizeList(raw)
    if (!names.length) return
    const existing = new Set(get().ingredients.map((item) => item.name))
    const now = Date.now()
    const created = names
      .filter((name) => !existing.has(name))
      .map((name, index) => ({
        id: crypto.randomUUID(),
        name,
        addedAt: now + index,
      }))
    if (!created.length) return
    await db.putIngredients(created)
    set({ ingredients: [...get().ingredients, ...created] })
  },

  removeIngredient: async (id) => {
    await db.deleteIngredient(id)
    set({ ingredients: get().ingredients.filter((item) => item.id !== id) })
  },

  clearPantry: async () => {
    await db.clearIngredients()
    set({ ingredients: [] })
  },

  setTonight: (id) => {
    if (id) localStorage.setItem(TONIGHT_KEY, id)
    else localStorage.removeItem(TONIGHT_KEY)
    set({ tonightDishId: id })
  },

  importAiDishes: async (items) => {
    const created = await db.importAiDishes(items)
    set({ dishes: [...created.reverse(), ...get().dishes] })
    return created.length
  },
}))
