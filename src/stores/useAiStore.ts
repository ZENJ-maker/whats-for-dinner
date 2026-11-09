import { create } from 'zustand'
import { DEFAULT_AI_CONFIG, type AiConfig, type AiDish } from '@/lib/types'
import { aiErrorText, generateDishes, type AiErrorKind } from '@/ai/client'
import { collectFlavors } from '@/ai/prompt'
import { useKitchenStore } from './useKitchenStore'

const CONFIG_KEY = 'wfh.ai.config'

function loadConfig(): AiConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (!raw) return DEFAULT_AI_CONFIG
    const parsed = JSON.parse(raw) as Partial<AiConfig>
    return { ...DEFAULT_AI_CONFIG, ...parsed }
  } catch {
    return DEFAULT_AI_CONFIG
  }
}

export type AiMode = 'batch' | 'explore' | 'table'

interface AiState {
  config: AiConfig
  results: AiDish[]
  loading: boolean
  error: string | null
  errorKind: AiErrorKind | null
  lastMode: AiMode
  isMock: boolean
  isCached: boolean
  setConfig: (patch: Partial<AiConfig>) => void
  generate: (mode: AiMode) => Promise<void>
  clearResults: () => void
}

export const useAiStore = create<AiState>()((set, get) => ({
  config: typeof localStorage !== 'undefined' ? loadConfig() : DEFAULT_AI_CONFIG,
  results: [],
  loading: false,
  error: null,
  errorKind: null,
  lastMode: 'batch',
  isMock: false,
  isCached: false,

  setConfig: (patch) => {
    const next = { ...get().config, ...patch }
    localStorage.setItem(CONFIG_KEY, JSON.stringify(next))
    set({ config: next })
  },

  generate: async (mode) => {
    const { config } = get()
    const kitchen = useKitchenStore.getState()
    set({ loading: true, error: null, errorKind: null, lastMode: mode })

    try {
      const result = await generateDishes({
        config,
        pantry: kitchen.ingredients.map((item) => item.name),
        existingNames: kitchen.dishes.map((dish) => dish.name),
        flavors: collectFlavors(kitchen.dishes.map((dish) => dish.flavor)),
        count: mode === 'table' ? 4 : 12,
        mode,
      })
      set({
        results: result.dishes,
        loading: false,
        isMock: result.mock,
        isCached: result.cached,
      })
    } catch (error) {
      set({ loading: false, error: aiErrorText(error), errorKind: null })
    }
  },

  clearResults: () => set({ results: [], error: null, isMock: false, isCached: false }),
}))
