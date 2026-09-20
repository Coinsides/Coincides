> **状态 (Status)**: active(v2,2026-09-20 C4a 补齐;2026-09-14 Henry 令建;**操作应用前必读**——读者=产品内 Agent/Fable/builder,不是最终用户)
> **层 (Layer)**: 现状 / 应用操作说明书
> **日期 (Updated)**: 2026-09-20
> **防腐条款**: 交付新面的工单,申报义务含"说明书条目已更新/无涉";每版段收口过一遍 diff。发现缺条错条=当场补(steward: Fable)。

# Coincides 应用操作说明书 v2

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

- **底部工具条(C4a,2026-09-20)**:四群以发丝线分隔。「纸的状态」=Preview/Layout/外观/装订及既有 More;「手上的笔」=Selection/Pen/Eraser;「+ 插入」=表格/时间线/柱图/折线图/媒体图/引文框/提示框;「看的方式」=View options/导航窗格/Overview/阅读步进,选块时保留「问 Agent」。既有按钮行为、tooltip 和只读禁用条件保留。窄屏先折叠「看」(1100px),再折叠「纸」(760px);笔与插入常驻,折叠菜单可键盘打开,没有功能被删除。
- **插入双入口(C4a)**:上述七项与同名斜杠命令共用执行器。表格、时间线、柱图、折线图沿既有浮层编辑并保存;媒体图沿既有图片上传插入链。媒体图/引文框/提示框需以已保存的纸上段落为目标,菜单用选中或正在编辑的段落,斜杠用输入段落;条件不满足时显示禁用原因。引文框/提示框打开 B3 段落样式编辑器,仍需保存,取消不写。既有15项斜杠的文案与行为不变;`Source Quote` 仍只转换 TextFlow writing role,与这两个 placement 样式命令不同。
- **文档标签条(C4a)**:打开笔记或板后,文档区顶部出现身份标签;点击切换,中键或×关闭,拖拽排序。标签可用左右键切换、Alt+左右键排序、Delete关闭。关闭只退出在场,原文档仍在 Project/Boards 列表;最后一张纸关闭回所属Project,最后一块板关闭回Boards。切换/关闭沿既有 blur 自动保存与离页等待,不另设「未保存」标签。每个标签记滚动位/阅读步进或板视口;仅内存会话态,无新表、无localStorage/sessionStorage持久化,刷新只重建当前URL页。当前工具的 note/board 目标由既有 tool_start/tool_end 活动投影为天青徽章,结束即灭;通知计数槽留空等C4b。不与 Staging/Recent/Favorites 合并。

- **UI**:打开笔记→双击纸面开始写;
- **API**:`POST /api/notes/:id/blocks`,body:`{ block_type:'paragraph', content_json:{ text_flow:{ textflow_version:1, units:[{ id:'<blockId>:unit', text:'正文', writing_role:'paragraph', indent_level:0, order_index:0, metadata:{}, status:'active' }], inline_structures:[], metadata:{} } }, plain_text:'正文' }`——order 自动排尾;
- **建笔记(A5,2026-09-19)**:Project 的「New Note」或 Board 的「New note」直接新建 A4 纵向纸;建纸流程没有纸型选择。API 仍为 `POST /api/notes {course_id, title, description?, page_format:'a4_portrait'}`,页帧使用既有 A4 默认种子;Board 建纸沿用 ceremony-note 原子入口。
- **纸型调节(A5)**:打开笔记→「笔记外观」浮卡→「纸型」,可选 A5/A4/A3 各纵向或横向、Letter 纵向、Legal 纵向,共 8 项。直接看当前纸面调整,没有另一张预览纸。尺寸读数与输入使用厘米(cm)或毫米(mm),可切换单位。选纸型作用于整本笔记的全部页帧,A1 按新纸面与版心自动重排跨页正文,一次撤销/重做恢复整次换型。
- **单页异形(A5)**:进入 Layout 态,选中要调整的页,输入物理宽高或拖纸角调尺寸,只覆写该页几何;平时纸角没有编辑命中。「恢复默认」清除该页覆写,回到笔记默认纸型;以后新建页也使用笔记默认,不沿袭邻页异形。单页调节与恢复进入撤销栈,装订段、页码与封面仍按当前页身份共处。
- **纸型存储与 Web 边界(A5)**:调节经既有页帧集合保存,物理单位在界面换算,存储仍为像素;既有 `page_format` 数据保持原值,不迁移。Web 长页保持独立的单帧向下生长模式,不列入上述纸型族,不提供转为分页纸或单页异形的操作。
- **标题与章节(A4,2026-09-19)**:正文行首输入 `# `、`## `、`### ` 建一/二/三级标题;在既有段落输入 `/h1`、`/h2`、`/h3` 可升降级,`/body` 还原正文。标题仍是普通 text 块里的 unit `writing_role:'heading_1'|'heading_2'|'heading_3'`,没有 heading 块型。标题占一条硬行、独立成块;Enter/Shift+Enter 在后面续正文块,长标题视觉换行不另造单位。改字号/行高时标题随 Typography 同步。
- **章操作**:章由标题和后续块序派生,截止下一个同级或更高层标题。删标题块只解散章,不删后文;拖标题旁的章把手搬整章,一次撤销/重做覆盖整批。标题前的文字是前言,缺级不造虚拟章。折叠箭头只改变本次阅读呈现,不存章节归属或折叠字段;隐藏正文不参与阅读分页,展开恢复。已有空页保留;打印仍包含完整正文。
- **标题导航**:左侧 Navigation→Headings（标题树）,点击标题跳到章锚,阅读位置变化时当前章高亮;隐藏目标先展开再跳。标题与层级随编辑刷新,无需重载。Chapter numbers 开关控制派生编号,不改正文。agenda 是同一标题投影的接口,目录页未实装。
- **封面与边界**:封面题名/述名仍属笔记身份,封面正文不提供标题升格,也不进入正文章树或 agenda;既有服务端封面白名单仍按 text 家族读取,本单没有增加服务端角色禁令。块正文改写继续走 text-save 门(`PUT /note-blocks/:id/text-save`);**Agent 零笔记直写权**(宪法③,14.4 note_patch 仅提案,人门采纳),不接章级动词——Agent 侧生成笔记的唯一路仍为 organized_note 提案。
- **纸型自动分页(A1)**:A4/Letter 等纸型中,在流且 auto 的块按正文顺序灌入所属页叠。文字到版心底部按完整渲染行续到下一页,需要时自动续页;同一个逻辑块可以显示在多页,正文仍只存一份。最小例:在 A4 笔记输入一段长正文,超过下墙后继续写,后文自动出现在下页。Web 长页保持单帧向下生长,不转为分页纸。
- **改版与页籍**:通过「笔记外观」改字号/行高/纸型,或进入 Layout 态调四界墙,会重新分页;每页可用自己的纸型和边距,跨页文字按目标页现宽重新换行。自动宽度来自该页现版心,储存的 x/y/width 不因分页被重写;块的 `frame_id` 只随首片换籍,经既有 placement 门保存。分片范围、后续片位置与行盒是派生数据,没有独立正文或分片写入 API。
- **跨片编辑**:在任意一片上编辑仍修改原逻辑块;片尾/片头的方向键继续穿行,跨页选区可复制和删除,撤销/重做后重新分页。块把手、标注章等可点击附属件随首片显示,同一件不会在每片重复出现。编辑面、Overview 和打印共用本次分页结果。
- **整块与溢出**:媒体、投影、组件本版不切片;当前页放不下时整块移到下一页。高于整页版心的块独占一页,保留完整高度并报告结构化溢出,不会静默裁短;应调整块尺寸或该页纸型后再检查成品。
- **自由摆放与墨水**:manual 块和非流覆盖件保持现有摆放,不随正文重排。墨水属于原页,文字跨页或首片换籍都不迁移墨水。正文回缩后既有页帧保留,以免连带删除原页墨水或手摆内容;空页不表示正文被复制。

- **图片编辑(B5,2026-09-20)**:选中纸面媒体图块→块控制条「编辑图片」→拖动原图定位,用 Zoom 滑杆/滚轮/捏合裁剪,「Rotate 90°」按 0/90/180/270° 顺时针旋转,「Reset」恢复原图。取景保持当前图像或已存窗口的比例,旋转时窗口一起转,暂不提供自由改比例。Esc/Cancel 取消草稿,Save 才保存;失败保留草稿供重试,原图不改写。一次保存进入既有笔记撤销/重做栈;浮层中快捷键不触发背后笔记撤销,关闭后沿原快捷键撤销/重做。只读投影没有编辑入口。
- **图片参数与消费面**:复用 `PUT /api/note-blocks/:id {metadata:完整metadata}`;只更新 `metadata.media.edit_v1`,其他 metadata 与 `asset_id/naturalWidth/naturalHeight/alt` 保留。例 `{crop:{x:25,y:25,w:50,h:50},zoom:2,rotation:90}`:crop 是旋转后原图包围盒的百分比,窗口不超出 0–100%,w/h>0;zoom=null 或 1–3。crop 非 null 时窗口为准,zoom 仅记编辑姿态,不二次放大;crop=null 时 zoom 派生居中缩放,null zoom 为全图。edit_v1 缺省/null=零编辑,旧媒体零迁移;Reset 保存 null,撤销可恢复编辑前的缺省状态。纸面、Overview 与页面导航缩略共用 MediaBlockProjection,等比呈现裁剪图,不改块布局或资产。**打印与导出预览仍是媒体占位,不输出图像**;本单未新增图像导出、行内媒体或装饰贴纸,未接 image_object_extensions。

- **引文与提示框(B3,2026-09-20)**:选中段落→块工具条「引」(段落样式)→选「引文」或「提示框」→保存。引文显示「引」字签、浅底与右对齐纯文本出处;提示框显示虚线、浅暖底与可改标签(默认「注」)。选「正文」清除本块样式。出处可换行、最多1000字符,标签最多32字符;Esc/取消不保存,Ctrl+Enter/Cmd+Enter 保存,失败保留草稿。一次保存进入既有撤销/重做栈,正文仍在原段落中编辑。
- **样式存法与分页**:复用 `PUT /api/notes/:id/block-placements/:placementId {display_overrides_json:完整覆写对象}`;仅增删对象内 `paragraph_furniture_v1` 键,例 `{variant:'quote',source:'范仲淹《岳阳楼记》'}` 或 `{variant:'callout',label:'冷知识'}`。其余覆写保留,不新增块型、不改 TextFlow 正文。在流长段按 A1 继续分页,每片有底纹/边线,字签或标签只在首片、出处只在末片;版面为装饰留出空间,不改存储坐标。纸面、缩略投影及打印跟随当前皮。
- **绢本与表头线(B3)**:「笔记外观」→皮预设「绢本」,沿用全局→Project→本页的三级继承与套装机制;亮暗主题切换时桌面及纸色随绢本亮暗表变化。「部件」中表头分隔线可调显示/隐藏、长短(满幅/版心/短线)、样式(实线/虚线/点线),颜色随皮;不改变四界墙。无封面时显示在题名带下缘,有封面时题名带退出。打印首张无封面内容页带冻结题名/述名及分隔线,为保持原页数,该页正文整体略缩以容纳题名带;后页比例不变。导出前按目标纸型检查首张成品。

- **原生表格(B1,2026-09-20)**:笔记底部工具条→「+ 插入」→「表格」打开表格浮层,保存后入纸;双击现有表格重开。可改 caption、每格文字、增删行列及切换「Header row」。Esc 取消本次草稿,Ctrl+Enter(或 Cmd+Enter)保存。一次保存把全部单元格与结构变更合为一次现役撤销/重做;新建表格也可撤销。失败保留浮层草稿供重试。表头关闭时降为首数据行,打开时首数据行升为表头;已有 64 数据行时须先删一行才能关闭表头。
- **CSV/TSV 导入**:在编辑器的单元格粘贴多行 CSV/TSV,自动替换整个网格并保留 caption;也可展开「Import CSV / TSV」粘贴后点导入。表头开关决定首导入行是否作表头。解析优先采用引号外的制表符,否则逗号;支持双引号包裹逗号/制表符/换行、双引号转义、CRLF/LF 与首字节 BOM。短行补空字符串;未闭引号、超限等错误显示提示并保留原网格,不截断导入。
- **表格 API 与边界**:`POST /api/notes/:id/blocks` body=`{block_type:'table',content_json:{caption:'新法表',headers:['新法','措施'],rows:[['青苗法','春贷秋还']]}}`;编辑走既有 `PUT /api/note-blocks/:id {content_json:完整表格,plain_text:null}`。媒体族、模板 `media.table`;真相仅为 `content_json` 的 caption?/headers/rows。1–64 列、0–64 数据行(可另有一行表头),表头与数据至少一行,各数据行列数必须一致,caption+表头+全部单元格总量≤65536 UTF-16 code units。`headers:[]` 表示无表头;单元格只存纯文本,允许换行,没有公式求值、合并单元格、列类型或单元格内 TextFlow/Item 锚。
- **表格阅读、分页与检索**:表格字体随正文 Typography 低 2px,表头底纹、隔行底色和发丝线随皮 token。宽表仅块内横滚,不撑宽纸面。默认在流表格共用 A1 整块规则:能容纳则原页,页尾放不下则整块下移,超高独占一页并报告 `indivisible_block_exceeds_page`,不跨页断行;封面/manual 表格沿既有自由布局。编辑面、Overview、页面导航与打印共用 flow plan 和表格组件。打印/导出按块宽从左侧裁切宽表,不打印滚动条,超高仍显示既有溢出提示;成品前应调整内容或纸型检查裁切。纸内 Navigation→Results 可搜 caption、表头及各格当前已保存文本。
- **表格 Agent 读面(B1 补遗一)**:`read_note` 保留实际 `kind:'table'`,仅在既有 `text` 键扁平输出:非空 caption 一行、非空 headers 制表分隔一行、rows 逐行制表分隔;caption/单元格内部 CRLF、TAB、CR、LF 替为空格。它是可检阅的有损文本投影,没有新增结构化 rows/headers 输出键;结构化投影槽归 C 波 14.3/14.4 注册表批,本单未接写动词。

- **内置组件(B2,2026-09-20)**:组件块是第四族,`block_type:'component'`,内容只存 `{component_kind,params}`。内置件为手工闭集 `timeline`、`chart_bar`、`chart_line`;未知 kind 显示名称与「未注册组件」占位,保留原数据。没有动态加载、自由 HTML 或图表 DSL;**内置件=闭集,自由组件候产房**。组件不进入封面住户白名单。
- **时间线编辑**:笔记底部工具条→「+ 插入」→「时间线」新建,双击已有时间线重开浮层。可改标题、逐条 year/label/detail、增删条目、上下移动。阅读时点条目展开/折叠 detail,仅改变呈现,不保存折叠字段。Esc 取消草稿,Ctrl+Enter/Cmd+Enter 保存;一次保存进入现役撤销/重做栈,保存失败保留草稿。参数例:`{component_kind:'timeline',params:{title:'宋初年表',entries:[{year:'960',label:'北宋建立',detail:'陈桥兵变后建宋'}]}}`。条目 1–64 条,year/label 为必需纯文本,detail/title 可选。
- **图表编辑**:工具条→「+ 插入」→「柱图」或「折线图」打开浮层,双击已有图表重开。表格式网格可编辑横轴标签、系列名称与各数值,增删列和系列,另可改标题与纵轴标签;保存/取消/撤销规则同时间线。参数例:`{component_kind:'chart_bar',params:{title:'收入示意',x_labels:['前期','后期'],series:[{name:'田赋',values:[70,40]},{name:'工商',values:[30,60]}],y_label:'比例'}}`。1–32 点、1–4 系列,每组 values 数量必须等于 x_labels,数值须有限,支持零、负数及小数。bar/line 共用 SVG 轴、刻度、图例与数值标注,颜色从当前皮的强调/中性 token 派生。
- **组件边界、分页与读面**:已知 params 只接受声明字段;标题、年份、标签、详情、轴名及系列名合计≤65536 UTF-16 code units。沿 A1 媒体整块规则:原页能放则原页,页尾放不下整块下移,超高独占并报告溢出,不切片。纸面、Overview、页面导航与打印共用组件及 flow plan;时间线在静态投影/打印中保留初始折叠,不强制展开详情改变分页高度。Navigation→Results 检索已保存的时间线详情/条目和图表标题/标签/系列名。`POST /api/notes/:id/blocks {block_type:'component',content_json:完整payload}` 创建,编辑仍走既有 `PUT /api/note-blocks/:id {content_json:完整payload,plain_text:null}`;无新增 Agent 写动词。`read_note` 的 kind 保持 `component`,既有 text 键按行扁平投影,字符串内部 CRLF/TAB/CR/LF 替为空格:时间线为标题+逐条年份/标签/详情,图表为标题/轴名/横轴标签+逐系列名称/数值。没有新增结构化输出键,结构化槽仍候 C 波。
- **组件成品检查**:Overview/打印的新投影实例不继承纸面的时间线展开态;若阅读时已展开并测高,静态面会保留 flow plan 中的预留高度而出现留白。图表长横轴标签最多显示三行,余文省略,完整文字保留于 SVG 描述和检索;宽图打印缩放至块宽,点数较多时字号会缩小。应按目标纸型检查成品可读性。

- **装订面(A2)**:笔记底部工具条→「装订」。打开「显示装订」后,选装订段、手填眉左/中/右与脚左/中/右文案;页码默认占脚中,可换到任一槽。页码占用槽的手填文案暂不显示,移走或关闭页码后恢复。施工默认开,可整体关闭;页眉页脚与页码也可分别关闭。
- **装订段与双页码**:首段从机械第 1 页到末页。「新增段」从上一段起点下一页建立新段,可调「起始机械页」;段结束于下一段起点前一页,最后一段覆盖余页。删除非首段后,前段接管其页区间。机械页序只供寻址,不可改;显示起始数可设,制式为阿拉伯/小写罗马/大写罗马。模板只编辑前后缀,中间 N 必留。例:第 3 页新段、起始数 4、罗马大写、前后缀「[」「]」,该页显示 [IV]。换纸型、异形页或 A1 重新分页后自动按当前机械序重投影;段界超出现有页数时留待后续页面,不制造空页。
- **槽位与样式**:展开某槽可调横移/纵移,单位为纸面逻辑 px;字体/颜色默认继承皮,可逐槽改字族、字号、字重、颜色 token 与斜体。「恢复皮样式」清除该槽覆写。点「保存装订」生效;失败保留输入供重试,取消不写。文案不会自动吸收章名。
- **装订 API**:`GET /api/notes/:id/binding-settings` 返回 `{binding_settings:null|配置}`;`PUT` 同路径 body=`{binding_settings:配置|null}`。设置住笔记级 `notes.binding_settings_json`,页帧/正文不存副本;null 读为施工默认单段。最小配置可由 `shared/types/noteBinding.ts` 的 `createDefaultNoteBindingSettings()` 取得。A3 使用 v2 配置并兼容 v1;通用 Note 与 Agent 工具响应保持既有形状。
- **封面页(A3)**:底部「装订」→「添加封面页」,在首内容页之前建立机械第 0 页。封面不显示页眉、页脚和页码,首内容页仍从机械第 1 页起算显示计数。封面全 manual,文字与媒体可自由摆放;组件块不能放入封面,A1 正文不会流入封面。有封面时旧表头标题带退出,无封面时保留原题名/述名输入。
- **题名件与述名件**:装订面中的「添加题名件」「添加述名件」各添加一个可摆放的真相绑定块;同一封面重复添加聚焦既有件。退档后重建封面可添加新投影,已移交首页的旧投影保留。直接编辑块内文字即修改笔记题名或述名,投影随笔记字段更新,不另存块正文。删除块只移除投影。API 复用 `POST /api/notes/:id/blocks`,body=`{block_type:'note_ref',content_json:{field:'title'}}`(述名用 `description`),随后走既有 placement 门放入封面;改字仍走 `PUT /api/notes/:id {title|description}`。封面的文字与绑定字段可在纸内搜索中命中。
- **封面图与导出**:在装订面选择封面图或「调整封面取景」,拖动与缩放后保存装订。card/page 两种取景共用同一原图,裁剪只存框参数;page 框随纸型满幅衬底,文字浮在其上。旧卡面封面可直接成为纸页衬底,不用再上传。封面图及框参数统一住 v2 装订 JSON,卡面继续读原有槽的投影。导出默认带封面,取消「导出包含封面」后保存即排除;Overview 仍可查看封面。
- **移除封面页**:装订面→「移除封面页」。封面上的块和墨水移交首内容页,存储坐标及原图保留,题名/述名真相不删除;移交后的自由块可能重叠,可进入 Layout 整理。添加/移除封面的 API 在同一个 `PUT binding-settings` 请求中携 `collection`(既有页帧集合),与封面身份变化原子提交;返回 `canvas_persistence` 供当前界面刷新。
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
- **修改已有文字(C2)**:Agent 经 `create_proposal {type:'note_patch',data:{note_id,patches:[{block_id,unit_id?,new_text}]}}` 发整 unit 替换提案;多 unit 块须指定 unit_id。创建时冻结旧文与块版本,不会改正文。收件箱逐 patch 显示旧文/新文,可逐项采纳或弃,允许部分采纳。先打开对应笔记,采纳沿该页编辑 runtime 的 text-save 保存队列与 Undo/Redo;保存请求附 `proposal_patch:{proposal_id,patch_index}`,正文与提案状态同事务。全案 `/apply` 不执行 note_patch。
- **失效与撤销**:靶块在发案后被编辑则显示失效,不可盲采纳;同提案同块多个 unit 依次采纳时,只跟进该提案已知的前次采纳版本。逐弃=`POST /api/proposals/:id/patches/:patchIndex/discard`;全弃保留已采纳事实。撤销走当前笔记原有栈,只恢复文字与范围,不把已处理提案重新变成 pending。

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
- **排版体检器(C1 消费)**:内部纯函数 `inspectBoardLayout({cards,edges})` 接收板坐标下的卡矩形、线折线采样与标签矩形,报告标签×卡、标签×标签、线穿非端点卡、超阈值卡×卡、近平行线重叠及坐标/严重度。Agent 板写后自动体检,本轮每板最后一份报告随收据呈现,历史回读同值。检查含装卸区产出的候选坐标,忽略隐藏层;标签用估算矩形,画面仍需人工检查。诊断不阻断写入,体检失败显示「暂不可用」;固定端点被其他卡覆盖时,单圆弧可能没有可避开的路径;
- 装饰 `POST /api/boards/:id/visuals {visual_kind:'shape', w,h, data:{}}`;
- **Agent 装卸区(C1)**:Agent 的 `board_mount_member` 与 `board_create_sticky` 强制 `placed:false,mounted_actor:agent`,先落既有 Staging。工具栏「Staging (N)」打开装卸区;人拖便签/引用上板或点「Place on board」采纳,沿用人类 PATCH 门。便签及绑定它的线在采纳前不进入画布,便签不会变成笔记或 Item。便签的宽/色/重量保留;成员沿现役采纳规则分配完整几何。人的普通创建仍直接上板。
- **Agent 批次撤销(C1)**:每个 Agent 会话的全部板写共享 `batch_id=conversation_id`,跨轮次、跨板。板工具栏「撤销 Agent 本批」撤此板最近会话的全部板写(含该会话涉及的其他板),成功后刷新画面并清空本板的本地 Undo/Redo。`GET /api/boards/:id/agent-batch` 给最近批次与待撤数;`POST /api/boards/:id/agent-batches/:batchId/revert {}` 按固定批次逆序原子撤销,二次请求 409,不自动退到旧会话。单条仍走 `POST /api/tool-receipts/:receiptId/revert`。
- **撤销冲突**:沿现役收据的后改保护,目标后续被人编辑、采纳或被外部新线引用时拒绝覆盖;整批任何一条冲突则全部不撤,保留人后改与所有收据。可从现役收据面逐条撤销无冲突项。未采纳的概念图批次可完整撤回,已采纳对象上的 Agent 整理也可撤回到整理前;不能将未后改时的可撤解释为可以抹掉后续人的修改。
- 边界:板摆放不改来源正文;便签正文与视觉线仅属板域,不携存储语义关系、不接 `relations`。C1 未新增 Agent 读器或改变 `read_board` 输出。

## 五 · Agent 能力边界表(给 Agent 的自我说明,也给操作者预期管理)

**对话情节记忆(C3)**:Agent 记忆独立页的「Episodes」页签按会话展示机器摘要、原消息首末 ID / 时间范围、完整 note/board/item/proposal/memory 锚清单。可按摘要/会话/锚 ID 查找,每页25条;GET `/api/settings/agent-episodes` 查本人投影,DELETE `/api/settings/agent-episodes/:id` 仅删除该摘要投影。沿记忆页行内二次确认,无编辑门。删除文案明确原始对话仍保留;下次组装超阈时可由原消息重新生成。

**压缩是视图,不是销毁**:唯一新增业务表 `agent_episodes`(083),不更新或删除原始 `agent_messages`。锚从工具调用/收据与 meta 机械提取,不交给模型猜测。组装顺序=既有常驻包→最近最多3条 episode(含完整锚 ID 行)→未压缩原消息→当前消息。episode 段总预算2048估算tokens,超限整条截老,不裁锚 ID;超大最新一条也整条移出常驻,仍可查。

**看门狗口径**:常驻包、工具定义、episode、近水与当前文字合计超过24000估算tokens才压最老连续段,每段最多8个完整轮次组,保留最近4组;交错的 turn_id 跨度合组,旧无 turn_id 消息按普通 user 开轮,工具调用/结果不切开。seq 是段首原消息 rowid,唯一键保证同段幂等,删除后重压仍沿用稳定序位。估算为ASCII每4字符约1token、其余Unicode码点每个约1token,不是模型精确计费;不可压的近期/当前消息或常驻包自身过大时允许仍超阈,不静默裁原文。

**摘要与唤醒**:生产摘要用本次会话经现役 resolver 得到的同一 provider/model,每段一次、无工具、最多等待15秒且服从300秒请求预算;失败或空输出回退为各轮首个有文本消息的首句按序拼接,摘要上限768估算tokens。测试环境强制回退,不调用摘要模型。现役 `search_memories` 保留 semantic→FTS→LIKE 三路语义记忆优先,随后并入 episode 摘要 FTS,总数仍受 limit;结果带 `kind: memory|episode`,episode 携会话/范围/完整锚清单。category 过滤仅选语义记忆。自动常驻记忆检索不纳入旧 episode;更老情节需显式搜索唤醒,不新增工具或写权。

**能(域写过写门:同事务史记+收据+可撤;发提案/存记忆为信道写)**:建目标/子目标/任务/卡组/分区/时间块×批;改时间块;标任务完成(**必须携用户原话锚**——用户没亲口说完成就是不能标);删时间块(**两段复述确认仪式**);发提案(九型,含 organized_note 与 note_patch);存/搜自己的记忆;读:read_note/read_board/read_content_groups/read_annotations_relations+search_documents/get_document_content(⚠️只见材料库)。

**板写七动词(C1)**:全部为 `door_write`,复用人类板服务并同事务写 `actor=agent` 史记与可撤收据。统一输入 `{board_id,input:{...}}`,更新另携对应 `member_id/sticky_id/visual_id`。

| 动词 | 边界 |
|---|---|
| `board_mount_member` | 上已有 note/content_group/item 到 Staging;不支持 text_range |
| `board_move_member` | 已有成员 x/y/w/h,可整理已采纳成员,不改变采纳状态 |
| `board_set_member_layer` | 已有 layer_id(或 null Base)及整数 z_index |
| `board_create_edge` | v1 member/sticky/point 两端,auto/n/e/s/w 锚,bend/dash/weight/caps/label 等全款纯视觉 API |
| `board_create_sticky` | text/x/y/w/weight/color_index;强制落 Staging |
| `board_update_sticky` | 同上六字段,宽240/416、重量1/2/3、颜色null/1;不代人采纳 |
| `board_patch_visual` | 更新现役 sticky(旧粉笔)/shape/freehand 装饰 API;不含其他视觉种类 |

板域不注册删除动词、建板、改 soul/板题或笔记写权,「直接放上去」显式授权通道仍未开放。七动词均在收据条逐项显示,批次与撤销入口见§四。

**UI 呈现两动词(C4a)**:独立 UI 注册组归 `channel_write`,不加入域写集,不新增效果分类。`ui_open_note {note_id}` 打开笔记并挂标签;`ui_focus_object {target}` 支持 `{type:'note_block',note_id,block_id}`、`{type:'note_page',note_id,page_index}`(从0计页)、`{type:'board_member',board_id,member_id}`(已上板且层可见)。例 `ui_focus_object {target:{type:'note_page',note_id:'<note-id>',page_index:0}}` 只滚动定位、短暂高亮,不选中编辑器、不写笔记或板真相。缺失/不匹配目标返回错误。每轮最多发8条,同目标1秒内不重发;重复仍有成功工具结果但 `dispatched:false`。工具调用/结果成对落史后才发 SSE `ui_command`,收据条照记 `✓ ui_open_note` 等;成功表示指令已发出,不是浏览器已显示。用户正持有输入框/输入法组合/对话框焦点时延后,blur稳定150ms后只执行最新待办,不抢正在输入的人。板聚焦仅改会话视口,不调用板保存门;刷新或历史回读不重放旧 UI 命令。此通道只开放导航呈现,不允许模拟点击、预填、预武装确认或取得新写权。

**不能(宪法四禁令+现状)**:写/改笔记正文(③);直建卡片(提案唯一);碰判断域(relation confirm 族);任何不可逆删除无仪式;模拟 UI(④);检索 Source Library(现状缺口);代用户 apply/discard 提案。用户可在 Agent 收件箱处理提案,但 chat 回复确认不等于已应用。

**操作者纪律**:Agent 宣称做了任何写动作,以收据/events 为准⛔以回复文字为准。让 Agent"记住"某事后,仍应**查一眼记忆表**(`GET /api/settings/agent-memories`)——qwen 有"说存没存"前科(空头支票)。

> **收据条读法(2026-09-14)**:Agent 面板每轮回复底部逐项 `✓ 动词名` 表示已保存工具结果报告成功,`✗ 动词名` 表示未取得成功结果;包括 `save_memory`/`create_proposal` 信道写,提案成功不等于采纳,删除复述不等于已删除。有文字且无写调用显示「本轮无写动作」,无文字纯读显示「仅查阅」;未知旧工具显示「未分类工具：名称」。live 收据来自流尾,历史按出生时登记的轮次归属读时投影,挂该轮最后一条 assistant 消息;同会话重叠轮次各算各的。未登记归属的旧史不显示收据条。**摘要只覆盖已持久化的工具调用与结果;没有收据条不等于没有写动作。** 落史异常时即使摘要为空,已提交的域写也可能存在,须结合错误与收据/events 核查,不能当作回滚证明。红旗 `claim_without_receipt` 仅统计窄词命中且零成功写收据的轮次,不阻断或改写回复。

**断线≠撤销**:对话中途断线/超时,已被工具接受的写动作**照常提交**(写门有收据可撤,不静默丢作业)——回来先看收据/events 再决定重试,⛔盲目重发同一请求造重复写。8 轮工具上限触顶会收到 round_limit 提示,续一条消息即可接着做。

**自然直令(C2)**:「请记住/别忘了/下次提醒我」要求 save_memory 成功收据后才能声称保存;记忆不等于定时通知。「整理这份材料」走 organized_note 提案,缺项目/来源先询问。两类映射的限定与 prompt 还原锁见 `docs/contracts/Agent-Intent-Prompt-Amendment.md`。

**圈块问 Agent(C2)**:笔记选区「问 Agent」沿原 contextHint 的 `note_view.data.selection={note_id,block_ids[]}` 随人的消息发送,最多32块。服务端复用 read_note 投影,优先当前页、至多8页、选区内容最多16000字符,截断/遗漏显式声明。选区回答在块旁天青色答卡呈现:「散去」关闭投影,全文留会话;「插入为块」由人点选,沿笔记人门在锚下插段落并可撤。锚与问题仅存 `agent_messages.meta.answer_card`,不新建真相表;未新增板选区语境或“存走”出口。

**计划卡(C2)**:服务端纯函数用有限关键词编译,不调用模型、不注册工具。板语境下可编译网格整理、明确命名的移动/图层/连线/便签修改、按ID挂载、添加便签/移动装饰,执行目标仅C1七动词。笔记选区的 `把“整 unit 旧文”改为“新文”` 要求唯一匹配,放行只发 note_patch 提案。计划显示动词与目标,「放行」才走既有执行器;「再想想」丢弃零执行。板写继续共享会话 batch_id 与整批撤销;目标变化须重编译。规则不能明确解析时回到普通对话。记忆编译结果是 save_memory 提示,实际仍走会话工具收据链。

## 六 · 测试专用

- 测试账号凭据在 repo 根 .env(CODEX_TEST_*);实测项目命名「实测·主题·日期」;
- 隔离栈起法:env 覆写 PORT/DB_PATH/各资产目录+DOTENV_CONFIG_PATH,`node --import tsx src/index.ts`;
- 新用户 Agent 可用的前提:active_provider 与机器钥匙库(%LOCALAPPDATA%/Coincides/provider-credentials.json)对得上——本机现有 dashscope/deepseek。
