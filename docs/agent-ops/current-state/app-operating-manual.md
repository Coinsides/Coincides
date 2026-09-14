> **状态 (Status)**: active(v1,2026-09-14 Henry 令建;**操作应用前必读**——读者=产品内 Agent/Fable/builder,不是最终用户)
> **层 (Layer)**: 现状 / 应用操作说明书
> **防腐条款**: 交付新面的工单,申报义务含"说明书条目已更新/无涉";每版段收口过一遍 diff。发现缺条错条=当场补(steward: Fable)。

# Coincides 应用操作说明书 v1

**这份文档回答"怎么用",不回答"为什么这样设计"(那是 design/ 的事)。** 每条=对象是什么+界面路径+API 门+最小例+边界。v1 条目优先收录已知的翻车点。

## 〇 · 对象地图(先建世界观)

- **Project(course)**:一切的家。笔记/材料/源/目标/任务/卡组都挂在某个 project 下;
- **Note(笔记)**:一张纸=**块(blocks)的序列**。块经 placement 排序落页,纸面渲染由布局引擎投影。**title+description 只是封面信息,⛔是笔记内容**;
- **Board(板)**:思考桌面,纯投影域。三种居民:members(引用 note/content_group/item)、edges(带 label 连线)、visuals(形状等装饰);板必须有 soul(purpose);
- **两座内容库(⚠️互不相通)**:**材料库(documents)**——`/documents/upload` 进,Note Proposal 生成、Agent 的 search_documents/get_document_content 吃这里;**Source Library(sources)**——`/sources/upload` 进,引用源/imprint/重投影世界吃这里。**chat Agent 今天检索不到 Source Library 的内容**(已实锤的割裂,修法候拍);
- **Deck/Card**:卡组挂 project;卡=知识内容,**创建唯一通道=提案**(create_card 已退役);
- **提案(proposal)**:Agent 对人说话的信道。pending→人 apply/discard;待处理提案在 **Agent 面板头部「提案」收件箱**可见,显示计数、类型摘要、chat/材料来源与时间,逐条处理;材料三型(material_map/organized_note/material_reconciliation)的 CourseDetail 既有面保留;
- **Agent 会话**:conversations+SSE 消息流;工具活动经 tool_start/tool_end 事件可见。

## 一 · 笔记:怎么写正文(翻车条目 #1)

- **UI**:打开笔记→双击纸面开始写;
- **API**:`POST /api/notes/:id/blocks`,body:`{ block_type:'paragraph', content_json:{ text_flow:{ textflow_version:1, units:[{ id:'<blockId>:unit', text:'正文', writing_role:'paragraph', indent_level:0, order_index:0, metadata:{}, status:'active' }], inline_structures:[], metadata:{} } }, plain_text:'正文' }`——order 自动排尾;
- 建笔记:`POST /api/notes {course_id, title, description?, page_format:'a4_portrait'}`;
- **边界**:无 heading 块型(章节块候 V14,章题暂用【】段落);块正文改写走 text-save 门(`PUT /note-blocks/:id/text-save`);**Agent 零笔记写权**(宪法③,note_patch 候 14.4)——Agent 侧生成笔记的唯一路=organized_note 提案。

## 二 · 上传:先想清楚去哪座库(翻车条目 #2)

- 要走 **Note Proposal/材料地图/Agent 文档检索** → 材料库:`POST /api/documents/upload`(multipart: file+course_id);
- 要走 **引用源/快照/重投影** → Source Library:`POST /api/sources/upload`(multipart: file+course_id+origin_entry_kind:'project_upload'|'library_upload');
- **一致性警示**:两库互不相通;传错门=下游功能全空。给 Agent 材料让它"用",今天只有材料库有效。

## 三 · 提案生命周期

- 列表 `GET /api/proposals?status=pending`;应用 `POST /api/proposals/:id/apply`(organized_note 空 body 即可);丢弃 `POST /api/proposals/:id/discard`;
- **收件箱 UI**:打开 Agent 面板→头部「提案」计数→展开待处理列表。可用型逐条「采纳」或「丢弃」,操作后刷新列表并提示结果;不可用型显示「此类提案暂不支持一键采纳」,仍可丢弃。material_reconciliation 的空 body apply 仅标记已复核,按钮为「标记已复核」,不执行调和动作。零 pending 时入口收敛;对话流结束刷新待处理计数;
- 人门生成整理笔记:`POST /api/proposals/organized-note {course_id, document_ids:[...], note_title?}`(=CourseDetail「Note Proposal」按钮);**已知限制**:生成输入被截(每段 3 片段×500 字,总 12k)——长材料只会整理出开头,候源管线批修;
- chat 路:让 Agent 发 organized_note 提案(A3a 已开);**apply 仍须人门**。

## 四 · 板:怎么摆思路

- 建板 `POST /api/boards {title, purpose:{title}}`(soul 必须有);
- 上件 `POST /api/boards/:id/members {member_kind:'note'|'content_group'|'item', member_id, x,y,w,h}`;
- 连线 `POST /api/boards/:id/edges {from_member_id, to_member_id, label}`;
- 装饰 `POST /api/boards/:id/visuals {visual_kind:'shape', w,h, data:{}}`;
- 边界:板是投影——摆错零真相损失;别把板当存储。

## 五 · Agent 能力边界表(给 Agent 的自我说明,也给操作者预期管理)

**能(全部过写门:同事务史记+收据+可撤)**:建目标/子目标/任务/卡组/分区/时间块×批;改时间块;标任务完成(**必须携用户原话锚**——用户没亲口说完成就是不能标);删时间块(**两段复述确认仪式**);发提案(八型,含 organized_note);存/搜自己的记忆;读:read_note/read_board/read_content_groups/read_annotations_relations+search_documents/get_document_content(⚠️只见材料库)。

**不能(宪法四禁令+现状)**:写/改笔记正文(③);直建卡片(提案唯一);碰判断域(relation confirm 族);任何不可逆删除无仪式;模拟 UI(④);检索 Source Library(现状缺口);代用户 apply/discard 提案。用户可在 Agent 收件箱处理提案,但 chat 回复确认不等于已应用。

**操作者纪律**:让 Agent"记住"某事后,**查一眼记忆表**(`GET /api/settings/agent-memories`)——qwen 有"说存没存"前科(空头支票);Agent 宣称做了任何写动作,以收据/events 为准⛔以回复文字为准。

## 六 · 测试专用

- 测试账号凭据在 repo 根 .env(CODEX_TEST_*);实测项目命名「实测·主题·日期」;
- 隔离栈起法:env 覆写 PORT/DB_PATH/各资产目录+DOTENV_CONFIG_PATH,`node --import tsx src/index.ts`;
- 新用户 Agent 可用的前提:active_provider 与机器钥匙库(%LOCALAPPDATA%/Coincides/provider-credentials.json)对得上——本机现有 dashscope/deepseek。
