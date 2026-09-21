> **状态 (Status)**: ready(HQ 按代理权翻牌;**派发排 T1 收口之后**——姑息模式单 builder 串行,且五族含 `toc` 依赖 T1 落地)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-21
> **单号**: V14 收尾批 · T2 富块提案管线(G6,⭐清单权重最高件)
> **上游**: ①缺口清单 G6(Henry 铁则主件:样张型笔记要 Agent 能做出来;organized_note 今天只产 text 块,表格/时间线/图表/引文/提示框/目录一个产不出);②C2 宪法③(Agent 永不直写用户文字;提案+人门=唯一通道)——本单**零改**该宪法,只扩提案的表达力;③视觉设计宪章(active)第四条出生公约;④HQ 现物普查:提案块白名单 `organizedNoteProposals.ts:226`(纯文字族,越界静默降级),apply=裸 INSERT `:437` ⛔经块服务/验证器——病灶即此。

# T2 · 富块提案管线(Agent 产出样张级笔记的正门)

## 一 · 载荷扩容(五族)

1. `OrganizedNoteBlock` 白名单(`services/organizedNoteProposals.ts:226`)扩四型:`table`/`component`/`toc` + 引文·提示框**样式**(quote/callout ⛔新块型——现役语法=paragraph 块 `display_overrides_json` 的 `paragraph_furniture_v1` 键,B3 交付);连同现役文字族合称**五族**;⛔`media`(资产不能凭空产,明确出界)⛔`item_ref`/`note_ref`(真相绑定件,提案不代绑);
2. 各型载荷**复用现役验证器逐字同源**:table→`validators/tableBlock.ts`(64×64/65536/行宽一致),component→`validators/componentBlock.ts`(kind 闭集 timeline/chart_bar/chart_line 三种+各自 params 上限;⛔借开放信封投未知 kind——Agent 产出面限内建闭集,信封的开放性留给产房),toc→T1 落定的载荷形状;furniture→variant∈{quote,callout}+自由文本 source/label;
3. 越界类型的现役**静默降级 paragraph**行为改为**降级+warning 记账**(warnings 数组现役字段),⛔拒单⛔丢块——生成不完美是常态,降级要有痕;
4. 出生公约:提案块载荷**零视觉字面值**(表格/组件/目录的样式全由渲染端 token 决定,载荷只有数据与语义;furniture 只带 variant+文本)。

## 二 · apply 归门(裸 INSERT 之病)

1. `applyOrganizedNoteProposal`(`:401`)落块改走**与人门同源的创建语义**:每型经其现役验证器校验后落行(table/component 载荷入 content;furniture 写 `display_overrides_json` 的 `paragraph_furniture_v1` 键;toc 照 T1 语义零真相);申报改法:或调现役块创建服务、或裸 INSERT 前逐型过同一 Zod 验证器——**二选一皆可,但校验器必须与人门逐字同一份**,⛔平行实现;
2. 校验失败的块:降级 paragraph(plain_text 保内容)+warning,整案 apply ⛔因单块失败而崩;
3. apply 仍为**人门**(领域提案收件箱 apply 按钮,现役);⛔任何自动 apply。

## 三 · 生成端(提示词教块型选择)

1. create_proposal 的 organized_note 生成提示扩块型指南:何时用表格(枚举对照类)/时间线(编年类)/图表(数量对比类)/引文框(原文引用)/提示框(注意事项)/目录(≥3 章);走 **F17/A4 amendment 通道**(带 SHA-256 可逆性证明:移除新节即还原原哈希——C2 先例);
2. `deterministic_fallback` 路(`:184`)扩最小确定性合成:夹具材料含表状/编年状内容时产对应型块——**测试走此路零真实模型**(C3「测试走确定性回退」纪律);
3. ⛔新工具⛔改 create_proposal 工具名/信道归类(仍 channel_write)。

## 四 · 收件箱预览(诚实档)

1. 领域提案收件箱的 organized_note 预览对四新型渲染**类型标注摘要**(「表格 N×M」「时间线 N 条目」「目录」+furniture 标记),⛔本单做全保真预览(纸面渲染 apply 后即真;预览保真候后续);摘要必须如实(数字从载荷现算);
2. 可见/可拒/可退三不变量照旧:预览可见、整案可弃、apply 后块可走现役删除/撤销。

## 五 · 评测与验收

1. 评测场新 scripted 场景一枚:夹具材料→organized_note 提案含≥四族块→apply→逐型断言落行形状(table content/component kind+params/furniture 键/toc 零真相)+降级路(一块越界型→paragraph+warning)——零 provider turn;
2. 定向:载荷校验/apply 归门/降级记账/预览摘要/amendment 哈希可逆;回归:client 全库+server 全量(**全量补集含 v13WildernessExecute,实测 ~460s,文件预算 ≥600s,⛔按 120s 超时判红**)+agent 族回归+评测场既有 13 场景全绿;
3. 证据落 `docs/audits/2026-09-21-t2-richblock-builder/`,原始日志留 `.codex-tmp/t2-richblock/`。

## 六 · 禁区(全部带射程)

⛔一切 git 写操作(add/commit/push/reset/改 .git 目录);只读 git 子命令明文允许(含验证门脚本内部调用);verify 门的 git 检查+secrets 扫描两组件留 HQ 收口,builder 跑其余组件按「非 git/secrets 的 N 组件」申报;⛔改 C2 宪法(Agent 直写仍禁,note_patch 通道零变)⛔read_note 输出 schema 扩键⛔TextFlow 真相 schema⛔坐标契约⛔新表新列(块行走现役 note_blocks;组件/表格载荷走现役 content 槽)⛔media/item_ref/note_ref 入提案⛔组件开放信封投未知 kind⛔新工具⛔Relation/判定域⛔新依赖⛔真实模型调用⛔用户库;⛔新设计安全对抗类用例(既有功能回归全库整跑明文允许零排除);合成凭据形值 ≤20 字符;新 `--sk-` token 后段 ≤18 字符。Result:六节各结论+逐件行号+测试数字+出生公约自查+amendment 哈希对+未做项;冲突停线举证。
