> **状态 (Status)**: draft
> **层 (Layer)**: 研究 / Research
> **日期 (Updated)**: 2026-07-11
> **权威 (Authoritative)**: 否（V11 Relation 前期设计讨论;不替代 roadmap / 契约 / 未来 plan）
> **上游**: `docs/Coincides-Relation-Product-Design.md`（老产品设计,活草稿）+ `docs/contracts/Link-Source-Relation-Boundary-Contract.md` + 06-28 端点教义 + 07-10 稀疏教义

# 2026-07-11 Better Notebook：Relation 定义与图谱尺度（会议记录）

> Henry × Claude。V10 由 Codex 施工中,本卷记录 Relation（V11）的前期设计讨论——流水线并行,绝对不是偷懒。

---

## 一、家底盘点（Claude 报告,已核）

1. **老产品设计文档**（1200 行活草稿）：CanvasConnector≠ObjectRelation≠RelationType 三分;生命周期(candidate→confirmed→stale/broken/recovered);底层维度模型(存在/条件/复合/方向/语义族/可见/出处);RelationType runtime 规格;A+B→C 复合关系形态。
2. **边界契约**：Link 答"去哪里看" / SourceReference 答"凭什么说" / ObjectRelation 答"这俩什么关系";真相≠渲染+render budget;GraphRAG 产出只进 candidate;GroupFolder≠关系真相。
3. **端点教义（06-28 Henry 拍）**：端点收窄 ContentGroup+花瓣;ContentRange=证据锚;"Relation 是被记录的判断,不是写作表面的永久可见线"。
4. **工程现状**：object_relations/canvas_edges/relation_layers 三表已活（v2.4.4 种子,九固定类型,任意端点,connection_state 机）→ **V11=非绿地:收编+迁移+端点收窄**（roadmap 定性）。
5. **07-10 稀疏教义**：正式关系稀疏;不确定住 Proposal;解释住冷痕迹;"关系的存在本身即痕迹,不附日记";允许遗忘。

## 二、定义（Claude 提案,Henry 暂搁未拍）

- **五边家族对比定义**：Link(去哪看)/收据(凭什么说)/Purpose 成员边(在此目的下演什么)/视觉连接线(画面怎么摆)/**Relation=唯一两端皆知识节点、内容为一个判断的边**。
- **定义句**：Relation = 一条被记录的判断:两个合格知识节点间的语义关系,经人确认(或人验收 AI 提案)后成为真相。承重词:判断(思考行为的沉淀,存在即痕迹)/合格节点(端点资格制)/确认(proposal-first,真相需要人的时刻)。
- **作用三方**：给人=连招的外化(思维动作的自画像,跨域发现);给 AI=联想的基底(GraphRAG 遍历/目的域上下文编译);给系统=第五真相封顶(点 CG+圈 Purpose+线 Relation,知识层三件套齐)。

## 三、视觉线 vs Relation 呈现（Claude 三拆,Henry 暂搁未拍）

- 三个缠在一起的问题剪开:①真相问题(线≠关系,已拍死)②投影问题(真相能否投上画布)③表面问题(消费界面有哪几个)。
- **重量住在创建不住在显示**:Relation 重在建(判断+确认),投影轻在显(开关镜头,读时派生,不落 canvas_edges 行——相对不焊在渲染层)。
- **三窗一家**:画布关系镜头(在场者之间,开关+预算)/局部图谱(跨场邻域遍历)/Inspector(列表,零污染)——同一真相的三扇窗,非竞争。
- **纸上无线**:关系线永不穿 page 内部,page 里 CG 顶多戴徽章。
- **线与关系合法接触点仅两个**:产房(合格端点间的线可递 RelationProposal)+ 自愿绑定(relation_backed=画布上的个人注记)。

## 四、图谱尺度重构（Henry 核心输入,本卷主戏）

- **对现有知识图谱的批判**：市面上（含 Henry 自己此前设想）全画得太大、太浅——花哨的粗糙点线,**点的细节必须展开才能看**,用户日常根本不会启用。Claude 锐化:它们是"用来看的地图",不是"用来看穿的镜片"。
- **★微观·单点射线视图 = 真正能进日常的那个**（Henry 数学生场景:non-cumulative 期末复习,看到上半学期的 definition 发懵→只看专属这个 definition 的一条线/一张小网:连哪些 theorem/lemma/definition=主线,example/remark=二三级支线）。**核心原则:微观尺度下节点渲染为内容,不渲染为符号**——直接可读的小网=阅读视图,不是可视化。**主线/支线分层是视图策略按 item 类型读时排的,不存关系里**（相对不焊,排序都不焊）。
- **Claude 对齐确认**：微观射线视图=Henry 二月认知模型（"点常驻,网被点唤醒"）的 UI 化——唤醒做成了界面。
- **尺度三档定型方向**：微观·单点射线（阅读伴侣,侧栏/浮层,大概率不长在画布上）/ 局部·笔记域（本篇骨架,复习定向）/ 宏观·课程全局（跨域发现,低频不可缺）。**宏微皆需缺一残废（Henry）;三档=同一真相的三个焦距,非三个系统（Claude）**。
- **笔记域图谱的范围定义候选（Claude,接 Henry 的 cross-note 场景）**：域=显式 frame——物理在场 item 默认入域;场外 item 人拉入或 Agent 提案人确认入域。**机制与 V9 目的圈押韵**（默认成员+显式拉入+proposal-first+跨笔记成员;是否直接复用 purposes 机器待议）。
- **★V11 第一颗承重钉（Henry 改名捅出的模型问题,标记不解）**：端点应为 **item**,CG 只是 item 的集合,单个 item 应可独立存在——但现状 member 只作为 CG 的一部分存在,"不进组的 item"无身份。三条路待掰:item 升一等实体(items 表,CG=捆) / 端点多态指针(便宜但无稳定知识身份) / 中间态 item=指针+收据(member 三真相同款形状,脱离 CG 强制)。V10 教训（身份不拆清必烂）适用——先想清再动。

## 五、未拍清单

- §二定义句与§三三拆（Henry"先不回答",挂起）。
- item 端点的实体形态（三条路）。
- 图谱域是否复用圈机器。
- 尺度三档的 V11 范围切分（哪档进 v1）。
