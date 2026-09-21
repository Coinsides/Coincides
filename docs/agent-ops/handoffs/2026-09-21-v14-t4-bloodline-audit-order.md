> **状态 (Status)**: done(2026-09-21 HQ 收官:普查 310 文件零遗漏,🅰 违约=0——血统法全线本already守;🅲 4 处候「代码等宽字体角色」设计;停线项=docs 索引,HQ 重生成后 docs:check 绿;**零代码改动⇒server 全量沿 T3 收口同树真全绿,数字不作废**;client 由 builder 实跑 2368/2368;双门绿)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-21
> **单号**: V14 收尾批 · T4 图鉴血统检查(现役元素硬编码值普查+最小修)
> **上游**: 视觉设计宪章(active)第四条血统法:纸面公民的视觉取值只许 token/角色/系统刻度;图鉴 99 件的现役实现从未按此审计过。**核查+最小修,⛔扩面⛔重构。**

# T4 · 血统检查(色与字族两项,纸面公民射程)

## 一 · 普查

1. 射程=**纸面公民**的样式实现:`client/src/pages/Notes/canvasEngine/` 下 blocks/layers/各投影组件的 CSS(module.css 与内联样式);⛔应用壳(侧栏/工具条/面板等 NoteDetail 壳层与全局 UI——它们不是纸面公民,另属后续);
2. 查两项(宪章第四条的头两款):**字面色值**(hex/rgb/hsl 直写)与**硬编码字体族**(font-family 直写非 var(--sk-*) 角色);逐处登记:文件:行号/值/所在元素/判定;
3. 判定三档:🅰 **无歧义违约**(有现成 token 对应,如 #2b2620 ≈ var(--sk-ink))→本单修;🅱 **有意为之候裁**(如皮肤预设文件本身的 token 快照字面值=合法源头;打印专用色)→登记不动;🅲 **缺 token**(需要新 token 才能归位)→登记不动,⛔本单造 token。

## 二 · 最小修

1. 仅 🅰 档:字面值→既有 token/角色引用,**逐处申报替换前后值与视觉等价论证**(色差肉眼级即等价;⛔顺手调色);
2. 五皮肤断言扩展:被修的元素若尚无 token 引用断言,补存在性级一条(T1 先例);
3. ⛔动几何/间距/尺寸(血统法第三款间距刻度=另批,本单只查色与字族)。

## 三 · 验收与禁区

1. 产出:`docs/audits/2026-09-21-t4-bloodline-builder/` 普查全表(🅰🅱🅲 三档全登记,含零命中文件申报射程)+修复清单;
2. 定向:被修元素渲染断言;回归:client 全库+server 全量(**111 文件零排除,补集含 v13WildernessExecute 与真 OCR 路,文件预算 ≥600000ms,⛔按 120s 判红**);
3. **禁区(带射程)**:⛔一切 git 写操作(add/commit/push/reset/改 .git);只读 git 明文允许(含验证门内部);git 检查+secrets 两组件留 HQ,其余按「非 git/secrets N 组件」申报;⛔新 token⛔新表新列⛔TextFlow 真相 schema⛔坐标契约⛔新工具⛔prompt⛔Relation/判定域⛔新依赖⛔用户库⛔真实模型调用(射程=远程 LLM/API 与凭据消耗;本地 MinerU OCR 子进程=构建内确定性工具,全库整跑明文含它);⛔新设计安全对抗类用例(既有功能回归全库整跑明文允许零排除);合成凭据形值 ≤20 字符;新 `--sk-` token 后段 ≤18 字符(本单⛔新 token,此条仅防御);
4. Result:普查数字(命中/三档分布)+逐修行号+测试数字+未做项;冲突停线举证。

## Result

> **From**: codex(builder)
> **日期**: 2026-09-21
> **判定**: **STOP — 普查完成，验收未完成；非 git/secrets 门的 docs:check 失败后停线，保持 ready，不代 HQ 放行。**
> **证据目录**: `docs/audits/2026-09-21-t4-bloodline-builder/`
> **原始日志**: `.codex-tmp/t4-bloodline/`

### 普查与最小修

全树枚举 canvasEngine **467 文件**，去除 **158 个测试文件**后，对 **309 个非测试 TS/TSX/CSS**逐个筛查，并纳入投影实际 import 的 `NoteDetail.module.css` 纸面选择器。扩展筛查分母 **310 = processed 310 + remaining 0**；310 包含为防漏而筛查的壳/hooks/数据服务，不等于纸面组件数量。逐文件射程、零命中与排除项见证据目录 `coverage.md`；逐处文件:行:列、值、元素、判定及输入 SHA-256 见 `census.md` / `census.json`。

**射程内 195 处：字面色 179、硬编码字族栈 16；🅰 0 / 🅱 191 / 🅲 4。** 11 文件命中、299 候选文件射程内零命中；另有 **5 处**壳层/非样式命中单列排除。定义源头与消费分开申报：直接投影/CSS 8 处、供值链 28 处、工厂/派生源头 159 处，不能把 195 处读作 195 项违约。额外检查了 `font` 简写、TS `families` 间接映射与 CSS fallback；未只查 `font-family`。

**修复清单为空：🅰 0，所以源码/测试修改 0，逐修行号与替换前后值/视觉等价论证的集合为空。** 被修元素定向断言、新增五皮肤 token 引用断言均不适用，不为凑修改抹除显式用户字体或改变测量栈。未新造 token，未动几何/间距/尺寸。

🅱 191 项仅登记候裁，不代 HQ 豁免：159 处是合法定义源头；27 处是已取 token 的兼容回退；5 处是用户字体覆盖或文档默认字体回退。标注回退还由 `client/src/components/ReferenceTag/ReferenceTag.tsx:4,40` 在全局页面消费，删去它不能保证纸面射程外视觉等价；纸笔已首先取 `--sk-ink`。逐处理由均已入表。

🅲 四处保留，需后续角色设计，未越单造 token：

| 文件:行 | 所在元素/供值 | 判定证据 |
| --- | --- | --- |
| `client/src/pages/Notes/canvasEngine/blocks/ParagraphFurniture.module.css:9` | `.source` 引文出处的 `font` 简写 | 与 `paragraphFurniture.ts:11–13,45–47` 的固定出处字体测量耦合；document 字体可被用户改，label 在 workbench 为 mono，均不能直接证明视觉/排版等价。 |
| `client/src/pages/Notes/NoteDetail.module.css:3790` | `.codeLineGutter` | 缺代码专属等宽字体角色，title/label 不等价。 |
| `client/src/pages/Notes/NoteDetail.module.css:3802` | `.codeTextArea` | 同上，与测量栈配套。 |
| `client/src/pages/Notes/canvasEngine/typographyMeasurementService.ts:111` | `typographyTextMetrics` 的 `code_line.fontFamily` | 分页投影/测量共用该栈；不能直接换成任意 CSS var。 |

对 `client/src` 只读核查，`--font-mono` 只有消费没有定义，不能当现成 token 使用。NoteDetail 中其 4571/4900/5234 三处消费为 ContentGroupPanel 壳层，未纳纸面违约数。

### 验证数字与停线证据

| 验证 | 本次结果 | 原始日志 |
| --- | --- | --- |
| client 全库 | **231 文件 / 2368 tests 全通过**，33.94s | `gate-05-test-unit.log` |
| verify 门 | **非 git/secrets 25 组件：25 已尝试，24 PASS / 1 FAIL** | `gate-result.json` 与 `gate-01-*` 至 `gate-25-*` |
| client / server build | 均 PASS | `gate-22-build-client.log` / `gate-23-build.log` |
| server 接线静态检查 | **111 文件 / 111 wired / 0 exempted / 0 unwired**，不是执行结果 | `gate-01-check-test-wiring.log` |
| server 全量 | **未启动，0/111 文件的本次全量执行证据**；部分 server 门组件的单独通过不能替代全量 | 无 server-all 运行日志；`server-pending-plan.json` 明记 NOT_RUN |

**停线冲突：`docs:check` 与本单验收要求不相容地返回失败，修复点在纸面最小修射程之外。** `gate-25-docs-check.log:5` 报告 `过期: docs/agent-ops/INDEX.md`，退出 1。失败发生时尚未追加本 Result，未改任何 agent-ops 文件；`pre-result-tracked-diff.log` 的只读 diff 文件列表为空。审计产物位于 `docs/audits/`，不在该索引的 agent-ops 扫描输入中。没有擅自生成/改写索引，没有继续启动 server 全量。证据目录另存 `stop-evidence.log` 与 `validation-summary.json`。

门按原 `verify:v2-bn8-runtime` 组件顺序执行，未改验证链；git 检查与 secrets 两组件照单留 HQ。测试环境使用内存 DB、隔离临时资产/凭据目录和空 dotenv，不继承 provider 凭据；合成 JWT 值长度 16，未用真实凭据。CodeGraph CLI 与 `rg` 不在 PATH、无可调用 CodeGraph MCP，先尝试后改用 PowerShell/Node 枚举；未重建索引。独立子线程仅只读核查，无并行源码写入。

### 未做项与继续条件

- **server 111 文件零排除全量尚欠**：包括主集 84 + 补集 27，明确含 `scripts/v13WildernessExecute.test.ts` 与本地真 OCR 的 MinerU/RegionCells 路。静态计划与逐文件 SHA 见 `server-pending-plan.json`，待用运行器 `run-server-all.mjs` 保留 **600000ms** 文件预算；计划不是运行证据。没有将此前工单成绩挪作本次回归。
- `docs:check` 首步失败，inventory/glossary 后续子步未执行；索引漂移待 HQ 处理并放行继续验证。工单仍为 ready，不能宣称收尾完成。
- 未做主观视觉/真实浏览器验收或截图对比；无 A 修改，未新增定向/五皮肤断言。未设计新安全对抗用例。
- 未执行 git 写操作、新 token、新工具/prompt、新依赖、用户库/真实模型调用、TextFlow schema、坐标契约或 Relation/判定域改动；开工已有用户未跟踪文件未动。
- 普查配方及完整派生集合已入证据目录，不把唯一副本留 scratch。源码输入 SHA 再核对无漂移；本次只写审计证据、scratch 与本 Result。
