> **状态 (Status)**: active
> **层 (Layer)**: 现状 / Current-State（Agent 分析 · 设计决定）
> **日期 (Updated)**: 2026-07-04
> **权威 (Authoritative)**: 设计方向 = 是（作为 Source 车道的规格前身 + roadmap 输入）；产品事实以 `PRODUCT.md` / current-state 为准
> **来源**：现状 map（run wtleazfsi）+ 工具调研（run w8z3ebz27 + 手写补查 af5c8f9b）+ 06-28 三层源重建愿景 + PI-048 调研 Outline。接 `docs/agent-ops/analysis/purpose-frame-build-decomposition.md`。

# Source 重建：现状 · 三层契约 · 工具选型 · 纠错 UX

> **一句话**：现有 Source = 漂亮的关系骨架 + 初级的扁平文字内核（snapshot 是假的）。方向 = 落 06-28 三层，**先立 SourceArtifact/Anchor 契约（接缝），把今天的糙解析当默认后端，日后换 PaddleOCR-VL 填真保真**。默认路径全本地、全开源、全中文强；真正的产品杠杆是**置信度驱动的一键纠错 UX**。

---

## 1. 现状（grounded · 4-agent map 实读代码）

### 1.1 骨架漂亮、内核初级 —— 4 条实锤
1. **提取 = 扁平文字 v1**。`documentParser.ts:291` 把所有输入压成一个 `extractedText` 字符串。无 typed blocks / bbox / 阅读序 / **LaTeX / 表格结构**。扫描件 OCR = Claude Haiku vision，prompt 写死 *"Return only the extracted text"*（`documentParser.ts:104`）—— 连能吐结构的路径都被命令丢结构。数学、表格被主动销毁（xlsx→CSV `:343`；OCR 只在原生文字 <100 字符才触发 `:323`）。
2. **snapshot = 投影的投影**。`source_snapshot_pages` 只存拼接纯文本，且**从 `document_chunks` 派生**（`sourceSnapshots.ts:129` generated_from='documents_and_document_chunks'），不碰原始字节/渲染页。页码是**编的**（chunk 序号+1 `:56-58`，或整篇塞进假的第 1 页 `:195-205`）。**可变**（每次重生 UPDATE + 删重插 `:131-176`）→ 当不了冻结收据。
3. **锚点只到「页」**。`text_start_offset/text_end_offset` 三张表都有，但**永远写 NULL**（`sourceAnchors.ts:186` Potemkin 列）；bbox 到处都没有。最细能锚到 `document_chunk`（页级）。`note_block_sources`（`015:77-92`）把 chunk+页+excerpt 揉一起、丢了笔记自己的子块 offset（= 06-28 §九A 盲点，坐实）。
4. **06-28 的 KEY TRAP 落成 bug**：锚的靶子(层2)= `source_snapshot_pages`，而它是用 `document_chunks`(层3蒸馏文字)拼的 → 层2层3共用一个扁平底料。

### 1.2 复用地图（好消息：非常有利）
承重的"假保真"表都是**派生可重建、无不可替代数据**；不可替代的东西都在稳定 KEEP 表。

| 组件 | 处置 | 说明 |
|---|---|---|
| `documents.file_path`（原始字节） | **KEEP** | 证据根 / 层1，唯一已经对的东西 |
| `documents.extracted_text` | **KEEP·降级** | 当便宜的检索/兜底文本，别再当"源" |
| `documentParser.ts` | **EXTEND 到接口后** | 别删（是能跑的糙默认），改成 `SourceParser` 接口的一个实现 |
| `document_chunks` | **KEEP·改角色** | 留给 embedding/检索，**别再当锚靶** |
| `source_materials/fragments/segments` | **KEEP** | 用户策展的库层，不可替代；上游改指 artifact block |
| `note_block_sources` | **KEEP·扩契约** | 用户/AI 写的锚 ORIGIN，不可替代；加 block_id + char offset |
| `source_anchor_links` | **KEEP** | anchor↔{note_block, evidence, proposal} 多态链，设计得很好 |
| `source_snapshots/pages` | **REPLACE** | 派生可弃；换成真 `source_artifact` + `source_artifact_block` |
| `source_anchors` | **EXTEND** | 保留行 + 页列，锚靶从 chunk 改指 block、开始写 offset/bbox |

---

## 2. 三层契约方案（06-28 愿景落成）

### 2.1 三层模型
```
① 原始字节（documents.file_path）—— 证据根，永不动
   ↓ OCR/VLM（可换后端）
② SourceArtifact —— 忠实·结构化·可寻址：typed block + bbox + 阅读序 + LaTeX + 表格。【仍是源】
   ↓ 按目的、lazy 蒸馏
③ 蒸馏内容（ContentGroup/TextFlow）—— 每 member 锚回 ② 的某 block
```
纪律：**② 可 eager（无框、便宜、忠实）；③ 必 lazy（按目的）**。OCR 的 block(②)≠ NoteBlock(③)，别自动转。

### 2.2 SourceArtifact / SourceArtifactBlock 契约（要立的接缝）
```
source_artifacts        { id, document_id, provider, provider_version,
                          content_hash, page_count, status, created_at }   ← 版本化/内容寻址，不可变
source_artifact_blocks  { id, artifact_id, page_index, reading_order(显式 int),
                          kind ∈ {paragraph,heading,list,table,figure,formula,caption,code,header,footer,aside},
                          bbox(x0,y0,x1,y1)+page_dims, text,
                          latex?(公式), table_html?(表), image_asset_id?(裁剪的图),
                          confidence, provider_meta }
```
- **不可变 + 版本化**（`content_hash`）→ 当 member 的**冻结原文快照**有稳定的东西可指；re-parse = 新版本，不改旧收据。
- `image_asset_id` → 手绘图/图表**裁剪成资产放回**（Notion 式），复用现有 canvas asset 存储。

### 2.3 SourceParser 可换后端接口
```
interface SourceParser { parse(bytes, mime) -> SourceArtifact }   // + provider/version 盖章
```
- 注册今天的 `documentParser` 为 **degenerate `native` 默认后端**（先吐"每页一个大 block"）→ 集成前不破坏任何东西、零用户数据迁移。
- 给 `paddleocr-vl` / `mineru` / `mistral` 留槽（见 §3）。

### 2.3.1 可插拔 = 开源扩展点 + i18n（Henry 2026-07-04）
背景：本产品要**开源**，用户母语未知（Henry 以中文为基准；英文天然兼容；但可能有日/韩/小语种为基准的用户）。这把 `SourceParser` 接口从"我们内部的换挡机制"**升级成社区扩展点 + 用户配置项** —— 而它一行核心代码都不用为此改，因为"契约优先"本来就是干这个的。
- **不是"一语言一解析器"**：现代 VLM 解析器本就多语言（PaddleOCR-VL / MinerU 109 语、Mistral 170）—— 日/韩在默认后端已能跑。可插拔真正解决的是：① 语言专精工具（某日语用户找到更好的）；② 偏好/信任/合规（有人不想用某国实验室工具）；③ 无 GPU → 换云 API；④ 未来更好工具。
- **开源原则（优雅答案）**：**你拥有「契约」+ 一个合理「默认后端」；接口是插口，社区/用户来填。** 不追每种语言，只做接缝。ship PaddleOCR-VL 当默认（已覆盖中/英/日/韩）+ 给云 adapter 留位（用户填自己 key）。
- **让可插拔真正成立的设计**：
  1. **契约语言中立**（真正的 i18n 约束）：阅读序要能处理 RTL（阿拉伯语）/ 竖排（日语）；`kind` 分类语言无关。**别把中文假设焊进契约。**
  2. **后端注册表 + 选择策略**：一个默认 + 可 per-doc/per-user 覆盖；配置驱动 → **"想什么时候换就什么时候换" = 改配置、不重编译**；运行时切、下一篇生效；老文档可用新后端**重解析成新版本**。
  3. **每个后端声明能力**（支持语言 / 公式 / 表格 / 手写）→ app 据此挑/提示（STEM → 路由到会公式的后端；不支持的语言 → 提示换）。
  4. **artifact 盖 `provider/version` 章**（契约已有）→ 可复现；换后端 = 新 artifact 版本、老的仍有效。
- **v1 别过度**：手动默认 + 覆盖就够；自动按语言/文档类型选后端（PI-048 R2 detection）= 锦上添花、先不做。

### 2.4 锚点改指 block（相对不焊 + 抗幻觉）
- `source_anchors` / `note_block_sources` 的靶子从 `document_chunk_id` → `source_artifact_block_id`（+ block 内 char span）。
- **激活那些 Potemkin offset 列** → 锚到行/区域级 → "跳回源"高亮真区域 + bbox 叠加。
- 有锚 = 搬来可查；**无锚 = 生成 → 标红送审**（天生的 hallucination 探测器）。

### 2.5 双闸门（PI-048）
**现在定契约形状 + 建表 + parser 接口（早闸，便宜、解锁一切）；晚点建真 OCR/VLM 管线（混凝土）。** 今天的糙解析当默认后端撑着。

---

## 3. 工具选型（2026-07 联网查证 · Henry 已拍板）

### 3.1 决定
**默认路径全本地、全开源、全中文强：**
- **主(唯一常驻)= PaddleOCR-VL 1.6**（百度，Apache-2.0）—— OmniDocBench 当前第一(96.33)，公式 CDM 94.21 / 表格 TEDS 92.76 **均超 MinerU**；0.9B、~2.5–4GB 显存，**4060/8GB 很稳**。
- **备(可换,不常驻)= MinerU 2.5**（上海 AI Lab，开源）—— 中文同样强、**手绘图区分类路由最好**；8GB 上偏紧,一次跑一个,当交叉验证/难页备胎。
- **契约范本 = PaddleOCR-VL + MinerU 输出直接归一**（`parsing_res_list` / `content_list.json` 取超集）。**Docling 踢掉**（中文实验性，不需要它当模板）。
- **Mistral OCR 4 = 纯可选逃生口**（无 GPU / 最脏照片手写，用户主动开）→ **移出默认本地路径**。

> 更新 06-28 旧假设：当时默认 MinerU；现按当前基准，**PaddleOCR-VL 反超**、更轻、许可更净 → 升为默认。

### 3.2 对照（打分尺 = 我们 6 个契约字段 + 场景）
| | 契约契合 | 中文 | 公式/表格 | 手写 | 本地/Windows | 许可 | 角色 |
|---|---|---|---|---|---|---|---|
| **PaddleOCR-VL 1.6** | 5.5/6 | 很强(百度·榜一) | **最强** CDM94/TEDS93 | 印刷+手写公式最好 | Docker/WSL·2.5–4GB | **Apache-2.0** | **主·本地默认** |
| **MinerU 2.5** | 5/6 | 很强(上海AI Lab) | 强 CDM88/TEDS88 | 支持·未基准·**图路由最好** | WSL/Docker·8GB+ | 自定义(宽松·天花板) | **备·交叉验证** |
| Mistral OCR 4 | 6/6 | leader(厂商说) | 强 | ~88.9%·未必强 | 云/销售闸 Docker | 闭源·云 | 可选逃生口 |
| ~~Docling~~ | 4.5/6 | **弱(实验性)** | 英强中弱 | 弱 | 纯 Python·CPU·原生 Win | MIT | 踢掉 |

### 3.3 手写中文 = 命门（承重·所有工具都栽这）
- 手写公式：PaddleOCR-VL 通用工具里最强(v1.6 CDM 97.49)；真 SOTA 是专门 HMER(Uni-MuMER 类)，**可选、非必需**。
- **手写「中文文字」是所有工具最弱轴**：PaddleOCR-VL 手写中文 ~85.9% vs 手写英文 92.6%。潦草学生页谁都脆。
- **专项基本不用叠**：texify 已废(并进 Surya)、pix2tex 只单公式、Pix2Text 改成包 VLM；表格专项(Camelot/pdfplumber)对手写不适用。→ 只在**低置信手写公式**挂可选 fallback，不做默认阶段。
- 手绘图：两家都 crop 成图片资产+bbox 放回，**不会丢**。

### 3.4 硬件
RTX 4060 = 8GB。PaddleOCR-VL(0.9B) 很稳；MinerU(1.2B) 偏紧但能跑。Windows 上走 **Docker/WSL2 本地服务(sidecar)**，不是 pip 装完就跑。

---

## 4. 纠错 UX 原则（真正的杠杆）

> **手写中文注定 ~86%、抽不干净是必然 → `confidence` 字段是承重的，UX 要让「改」极其顺手。Source 做得好不好，不取决于"抽得多准"，取决于"抽错了改得多快"。**

- 低置信 block 显式标出 → 一键纠错 → 人改了就落 member 本体（不回写源）。
- 扣住：契约的 **per-block confidence**（抗幻觉：无锚/低置信→送审）+ 红线 **"Agent 能编的人 100% 能编"**（抽错人一键改）。
- 这也回答"为什么 confidence 要 per-block"：它驱动送审/纠错路由，不是装饰。

---

## 5. 先后 + 与目的层的关系（修订）

现有 Source 基座太糙（页级/可变/假页）→ **接不了真原文快照收据**。所以修订 `purpose-frame-build-decomposition.md §6.4`：

```
U1/U2 目的层（不碰 Source · 先做）
   → Source 契约接缝（早闸：source_artifact/block 表 + SourceParser 接口 + 锚改指 block）
       ← member 快照补全 & 装配管线的前置
      → [member 快照补全 + 装配]
   ‖ 全 OCR/VLM 管线（PaddleOCR-VL sidecar）另排 · 建前跑 PI-048 spike（拿 Henry 真手写中文数学）
```
**目的层仍第一、仍不被 Source 挡**；但"真锚定/真快照/装配"那半，前面要先立 Source 契约接缝。

---

## 6. 待拍 / 下一步

- ✅ 方向已拍：契约优先 + 可换后端 + PaddleOCR-VL 主/MinerU 备（全本地开源中文强）+ Mistral 可选逃生口 + 置信度纠错 UX。
- ✅ 硬件已确认：4060/8GB 够。
- ☐ **第一刀（Source 早闸）**：定 `source_artifact/block` 契约 + `SourceParser` 接口 + 今天解析当 `native` 后端 + 锚改指 block。可在目的层落一半后紧跟排。
- ☐ **建真 PaddleOCR-VL 管线前**：PI-048 spike —— 拿 Henry 真实手写中文数学 + 印刷 STEM 跑一轮，验证保真度 + 校准置信度阈值 + 手绘图裁剪。
- ☐ 待议：contract 的 `kind` 分类粒度（PaddleOCR-VL/MinerU 类目比我们 11 类粗，需轻量后映射）；bbox 坐标空间归一（MinerU 0-1000 / PaddleOCR-VL 像素）。
