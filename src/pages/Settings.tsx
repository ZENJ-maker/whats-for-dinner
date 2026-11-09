import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { testConnection, sanitizeKey, type ConnectionResult } from '@/ai/client'
import { buildBackup, clearEverything, restoreBackup, type BackupBundle } from '@/lib/db'
import { useAiStore } from '@/stores/useAiStore'
import { useKitchenStore } from '@/stores/useKitchenStore'

const PRESETS = [
  { label: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
]

const inputClass =
  'w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none placeholder:text-muted/70 focus:border-brand/60'

/** 只露头尾，方便和服务商后台显示的那串对一下 */
function maskKey(raw: string): string {
  const clean = sanitizeKey(raw)
  if (clean.length <= 8) return clean
  return `${clean.slice(0, 3)}…${clean.slice(-4)}`
}

export function Settings() {
  const config = useAiStore((s) => s.config)
  const setConfig = useAiStore((s) => s.setConfig)
  const hydrate = useKitchenStore((s) => s.hydrate)

  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<ConnectionResult | null>(null)

  const runTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      setTestResult(await testConnection(config))
    } finally {
      setTesting(false)
    }
  }

  const exportBackup = async () => {
    try {
      const bundle = await buildBackup()
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `今晚吃啥-备份-${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      URL.revokeObjectURL(url)
      setMessage(`已导出 ${bundle.dishes.length} 道菜和 ${bundle.ingredients.length} 种食材`)
    } catch {
      setMessage('导出失败了，检查一下浏览器存储权限')
    }
  }

  const importBackup = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as BackupBundle
      if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.dishes)) {
        setMessage('这个文件不是有效的备份')
        return
      }
      await restoreBackup(parsed)
      await hydrate()
      setMessage(`已恢复 ${parsed.dishes.length} 道菜和 ${parsed.ingredients?.length ?? 0} 种食材`)
    } catch {
      setMessage('导入失败，文件可能损坏了')
    }
  }

  return (
    <div className="pb-24">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line/60 bg-cream/95 px-4 py-3 backdrop-blur">
        <Link to="/" className="rounded-full border border-line bg-white px-3 py-1.5 text-sm">
          ←
        </Link>
        <h1 className="text-lg font-bold">设置</h1>
      </header>

      <section className="mx-4 mt-4 rounded-2xl bg-white p-4">
        <h2 className="text-sm font-semibold">AI 配置</h2>
        <p className="mt-1 text-[11px] leading-relaxed text-muted">
          留空就用内置示例菜谱。key 只存在这台设备的浏览器里，不会上传到任何地方。
        </p>

        <div className="mt-3 flex gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setConfig({ baseUrl: preset.baseUrl, model: preset.model })}
              className="rounded-full border border-line px-3 py-1 text-[11px] text-ink-soft"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <label className="mt-3 block space-y-1">
          <span className="text-[11px] text-ink-soft">Base URL</span>
          <input
            className={inputClass}
            value={config.baseUrl}
            onChange={(event) => setConfig({ baseUrl: event.target.value })}
            placeholder="https://api.deepseek.com/v1"
          />
        </label>

        <label className="mt-2.5 block space-y-1">
          <span className="text-[11px] text-ink-soft">模型</span>
          <input
            className={inputClass}
            value={config.model}
            onChange={(event) => setConfig({ model: event.target.value })}
            placeholder="deepseek-chat"
          />
        </label>
        <p className="mt-1 text-[10px] leading-relaxed text-muted">
          DeepSeek 官方的模型名是 deepseek-chat 或 deepseek-reasoner。如果 key 来自中转服务，模型名和
          Base URL 都要用那家服务商给的。
        </p>

        <label className="mt-2.5 block space-y-1">
          <span className="text-[11px] text-ink-soft">API Key</span>
          <input
            className={inputClass}
            type="password"
            value={config.apiKey}
            onChange={(event) => setConfig({ apiKey: event.target.value })}
            placeholder="sk-…"
            autoComplete="off"
          />
          {config.apiKey ? (
            <p className="mt-1 text-[10px] leading-relaxed text-muted">
              当前 key：{maskKey(config.apiKey)}，共 {sanitizeKey(config.apiKey).length} 个字符
              {sanitizeKey(config.apiKey) !== config.apiKey
                ? '（含空格或不可见字符，发送时会自动去掉）'
                : ''}
            </p>
          ) : null}
        </label>

        <button
          type="button"
          onClick={() => void runTest()}
          disabled={testing}
          className="mt-3 w-full rounded-xl border border-line py-2.5 text-sm disabled:opacity-60"
        >
          {testing ? '测试中…' : '测试连接'}
        </button>

        {testResult ? (
          <p
            className={`mt-2 rounded-xl px-3 py-2 text-[11px] leading-relaxed ${
              testResult.ok ? 'bg-leaf/10 text-leaf' : 'bg-brand-soft/70 text-brand-dark'
            }`}
          >
            {testResult.message}
          </p>
        ) : null}
      </section>

      <section className="mx-4 mt-3 rounded-2xl bg-white p-4">
        <h2 className="text-sm font-semibold">数据</h2>
        <p className="mt-1 text-[11px] leading-relaxed text-muted">
          所有菜谱和照片都存在这台设备的浏览器里。清缓存或换设备前，记得导出一份。
        </p>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => void exportBackup()}
            className="flex-1 rounded-xl bg-brand py-2.5 text-sm font-medium text-white"
          >
            导出备份
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex-1 rounded-xl border border-line py-2.5 text-sm"
          >
            导入备份
          </button>
        </div>

        <button
          type="button"
          onClick={async () => {
            if (!confirm('确定清空所有菜品、食材和照片？这个操作不可撤销。')) return
            await clearEverything()
            await hydrate()
            setMessage('数据已清空')
          }}
          className="mt-2 w-full rounded-xl border border-line py-2.5 text-sm text-muted"
        >
          清空所有数据
        </button>

        {message ? <p className="mt-2 text-[11px] text-leaf">{message}</p> : null}

        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void importBackup(file)
            event.target.value = ''
          }}
        />
      </section>

      <section className="mx-4 mt-3 rounded-2xl bg-white p-4">
        <h2 className="text-sm font-semibold">关于</h2>
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
          今晚吃啥 v1.0 · 纯前端，无后端，无账号。
          <br />
          菜品、食材、照片全部保存在本机 IndexedDB；AI 调用直接从浏览器发往你自己配置的接口。
        </p>
      </section>
    </div>
  )
}
