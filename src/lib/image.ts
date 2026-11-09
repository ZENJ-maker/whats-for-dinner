/** 图片压缩：手机上随手拍的照片动辄 5–10MB，直接进 IndexedDB 会很痛 */

export interface CompressedPhoto {
  full: Blob
  thumb: Blob
  w: number
  h: number
}

const FULL_MAX = 1280
const THUMB_SIZE = 320
const QUALITY = 0.82

export async function compressImage(file: File): Promise<CompressedPhoto> {
  const source = await decode(file)
  const width = 'width' in source ? source.width : 0
  const height = 'height' in source ? source.height : 0
  if (!width || !height) throw new Error('图片解码失败，换一张试试')

  const full = await renderFull(source, width, height)
  const thumb = await renderThumb(source, width, height)
  if ('close' in source) source.close()
  return { ...full, thumb, w: width, h: height }
}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file)
    } catch {
      /* Safari 老版本可能不支持某些格式，回退到 <img> */
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片解码失败，换一张试试'))
    }
    img.src = url
  })
}

function makeCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('浏览器不支持 Canvas')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  return [canvas, ctx]
}

function toJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('图片压缩失败'))),
      'image/jpeg',
      QUALITY,
    )
  })
}

async function renderFull(
  source: ImageBitmap | HTMLImageElement,
  width: number,
  height: number,
): Promise<{ full: Blob }> {
  const scale = Math.min(1, FULL_MAX / Math.max(width, height))
  const w = Math.max(1, Math.round(width * scale))
  const h = Math.max(1, Math.round(height * scale))
  const [canvas, ctx] = makeCanvas(w, h)
  ctx.drawImage(source, 0, 0, w, h)
  return { full: await toJpeg(canvas) }
}

async function renderThumb(
  source: ImageBitmap | HTMLImageElement,
  width: number,
  height: number,
): Promise<Blob> {
  const side = Math.min(width, height)
  const sx = (width - side) / 2
  const sy = (height - side) / 2
  const [canvas, ctx] = makeCanvas(THUMB_SIZE, THUMB_SIZE)
  ctx.drawImage(source, sx, sy, side, side, 0, 0, THUMB_SIZE, THUMB_SIZE)
  return toJpeg(canvas)
}
