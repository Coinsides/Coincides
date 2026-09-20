export type DirectInstructionKind = 'memory' | 'proposal';

/** C2's two direct-command families. These rules classify only; they never execute. */
export const DIRECT_INSTRUCTION_RULES = [
  {
    kind: 'memory',
    tool: 'save_memory',
    description: '句首直接要求记住、别忘了、下次提醒我；排除引用、否定和讨论指令含义。',
    prompt: '“记住／别忘了／下次提醒我”类自然直令必须调用 save_memory；只有成功收据返回后才说已保存。保存的是记忆，不承诺定时通知。',
  },
  {
    kind: 'proposal',
    tool: 'create_proposal',
    description: '句首直接要求整理、归纳、梳理材料；排除引用、否定和讨论指令含义。',
    prompt: '“整理这份材料”类自然直令必须走 create_proposal 的 organized_note 提案；先取得现役工具要求的项目与来源，缺少时询问，不编造来源、不直写笔记。',
  },
] as const;

const chinesePrefix = /^(?:请(?:你)?(?:帮我)?|帮我|麻烦(?:你)?(?:帮我)?)\s*/u;
const englishPrefix = /^please\s+/iu;
const ordinaryDiscussion = /(?:是什么意思|的意思是什么|这(?:个|些)词|的用法|如何使用这个词|what does .+ mean)/iu;

/** Deliberately small, anchored keyword grammar; unsupported/mixed prose stays unclassified. */
export function classifyDirectInstruction(text: string): DirectInstructionKind | null {
  const command = text.trim().replace(chinesePrefix, '').replace(englishPrefix, '');
  if (!command || /^[“”‘’"'`「『《]/u.test(command) || ordinaryDiscussion.test(command)) return null;
  // The Chinese positive “别忘了” is explicit memory intent, not a negation of saving.
  const memory = command.match(/^(?:记住|记着|别忘了|不要忘了|下次提醒我)\s*[:：,，]?\s*(.+)$/u)
    ?? command.match(/^(?:remember|do not forget|don't forget|remind me next time)\s+(.+)$/iu);
  if (memory?.[1].trim()) return 'memory';
  if (/^(?:整理|归纳|梳理)(?:一下)?\s*(?:这(?:些|份|个)?|那(?:些|份|个)?|当前|选中(?:的)?)?\s*(?:材料|资料|文档)(?:$|[\s，,:：。！!]|成|为|里|中)/u.test(command)
    || /^把\s*(?:这(?:些|份|个)?|那(?:些|份|个)?|当前|选中(?:的)?)?\s*(?:材料|资料|文档)\s*(?:整理|归纳|梳理)(?:$|[\s，,:：。！!]|成|为)/u.test(command)
    || /^(?:organize|summarize)\s+(?:(?:this|these|the|selected)\s+)?(?:material|materials|document|documents)\b/iu.test(command)) return 'proposal';
  return null;
}

export function renderDirectInstructionPrompt(toolName: (name: string) => string = name => name): string {
  return `### 自然直令映射（C2 amendment）\n${DIRECT_INSTRUCTION_RULES.map(rule => `- ${rule.prompt.replace(rule.tool, toolName(rule.tool))}`).join('\n')}\n- 仅上述两类直接指令；引用、否定、解释词义或普通讨论不触发映射。提案登记不等于应用，仍由人采纳。\n\n`;
}

export const NOTE_PATCH_PROMPT_BOUNDARY = '不能直接写改笔记正文；修改已有文字只能发 note_patch 提案，逐 patch diff 由人采纳或拒绝，采纳经人门 text-save 保存并沿现役撤销；生成笔记只能发 organized_note 提案。不能直接创建卡片，不能碰人类判断记录，不能无仪式做不可逆删除。';
