/**
 * 食材名归一化。
 *
 * 匹配的准确度几乎完全取决于这里：用户可能写「西红柿」，也可能写「番茄」；
 * AI 可能返回「嫩豆腐」，而家里录的是「豆腐」。统一成同一个词之后，
 * 匹配引擎只需要做集合运算。
 */

/** 同一种东西的不同叫法，第一个是标准名 */
const SYNONYM_GROUPS: string[][] = [
  ['番茄', '西红柿', '洋柿子'],
  ['土豆', '马铃薯', '洋芋'],
  ['蛋', '鸡蛋', '鸭蛋', '蛋液', '鸡蛋液', '土鸡蛋'],
  ['虾', '虾仁', '大虾', '鲜虾', '基围虾', '明虾'],
  ['黄瓜', '青瓜', '刺黄瓜'],
  ['豆腐', '嫩豆腐', '老豆腐', '北豆腐', '南豆腐', '内酯豆腐'],
  ['葱', '小葱', '大葱', '香葱', '葱花', '葱段'],
  ['蒜', '大蒜', '蒜瓣', '蒜头', '蒜末', '蒜蓉'],
  ['姜', '生姜', '姜片', '姜末', '姜丝'],
  ['青椒', '尖椒', '柿子椒', '线椒'],
  ['茄子', '长茄', '圆茄', '紫茄子'],
  ['五花肉', '猪五花', '带皮五花肉'],
  ['牛肉', '牛腩', '牛里脊', '牛腱'],
  ['米', '大米', '米饭', '白米'],
  ['面', '面条', '挂面', '手擀面'],
  ['鸡胸肉', '鸡胸', '鸡脯肉'],
  ['香菇', '冬菇', '花菇'],
]

const ALIASES: Record<string, string> = (() => {
  const map: Record<string, string> = {}
  for (const group of SYNONYM_GROUPS) {
    const canonical = group[0]
    for (const name of group) map[name] = canonical
  }
  return map
})()

/** 这些前缀属于描述而不是身份：新鲜番茄 就是 番茄 */
const STRIPPABLE_PREFIXES = ['新鲜', '冰鲜', '冷冻', '速冻', '现杀', '鲜']

export function normalizeName(raw: string): string {
  let s = raw.normalize('NFKC').trim().toLowerCase()
  s = s.replace(/[\s\u3000]+/g, '')
  // 去掉「番茄（中等大小）」这类括号补充
  s = s.replace(/[（(][^）)]*[）)]/g, '')
  if (!s) return ''

  for (const prefix of STRIPPABLE_PREFIXES) {
    // 留两个字以上，避免「鲜」把「鲜虾」削成「虾」之外的东西
    if (s.length > prefix.length + 1 && s.startsWith(prefix)) {
      s = s.slice(prefix.length)
      break
    }
  }

  return ALIASES[s] ?? s
}

/** 把「番茄、虾仁, 嫩豆腐」这类用户输入拆成数组 */
export function splitNames(input: string): string[] {
  return input
    .split(/[,，、;；\n\r/]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/** 拆分 + 归一化 + 去重 */
export function normalizeList(input: string | string[]): string[] {
  const raw = Array.isArray(input) ? input : splitNames(input)
  const out: string[] = []
  for (const item of raw) {
    const name = normalizeName(item)
    if (name && !out.includes(name)) out.push(name)
  }
  return out
}
