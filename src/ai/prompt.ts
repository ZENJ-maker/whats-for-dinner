export const PROMPT_VERSION = 'v1'

export interface PromptInput {
  pantry: string[]
  existingNames: string[]
  flavors: string[]
  count: number
  mode: 'batch' | 'explore' | 'table'
}

const SYSTEM = `你是一位中国家常菜厨师，熟悉南北口味，擅长用有限的食材做出真正能上桌的菜。
你只输出 JSON，不写解释、不用 markdown 代码块。
铁律：
1. 只能使用用户给出的食材作为主料；盐、油、生抽、老抽、料酒、糖、醋、淀粉、葱姜蒜、豆瓣酱这类基础调料可以默认家里有。
2. 菜名要具体、像人话（例如「番茄虾仁」），不要「番茄虾仁炒蛋风味煲」这种堆词。
3. 每道菜 2–8 个主料食材，用中文常用名，不要写「适量」「少许」。
4. 步骤写 2–6 条，每条一句话，具体到火候或时间。
5. 不要和用户已会做的菜重名。`

export function buildPrompt(input: PromptInput): { system: string; user: string } {
  const { pantry, existingNames, flavors, count, mode } = input

  const modeLine =
    mode === 'explore'
      ? '用户想换换口味，请可以偏向他平时不常做的菜系或做法，避开他已有的口味路线。'
      : mode === 'table'
        ? '用户在配一桌菜：请让荤素搭配、口味有层次，包含一道汤或凉菜。'
        : '用户想尽可能多地看到这些食材能做的菜，请覆盖不同的做法（炒、蒸、炖、汤、凉拌）。'

  const user = [
    `我家现有食材：${pantry.length ? pantry.join('、') : '（还没录入，请随便用常见食材）'}`,
    existingNames.length ? `我目前会做：${existingNames.slice(0, 40).join('、')}` : '我刚开始记录菜谱，还没有菜品。',
    flavors.length ? `我常做的口味偏：${flavors.slice(0, 6).join('、')}` : '',
    modeLine,
    `请生成 ${count} 道菜。`,
    '严格按这个 JSON 结构输出：',
    '{"dishes":[{"name":"菜名","minutes":20,"difficulty":"简单|普通|较难","ingredients":["食材1","食材2"],"seasonings":["生抽","盐"],"steps":["步骤1","步骤2"],"flavor":"家常|酸甜|香辣|清淡|酱香","tags":["荤菜","快手"]}]}',
  ]
    .filter(Boolean)
    .join('\n')

  return { system: SYSTEM, user }
}

/** 从菜品库聚合出「常做口味」，用来让 AI 换路子 */
export function collectFlavors(flavors: (string | undefined)[]): string[] {
  const counter = new Map<string, number>()
  for (const flavor of flavors) {
    if (!flavor) continue
    counter.set(flavor, (counter.get(flavor) ?? 0) + 1)
  }
  return [...counter.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name)
}
