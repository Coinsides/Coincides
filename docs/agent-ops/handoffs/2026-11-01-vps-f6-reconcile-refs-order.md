> **from**: claude(Main_Designer)
> **to**: 临时工程对话1(builder)
> **status**: ready
> **单号**: VPS-F6 · 桥后遗症两修单(Reconcile 同源误判 + Note Proposal 引用错配)
> **上游**: Tester(1) round-02 中途报(A-10/A-11 候选,版本 a74ccd71 实测);两者均为桥通后首次走通的既有路径上的病

# VPS-F6 · 桥后遗症两修单

## 一 · 修一:Reconcile 同源判定把两个 null 当同一文档

- **现象**(Tester 实测):30 组提案全误报——24 组 OVERLAP 把**两份不同 PDF**配对,理由却是「page ranges overlap within the same source document」;另 6 组 SAME_CONCEPT 是同一 md 同一 segment 的标题片段配自己的正文片段。
- **根因**(Tester 已定位):桥接材料 document_id 全为 null,`materialReconciliationProposals.ts` 约 :424 的 `left.document_id !== right.document_id` 在两边都 null 时判为「同一文档」。
- **修法**:同源身份改为**来源恒等键** = document_id 与 source_record_id 的组合(或经 source_material_id 回溯),null≠null;**同 segment 自配对排除**(标题片段 vs 自身正文片段不构成 SAME_CONCEPT);slice(0,30) 截断保留(噪声修掉后自然不挤)。
- **测试**:①两份不同 Source 的桥接材料→零 OVERLAP(阳性对照:退回旧判定→误报重现);②同一 Source 内真实页重叠→仍报(别把真的修没了);③同 segment 自配对→排除;④documents 旧路行为不变。

## 二 · 修二:Note Proposal 每块引用全相同(fallbackRefs 挂满全体)

- **现象**(Tester 实测):23 块的 source_references 完全相同=全体 segment 的前 3 个引用;英文 Source 的块也引中文 PDF。
- **侦察+修法**:查 `organizedNoteProposals` 引用装配——fallbackRefs 不应无条件挂到每块;改为**每块引用=真正喂了该块的 segment/fragment 的引用**;仅当某块零引用时才用兜底,且兜底要申报形状(宁可空也别错配,方向候你侦察后在回执申报)。
- **测试**:多源提案→各块引用与其来源 segment 对应、互不相同;零引用块的兜底行为断言;单源路径回归。

## 三 · 验收与测试面

服务端定向(reconciliation/proposals 家族+新用例)正门运行器;阳性对照≥1;⛔真实模型调用(AI 模式走确定性/mock);⛔全库马拉松。

## 四 · 纪律

照抄现役全套(⛔git 写/⛔.env 值/⛔用户库/⛔动锁文件/⛔安全对抗类用例/合成值规矩/措辞中性)。

## 五 · 回执协议

本文件尾部 `## Result` 五件套;证据 `docs/audits/2026-11-01-vps-f6-builder/`;完工短讯。

## 六 · 不在射程

Reconcile/Proposal 的 UI 与文案(🅱 批);「Note Proposal 只取 Map 已采纳材料无提示」(🅱 批);材料区上传后刷新(🅱 批);向量检索版。


## Result — 2026-11-01 · 临时工程对话1

**执行状态**:`done`,交工作树,未 commit。

### 修一:Reconcile 同源判定(`services/materialReconciliationProposals.ts`)

- **来源恒等键** `sourceIdentity`:有 `document_id` 用 `document:<id>`,否则用 `source:<source_record_id>`,再兜底 `material:<source_material_id>`。null≠null 是结构性保证(恒非空、恒可辨);OVERLAP 改用恒等键比较。
- **同 segment 自配对的真因与排除**:根因有一半在我 F3 的设计——给 Source fragment 设 title 时,标题块下的段落沿用了标题块的标题。于是按标题聚组时,**标题片段本身**与它的正文片段被配成 SAME_CONCEPT(Tester 那 6 组)。
  - 排除规则:content 归一化后等于 title 的片段(标题本身)不进标题聚组。
  - 没有改用「segment 相同」作判据:`firstSegmentForFragment` 按片段在 segment 内的序号取首个,片段同属多个 segment 时结果不确定,不可靠。
  - 也没有改成「标题组必须跨源」:既有用例「same-document page overlap and conflict」依赖**同一文档内**同标题两块构成 CONFLICT,那是 legacy 的既定语义,必须保留。
- **另修一处会自生的噪声**:Source fragment 是一块一条、单页的。同一 Source 同一页上的相邻块按页码必然「重叠」,修掉 null≠null 后会在同源内部刷屏(12 块同页 = 66 对)。新增 `sameProjectionPage`:同一 material 的两个投影块页码完全相同时不算 OVERLAP——它们是同一份文本的相邻分块,不是重复。
- **关于「同一 Source 内真实页重叠必须仍报」(申报)**:按现行一块一条的 fragment 形状,Source 内不会产生跨页区间重叠,因此 Source 的 OVERLAP 实际只在「同一原件经两个 material」时才可能出现。**真重叠在 legacy 文档路径上原样保留并有用例锁住**(chunk 页段 1–3 与 2–4 → OVERLAP)。若你认为 Source 应有块组级的重叠信号,属另案设计。
- `slice(0, 30)` 保留;`FragmentEvidence.document_id` 改为可空(下游 `evidence_items` 列本就可空,`groupEvidenceIds` 已按 isString 过滤)。

### 修二:Note Proposal 每块引用(`services/organizedNoteProposals.ts` + `services/organizedNotePrompt.ts`)

- **侦察结论**:病在 AI 路径。岛上 DeepSeek 有钥匙,走的就是这条。模型产出的块与 segment 之间**没有任何关联字段**,代码只能把「全体 segment 的前 3 个引用」(`fallbackRefs`)挂给每一块,于是 23 块引用全相同,英文块也引到中文 PDF。确定性路径本来就是按 segment 逐块挂引用,无此病。
- **修法**:
  - 材料简报给每个 segment 编号 `[S1]`、`[S2]`…;
  - 新增**追加式** prompt amendment `ORGANIZED_NOTE_SOURCE_ATTRIBUTION_AMENDMENT`,要求每个非 TOC 块写 `"source_segments":[n,…]`,只列内容真正来自的段,宁缺勿猜;
  - 每块引用 = 所标 segment 的引用,按 fragment 去重,至多 3 条。
- **兜底形状**(申报):块没有标注,或标注编号非法 → `source_references: []`,并在该块 `warnings` 里写入 `"No source segment was attributed to this block."`。**宁空不错配**。TOC 块恒无引用。

### 测试(实跑实报)

- **新文件 `vpsF6BridgeAftercare.test.ts` 7/7**(证据 `docs/audits/2026-11-01-vps-f6-builder/f6-tests.tap`):
  1. 两份不同 Source 同页码 → 零 OVERLAP;
  2. 一份 Source 12 块同页 → 零 OVERLAP(不刷屏);
  3. 标题片段不与自己的正文配 SAME_CONCEPT;
  4. 两份 Source 同名标题 → 仍报 SAME_CONCEPT,证据只有两段正文,不含标题片段;
  5. legacy 文档同文档真实页重叠与冲突 → 仍报 OVERLAP 与 CONFLICT;
  6. AI 路径(合成钥匙 + 桩 fetch 读回带编号的简报并按真实编号作答,⛔真实网络与模型调用)→ 英文块只引英文 Source、中文块只引中文 Source、两者不同;无标注块与非法标注块为空引用并带警告;TOC 无引用;
  7. 确定性路径回归:每块引用都来自本段 Source。
- **阳性对照 ×3**,各自独红,均已还原:
  - a. 恒等键退回 `document_id` 比较 → 仅 1 红(`positive-control-a-null-identity.tap`);
  - b. 每块引用退回 fallbackRefs → 仅 6 红(`positive-control-b-fallback-refs.tap`);
  - c. 去掉标题片段排除 → 3、4 红(两条都依赖它,`positive-control-c-heading-self.tap`)。
- **回归**:reconciliation / proposal 家族 + F3/F5 + NoteBlockLifecycle 共 7 文件 **127/127**(`f6-server-targeted.tap`)。
- **类型检查**:87 条 = 基线(`server-tsc.log`)。

### 随改的既有锁定用例(申报)

`v14OrganizedNoteRichBlocks`「T2 generator amendment removal recovers the original 569-byte SHA-256」:原断言是「只去掉 T2 amendment 即还原 base 哈希」。按 amendment 只追加的既定纪律,改为「去掉**全部** amendment(T2 + F6)还原 base 哈希」,base 哈希与 569 字节原样不动;另给 F6 amendment 加关键词断言。

### 测试夹具申报

text 格式的 Source 不接受 artifact 带 page_index,物化会失败。夹具因此先按无页码物化,再把 `source_page_index` 写进投影块 metadata,模拟 PDF 投影的形状。只塑造测试数据,产品代码不受影响。

### 环境申报

未读 `.env`;无 git 写操作;无真实模型调用(AI 路径全程桩 fetch);无用户库接触。

## Main_Designer 收口 — 2026-11-01

- **实质验收**:HQ 复跑新文件+RichBlocks+OrganizedNoteProposals 15/15;恒等键(前缀三选一恒非空)与 sameProjectionPage 代码核阅;三处阳性对照各自独红(定位到修)照单全收;127/127 家族回归与 tsc 基线采信;
- **设计申报三件核准**:①Source 内一块一条形状下无真实跨页重叠,legacy 真重叠有用例锁——「Source 块组级重叠信号」记另案候需;②兜底=空引用+块级警告(宁空不错配)正合设计意图;③T2 冻结用例改「去全部 amendment 还原 base」——追加式纪律的正确演化,base 哈希原样;
- **记一笔**:builder 自报 SAME_CONCEPT 真因半在其 F3 设计(标题下沿用 title 致自配对)——回头咬自己单子的自报文化,记正分;
- F6 闭合,随收口第八轮部署。
