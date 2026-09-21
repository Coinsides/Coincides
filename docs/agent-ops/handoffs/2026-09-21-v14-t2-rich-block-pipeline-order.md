> **状态 (Status)**: done(2026-09-21 HQ 收官:builder 环境两红=Python 系,HQ 机 server 主集真全绿含该两文件;client 2341/2341 逐字对上;双门绿。Agent 产样张级笔记的正门自此开通)
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

## Result

**2026-09-21 · Codex builder：实现已落地，验证 STOP，尚未收口；状态保持 ready。** T1 当前 HQ 状态为 done，前置已满足。停线原因是本机 Python/MinerU 的两处既有回归失败；不排除、不跳过、不将环境红冒充全量绿，也不自行翻牌。证据入口：[builder 审计](../../audits/2026-09-21-t2-richblock-builder/README.md)；原始日志 `.codex-tmp/t2-richblock/`。

### 一 · 载荷扩容：实现通过

五族已接：文字、table、component、toc、paragraph furniture。`organizedNoteBlocks.ts:7` 为允许家族；`:25` 是生成/apply 共用归一化；`:43` 为保原文降级+warning；`:62` 直接用现役 `createNoteBlockSchema`（其 table/component/toc 下游校验器逐字复用，未另写上限校验）；`:67` 为 toc 零真相；`:31` 保留首个存活章节的精确角色。未知类型（含 media/item_ref/note_ref/quote/callout）与未知组件 kind 均不入富块。B3 服务端此前无专用校验，本次 `validators/paragraphFurniture.ts:5` 定义唯一语义 Zod，并由人门 `validators/index.ts:776` 与提案共用。

### 二 · apply 归门：实现通过

采用工单允许的第二种改法：保留现役整案事务/INSERT，在写每块前走与人门同一份创建 Zod。入口 `organizedNoteProposals.ts:313`，重验 `:366`，placement 外观落槽 `:356`，提案数据与 warning 回存 `:409`，apply 返回 warning `:427`。table/component 保留原生 content_json；furniture 写 note_block_placements.display_overrides_json；toc 不存正文/题名/来源锚/章节缓存。错误块保 plain_text/body，不丢块、不废整案。未改人门路由与自动采纳规则；已验证各型沿现役块删除/恢复可回退。

### 三 · 生成端：实现通过，amendment 可逆

`organizedNotePrompt.ts:2` 完整保留旧五句，`:10` 追加块型选择与约束，`:25` 拼接；生成器消费在 `organizedNoteProposals.ts:227`。确定性回退 `:182` 读取完整 fragment（来源摘录仍保现役短引用），`organizedNoteBlocks.ts:100` 识别 Markdown 表、编年行、引文与提示；至少三个不同章节标题时在 `organizedNoteProposals.ts:188` 放空载荷 toc。未改 create_proposal 名称或 channel_write，未改主 Agent prompt / C2 note_patch。

UTF-8 SHA-256：旧 prompt（569 bytes）=`2a330527f4d46fff0f1e6bcde4fe308c10b667480a575026c7e6789042cc9274`；新 prompt（2460 bytes）=`0159d0c94773cc51599ab235dcdb00960521a9eaae96f30903f3d88470cd46cf`；精确移除新节后=`2a330527f4d46fff0f1e6bcde4fe308c10b667480a575026c7e6789042cc9274`。新节 1891 bytes，hash=`167d353bc18f635c73e986e3e777be2e552bb5d75b7e6a0decad4c474b8fa547`。契约见 `docs/contracts/Organized-Note-Rich-Block-Prompt-Amendment.md:7`；测量 JSON 与施工前原件均留证。

### 四 · 收件箱预览：实现通过

`proposalInboxModel.ts:26` 同源生成「表格 数据行×列」「时间线 N 条目」「柱状图/折线图 组×点」「目录」「引文/提示框」摘要，数字现算；`:84`/`:85` 暴露逐块与提案 warning。Agent 收件箱 `ProposalInbox.tsx:37` 展开全块摘要；项目材料页领域预览 `CourseDetail.tsx:1448` 遍历全部块、`:1449` 复用同一摘要、`:1457` 展示 warning，去掉旧 8 块截断。无全保真 renderer。显式采纳/整案丢弃入口保留，未自行 apply。

### 五 · 评测与验收：功能验证通过；全量环境两红停线

- 新 `server/scripts/agent-eval/scenarios/14-rich-block-pipeline.ts:14`：显式 scriptedOnly；`:16` 经现役 create_proposal 分派；`:40` 零 turns；`:44` 断言 pending 无笔记写入；`:62` 经人门 apply 并验五族行形状/降级账/目录投影；`:86` 验整案丢弃。实测 3/3，provider 调用与轮次均 0。
- 评测场空轮接法：`types.ts:49`、`discovery.ts:19`、`harness.ts:28`（live 凭据读取前拒绝 scriptedOnly live），`harness.test.ts:80` 追加合法零轮测试；既有场景零改。
- 定向：6 文件 **54/54**。新增 server 文件 `v14OrganizedNoteRichBlocks.test.ts:25,48,65,90,105,122,154,161` 共 8 测试，覆盖五族同源、上限、降级、外观语义、apply/恢复、确定性合成和哈希；前端 `proposalInboxModel.richBlocks.test.tsx:18,26` 共 2 测试，覆盖真实数量与人门/警告；`server/package.json:40` 纳入常驻主集。最新 server 测试同时进入最终全量。
- client 全库最终 **230 文件，2341/2341**，build 通过；agent 族独立 **339/339**；既有 13 scripted 场景 **122/122**，连新场景 **14/14 场景、125/125 断言**。
- server 全量最终：递归 server/src + server/scripts，**111 文件零排除**，包含 `v13WildernessExecute.test.ts`；每文件 **600000 ms**，本轮约 109 秒完成。Node 报告 **1118 tests：1116 pass / 2 fail / 0 skipped / 0 cancelled / 0 retry**。其中 Python 文件加载失败不代表其内部用例已执行通过。
- **STOP 证据**：`server-all.log:61806` 为 `v2SourceMineruWiring.test.ts` 加载阶段 `python.exe ENOENT`；`:62646` 为 `v2SourceRegionCells.test.ts` 固定 uv CPython 启动失败、MinerU code 101。失败集复验 **67/69** 同形。首次全量另外 10 处由 builder 测试隔离目录设在仓内引起，已只修测试启动器、改新建系统临时空目录，最终全量证实恢复；首跑日志 `server-all-initial.log` 保留，未改产品凭据服务。
- 验证门申报严格为 **「非 git/secrets 的 25 组件」25/25 exit 0**，不是完整门全绿。末次改动后 client 全库/构建、server 全量/构建、知识测试 **29/29**、知识 check、评测 typecheck、docs:check 均已复验（server 全量保留上述两红）。

### 六 · 禁区与出生公约：已自查；未做项明确

新增生产载荷只含数据与语义；table/component/toc 走 strict 现役 Zod，furniture 仅 variant+source/label；无新 CSS、字面颜色、硬编码字体、私有间距、坐标值或 `--sk-` token。TextFlow 仅构造现役形状与角色，schema 零改。未改 C2 宪法、主 prompt、note_patch、read_note 输出、坐标契约、Relation/判断域；无新表新列、新工具、新依赖、真实模型调用或用户库访问；无 git 写操作。新合成凭据值均 ≤20 字符；新测试是本单功能边界用例，未新设计安全对抗用例；既有回归零排除。

说明书同步 `app-operating-manual.md:83`；显式执行知识指纹更新，`agent-knowledge-fingerprint.json:4` 的能力名集 hash 仍为 `85acce270a2224893e4c011ce4e46e1625f01d5ceba81f7f393cca7aa2a78b15`，`:145` 仅说明书日期推进。自动索引同步 `docs/agent-ops/INDEX.md:144`、`current-state/INDEX.md:17`、`docs/contracts/INDEX.md:25`。全部逐件行号与源码 hash 见审计 `files-and-lines.json`。代码由主 builder 串行修改；子 agent 仅只读核对，既存未跟踪文件未动。

**未做/未完成**：HQ 在可用 Python 环境复跑 server 全量、门尾 git 检查+secrets 扫描、最终抽检放行；builder 不越权修环境或豁免测试。真实模型效果、全保真预览、主观浏览器验收未做。确定性回退仅识别显式结构，不从散文猜图表数量。以上停线项解决前，本 Result 不构成收口或 done。
