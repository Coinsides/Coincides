> **状态 (Status)**: ready(HQ 按代理权翻牌;**派发排 T5 之后**,单 builder 串行)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-21
> **单号**: V14 收尾批 · T6 行内链接三靶(G3+G12 合体)
> **上游**: ①缺口清单 G3(正文零链接原语,Henry 点名真缺口)+G12(两种跳法:跳本笔记章/块+**笔记引用笔记**);②TextFlow-Contract.md §3 现物:`InlineStructuredObject.semantic_kind` 联合体**已含 `inline_link`**(「在场不承诺激活命令或渲染器」)——本单=激活休眠种,⛔造新种;B8 锚重映射/降级规则现成全套照用;③A4 先例:契约修正=在契约文档增补明示节,零改既有条款。**契约门单,谨慎级最高。**

# T6 · 行内链接(inline_link 激活,三靶)

## 一 · 契约修正(先行)

1. TextFlow-Contract.md §3 增补「inline_link 激活」小节:`field_values` 形状=三靶联合——`{target_kind:'heading', block_id, unit_id}`(章锚=heading 单元身份,章是派生域零章 id)/`{target_kind:'block', block_id}`/`{target_kind:'note', note_id}`;**明文重申 inline_formula/inline_code 照旧 disabled 零动**;增补⛔改 §3 既有任何条款(B8 重映射/降级/坐标规则一字不动);
2. 修正节措辞照 A4 先例:声明新增内容+声明未动清单;Result 附契约 diff 全文。

## 二 · 三面行为

1. **创建(人门)**:选中正文文字→「链接到…」(工具条选中态入口+斜杠,C4a 同词双入口纪律):选靶面板两栏=本笔记章树(现役 chapterProjectionService 投影)+本项目笔记列表(现役列表接口);落 `inline_link` 记录(anchor_range=选区,B8 语义);⛔跨项目靶⛔URL 外链(外链=另案,别混);
2. **渲染**:链接文字着 accent token+现役链接样式惯例;点击:heading 靶→现役 selectChapter/selectHeading 通道;block 靶→现役块导航;note 靶→文档标签条开该笔记(C4a 现役 open 通道);**悬空靶**(目标已删)→惰性文字+降级标记(B8 降级语义近亲),⛔崩⛔自动清除记录;
3. **打印/导出**:降级为纯文字(契约明文;⛔打印蓝字⛔脚注编号——v1 极简);
4. **read_note 投影**:链接以纯文字随现役 flat 投影走,⛔扩 schema 键;
5. **编辑生命周期**:B8 既有规则全权治理(锚内编辑→range null+证据保留),⛔新逻辑;撤销/重做沿现役快照。

## 三 · Agent 面

⛔本单:提案生成含链接(organized_note/note_patch 载荷零动)——记 Result 遗留给后续小单;⛔新工具⛔prompt。

## 四 · 出生公约(照守)

链接色=accent token;⛔字面 hex⛔硬编码字体;悬空态用 ink-muted 族。

## 五 · 验收与禁区

1. 定向:三靶创建/点击导航/悬空惰性/打印降级/B8 编辑重映射(锚内编辑降级)各断言+双入口对象等价(现役斜杠与菜单对象 deepEqual 零变,新增仅此一项);
2. 回归:client 全库+server 全量(**111 文件零排除,补集含 v13WildernessExecute 与本地真 OCR 路,文件预算 ≥600000ms,⛔按 120s 判红**);
3. 证据落 `docs/audits/2026-09-21-t6-inline-link-builder/`,原始日志 `.codex-tmp/t6-link/`;
4. **禁区(带射程)**:⛔一切 git 写操作(add/commit/push/reset/改 .git);只读 git 明文允许(含验证门内部);git 检查+secrets 两组件留 HQ,其余按「非 git/secrets N 组件」申报;⛔semantic_kind 联合体扩缩(inline_link 已在)⛔inline_formula/inline_code 激活⛔B8 重映射规则改动⛔坐标契约(UTF-16 存储/grapheme 交互照旧)⛔TextFlow 真相 schema 其余部分⛔新表新列⛔read_note schema 扩键⛔提案载荷⛔新工具⛔prompt⛔Relation/判定域(行内链接=呈现级导航,⛔接 relations 表)⛔新依赖⛔用户库⛔真实模型调用(射程=远程 LLM/API 与凭据消耗;本地 MinerU OCR 子进程=构建内确定性工具,全库整跑明文含它)⛔URL 外链;⛔新设计安全对抗类用例(既有功能回归全库整跑明文允许零排除);合成凭据形值 ≤20 字符;新 `--sk-` token 后段 ≤18 字符;
5. Result:契约 diff 全文+逐件行号+测试数字+出生公约自查+未做项;冲突停线举证。
