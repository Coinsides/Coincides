> **状态 (Status)**: draft
> **层 (Layer)**: 研究 / Research
> **日期 (Updated)**: 2026-07-10
> **权威 (Authoritative)**: 否（讨论与第三者审视快照；不替代 V2.BN.10 Plan、技术设计或后续 ADR）
> **取代 (Supersedes)**: —
> **被取代 (Superseded by)**: —

# 2026-07-10 Better Notebook：Source Floor、思考延伸与 V10 设计审视（会议记录）

> Henry × Codex。V2.BN.10 的主要设计由 Henry 与 Fable / Claude 共同形成，本轮由 Codex 在阅读 V10 Plan、实现设计和近期会议记录后，以相对独立的第三者视角反推设计初衷、评价思想成熟度，并开始分批审视方案中的产品与工程风险。
>
> 本记录保存的是今天的思想推进与待裁建议，不是当前工程真相。实现仍以活跃的权威文档、Henry 后续裁决及正式版本计划为准。

---

## 一、今天讨论了什么

今天的讨论大致沿着五条线推进：

1. **双 Agent 的角色分工**：Fable / Claude 更集中地参与产品发散与方案设计；Codex继续承担主要工程实现，同时在没有参与原始设计的部分充当第三者审视者。会议记录、Plan 与设计稿构成两边共享的外部记忆。
2. **V2.BN.10 初衷推测**：围绕 Source Floor Plan，逐层反推为什么要建立全局源库、摄入与物化管线、证据收据、引用源、Purpose 以及未来 Agent 的操作底座。
3. **Coincides 的长期目的**：Henry 进一步说明，产品并非只想成为“第二大脑”或笔记仓库，而是希望成为人类学习与思考的延伸，并保留能够重新理解自己认知演进的稀疏痕迹。
4. **Relation 的长期尺度**：讨论了“保存思考痕迹”与“制造长期语义噪音”的边界，明确不能把每一次联想、类比和可能相关都永久焊在正式关系边上。
5. **V10 设计审视**：Codex 计划分五批审视 V10；今天已经完成概念/产品哲学层和用户心智/工作流层，数据模型、Agent 长期尺度及最终范围裁剪仍待继续。

---

## 二、对 V2.BN.10 初衷的六层推测

### 2.1 第一层：建立可靠摄入，而不是先追求聪明解析

V10 的第一目的不是做一个炫目的 OCR 或文档总结器，而是建立“资料先安全进入系统”的最低承诺：

- 上传、复制入库、哈希去重与原件保存先成立；
- 解析和物化可以失败，但失败不能让原件丢失；
- “收”与“转”分离，解析器是可替换能力，不是 Source 身份本身；
- Source Floor 首先解决“不丢、可找、可重试”，再谈高保真理解。

这一层为后续所有 Source、引用与 Agent 工作提供了可靠入口。

### 2.2 第二层：Source 是第一个真正无墙的知识对象

Source 不应被某个 Project 独占。Project 是观察与组织知识的镜头，而不是 Source 的生命所有者：

- 同一份资料可以被多个 Project 使用；
- 上传地点是来源或最初放置位置，不等于永久归属；
- 删除 Project 不应顺带删除 Source 真相；
- 全局 Source Library 是“一个知识空间、多个项目镜头”的第一个实际产品形态。

### 2.3 第三层：建立认识论防线，而不只是文件管理

Source 系统真正承担的是证据责任：

- 用户需要知道一段内容来自哪里；
- 引用应携带锚与收据，活跳转失效时仍能留下当时所见；
- 直接引用、转述、蒸馏、推断不能被洗成同一种“有来源”；
- 生成内容必须能与搬运、解释和推断区分，否则 Agent 越强，幻觉的破坏面越大。

因此 V10 不是“Documents 页面升级”，而是 Coincides 溯源语法的地基。

### 2.4 第四层：允许活的现在与冻结的过去共存

用户需要自由修改内容，同时引用世界又需要稳定。设计通过“一套内容机器、不同文档类别与生命周期”来调和：

- TextFlow 继续作为统一内容真相，不再为 Source 另造编辑器；
- 引用源投影复用 Note / Block / Annotation / ContentGroup / Purpose 的既有能力；
- Source 内容可以被政策锁定，而用户的解释、标注和组织工作仍可继续；
- 未来通过版次、收据和修订语义表达变化，而不是悄悄覆盖过去。

这不是建立两个知识宇宙，而是让同一套内容引擎承载不同责任。

### 2.5 第五层：先建 Agent 可用的底料，再接 Agent 操作者

Agent 目前不是 V10 的交付目标，但 V10 正在为它准备可操作的 substrate：

- Agent 将来需要稳定 Source 身份、可寻址内容、出处模式和可检查的收据；
- AI 生成笔记不能只靠一次长上下文临场生成，而应从 Source、ContentRange、ContentGroup、Purpose 与草稿装配结构中取材；
- 当前先让人类能上传、阅读、标注和组织这些对象，未来 Agent 才能在相同真相上提出 proposal；
- “人类先能用，AI 后接入”不是拖延 Agent，而是在降低它未来的不可靠性。

### 2.6 第六层：形成个人长期可延续的知识制度

当 Source、TextFlow、ContentGroup、Purpose、Canvas 和未来 Relation 连接起来后，Coincides 不再只是保存结果，而是在为用户形成一套可延续的个人知识制度：

- 新资料能够进入已有知识空间；
- 旧理解能被重新调用，而不是埋在孤立文件里；
- 不同阶段和不同 Project 的学习可以发生交叉；
- 用户能够回看自己当时依据什么、如何组织、后来又如何改变。

Source Floor 的深层意义，是给这套长期制度建立可靠的证据入口。

---

## 三、Henry 对产品终极目的的补充

### 3.1 Coincides 是学习与思考的延伸

Henry 的核心判断是：Coincides 不只是“第二大脑”，而应成为用户学习与思考的延伸。

如果目标只是保存笔记，Notion、Obsidian 或普通文档工具已经足够。之所以绕远路建立 TextFlow、ContentGroup、Canvas、Source、Purpose、Relation 与未来 Agent，是因为目标不只是存下结论，而是让知识能够在时间中继续参与思考。

### 3.2 保存的是稀疏痕迹，而不是思维全过程

完整保存思考过程既不现实，也不经济：

- 全量对话与推理会迅速膨胀；
- 重读成本和 Agent token 成本都很高；
- 上下文压缩后，大量细节仍会自然消失；
- 机械保留一切不等于保存真正有价值的认知转向。

因此更可行的目标是保存**思考的痕迹**：引用过什么、如何组合、在哪个 Purpose 下组织、何时改变方向、哪些理解后来被替代。痕迹不是完整证明，却能成为重新进入旧思路的路径。

### 3.3 产品要同时服务广度学习与深度研究

人的生命有限，而学习没有尽头。人生不同阶段能够投入学习的时间极不均衡，很多人的时间会被工作、家庭和生存压力切碎。因此 Coincides 应当同时允许：

- 对一个领域进行长期、系统、深入的研究；
- 广泛接触多个领域，并保留足以继续思考的基础认识；
- 在未来重新进入曾经中断的主题；
- 利用已有痕迹发现不同领域之间的结构相似性。

它不是替用户学习，而是降低“中断以后再也接不回来”的成本。

### 3.4 跨领域联系是认知增长的重要来源

Henry 以“项目管理与打扫卫生”为例：表面上两者距离很远，但都涉及分类、频率、可达性、维护成本、沉没成本、未来使用和有限空间分配。学习的价值不只在掌握单一学科，而在于已有认知能够成为理解新领域的材料。

Coincides 的 Cross-note、Cross-project、Source 与 Relation 设计，最终应帮助用户发现这种联系；系统不必替用户写出一篇过度解释的哲学论文，只要让相关痕迹在合适的时候重新可见，就可能触发真正的思考。

---

## 四、思考痕迹与 Relation 的边界

### 4.1 不把每次联想永久焊成正式关系

Henry 指出，如果每条 Relation 都永久保存“结构类比、个人联想、可能相关、当时解释”等大量文本，十年后会形成严重噪音：

- 同一用户在不同时期的解释可能互相冲突；
- 后来的理解可能更成熟，但系统难以自动判断哪一条应当代表现在；
- 人可以选择不看，Agent 却可能在读取图时反复吞入这些语义杂质；
- Agent 为比较和消歧付出的 token 会随关系规模持续上升。

### 4.2 当前较稳的方向

- **正式 Relation 保持稀疏**：主要保存稳定端点、关系类型、作用域与当前有效状态。
- **Proposal 承担不确定性**：可能相关、待确认和 AI 建议不应直接进入正式图。
- **痕迹另有冷层**：只有少数真正重要的认知转向值得被用户显式保留，且默认不进入图查询和 Agent 上下文。
- **Agent 按目的读取局部编译视图**：不默认读取全部关系表，更不默认读取每条关系的历史解释。
- **允许遗忘**：长期系统的成熟不等于保存一切，而是知道什么必须留、什么可以重建、什么应该自然消退。

Relation 的存在本身就可以是一条痕迹；不需要给每一条边再附上一部日记。

---

## 五、第一批审视：概念与产品哲学

> 以下为 Codex 的第三者审视，尚未经过 Henry 最终裁定。

### 5.1 成熟之处

1. **“相对不焊绝对”已经成为可执行设计律**：Purpose 状态、Project 放置、Source 使用关系均开始与对象固有身份分离。
2. **收转解耦是 V10 最强的基础判断之一**：摄入不再被解析成功与否绑架，未来更换解析器也不动 Source 身份。
3. **底料与操作者分离清楚**：先建人类可用、AI 可读的对象与契约，再引入 Agent 操作，能避免 AI 功能反过来污染真相层。
4. **Scope 控制已经成熟**：版次机器、完整血统、重物化、网页采集、音视频理解等均被明确后置，没有因为愿景宏大而全部塞入 V10。
5. **对抗核查有实际价值**：计划已经主动处理写旁路、系统笔记误锁、课程删除迁移不完整、图片资产被误删等高危问题。

### 5.2 尚不成熟之处

1. **概念名词过密**：事实源、引用源、编辑层、Source File、SourceArtifact、SourceProjection、Reference Note、Edition、Living Copy 同时出现，会抬高开发者和用户的理解成本。
2. **Source 身份仍有过渡性歧义**：长期哲学认为持久身份住在引用源，但 V10 又把 `source_files` 描述为全局真相实体；“文件附件”和“源身份”尚未完全拆清。
3. **“源投影是真 Note”措辞过强**：更准确的说法应是“复用同一内容引擎、属于不同文档类别”，否则容易把实现复用误解成产品身份完全相同。
4. **“只读”并不精确**：V10 实际上要锁 Source 内容，同时允许 metadata、标注、ContentGroup、Purpose 和部分布局继续工作。产品语言应表达为“源内容锁定，解释与组织可编辑”。
5. **地板版本承载了过多未来宪法**：出版、版次、修缮、血统、reconcile 等长期概念可以留接缝，但不应让 V10 的用户心智也背上这些尚未交付的名词。
6. **Home 仍是过渡性伪归属**：它解决孤儿落点，但若把它表现成不可删除的特殊 Project，可能重新制造一种隐形 owner。
7. **`birth_course_id` 是来源事实，不是使用关系**：它只能回答“从哪里首次进入”，不能回答“哪些 Project 正在使用它”。

总体评价：V10 已是一份成熟的架构研究，但还没有完全收束成同等成熟、同等简洁的产品规格。应简化可见名词和当前承诺，而不是简化真相边界。

---

## 六、第二批审视：用户心智与工作流

> 以下同样属于待裁建议。

### 6.1 高优先级问题

1. **跨 Project 去重可能形成死路**：用户在 Project B 上传一份已经从 Project A 入库的文件，哈希命中后如果只返回“已在库中”，B 没有 placement / membership，就不会获得任何可见使用关系。去重成功反而可能让用户在当前工作区什么都看不到。
2. **删除 Project 的默认选项可能毁掉用户劳动**：源投影虽然可重建，但其上的 Annotation、ContentGroup、Purpose、布局和修订并非都可重建。若已有用户工作，默认“删除投影”不应与纯机器投影同等处理。
3. **源条目点击行为在无投影状态下没有闭环**：能力 0 文件、解析失败、孤儿或投影待重建时，点击条目到底打开原件、详情、错误页还是重建入口，需要明确状态机。

### 6.2 中优先级问题

4. **锁定状态必须在 UI 上可理解**：不能只依赖服务端 4xx。用户应清楚知道哪些内容不能改、哪些标注与组织操作仍然可用。
5. **V10 尚无真正的 Source 纠错路径**：先不做修缮版次可以接受，但界面必须诚实地把投影称为“提取阅读视图”，并始终提供“查看原件”；不能暗示它已经是高保真重建。
6. **旧 Documents 与新 Sources 双入口会制造分裂心智**：正常产品路径最好只有一个主上传入口；旧管线即使暂时保留，也不应继续与新 Source 管线争夺用户注意。
7. **Home 的产品呈现需要克制**：它应更像系统收件箱 / 未归档空间，而不是一个行为奇怪、不可删除的普通课程。
8. **全局 Source Library 缺少最低检索能力**：一旦文件数量增加，只按上传时间陈列会迅速失用；首版至少应考虑搜索、类型、状态和来源过滤。

### 6.3 更顺的主工作流草案

```text
上传文件
  → 原件立即安全入库
  → 若已存在，则把既有 Source 放入当前 Project 镜头
  → 展示解析 / 物化状态
  → 点击时打开当前最佳可用视图
  → Source 内容锁定，但允许标注、解释与组织
  → 删除 Project 时优先保护已经发生的用户劳动
  → 只有 Source Library 可以删除 Source 本身
```

这个流程比“上传记录的技术状态机”更接近用户实际感受到的产品。

---

## 七、当前形成的阶段性判断

1. Coincides 的长期目标可以表述为：**以证据为根、以结构和布局为工作面、以稀疏痕迹帮助用户延续思考的个人知识基础设施。**
2. Source 是证据入口和认识论地基，不只是附件管理；但 V10 的首要任务仍应是把摄入、保存、状态、打开与删除做可靠。
3. “保存思考痕迹”不能演化成“永久保存每次语义自言自语”。正式图、Proposal、冷痕迹和 Agent 临时推理必须分层。
4. Project 是镜头的原则已经成熟，但 V10 还缺少显式 Source placement / membership，当前工作流与这条原则尚未完全对齐。
5. SourceProjection 应复用 Note 内容引擎，但产品上要保持文档类别与权限责任的区别。
6. V10 可以暂不交付修缮、版次和重建，但必须避免给用户造成“投影绝对忠实、删除后随时可完整恢复”的错误承诺。
7. 当前审视尚未完成，本文中的批评不能直接视作 Plan 修改决定。

---

## 八、待继续的三批审视

Codex 原计划将第三者审视分成五批。今天已完成前两批，后续继续：

### 8.1 第三批：数据模型与工程生命周期

重点检查 Source 身份与文件附件是否混杂、去重并发、物化幂等、部分失败、数据库与文件系统删除的一致性、Home 唯一性、课程迁移覆盖和大文件承载边界。

### 8.2 第四批：Agent 与十年尺度

重点检查默认上下文应读取什么、如何编译 Purpose-scoped Reading View、哪些历史进入冷层、Relation 与 Source 收据如何避免长期噪音，以及系统是否真正允许遗忘和重建。

### 8.3 第五批：最终范围裁剪

输出一份明确的：

- 必须保留；
- 开工前必须修正；
- 可以在 V10 留接缝但不实现；
- 应从 V10 删除；
- 值得补入后续版本。

最终目标不是让设计更宏大，而是让 Source Floor **能用、好用、不会把后续道路焊死**。

---

## 九、本次没有拍定的事项

- 尚未决定是否在 V10 立即新增 SourceProjectPlacement / Membership。
- 尚未决定 Source 身份与 `source_files` 是否应在数据库层立即拆分。
- 尚未修改 V2.BN.10 Plan、技术设计或 Roadmap。
- 尚未完成数据模型、Agent 长期尺度和最终范围三批审视。
- 本记录中的第三者建议，只有在 Henry 明确裁定并进入 Plan / ADR / 现状层后，才成为工程依据。

---

## 十、第三批审视：数据模型与工程生命周期

> 本节追加于前两批审视之后。自本节起，§8.1“第三批待继续”和 §9“尚未完成数据模型审视”的状态已自然过期；保留原文是为了保存本次会议的推进痕迹。以下仍是 Codex 的第三者建议，未经过 Henry 裁定。

### 10.1 总判断

V10 对**写权限隔离**考虑得很成熟，但对**异步任务与文件生命周期**考虑得还不够完整。

最危险的地方不是 Source UI，也不是解析器能力，而是四件事：

1. 同一文件被并发上传时，是否只产生一个事实源；
2. 服务在物化到一半时退出，重试是否会生成重复 Note / Block；
3. SQLite 事务回滚时，已经 rename / unlink 的物理文件怎么办；
4. `source_files` 到底是一份文件、一个 Source 身份、一次解析任务，还是当前投影的 owner。

如果这些边界不先说清，V10 表面可以跑通，后续版次、重物化和跨 Project 使用会被迫围绕一张含义不断变化的表补丁式生长。

### 10.2 开工前必须处理的四个问题

#### A. 物化缺少明确的幂等与部分失败协议

当前 Plan 是 `fire-and-forget` 解析，物化器直接写入 notes / blocks / placements / sources，并用 `operation_batch` 记账；启动时只把卡在 `parsing` 的 Source 复位或标错。

这无法自动回答：

- Note 已创建、只写了一半 Block 时进程退出怎么办；
- retry 是继续、覆盖、清理后重建，还是再建一份；
- 同一个 Source 被两次重试同时处理时谁获胜；
- 部分物化产物是否会被列表、扫描器或用户提前看见。

`operation_batch` 是审计记录，不等于 durable job，也不天然提供幂等。

**最低修正**：物化必须有稳定 identity。可以新增 `source_materializations`，也可以在 v1 用确定性的 projection note id + 单事务提交，但必须明确：

- 同一 Source / 文件同一时间只允许一个 active materialization；
- 解析可在事务外完成，产物发布必须原子；
- retry 要么复用同一 identity 并先清理未发布 staging，要么明确创建新 run；
- `materialized` 只能在完整产物提交后写入；
- parsing 状态下的半成品不能进入正常用户与扫描器视图。

#### B. 数据库事务不能回滚物理文件操作

V10 同时操作 SQLite 与本地文件系统：

- 上传：disk temp → hash → rename → insert row；
- 删除 Source：删 row / projection + unlink blob；
- 删除 Project：迁移 15 张表，同时调用 asset release 删除图片文件。

SQLite 可以回滚行，不能把已经 `unlink` 的文件恢复，也不能自动清理一次失败 `rename` 留下的孤儿 blob。“放在同一事务里”对文件系统并不构成原子性。

**最低修正**：为上传和删除分别写出补偿协议。

- 上传失败：DB insert 失败必须清理已落位 blob；rename 失败必须回滚预留 row；临时文件必须有启动清扫。
- 删除失败：先把 blob 原子移动到同盘 quarantine / trash staging，再提交 DB；提交成功后最终 unlink，提交失败则移回。
- Project 迁移：事务内只决定哪些资产仍被引用；真实 unlink 最好在提交后执行，失败进入可重试清理队列，而不是让文件副作用混入可回滚事务。

这里的 staging 不是面向用户的“软删除垃圾桶”，而是完成硬删除所需的工程补偿层，不违背 Henry 对业务数据硬删除的判断。

#### C. 哈希去重只有查询，没有数据库唯一性

客户端 precheck 是体验优化，不是并发约束。两个标签页可以同时得到 `clear`，随后同时上传；普通 `(user_id, content_hash)` 索引无法阻止重复行。

**最低修正**：

- 服务端流式 hash 是最终裁判；
- 数据库加 `UNIQUE(user_id, content_hash)`，或与实际生命周期一致的 partial unique；
- insert 冲突后返回既有 Source，而不是 500；
- 客户端 hash 只负责节省网络流量，不能被当作安全或一致性边界。

#### D. `source_files` 同时承担了四种身份

当前草案的一行同时保存：

- 不可变文件附件：hash / storage_key / mime / size；
- 用户心智中的 Source 条目；
- 解析任务状态：received / parsing / materialized / failed；
- 当前 SourceProjection 指针：reference_note_id。

这在“一个 Source 永远只有一个文件、一次解析、一个投影”时可用，但与已经讨论过的 1:N 事实源附件、重新解析、版次和多个 Project 镜头不自然兼容。尤其是“持久身份在引用源”与“版次链挂 `source_files`”目前没有完全对齐。

这不是单纯的数据库范式问题，而是四种生命周期会互相牵制：换文件不等于换 Source，重试解析不等于新增文件，重建投影也不等于创建新身份。

### 10.3 建议修正的数据形状

Codex 更倾向于在仍无生产数据的阶段，先做一个很薄的四层分工：

```text
source_records
  用户心智中的 Source 身份；长期稳定，不等同于某个文件或某次解析。

source_files
  不可变事实附件；属于 source_record；hash / blob / mime / size 在这里。

source_materializations
  某个文件经某个 parser/version 产生投影的一次 durable run；保存状态、错误与 note_id。

source_project_placements
  Source 在哪些 Project 镜头里可见；解决跨 Project 去重后“库里有，但当前项目没有”的死路。
```

这四张表听起来比一张表重，但它们没有引入出版机器、完整血统或 Edition；只是把四种已经实际存在的生命周期各放回自己的位置。

V10 仍然可以只允许：

- 每个 Source 一个当前事实文件；
- 每个 Source 一个成功投影；
- 不提供重物化 UI；
- 不提供版次 UI。

限制可以留在服务层，数据地基不必假装世界永远只有 1:1。

如果 V10 坚持不拆 `source_records`，也必须诚实写下技术债：**v1 的 Source 身份暂时等同于文件行，未来出版与多附件落地前会发生一次实体迁移**。不能一边采用单表，一边继续宣称它已经是版次机器的零迁移落点。

### 10.4 仍需在 Plan 中补清的生命周期问题

#### 1. “可重建”承诺目前缺少工程依据

V10 不保存持久 SourceArtifact，不记录 parser run/version，也不实现重物化，却在孤儿状态和删除文案中使用“投影待重建”“内容可重建”。即使重新解析出相同文字，新 Block id、locator 和用户 Annotation / ContentGroup 锚也未必能稳定复原。

两个诚实选项：

- V10 明确不承诺重建，只说“原件仍保留；重建能力后续提供”；或
- 现在保存 materialization identity、parser key/version 与稳定 block mapping，给未来重建留下可验证依据。

#### 2. `status='deleted'` 与硬删除语义冲突

Plan 同时设计 `source_files.status = active|deleted`，又规定删除 Source 时删行、blob 和 projection。若记录被硬删，`deleted` 永远没有合法使用场景，只会成为第二套含混生命周期。

按 Henry 已拍的原则，建议业务层直接硬删并移除该字段。若为跨文件系统事务需要短暂 `deleting`，它应是内部操作状态或 staging 记录，不是用户可恢复的软删除真相。

#### 3. 出身记录会随 Project 删除而消失

`birth_course_id ON DELETE SET NULL` 能避免墙，却不能满足“Origin 是永久溯源事实”。Project 删除后，系统只剩 NULL，不再知道最初从哪里进入。

可以保留 nullable FK 供活跳转，同时保存轻量 origin receipt，例如原 Project id/name 的冻结摘录和上传入口。Origin receipt 与 placement 是两件事：前者记录过去，后者描述现在可从哪里看到。

#### 4. Source 删除后的收据必须由 FK 语义保证

`note_block_sources.source_file_id` 应明确 `ON DELETE SET NULL`，并确保 `source_excerpt`、定位摘录和出处模式不会跟随 Source 行级联消失。验收不能只测 Source 被删，还要测试引用行仍在、收据仍能展示、活跳转明确降级。

#### 5. Home 与特殊文档类别需要数据库不变量

确定性 id、`INSERT OR IGNORE` 和路由守卫不足以阻止并发或历史脏数据产生多个 Home。建议：

- 用 partial unique 保证每个 user 每种 system project 至多一个；
- 与其只用 `is_system`，更可考虑 `system_kind='home'`，给未来其他系统容器保留明确身份；
- 公共 API 永远不能让用户写 `note_class='system'` 或自行改 `note_class`；
- `note_class` 既然参与权限判断，就应有 CHECK / validator / constructor 三层约束，而不是自由字符串。

#### 6. “迁移 15 张表”不能长期靠人工记忆

这次对抗核查已经把清单从 6 张修到 15 张，恰好证明手写清单会随新卫星表增长再次漏项。建议增加模型检查：扫描所有含 `course_id` 或指向 course-scoped 主体的表，与“迁移 / 删除 / 保留”策略注册表比对；出现新表但没有策略时让测试失败。

这比每个版本重新靠人肉盘点更符合长期工程纪律。

#### 7. 大文件边界还不完整

- User Workflow 用“100MB 重复文件”举例，但 multer 上限是 50MB，口径需要统一。
- 浏览器 WebCrypto 整体 digest 可能把整份文件读入内存；50MB 尚可，但应避免在主线程造成明显冻结。
- 50MB 压缩 docx / pptx 可能解压成远大于 50MB 的内容，需要解压体积、条目数、解析时间和页数上限。
- 超长 PDF 可能生成成千上万个 Block；需要最大页数 / Block 数、分批写入或明确拒绝策略。
- parser 失败要区分“格式不支持、资源超限、文件损坏、内部错误”，否则重试按钮会鼓励用户重复执行一个必然失败的任务。

这些不要求 V10 建完整任务队列，但必须有边界、超限错误和不会无限重试的状态。

### 10.5 本轮确认的成熟工程判断

第三批并非否定整份 Plan。以下部分值得保留：

1. `note_class + note_blocks.source_kind` 双层标记，正确覆盖了 Note 级和 Block 级写路径的不同事实。
2. 权限锁放在服务端，UI 只做可理解的镜像，而不是把“不可编辑”寄托在按钮隐藏上。
3. 文件 copy-in、storage_key 间接寻址、永不按外部路径引用，是可靠 Source 系统必须有的地基。
4. legacy Documents / anchors / snapshots 冻结而不强行迁移，能避免 V10 同时承担两代系统转换。
5. 扫描器 must-exclude 清单和“新建 system backing note 前向路径”说明对抗核查确实触及了真实写旁路。
6. RED-first 验证矩阵方向正确；现在需要把并发、部分失败和文件补偿也加入矩阵。

### 10.6 第三批结论

在这一批看来，V10 尚不适合立即照当前 Plan 全速实现。开工前至少应拍定：

1. Source 身份是否从 `source_files` 中拆出；
2. 是否新增 SourceProjectPlacement；
3. 物化采用 durable run，还是确定性 id + 原子发布；
4. 上传 / 删除的文件系统补偿协议；
5. 哈希唯一约束；
6. V10 是否撤回“可重建”的当前承诺。

这些不是未来版次机器的奢侈设计，而是 Source Floor 自己的承重边界。

---

## 十一、第四批审视：未来 Agent 与十年尺度

### 11.1 Henry 的前提纠正

Henry 明确指出：当前代码库中存在的 Agent 属于 Coincides 1.x 时代，其数据假设、对象模型和产品需求与 Better Notebook 当前体系不匹配。

因此本轮采用以下前提：

- 不把 legacy Agent 当作未来 Agent 的种子；
- 不为兼容 legacy Agent 扭曲 Source / Purpose / ContentGroup / Canvas 的新真相；
- 不用 legacy Agent 的“能否读到”作为 V10 验收标准；
- V10 只需要建立未来 Agent 可依赖的干净 substrate，不实现 Agent 操作者；
- 旧 Agent、旧 embedding 与旧扫描器若会误读新对象，应隔离或排除，而不是继续扩写兼容层。

### 11.2 核心结论：Agent-ready 不等于现在接 Agent

未来 Agent 真正需要的不是数据库访问权，也不是一份提前冻结的 prompt JSON，而是两条稳定边界：

1. **有界、可追溯的读取边界**：根据当前 Purpose、用户选择和预算，把真相编译成有限 Reading View；
2. **proposal-only 的写入边界**：Agent 只能提出结构化变更建议，真正写入由现有领域服务和用户确认执行。

建议的长期管线是：

```text
Truth Layer
  Source / TextFlow / ContentGroup / Canvas / Relation
        ↓
Read Model Compiler
  稳定 DTO，隐藏表结构与历史兼容细节
        ↓
Context Selector
  Purpose-scoped、用户选中范围、token budget
        ↓
Future Agent
        ↓
Structured Proposal
        ↓
Domain Service + Human Acceptance
        ↓
Truth mutation
```

Agent 不应跳过 Read Model 直接读表，也不应跳过 Proposal 直接写真相。

### 11.3 legacy Agent 的正确处理

当前 legacy Agent 最合适的状态是“隔离的历史子系统”，而不是新能力的依赖：

- 新 SourceProjection 默认不进入 legacy Agent 的扫描、embedding 和候选生成；
- 新表不为 legacy Agent 补 adapter，除非只是为了阻止误读；
- 旧 embedding 索引继续视为可丢弃派生物，不成为新知识真相；
- 未来重做 Agent 时，从当前四大支柱和 Source 的正式 read model 起步；
- legacy Agent 能继续服务旧路径即可，不能反向定义 V10 的对象形状。

V10 Plan 中对五台扫描器的 must-exclude 是正确方向，但应把它理解为**隔离旧世界**，不是完成了 Agent 集成。

### 11.4 Agent 默认不能读“全部”

一个使用十年的知识库可能包含：

- 数万 Source block；
- 数千 ContentGroup；
- 成千上万条 Relation；
- 大量历史 Proposal、操作记录、旧解释和修订痕迹；
- 多个 Project、Purpose 与时间阶段。

未来 Agent 若默认读整个库，问题不只是 token 贵，而是语义质量会随着时间下降。旧解释、冲突观点和无关关系会稀释当前目的。

上下文应按层取用：

```text
第一层：当前 Purpose + 用户选中对象 + 直接 Source 收据
第二层：相关 ContentGroup / Petal + 当前有效 Relation
第三层：按需展开的 Source range / 邻接节点 / 原文页面
第四层：用户显式要求时才读取的历史版次与冷痕迹
默认排除：旧 Proposal、失效解释、全量 operation log、原始布局噪音
```

因此 PurposeFrame 的长期价值，不只是给内容贴目标，而是成为 Agent context compiler 的根。

### 11.5 SourceArtifact 不能直接成为 Agent API

`SourceArtifact` 是 parser 与 materializer 之间的中间接口，描述解析器看到了什么。它适合承载页、块、bbox、confidence、provider 等重建信息，但不等于 Agent 应读取的产品语义。

若未来 Agent 直接消费 SourceArtifact，会产生三个耦合：

- Agent prompt 被 parser backend 的输出形状绑死；
- 更换 MinerU / OCR / native parser 会改变 Agent 上下文；
- bbox、provider 和解析细节会挤占本应留给正文、出处与目的的预算。

未来需要单独的 `SourceReadingView`：

- 以稳定 Source 身份为入口；
- 选择当前可用 materialization；
- 只暴露任务需要的正文、locator、confidence 摘要和收据；
- parser-specific metadata 经 adapter 归一化；
- 可以按 range、page、ContentGroup 或 Purpose 局部编译。

SourceArtifact 属于摄入内部协议，SourceReadingView 才属于未来 Agent 读取协议。

### 11.6 Agent 必须知道“这句话是什么地位”

Agent 读取内容时，至少要区分：

- Source 原文或忠实摘录；
- 用户自己的解释；
- AI 的转述或蒸馏；
- 尚未确认的推断；
- 当前 Purpose 下的组织状态。

但这些地位不能焊在 Source 身份上。直接引用 / 转述 / 蒸馏 / 推断属于**使用关系或产物相对于来源的模式**，同一份 Source 在不同内容中可以承担不同角色。

未来 Agent 的事实边界应由“内容 + 使用模式 + 收据”共同表达，而不是只看到一个 `source_id` 就把整段内容当作证据。

### 11.7 Agent 写入必须 proposal-first

未来 Agent 不应拥有“随便调用 CRUD”的能力。它需要的是产品级命令：

- 建议把哪些 range 收进 ContentGroup；
- 建议拆分、合并或调整 Petal；
- 建议建立、拒绝或替换 Relation；
- 建议从哪些 Source range 装配一个 Draft；
- 建议将哪些内容物化到 Note / PageFrame；
- 建议某个锚发生漂移，需要重新绑定。

Proposal 应包含：目标 Purpose、输入对象、建议动作、Source receipts、影响范围和可撤销信息。用户接受后，仍由 ContentGroup、Source、Note、Canvas 等领域服务执行。

这保证未来换模型、换 Agent harness 或接入外部 Agent 时，真相层不会跟着换一套写入语义。

### 11.8 Relation 在 Agent 时代更要保持稀疏

Henry 对 Relation 噪音的判断在 Agent 视角下更加成立：

- 正式关系只保存当前有效、可查询的语义骨架；
- “可能相关”留在 Proposal；
- 个人联想和历史解释若值得保存，进入冷痕迹而非默认边属性；
- Agent 默认读取 Purpose 范围内的当前关系，不读取全量历史关系说明；
- embedding、GraphRAG 和 rerank 结果全部是可重建索引，不得升格为关系真相。

一条正式 Relation 的存在已经是思考痕迹。解释可以按 Source、当时的 Purpose 和变更记录在需要时重新叙述，不必永久把长理由焊在边上。

### 11.9 十年尺度需要五类数据温度

建议长期把数据按使用温度区分，而不是一律当作 Agent 上下文：

```text
Active Truth
  当前 TextFlow / ContentGroup / Source identity / Relation / Purpose 状态

Receipts
  引用摘录、locator、Source 使用模式；小而稳定，长期保留

Cold Trace
  重要转向、被取代理解、历史 Proposal、操作事件；默认不读

Derived Index
  embedding、GraphRAG、全文索引、聚类；随时可删可重建

Transient Context
  某次 Agent 任务编译出的 prompt/input；任务结束即可丢弃
```

如果把 Cold Trace、Derived Index 或 Transient Context 混入 Active Truth，十年后系统会越来越难读，也越来越难让 Agent形成稳定判断。

### 11.10 没有 Agent 时如何验证“Agent-ready”

不需要为了验收 V10 把 Agent 提前接进来。可以用确定性 model contract 验证：

1. 给定 Source / Note / Purpose fixture，能否编译出稳定、有限的 Reading View；
2. Reading View 是否含稳定 id、正文、locator、收据与使用模式，而不泄漏表结构；
3. 是否能按 Purpose / range / page 限定范围；
4. 删除 Project、删除 Source、投影缺失时，Reading View 是否明确降级而不伪造证据；
5. 相同输入是否产生确定性排序，避免 Agent 上下文随机漂移；
6. 大型 fixture 编译结果是否有大小预算与截断规则；
7. 新 SourceProjection 是否完全不进入 legacy Agent / embedding 扫描。

这里测试的是未来 Agent 的**食材和餐盘**，不是提前制造厨师。

### 11.11 对 V10 的实际影响

从 Agent 角度看，V10 不需要新增 Agent 页面、对话框、prompt、embedding 或 GraphRAG，也不需要实现完整 AgentReadingView API。

V10 真正需要守住的是：

- Source 身份稳定，不与文件、解析 run 和 Project owner 混杂；
- locator、收据和使用模式有明确接缝；
- SourceProjectPlacement 能提供 relevance / visibility 基础；
- 所有真相变更经过领域服务，不让未来 Agent 被迫学数据库写法；
- legacy Agent 与扫描器不能误读新对象；
- 不把 parser DTO、metadata JSON 或全量历史当成未来 Agent 契约。

换句话说，第四批没有给 V10 增加一大堆 Agent 功能。它反而进一步要求 V10 **少承诺、分清层、留稳定接口，不为一个尚不存在的 Agent 预造第二套真相**。

### 11.12 第四批结论

未来 Agent 应被视为可替换操作者，而不是第五个真相源。它的可靠性来自：

```text
干净真相
+ 有界 Reading View
+ Purpose-scoped context
+ Source receipts
+ proposal-first mutation
```

当前 1.x Agent 与这条路线不匹配，应保持隔离。V10 的 Agent 成熟度不以“现有 Agent 能不能跑”衡量，而以“未来任何合格 Agent 能否在不理解内部数据库的情况下，读到有限且可信的材料，并通过受控 proposal 参与工作”衡量。

---

## 十二、第五批审视：最终范围裁剪与建议版 V10

### 12.1 总体裁决

V2.BN.10 的方向是正确的，值得继续；它不需要推倒重写，但**需要在开工前重写一次数据与生命周期脊柱**。

当前 Plan 最大的问题不是缺功能，而是试图同时充当：

- Source Floor 的可执行计划；
- 未来出版 / 版次 / 血统机器的宪法；
- Project 拆墙的过渡方案；
- Agent 时代的预留说明；
- legacy Documents 的切换方案。

这些思想本身大多有价值，但全部挤在一个地板版本里，会让实现者分不清“本版必须成立的真相”和“未来不能焊死的接缝”。

Codex 的设计判断是：**V10 应当变得更无聊、更可靠。** 用户只需要感受到六件事：

```text
收得进来
找得到
当前 Project 看得到
打得开
引得准
删得明白
```

只要这六件事可靠，Source Floor 就成立。版次、修缮、血统、Agent 装配和高保真重建都可以在它上面继续生长。

### 12.2 原样保留

以下设计已经成熟，不建议重新讨论：

1. **V10 先做 Source Floor**，而不是继续增加 CanvasObject 或提前做 Relation。
2. **全局 Source Library**，Source 不被单个 Project 拥有。
3. **copy-in + storage_key + server-side hash**，永不依赖用户外部文件路径。
4. **收转解耦**，解析失败不影响事实文件安全入库。
5. **能力分级**，能保存不等于能解析，不能解析也仍是合法 Source。
6. **双开模式**，应用内看提取阅读视图，同时始终能查看事实原件。
7. **复用 Note / TextFlow 内容引擎**，不为 Source 另造第二套编辑机器。
8. **Source 内容政策锁在服务端**，UI 只负责清楚表达。
9. **`note_class + source_kind` 双层标记**，分别覆盖 Note 与 Block 写路径。
10. **非对称删除**，删 Project 不删 Source；删 Source 只能从 Source Library 发起。
11. **legacy Documents 冻结**，不在 V10 顺手做完整旧数据迁移。
12. **scanner must-exclude + RED-first**，防旧机器误读 SourceProjection。
13. **V10 不做 Agent / GraphRAG / Relation runtime**，legacy Agent 保持隔离。

### 12.3 开工前必须修改

以下六项是 Source Floor 自身的承重边界，建议未拍定前不要开始 migration 045：

1. **Source 身份与事实文件拆分**：推荐增加 `source_records`；若坚持单表，必须明确接受未来实体迁移，删除“零迁移版次落点”的承诺。
2. **增加 SourceProjectPlacement**：去重命中时把既有 Source 放入当前 Project 镜头，Project 删除只删 placement，不影响 Source。
3. **数据库级 hash 唯一约束**：客户端 precheck 仅优化体验，服务端 hash + UNIQUE 负责真一致性。
4. **物化幂等 / 原子发布协议**：durable run 或确定性 id 二选一，禁止半成品进入用户面；retry 不得重复建 Note / Block。
5. **文件系统补偿协议**：temp、rename、quarantine、unlink 与 DB commit 的失败路径全部写入 Plan 和 RED 测试。
6. **撤回不真实的“可重建”承诺**：在稳定 materialization identity、parser version 与 block mapping 到位前，只承诺原件安全保存，不承诺完整恢复用户投影工作。

### 12.4 建议补入 V10，但不扩大产品野心

这些能力体量不大，却直接决定首版是否真的可用：

1. **状态感知的条目打开行为**：ready 打开阅读视图；received/parsing 打开状态详情并可查看原件；failed 展示失败原因与原件；无投影时不跳死路。
2. **清楚的锁定文案**：统一表达为“Source 内容锁定；标注、解释与组织可编辑”，避免笼统“只读”。
3. **Source Library 最小检索**：文件名搜索 + 类型筛选 + 状态筛选。不要第一版就做复杂 faceting。
4. **Origin receipt**：`birth_course_id` 活跳转之外，保留轻量 Project 名称 / id / 上传入口摘录。
5. **收据删除降级测试**：删 Source 后 `source_file_id` 置空，摘录、locator 和使用模式仍在。
6. **Home 唯一不变量**：数据库约束每用户一个 `system_kind='home'`；产品上呈现为“主页 / 未归档”，不伪装成普通课程。
7. **迁移策略覆盖测试**：新增 course-scoped 表而没有 move/delete/preserve 策略时，contract test 失败。
8. **资源边界**：统一 50MB 口径，增加解压体积、页数、Block 数、解析超时和不可重试错误分类。
9. **唯一主上传入口**：新 Source 管线成为正常入口；旧 Documents 上传隐藏或明确降级，避免用户面对两套摄入心智。

### 12.5 明确后置

以下内容可以继续留在设计与会议记录中，但不应作为 V10 实现或验收义务：

- Edition / Living Copy / Publication / 修缮源；
- reconcile 与三方合并；
- 重物化 UI、解析后端切换 UI；
- 完整 SourceArtifact 持久化；
- 高保真 bbox 还原、MinerU / VLM / OCR 强管线；
- 完整血统 DAG、血统面板与链路重叙；
- 内部 Note 出版为 Source；
- Source correction / proofreading 工作台；
- URL 抓取、网页剪藏、音频、视频和 3D；
- pptx / xlsx / csv 的结构化解析；
- AgentReadingView API、prompt、Agent UI、embedding、GraphRAG；
- Relation runtime 与自动关系生成；
- 完整 SourceUsage 分析和使用统计。

这些不是被否定，而是 V10 不需要证明它们。

### 12.6 从 V10 Plan 删除或改写

1. 删除 `source_files.status='active'|'deleted'`；业务采用硬删除，不保留无消费面的伪状态。
2. 删除“100MB 重复文件”例子，或把上限整体改成同一个数，避免规格自相矛盾。
3. 把“只读源笔记”统一改为“Source 内容锁定的提取阅读视图”。
4. 把“真 Note”改为“复用 Note 内容引擎的 `source_projection` 文档类别”。
5. 把“可重建”改为“原件仍在；重建能力后续提供”，除非本版补齐真正重建基础。
6. 删除“版次链将来挂 source_files、不挂 note”的当前硬断言，待 Source identity 拆分后重新决定。
7. 删除未消费的 speculative 字段，例如没有明确写读路径的可选 `source_block_id`。
8. 把出版、版次、Agent 与收集章节的长篇未来说明移出执行步骤，只在 `Out of Scope / Future Seam` 留一行链接。
9. `metadata` 中本版要使用的 key 应列成闭合集合，不把它变成未来概念的临时垃圾场。

### 12.7 建议的子版本顺序

与其按“后端、解析、UI、删除”横切，建议按可独立验证的生命周期纵切：

```text
V2.BN.10.1  Source Identity And Placement Floor
  source_records / source_files / source_project_placements
  hash UNIQUE / Home invariant / origin receipt

V2.BN.10.2  File Intake And Storage Lifecycle
  upload / precheck / copy-in / temp-cleanup / compensation
  capability-0 storage / limits / typed failures

V2.BN.10.3  Parser And Atomic Materialization
  SourceArtifact internal interface / native parsers
  materialization identity / retry / atomic publish / projection policy lock

V2.BN.10.4  Source Library And Project Experience
  one upload path / list / search-filter / status-aware open
  dual view / locked-content UX / current-project placement

V2.BN.10.5  Deletion, Receipts And Closure Gate
  delete Project / move to Home / delete Source
  receipt survival / asset compensation / migration coverage
  concurrency + crash-injection + real-document browser smoke
```

这样每个子版本都能回答一个完整问题，而不是 10.1 建完很多表却还没有任何一条生命周期闭环。

### 12.8 建议的最终验收门

V10 收口前至少验证：

1. 两个并发上传只产生一个事实文件和一个 Source 身份。
2. 同一 Source 在另一个 Project 上传时，当前 Project 立即获得 placement。
3. 服务在物化任意阶段退出，重启后不存在半成品可见或重复投影。
4. DB insert / rename / unlink 任一步失败，数据库与磁盘最终都可恢复到一致状态。
5. PDF / docx / txt / md / image 各用一份真实材料跑完整摄入；失败格式仍能查看原件。
6. SourceProjection 内容不可改，但 Annotation、ContentGroup、Purpose 与允许的表现层操作可用。
7. 无投影、解析中、解析失败和 ready 四种条目都能打开正确界面，不存在死点击。
8. 删除 Project 永远不删除 Source；有用户劳动的投影得到明确保护选择。
9. 删除 Source 后引用收据仍在，活跳转明确降级。
10. Home 只有一个，不能删、不能改系统身份，也不会成为 Source 的真正 owner。
11. 新 SourceProjection 不进入 legacy Agent、embedding、模板迁移和其他旧扫描器。
12. 大文件、压缩膨胀、页数超限和不可重试解析错误均给出稳定结果。
13. Source Library 可以按名称找到文件，并按类型 / 状态筛选。
14. 浏览器完整走通“上传 → 等待 → 阅读 → 查看原件 → 引用 → 跨 Project 使用 → 删除”的真实旅程。

### 12.9 最终评价

这套设计最成熟的地方，是它已经知道 Source 不只是文件，而是证据、引用、项目镜头和未来思考装配的共同入口。

最不成熟的地方，是它太急于一次性解释 Source 的一生，导致地板版本提前背上了出版、血统、Agent 与拆墙的语言重量，同时最朴素的并发、重试和文件补偿还没有同样清楚。

真正有设计品味的收束，不是再补更多未来名词，而是让第一版做到：

> 用户把材料交给 Coincides 后，可以放心忘记文件放在哪里；需要时找得到、看得见、引得回，删错 Project 也不会失去证据。

做到这里，V10 就已经对得起 Source Floor 这个名字。其余宏大能力不需要在这一版证明。

---

## 十三、Claude 复核反馈与 Codex 回应

### 13.1 双 Agent 审视形成互补

Claude 阅读本记录全部十二节后认为，大部分审视应当接受。其既有两轮核查主要覆盖写权限、表清单和 verdict 忠实度；Codex 补充的异步任务、并发、崩溃与文件生命周期维度，确实击中了原核查矩阵未覆盖的 Source Floor 承重边界。

本轮协作证明：独立第三者的价值不是重复确认已有结论，而是从不同失败模型重新攻击同一设计。

### 13.2 双方已经收敛的事项

Claude 明确认可以下修正：

- SourceProjectPlacement 进入 v1；
- Source 身份、事实附件、物化 run、Project placement 四层拆分；
- hash 数据库唯一约束；
- 物化幂等与原子发布；
- 文件系统补偿协议；
- “只读 / 真 Note / 可重建”等语言诚实化；
- 删除与硬删冲突的 `status='deleted'`；
- 15 表手工迁移清单升级为机器策略覆盖检查；
- 统一 50MB / 100MB 规格，并补资源上限与错误分型；
- 五段纵切版本顺序与并发 / 崩溃注入收口门；
- legacy Agent 保持隔离，第四批仅作为未来 substrate 约束存档。

### 13.3 Claude 对 Codex 的三处修正

#### 1. 版次链不变量应保留，只更换载体

Codex 原建议删除“版次链挂 `source_files`”的硬断言。Claude 正确指出：不能连同“版次不得随 Project / projection 级联蒸发”这一已付出代价得到的不变量一起删除。

双方收敛后的准确表达应是：

> 未来 Edition / Publication history 属于全局 `source_record` 身份，不属于事实附件 `source_file`，也不属于可删除的 projection note 或 Project。

V10 只在 Future Seam 中保留这条归属不变量，不实现 Edition 表和出版机器。

#### 2. 删除 Project 的默认选项属于 Henry 的产品裁决

Codex 倾向“存在用户劳动时默认迁移到 Home”，Claude 认为“默认删除并诚实警告”同样符合尊重删除意图的哲学。双方同意这不是纯工程问题，最终由 Henry 决定。

Codex 仍推荐一个有界的动态默认：

```text
纯机器投影
+ 无其他 Project placement
+ 无 Annotation / ContentGroup / Purpose / 人工表现层工作
  → 默认删除投影

存在任一用户劳动
或 Source 仍被其他 Project placement 使用
  → 默认迁移投影到 Home
```

两个选项始终同时可见，动态默认只反映不可逆损失的不对称，不剥夺用户删除意图。

#### 3. 未来宪法应移位而非删除

双方没有实质分歧。出版、版次、Agent 与血统的不变量可保留在设计文档或 Future Seam 附录；执行 Plan 只保留一行链接和本版不得焊死的接口，不让未来语言淹没当前任务。

### 13.4 对六项待拍决定的 Codex 建议

| # | 决定 | Codex 最终建议 |
|---|---|---|
| 1 | 数据脊柱四层拆分 | 拍“拆”；现在是零生产数据的最低成本窗口 |
| 2 | Placement 进入 v1 | 拍“进”；它同时解决产品死路与未来 relevance |
| 3 | 物化幂等方案 | 拍 durable run 表；但它只是持久状态机，不扩成完整任务队列 |
| 4 | 删除 Project 默认项 | 推荐按“用户劳动 / 外部 placement”动态默认，选择权始终保留 |
| 5 | 撤回可重建承诺 | 拍“撤”；先承诺原件安全，重建能力以后用事实挣回来 |
| 6 | 五段纵切子版本 | 拍“采纳”；每段闭合一条生命周期 |

### 13.5 一个需要随四层拆分同步钉住的关系方向

- `source_file` 属于 `source_record`；同一 hash 命中返回既有 record。
- `source_materialization` 属于 record，并明确使用哪一个 file、parser 与 projection note。
- `source_project_placement` 指向 record，不指向 file 或 projection note。
- projection note 可以暂时落在出生 Project；出生 Project 删除时，若仍有其他 placement 或用户劳动，则迁移到 Home。
- 未来 Edition 属于 record；projection note 只是当前内容工作面，不是历史身份。

这组方向能同时保住“一个知识空间、Project 是镜头”“事实附件可追加”“投影可替换”与“历史不随容器蒸发”。

### 13.6 当前流程结论

Codex 同意 Claude 的暂停判断：在六项决定由 Henry 拍定、Plan 升级为 v3、实现设计升级为 v2 之前，不应开始 migration 045。此处暂停不是犹豫，而是因为审视已经触及承重墙，先改图纸比写完再迁移便宜得多。

---

## 十四、2026-07-11 跟进：Henry 正式拍板与 Plan v3

Henry 在复核 Codex 五批审视与 Claude 回执后，正式拍板采用 §13.4 的六项建议：

1. Source 数据脊柱拆为 `source_records / source_files / source_materializations / source_project_placements`；
2. SourceProjectPlacement 进入 V10 v1；
3. materialization 使用 durable run 表；
4. 删除 Project 按“用户劳动 / 其他 Project placement”动态选择默认项，两个选项始终保留；
5. 撤回 V10 当前的“投影可重建”承诺，只承诺事实原件安全保留；
6. V10 子版本改为五段纵向生命周期切分。

同时确认：

- 未来 Edition / Publication history 的不变量继续保留，但载体升级为全局 `source_record`；
- `source_files.status='deleted'` 删除，Source 业务语义坚持硬删除；
- legacy Agent 不作为 V10 消费者或验收依据；
- migration 045 在技术底稿同步 v2 前继续暂停。

Codex 已据此将 `docs/releases/V2.BN.10-plan.md` 重写为 planned v3。v3 的五个子版本为：

```text
V2.BN.10.1  Source Identity And Placement Floor
V2.BN.10.2  File Intake And Storage Lifecycle
V2.BN.10.3  Parser And Atomic Materialization
V2.BN.10.4  Source Library And Project Experience
V2.BN.10.5  Deletion, Receipts And Closure Gate
```

Plan v3 现为 V10 的范围、用户流程、顺序与验收依据；既有技术底稿 v1.1 的代码盘点仍有价值，但其单表脊柱和旧生命周期结论不再作为实现依据，必须先升级为 v2。
