import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { AiDish, Dish, Ingredient, PhotoRecord } from './types'

const DB_NAME = 'dinner-spin'
const DB_VERSION = 1

interface CacheEntry {
  key: string
  value: unknown
  createdAt: number
}

interface DinnerDB extends DBSchema {
  dishes: { key: string; value: Dish; indexes: { 'by-source': string } }
  ingredients: { key: string; value: Ingredient }
  photos: { key: string; value: PhotoRecord }
  aiCache: { key: string; value: CacheEntry }
}

let dbPromise: Promise<IDBPDatabase<DinnerDB>> | null = null

export function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null
  } catch {
    return false
  }
}

function getDB(): Promise<IDBPDatabase<DinnerDB>> {
  if (!dbPromise) {
    dbPromise = openDB<DinnerDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('dishes')) {
          const store = db.createObjectStore('dishes', { keyPath: 'id' })
          store.createIndex('by-source', 'source')
        }
        if (!db.objectStoreNames.contains('ingredients')) {
          db.createObjectStore('ingredients', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('photos')) {
          db.createObjectStore('photos', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('aiCache')) {
          db.createObjectStore('aiCache', { keyPath: 'key' })
        }
      },
    })
  }
  return dbPromise
}

/* ---------------------------------- 菜品 --------------------------------- */

export async function loadDishes(): Promise<Dish[]> {
  const db = await getDB()
  return db.getAll('dishes')
}

export async function saveDish(dish: Dish): Promise<void> {
  const db = await getDB()
  await db.put('dishes', dish)
}

export async function deleteDish(id: string): Promise<void> {
  const db = await getDB()
  const dish = await db.get('dishes', id)
  await db.delete('dishes', id)
  if (dish?.photoId) await deletePhotoIfOrphan(dish.photoId)
}

/** 同一张照片可能被多道菜引用，确认没人用了才删 */
async function deletePhotoIfOrphan(photoId: string): Promise<void> {
  const db = await getDB()
  const dishes = await db.getAll('dishes')
  if (dishes.some((d) => d.photoId === photoId)) return
  await db.delete('photos', photoId)
}

/* ---------------------------------- 照片 --------------------------------- */

export async function savePhoto(photo: PhotoRecord): Promise<void> {
  const db = await getDB()
  await db.put('photos', photo)
}

export async function loadPhoto(id: string): Promise<PhotoRecord | undefined> {
  const db = await getDB()
  return db.get('photos', id)
}

export async function loadAllPhotos(): Promise<PhotoRecord[]> {
  const db = await getDB()
  return db.getAll('photos')
}

/* ---------------------------------- 食材 --------------------------------- */

export async function loadIngredients(): Promise<Ingredient[]> {
  const db = await getDB()
  return db.getAll('ingredients')
}

export async function putIngredients(items: Ingredient[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('ingredients', 'readwrite')
  await Promise.all(items.map((item) => tx.store.put(item)))
  await tx.done
}

export async function deleteIngredient(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('ingredients', id)
}

export async function clearIngredients(): Promise<void> {
  const db = await getDB()
  await db.clear('ingredients')
}

/* --------------------------------- AI 缓存 -------------------------------- */

export async function readCache<T>(key: string, ttlMs: number): Promise<T | undefined> {
  const db = await getDB()
  const entry = await db.get('aiCache', key)
  if (!entry) return undefined
  if (Date.now() - entry.createdAt > ttlMs) {
    await db.delete('aiCache', key)
    return undefined
  }
  return entry.value as T
}

export async function writeCache<T>(key: string, value: T): Promise<void> {
  const db = await getDB()
  await db.put('aiCache', { key, value, createdAt: Date.now() })
}

export async function clearCache(): Promise<void> {
  const db = await getDB()
  await db.clear('aiCache')
}

/* ------------------------------- 导入 / 清空 ------------------------------- */

export interface BackupBundle {
  version: 1
  exportedAt: number
  dishes: Dish[]
  ingredients: Ingredient[]
  /** photoId → data URL */
  photos: Record<string, string>
}

export async function buildBackup(): Promise<BackupBundle> {
  const [dishes, ingredients, photos] = await Promise.all([
    loadDishes(),
    loadIngredients(),
    loadAllPhotos(),
  ])
  const encoded: Record<string, string> = {}
  for (const photo of photos) {
    encoded[photo.id] = await blobToDataUrl(photo.full)
  }
  return { version: 1, exportedAt: Date.now(), dishes, ingredients, photos: encoded }
}

export async function restoreBackup(bundle: BackupBundle): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['dishes', 'ingredients', 'photos'], 'readwrite')
  await tx.objectStore('dishes').clear()
  await tx.objectStore('ingredients').clear()
  await tx.objectStore('photos').clear()

  for (const [id, dataUrl] of Object.entries(bundle.photos ?? {})) {
    const blob = await dataUrlToBlob(dataUrl)
    const bitmap = await createBitmapSafe(blob)
    await tx.objectStore('photos').put({
      id,
      full: blob,
      thumb: blob,
      w: bitmap?.width ?? 0,
      h: bitmap?.height ?? 0,
      createdAt: Date.now(),
    })
    bitmap?.close?.()
  }
  for (const dish of bundle.dishes ?? []) await tx.objectStore('dishes').put(dish)
  for (const item of bundle.ingredients ?? []) await tx.objectStore('ingredients').put(item)
  await tx.done
}

export async function clearEverything(): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['dishes', 'ingredients', 'photos', 'aiCache'], 'readwrite')
  await Promise.all([
    tx.objectStore('dishes').clear(),
    tx.objectStore('ingredients').clear(),
    tx.objectStore('photos').clear(),
    tx.objectStore('aiCache').clear(),
  ])
  await tx.done
}

export async function importAiDishes(dishes: AiDish[]): Promise<Dish[]> {
  const now = Date.now()
  const created: Dish[] = dishes.map((d, index) => ({
    id: crypto.randomUUID(),
    name: d.name,
    ingredients: d.ingredients,
    seasonings: d.seasonings,
    minutes: d.minutes,
    difficulty: d.difficulty,
    steps: d.steps,
    flavor: d.flavor,
    tags: d.tags,
    source: 'ai',
    createdAt: now + index,
  }))
  const db = await getDB()
  const tx = db.transaction('dishes', 'readwrite')
  for (const dish of created) await tx.store.put(dish)
  await tx.done
  return created
}

/* --------------------------------- 工具函数 -------------------------------- */

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl)
  return res.blob()
}

async function createBitmapSafe(blob: Blob): Promise<ImageBitmap | null> {
  try {
    return await createImageBitmap(blob)
  } catch {
    return null
  }
}
