> **状态 (Status)**: done
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-14
> **单号**: V14 · 说明书接线单 · Agent system prompt 产品世界观+边界节
> **上游**: `current-state/app-operating-manual.md`(**内容权威,照抄蒸馏⛔自创事实**)+Henry 09-14 令("Agent 要熟练使用并清楚能力边界")+实测两标本(空头支票/提案面谎报)

# 说明书接线单 · Agent 的产品说明

**性质**:产品内 Agent 今天的 system prompt 只有数据清单(课程/卡组/记忆),**没有产品说明**——它不知道笔记由块构成、不知道两座库谁可搜、会向用户宣称不存在的"Proposal 面板"。本单把说明书的世界观+边界蒸馏进 system prompt。⛔新工具⛔改机关⛔改工具行为——纯提示词工程+测试。

## 一 · system prompt 新增「产品说明」节(server/src/agent/system-prompt.ts)

从说明书蒸馏,要点必含(措辞可润,事实⛔改):

1. **世界观**:笔记=块的序列(title/description 只是封面);板=投影桌面;卡=提案唯一;两座库——你能搜的是材料库(search_documents),**Source Library 的内容你今天搜不到**,用户给了 Source 文件而你找不到时,如实告知这个边界并建议用户经材料库上传;
2. **提案真话**:你发的 chat 提案目前**没有界面可见**——⛔告诉用户"去 Proposal 面板查看"(不存在);正确说法:提案已登记,材料类提案可在项目页处理,其余需等待产品的提案面上线(或请用户直接答复你确认与否);
3. **宣称纪律(反空头支票)**:任何"我已保存/已创建/已发送"之前,确认对应工具调用**成功返回**;工具报错=向用户如实说明失败与原因,⛔宣称成功⛔静默吞错;记忆保存必须经 save_memory 工具,对话里记住≠保存;
4. **仪式说明**:标记任务完成需要用户亲口确认(工具会要求原话);删除时间块走两段确认(先复述后果,用户同意才执行)——提前告知用户流程,别让 400/409 显得像故障;
5. 边界收尾:不能写改笔记正文/不能直建卡/不能碰人类判断记录/不能无仪式做不可逆删除。

## 二 · 验收

1. 定向:①prompt 含上述五要点断言(关键词级)②既有 prompt 段(课程/卡组/语境/L1)零变断言③长度预算申报(新节 token 估计);server 受影响面+全量(Python/MinerU 环境红按例申报);client 全库必跑;
2. 行为抽测(隔离库+provider stub 即可):问"你能读我 Source Library 里的文件吗"→回答含边界如实告知;
3. 证据落 `docs/audits/2026-09-14-agent-manual-builder/`(⛔构建产物⛔原始日志);git/secrets HQ 收口。

## 三 · 禁区与申报

⛔新增/修改工具与注册表;⛔改机关;⛔改说明书(发现事实出入=停线举证);⛔新设计安全对抗类用例(既有回归照跑零排除);⛔碰 .git;⛔commit;⛔读 .env key 值;⛔用户库;⛔新依赖;新造凭据形合成值 ≤20 字符(域数据不在射程)。Result 必含:prompt 节全文、token 估计、测试数字、未做项。冲突停线举证⛔自作主张。


## Result

> **From**: codex(builder)
> **日期**: 2026-09-14
> **结果**: builder 交付完成；以下环境/索引红及 HQ 留项未冒充放行。

实现：仅修改 server/src/agent/system-prompt.ts 与既有 server/src/__tests__/v14ContextHint.test.ts；新增产品说明，修正原文三处不存在的 Proposal panel 指引。五类事实全部来自说明书/本单；说明书 SHA-256 前后一致，未改说明书、工具、注册表或机关。新增 8 项测试，原有 5 项保留；六份改动前渲染 hash 验证课程/卡组/语境/L1 等旧内容零变（三句已声明的面板修正除外）。

### Prompt 节全文

```text
## 产品说明
以下是 Coincides 当前的产品事实与操作边界。

### 世界观与两座内容库
- 笔记（Note）是块（blocks）的序列；title/description 只是封面信息，不是笔记正文。
- 板（Board）是思考用的投影桌面，不是内容存储；卡片（Card）创建的唯一通道是提案。
- 材料库（documents）与 Source Library（sources）互不相通。search_documents / get_document_content 只可检索、读取材料库；你今天检索不到 Source Library 的内容。用户给了 Source 文件而你找不到时，要如实说明这个边界，并建议用户经材料库上传，供你检索和读取。

### 提案真话
- 你在 chat 里发出的提案目前没有可见的提案界面；不要告诉用户“去 Proposal 面板查看”，该面板不存在。
- 仅在提案工具成功返回后，才说“提案已登记”。材料类三型 material_map / organized_note / material_reconciliation 可在项目页处理；其余需等待产品的提案面上线，也可请用户直接答复你确认与否。用户在 chat 答复确认不等于提案已应用；apply 仍须人门，不要宣称已经应用。

### 宣称纪律
- 说“我已保存／已创建／已发送”等任何写动作已完成之前，必须确认对应工具调用成功返回，以收据和工具事件为准，不能以回复文字代替执行。
- 工具报错时，如实说明失败与原因；不得宣称成功，不得静默吞错。
- 记忆保存必须调用 save_memory 并成功返回；在对话里记住不等于已保存。

### 仪式说明
- 标记任务完成需要用户亲口确认该任务已完成；工具要求携带用户原话锚 user_utterance_anchor，不能自行推断完成。
- 删除时间块走两段复述确认：先向用户复述后果，等用户同意才执行。提前说明这两类操作的确认流程，避免把所需确认的 400/409 当作普通故障。

### 能力边界
- 不能写改笔记正文；生成笔记只能发 organized_note 提案。不能直接创建卡片，不能碰人类判断记录，不能无仪式做不可逆删除。
```

### Token 估计

新节 951 字符（525 汉字、426 其他字符，包含标题与分隔空行）。按汉字 1–2 token、其他每 4 字符约 1 token 粗估 **632–1157 token**；估计预算 2000。无 tokenizer 新依赖、无真实 provider 调用，不作精确 token/费用承诺。整个空语境 prompt 22642 → 23759 字符，净增 1117（含三句面板修正）。

### 测试数字与证据

- server 受影响面 8 文件：**123/123 通过**，0 失败/跳过/取消，exit 0；包含本文件全部 13 项（原 5 + 新 8）。
- server 全量，所有 test:* 去重 **85 文件**：**786 个 TAP 结果，784 通过、2 失败，0 跳过/取消/todo**；最终真实 exit 1、signal null。两红均 Python/MinerU 环境：v2SourceMineruWiring.test.ts 模块加载 spawnSync python.exe ENOENT；v2SourceRegionCells.test.ts 的真实 MinerU 用例 parser_failure / exit 101，虚拟环境引用缺失 Python。前者整文件加载失败，子测未能枚举；786 不冒充预期全子测分母。环境原样留 HQ。
- client 全库：**170 文件、1737/1737 通过**，0 失败/跳过，exit 0。
- runtime 子项：wiring 84/84（另 1 个 manifest 文件在根 scripts）、registry 5/5、manifest 10/10、parity 10/10；manifest 28 条/14 public、shared-import 262 文件 0 违规、客户端各静态门、model 60 groups、performance 5 场景、client build 与 server build 均通过。各范围有交叉，数字不相加。
- docs:check **未通过**：agent-ops/INDEX.md、current-state/INDEX.md、brainstorm/INDEX.md 三份索引在本单文档回写前已过期；未扩大范围再生索引。链内后续 object-inventory 与 glossary K-1 至 K-3 另行执行通过。总验证门不能宣称全绿。
- 行为抽测：隔离内存库 + provider stub，问“你能读我 Source Library 里的文件吗”，回复明确不能检索/读取 Source Library，并建议材料库上传；真实路由的 prompt 传递、SSE text/done 和持久化一致均通过。此证据不等于真实模型遵从性。
- 首轮全量 TAP 同样 784/2，但 PowerShell 外层未返回；仅中断自有会话，随后同样 85 文件零排除重跑，用 Node 日志 fd 与 exit/close 确认最终退出。详细过程、统计、清单与文件 hash 见 [证据目录](../../audits/2026-09-14-agent-manual-builder/README.md)。目录仅存摘要/结构化证据，无原始日志或构建产物。

### 未做项与禁区申报

Python/MinerU 环境修复、三份文档索引再生、git/secrets 检查、真实模型评估及主观放行均留 HQ。根 verify:v2-bn8-runtime 因内含 git/secrets 未直接调用，其余子项按上表执行。

零 git 命令、未碰 .git、未 commit、未读 .env 密钥值、未碰用户库、未增依赖、未新设计安全对抗用例；既有回归原样运行零排除。新造凭据形环境值 manual-test / v14-local 均 ≤20 字符；既有凭据不改。说明书条目申报：**未改，既有内容蒸馏接线，无新增产品事实或界面**。
