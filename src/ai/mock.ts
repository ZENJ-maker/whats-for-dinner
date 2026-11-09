import type { AiDish } from '@/lib/types'

/**
 * 演示数据。
 *
 * 没有配置 API key 时走这里，保证线上 demo 永远点得动——
 * 作品集最怕的就是「打开链接，点一下，报错」。
 */
const CATALOG: AiDish[] = [
  {
    name: '番茄虾仁',
    minutes: 15,
    difficulty: '简单',
    ingredients: ['番茄', '虾'],
    seasonings: ['盐', '糖', '料酒', '淀粉'],
    steps: ['虾仁用料酒、盐、淀粉抓匀腌 10 分钟', '番茄切块下锅中火炒出红汁', '下虾仁翻炒到变色，加半勺糖调味收汁'],
    flavor: '酸甜',
    tags: ['荤菜', '快手'],
  },
  {
    name: '虾仁豆腐煲',
    minutes: 18,
    difficulty: '普通',
    ingredients: ['虾', '豆腐'],
    seasonings: ['生抽', '蚝油', '葱', '蒜'],
    steps: ['豆腐切块，淡盐水泡 5 分钟去豆腥', '爆香蒜末，下虾仁炒到微卷', '加豆腐和半碗水，生抽蚝油焖 6 分钟', '撒葱花收汁'],
    flavor: '咸鲜',
    tags: ['荤菜', '下饭'],
  },
  {
    name: '拍黄瓜',
    minutes: 5,
    difficulty: '简单',
    ingredients: ['黄瓜'],
    seasonings: ['蒜', '生抽', '醋', '香油'],
    steps: ['黄瓜拍裂切段', '加蒜末、生抽、醋、香油拌匀', '冷藏 5 分钟更爽口'],
    flavor: '清爽',
    tags: ['凉菜', '快手'],
  },
  {
    name: '虾仁炒黄瓜',
    minutes: 8,
    difficulty: '简单',
    ingredients: ['黄瓜', '虾'],
    seasonings: ['盐', '料酒', '蒜'],
    steps: ['黄瓜切片，虾仁腌 5 分钟', '热锅下虾仁滑炒至变色盛出', '下黄瓜大火翻炒 1 分钟，回锅虾仁加盐'],
    flavor: '清淡',
    tags: ['荤菜', '快手'],
  },
  {
    name: '肉末茄子',
    minutes: 25,
    difficulty: '普通',
    ingredients: ['茄子', '五花肉'],
    seasonings: ['豆瓣酱', '生抽', '蒜', '糖'],
    steps: ['茄子切条撒盐静置 10 分钟挤干水分', '肉末炒散出油，下豆瓣酱炒香', '下茄子翻炒，加半碗水焖 8 分钟', '收汁前加蒜末和少许糖'],
    flavor: '酱香',
    tags: ['荤菜', '下饭'],
  },
  {
    name: '蒜蓉西兰花',
    minutes: 10,
    difficulty: '简单',
    ingredients: ['西兰花'],
    seasonings: ['蒜', '盐', '蚝油'],
    steps: ['西兰花掰小朵焯水 1 分钟', '热油爆香蒜末', '下西兰花大火翻炒，加盐和少许蚝油'],
    flavor: '清淡',
    tags: ['素菜', '快手'],
  },
  {
    name: '土豆炖牛肉',
    minutes: 60,
    difficulty: '较难',
    ingredients: ['土豆', '牛肉'],
    seasonings: ['生抽', '老抽', '姜', '八角'],
    steps: ['牛肉冷水下锅焯去血沫', '热锅煸香姜片，下牛肉和生抽老抽翻炒上色', '加热水没过牛肉，小火炖 40 分钟', '下土豆块再炖 15 分钟，收汁'],
    flavor: '酱香',
    tags: ['荤菜', '炖菜'],
  },
  {
    name: '蛋炒饭',
    minutes: 12,
    difficulty: '简单',
    ingredients: ['米', '蛋'],
    seasonings: ['盐', '葱', '生抽'],
    steps: ['隔夜饭打散，鸡蛋打匀', '热油炒蛋至半凝固，下米饭翻炒', '加盐和少许生抽，撒葱花出锅'],
    flavor: '家常',
    tags: ['主食', '快手'],
  },
  {
    name: '西红柿鸡蛋汤',
    minutes: 15,
    difficulty: '简单',
    ingredients: ['番茄', '蛋'],
    seasonings: ['盐', '香油', '葱'],
    steps: ['番茄切块炒软出汁', '加水煮开，淋入蛋液推成蛋花', '加盐、香油，撒葱花'],
    flavor: '清淡',
    tags: ['汤', '快手'],
  },
  {
    name: '香菇滑鸡',
    minutes: 30,
    difficulty: '普通',
    ingredients: ['香菇', '鸡胸肉'],
    seasonings: ['生抽', '蚝油', '淀粉', '姜'],
    steps: ['鸡胸切片，用生抽淀粉抓匀腌 15 分钟', '香菇切片', '爆香姜片，下鸡肉滑炒至变色', '下香菇和蚝油翻炒，加少许水焖 5 分钟'],
    flavor: '咸鲜',
    tags: ['荤菜', '下饭'],
  },
  {
    name: '青椒土豆丝',
    minutes: 12,
    difficulty: '普通',
    ingredients: ['土豆', '青椒'],
    seasonings: ['醋', '盐', '蒜'],
    steps: ['土豆切细丝泡水去淀粉', '热油爆香蒜末，下土豆丝大火翻炒', '加青椒丝，淋醋和盐快速出锅'],
    flavor: '酸辣',
    tags: ['素菜', '快手'],
  },
  {
    name: '手撕包菜',
    minutes: 10,
    difficulty: '简单',
    ingredients: ['包菜'],
    seasonings: ['干辣椒', '生抽', '醋', '蒜'],
    steps: ['包菜手撕成片，洗净沥干', '热油爆香蒜和干辣椒', '下包菜大火猛炒 2 分钟，淋生抽和醋'],
    flavor: '香辣',
    tags: ['素菜', '快手'],
  },
]

const norm = (name: string) => name.trim()

/** 按现有食材挑最贴合的几道；不够就用目录里的补齐，保证 demo 有内容 */
export function mockDishes(pantry: string[], existingNames: string[], count = 6): AiDish[] {
  const stock = new Set(pantry.map(norm))
  const taken = new Set(existingNames.map(norm))

  const available = CATALOG.filter((dish) => !taken.has(dish.name))
  const scored = available
    .map((dish) => ({
      dish,
      score: dish.ingredients.filter((item) => stock.has(item)).length,
    }))
    .sort((a, b) => b.score - a.score)

  const picked = scored
    .filter((item) => item.score > 0)
    .map((item) => item.dish)
    .slice(0, count)

  if (picked.length >= count) return picked

  for (const dish of available) {
    if (picked.length >= count) break
    if (!picked.some((item) => item.name === dish.name)) picked.push(dish)
  }
  return picked.slice(0, Math.max(1, Math.min(count, CATALOG.length)))
}
