> **状态 (Status)**: active(v1,2026-09-14 Henry 令建;**操作应用前必读**——读者=产品内 Agent/Fable/builder,不是最终用户)
> **层 (Layer)**: 现状 / 应用操作说明书
> **防腐条款**: 交付新面的工单,申报义务含"说明书条目已更新/无涉";每版段收口过一遍 diff。发现缺条错条=当场补(steward: Fable)。

# Coincides 应用操作说明书 v1

**这份文档回答"怎么用",不回答"为什么这样设计"(那是 design/ 的事)。** 每条=对象是什么+界面路径+API 门+最小例+边界。v1 条目优先收录已知的翻车点。

## 〇 · 对象地图(先建世界观)

- **Project(course)**:一切的家。笔记/材料/源/目标/任务/卡组都挂在某个 project 下;
- **Note(笔记)**:一张纸=**块(blocks)的序列**。块经 placement 排序落页,纸面渲染由布局引擎投影。**title+description 只是封面信息,⛔是笔记内容**;
- **Board(板)**:思考桌面,纯投影域。居民包括 members(引用 note/content_group/item/text_range)、stickies(板内便签)、edges(带 label 视觉连线)、visuals(粉笔/形状等装饰);板必须有 soul(purpose)。视觉线不写 Relation;
- **两座内容库(⚠️互不相通)**:**材料库(documents)**——`/documents/upload` 进,Note Proposal 生成、Agent 的 search_documents/get_document_content 吃这里;**Source Library(sources)**——`/sources/upload` 进,引用源/imprint/重投影世界吃这里。**chat Agent 今天检索不到 Source Library 的内容**(已实锤的割裂,修法候拍);
- **Deck/Card**:卡组挂 project;卡=知识内容,**创建唯一通道=提案**(create_card 已退役);
- **提案(proposal)**:Agent 对人说话的信道。pending→人 apply/discard;待处理提案在 **Agent 面板头部「提案」收件箱**可见,显示计数、类型摘要、chat/材料来源与时间,逐条处理;材料三型(material_map/organized_note/material_reconciliation)的 CourseDetail 既有面保留;
- **Agent 会话**:conversations+SSE 消息流;工具活动经 tool_start/tool_end 事件可见。

## 一 · 笔记:怎么写正文(翻车条目 #1)

- **UI**:打开笔记→双击纸面开始写;
- **API**:`POST /api/notes/:id/blocks`,body:`{ block_type:'paragraph', content_json:{ text_flow:{ textflow_version:1, units:[{ id:'<blockId>:unit', text:'正文', writing_role:'paragraph', indent_level:0, order_index:0, metadata:{}, status:'active' }], inline_structures:[], metadata:{} } }, plain_text:'正文' }`——order 自动排尾;
- 建笔记:`POST /api/notes {course_id, title, description?, page_format:'a4_portrait'}`;
- **边界**:无 heading 块型(章节块候 V14,章题暂用【】段落);块正文改写走 text-save 门(`PUT /note-blocks/:id/text-save`);**Agent 零笔记写权**(宪法③,note_patch 候 14.4)——Agent 侧生成笔记的唯一路=organized_note 提案。
- **纸型自动分页(A1)**:A4/Letter 等纸型中,在流且 auto 的块按正文顺序灌入所属页叠。文字到版心底部按完整渲染行续到下一页,需要时自动续页;同一个逻辑块可以显示在多页,正文仍只存一份。最小例:在 A4 笔记输入一段长正文,超过下墙后继续写,后文自动出现在下页。Web 长页保持单帧向下生长,不转为分页纸。
- **改版与页籍**:通过「笔记外观」改字号/行高/纸型,或进入 Layout 态调四界墙,会重新分页;每页可用自己的纸型和边距,跨页文字按目标页现宽重新换行。自动宽度来自该页现版心,储存的 x/y/width 不因分页被重写;块的 `frame_id` 只随首片换籍,经既有 placement 门保存。分片范围、后续片位置与行盒是派生数据,没有独立正文或分片写入 API。
- **跨片编辑**:在任意一片上编辑仍修改原逻辑块;片尾/片头的方向键继续穿行,跨页选区可复制和删除,撤销/重做后重新分页。块把手、标注章等可点击附属件随首片显示,同一件不会在每片重复出现。编辑面、Overview 和打印共用本次分页结果。
- **整块与溢出**:媒体、投影、组件本版不切片;当前页放不下时整块移到下一页。高于整页版心的块独占一页,保留完整高度并报告结构化溢出,不会静默裁短;应调整块尺寸或该页纸型后再检查成品。
- **自由摆放与墨水**:manual 块和非流覆盖件保持现有摆放,不随正文重排。墨水属于原页,文字跨页或首片换籍都不迁移墨水。正文回缩后既有页帧保留,以免连带删除原页墨水或手摆内容;空页不表示正文被复制。

- **装订面(A2)**:笔记底部工具条→「装订」。打开「显示装订」后,选装订段、手填眉左/中/右与脚左/中/右文案;页码默认占脚中,可换到任一槽。页码占用槽的手填文案暂不显示,移走或关闭页码后恢复。施工默认开,可整体关闭;页眉页脚与页码也可分别关闭。
- **装订段与双页码**:首段从机械第 1 页到末页。「新增段」从上一段起点下一页建立新段,可调「起始机械页」;段结束于下一段起点前一页,最后一段覆盖余页。删除非首段后,前段接管其页区间。机械页序只供寻址,不可改;显示起始数可设,制式为阿拉伯/小写罗马/大写罗马。模板只编辑前后缀,中间 N 必留。例:第 3 页新段、起始数 4、罗马大写、前后缀「[」「]」,该页显示 [IV]。换纸型、异形页或 A1 重新分页后自动按当前机械序重投影;段界超出现有页数时留待后续页面,不制造空页。
- **槽位与样式**:展开某槽可调横移/纵移,单位为纸面逻辑 px;字体/颜色默认继承皮,可逐槽改字族、字号、字重、颜色 token 与斜体。「恢复皮样式」清除该槽覆写。点「保存装订」生效;失败保留输入供重试,取消不写。文案不会自动吸收章名。
- **装订 API**:`GET /api/notes/:id/binding-settings` 返回 `{binding_settings:null|配置}`;`PUT` 同路径 body=`{binding_settings:配置|null}`。设置住笔记级 `notes.binding_settings_json`,页帧/正文不存副本;null 读为施工默认单段。最小配置可由 `shared/types/noteBinding.ts` 的 `createDefaultNoteBindingSettings()` 取得。封面静默 `dropFolioOnCover` 仅预留,本版不创建第 0 页/封面页。通用 Note 与 Agent 工具响应保持既有形状。
- **折缝(A2)**:「View options / 视图」中的「Fold page gaps（折叠页间空白）」或纸页之间的开合按钮,切换连续纸面阅读与显缝阅读。它压缩页帧间空白,保留页高与四界墙,不改正文、分页、manual 块或墨水存储坐标;状态只属于当前笔记的阅读视图。Overview 缩略图、打印始终使用原页几何和装订设置。Web 长页没有页间缝,该开关隐藏。

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
- **铺概念图用便签,⛔每节点一笔记**:短概念、草拟分类直接住板上;有正文价值的内容集中写成图例笔记再挂板。便签不进材料库、不是 Item、不能被 ContentGroup 引用;本版没有转正为笔记入口。旧粉笔仍保留其原操作;
- **便签 UI**:板工具栏「Add sticky」创建中性方签,双击或「Edit sticky」编辑,换行保留,「Save sticky」/Ctrl+Enter 保存,Escape 取消编辑。正文固定 16px/Medium、随文字纵向长高。选中后 Width=Square(240)/Wide(416)、Weight=Light/Medium/Heavy、Color=Neutral/Primary accent;轻档始终中性,中档浅底描边,重档实底反衬。可拖动、钉住、移图层、删除及撤销,删除同时移除相连的板视觉线;
- **便签 API**:`POST /api/boards/:id/stickies {text,x,y,w:240|416,h?,color_index:null|1,weight:1|2|3,layer_id?}`;`PATCH/DELETE /api/boards/:id/stickies/:stickyId`。纯文本上限 12000 字符,`h` 缺省时按内容估高,UI 保存时传实测高度;内容只存 `board_stickies`;
- **连线 UI**:「Connect」依次选两张 member/便签卡;或从悬停/选中卡的四边中点把手拖出一条线,从把手起笔固定该锚。选中线可拖单个弯度手柄(bend=0 即直)、拖两端重新绑定;靠近卡片有淡轮廓预告、靠近把手有吸附,按 Alt 拖端点不吸附。「Unbind start/end」显式解绑,已绑定端随卡移动;
- **线样式**:Line dash=Solid/Dashed,Line weight=1/2/3,Start cap/End cap 各 None/Arrow/Dot。中性线三档分别用 `--board-line-1/2/3`(border-subtle/text-muted/text-secondary),线宽 1.5/2.25/3.375,粗线也更深,端点色随线色;新线沿用当前会话上一条线的样式。新建时只计算一次避让(非端点卡+16px呼吸边距),无挡默认微弯;移动卡后不自动重算,「Reroute」显式重算一次;
- **连线 API**:`POST /api/boards/:id/edges {from:{kind:'member'|'sticky',id,anchor:'auto'|'n'|'e'|'s'|'w'},to:{kind:'member'|'sticky',id,anchor:'auto'|'n'|'e'|'s'|'w'},label?,bend?,dash?,weight?,cap_start?,cap_end?,color_index?,label_position?}`。自由端为 `{kind:'point',x,y}`。旧 `{from_member_id,to_member_id,label}` 请求仍可用。更新/删除=`PATCH/DELETE /edges/:edgeId`;重新取道=`POST /edges/:edgeId/reroute`。`GET /boards/:id` 含 `stickies`。新边 `visual_version=1`;迁移旧边 `visual_version=0,bend=0` 保持原直线、原方向及样式,显式改新视觉轴/端点/取道才升级;
- **标签**:双击线身即建/即编,纯文本可换行、约120px折行、水平显示;Ctrl+Enter/「Save label」保存。拖标签沿弧滑动,近中点吸回;存储 `label_position` 为 0–1,默认0.5。新线绘制跳过标签矩形内线段,不垫底色;
- **排版体检器**:内部纯函数 `inspectBoardLayout({cards,edges})` 接收板坐标下的卡矩形、线折线采样与标签矩形,报告标签×卡、标签×标签、线穿非端点卡、超阈值卡×卡、近平行线重叠及坐标/严重度。只诊断不阻断操作,本单未接 UI/Agent 消费者;画面仍需人工检查。固定端点被其他卡覆盖时,单圆弧可能没有可避开的路径;
- 装饰 `POST /api/boards/:id/visuals {visual_kind:'shape', w,h, data:{}}`;
- 边界:板摆放不改来源正文;便签正文与视觉线仅属板域,不携存储语义关系、不接 `relations`。Agent 的板写动词和新版 `read_board` 消费面不在此版接入范围。

## 五 · Agent 能力边界表(给 Agent 的自我说明,也给操作者预期管理)

**能(域写过写门:同事务史记+收据+可撤;发提案/存记忆为信道写)**:建目标/子目标/任务/卡组/分区/时间块×批;改时间块;标任务完成(**必须携用户原话锚**——用户没亲口说完成就是不能标);删时间块(**两段复述确认仪式**);发提案(八型,含 organized_note);存/搜自己的记忆;读:read_note/read_board/read_content_groups/read_annotations_relations+search_documents/get_document_content(⚠️只见材料库)。

**不能(宪法四禁令+现状)**:写/改笔记正文(③);直建卡片(提案唯一);碰判断域(relation confirm 族);任何不可逆删除无仪式;模拟 UI(④);检索 Source Library(现状缺口);代用户 apply/discard 提案。用户可在 Agent 收件箱处理提案,但 chat 回复确认不等于已应用。

**操作者纪律**:Agent 宣称做了任何写动作,以收据/events 为准⛔以回复文字为准。让 Agent"记住"某事后,仍应**查一眼记忆表**(`GET /api/settings/agent-memories`)——qwen 有"说存没存"前科(空头支票)。

> **收据条读法(2026-09-14)**:Agent 面板每轮回复底部逐项 `✓ 动词名` 表示已保存工具结果报告成功,`✗ 动词名` 表示未取得成功结果;包括 `save_memory`/`create_proposal` 信道写,提案成功不等于采纳,删除复述不等于已删除。有文字且无写调用显示「本轮无写动作」,无文字纯读显示「仅查阅」;未知旧工具显示「未分类工具：名称」。live 收据来自流尾,历史按出生时登记的轮次归属读时投影,挂该轮最后一条 assistant 消息;同会话重叠轮次各算各的。未登记归属的旧史不显示收据条。**摘要只覆盖已持久化的工具调用与结果;没有收据条不等于没有写动作。** 落史异常时即使摘要为空,已提交的域写也可能存在,须结合错误与收据/events 核查,不能当作回滚证明。红旗 `claim_without_receipt` 仅统计窄词命中且零成功写收据的轮次,不阻断或改写回复。

**断线≠撤销**:对话中途断线/超时,已被工具接受的写动作**照常提交**(写门有收据可撤,不静默丢作业)——回来先看收据/events 再决定重试,⛔盲目重发同一请求造重复写。8 轮工具上限触顶会收到 round_limit 提示,续一条消息即可接着做。

## 六 · 测试专用

- 测试账号凭据在 repo 根 .env(CODEX_TEST_*);实测项目命名「实测·主题·日期」;
- 隔离栈起法:env 覆写 PORT/DB_PATH/各资产目录+DOTENV_CONFIG_PATH,`node --import tsx src/index.ts`;
- 新用户 Agent 可用的前提:active_provider 与机器钥匙库(%LOCALAPPDATA%/Coincides/provider-credentials.json)对得上——本机现有 dashscope/deepseek。
