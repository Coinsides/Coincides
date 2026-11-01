> **from**: claude(Main_Designer)
> **to**: 临时工程对话1(builder)
> **status**: ready(段一侦察即可开工;段二施工候 Main_Designer 核准侦察结论)
> **单号**: VPS-F3 · 材料断桥单(两段式)
> **上游**: Tester(1) round-01 A-01/A-02(docs/brainstorm/field-tests/round-01/);Main_Designer 确诊 census 2026-11-01

# VPS-F3 · 材料断桥单(两段式)

## 〇 · 确诊与设计拍定

**病理链(HQ census)**:`source_materials`/`source_fragments`/`material_segments`(迁移 016-018 时代)全部喂自**旧 documents 管线**——`courseMaterials.ts:120` 读 `documents` 表、`:178` 读 `document_chunks`;旧管线 UI 零挂载且已停喂(TD-43)→ Project Material 恒 0、Material Map/Note Proposal/Reconcile 三按钮恒禁、Agent `create_proposal` 恒报 "No material segments found"(organizedNoteProposals.ts:152)、首页 Agent 只检索 documents 读不到 Source(A-02)。新 Source 体系(迁移 045+,source_records/转写/投影笔记)接管了「原件进门」,但其产出从未接进 material 消费层。

**设计拍定(Main_Designer)**:走**换供应商**——保留 proposal/reconcile 消费层(产品主菜),把 **Ready Source 的投影产出**接为材料来源。⛔砍消费层;「改消费面绕开 material 表」仅当侦察证明换供应商不可行时再议。

## 一 · 段一:侦察(即可开工,⛔动任何代码)

交一份拓扑侦察报告(回执本文件+短讯摘要),内容:
1. **准确拓扑图**:source_materials / source_fragments / material_segments / 各 proposal 服务的生成与消费链;三按钮各自的禁用条件(client 侧现物);
2. **换供应商的 schema 代价**:`source_materials.document_id NOT NULL REFERENCES documents` 如何容纳 Source 来源(新列 source_record_id?放宽 NOT NULL 的 SQLite 机制?)——给出最小迁移方案与迁移号(≥现役最大+1);
3. **fragment 最小来源形状**:荐 = 投影笔记的 note_blocks 文本(块级,天然有锚点,合「文字必须住 TextFlow/正文=块」的家法)——验证可行性,或给出更优来源(转写层?)及理由;
4. **A-02 边界**:首页 Agent 的材料检索工具当前读什么(documents/doc_chunks/向量?),把 Source 投影纳入检索面是「随本单顺手」还是「独立一单」——给出工作量级判断;
5. **删除闭环**:Source 删除(deleteSourceWithCompensation)如何同步清理其 material 行——方案里必须有这一腿,否则删 Source 留孤儿材料。

**段一回执后停,候 Main_Designer 核准方案再开段二。**

## 二 · 段二:施工(候核准,按核准后的方案细则)

预期骨架(以核准为准):新迁移 + 桥接(材料 refresh 时 documents∪source_records 双源,旧行为向后兼容)+ 三按钮随材料出现自然解禁 + Source 删除连带清材料 + 端到端 mock 链测试(上传→材料出现→create_proposal 成功)。

## 三 · 纪律(照抄现役+迁移纪律)

⛔git 写操作;⛔读 .env key 值;⛔真实模型调用;⛔用户库;⛔动依赖锁文件;合成值规矩照旧;⛔安全对抗类用例;**迁移纪律**:向后兼容(旧 documents 行照常工作)、幂等、⛔任何清库/重建指令进迁移。

## 四 · 回执协议

段一/段二各自追加 `## Result`;证据 `docs/audits/2026-11-01-vps-f3-builder/`;短讯通报里程碑。

## 五 · 不在射程

Agent 检索面改造(除非段一判「顺手」且我核准);旧 documents 管线复活;Material/Proposal 的 UI 重设计(文案批另行);岛上既存数据回填(部署后运维裁)。
