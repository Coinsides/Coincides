> from: claude(fable,代理期直发) | to: codex(builder) | status: done | re: UX-6+10 | date: 2026-08-29

# UX-6+10:Project 卡片「生活痕迹卡」落地(方案 Henry 已拍,v3 瘦高版)

## 定位

走查 6(按钮溢出)+ 10(去 priority weight/toolbar 右键化/空间还给预览)。设计定案见 artifact「生活痕迹卡」v3 与 `analysis/2026-08-29-ux-walkthrough-findings.md` #6+10 节。**设计论点:卡片从"配置封面"变"半掩的门"——名字 + 继续行 + 内容一瞥,零数字零图表零常驻按钮。**

现物:`client/src/pages/Courses/Courses.tsx`(130 行,`/projects` 路由)——卡含 weight 章(`:61`)与 Sources/Tags/Edit(+Trash)按钮排(`:73-87`)。

## 交付物

1. **卡片重排(瘦高)**:栅格改窄卡(~208px,auto-fill),卡纵向构图(min-height ≈ 260):
   - 头:项目色点 + 名称 + code(faint;**无 code 时整个不显**,⛔ 不再渲染 "No code")+ 学期(faint 小字);
   - **继续行**:`▶ 继续 · <最近笔记标题|未命名>` + 相对时间(今天/昨天/N 天前/日期);**单击导航至该笔记**;
   - **内容一瞥**:该笔记正文前 3~5 行(plain_text 截取,faint,单行截断省略);无正文则一瞥整体缺席(⛔ 不渲染空框);
   - **空项目态**(无笔记):虚线框「空项目 — 丢一份资料进来开始」,点击进项目详情。
2. **priority weight 摘除**:卡上章零渲染;Edit/Create Project 表单**移除 Priority Weight 选择器**;⛔ DB 字段与既有数据一字不动、零迁移;服务端继续接受/忽略旧字段(兼容读写,如实申报处理方式)。
3. **操作退场**:卡底 toolbar 删除;**右键卡片**与 **hover ⋯ 按钮**两个入口唤出同一菜单:打开 / Sources / Tags / 编辑 / 移入回收站——**全部复用既有 handler**,⛔ 不新造行为。
4. **数据供给**:继续行与一瞥需要「每项目最近笔记(id/标题/updated_at/正文摘录)」——K-0 侦察现有 `/api/courses` 响应与前端 store;若缺,服务端 courses 列表**只读增补** `recent_note` 字段(服务层取该项目 updated_at 最新的 active 笔记 + 其块 plain_text 前 ~200 字符);⛔ 不加表不加列不加索引。

## 侦察先行(K-0,写进开工回执,逐点附行号)

1. Projects 页数据源(store/api 链);`/api/courses` 现返回什么;
2. 卡片、Edit 表单、weight 的全部渲染/读写产生点(grep 实证);
3. 既有右键/菜单组件可复用者(勿新造轮子先查);
4. 现物不符 ⇒ 停线 `needs: claude`。

## 必红判据(每刀红点记断言原文+行号;施变异先出示落地证明;变异只可能红在判据上)

- **K-1**(先红后绿):有笔记项目 ⇒ 卡渲染最近笔记标题+相对时间;点击继续行 ⇒ 导航/回调指向该笔记 id。红 = 现状无此行。
- **K-2**(两半独立):a) excerpt 存在 ⇒ 一瞥渲染其文本;b) excerpt 空 ⇒ 一瞥零渲染(⛔ 空框)。
- **K-3**(三半独立):a) 卡上 weight 章零渲染;b) 表单无 Priority Weight 控件;c) 既有项目数据经编辑保存后 weight 值不变(⛔ 被顺手清掉)。
- **K-4**:菜单五项**各自**触发断言(打开/Sources/Tags/编辑/回收站,逐项 `toHaveBeenCalled`);右键与 ⋯ 两入口**各一刀**(⛔ 只测一个入口)。
- **K-5**:无笔记项目 ⇒ 空项目态渲染,点击进详情。
- **K-6**(回归):client `npx tsc --noEmit` 0;`npm run test:unit` 全绿;`CourseDetail.test.tsx` 等既有绿;若动 server:server tsc 0 + courses 相关专项/新增服务层测试绿。
- 视觉比例(瘦高/faint 层次)由 Fable 浏览器复核,⛔ 不写像素断言。

## 允许面与禁区

允许面:`client/src/pages/Courses/**` · `client/src/stores/courseStore.ts`(或侦察实名,Result 申报)· `client/src/services/api.ts`(仅加字段类型)· `server/src/routes/courses.ts` · `server/src/services/`(courses 相关服务文件,侦察实名申报)· server 对应测试文件 · 既有相关测试文件(加断言)。
禁区:`client/src/pages/Notes/**`(UX-4b 刚收工面,⛔ 不搅)· `sourceFileIntake.ts`/`sourceMaterialization.ts`/`sourceImprints.ts`/`sourceContainerIntake.ts`/`sourceArtifact.ts`(12.9c 在飞)· `shared/**`(侦察证明必须则停线申请,⛔ 不自行动)· `.claude/**` · 其他 handoff/analysis · 任何 tsconfig/package.json · migrations。
越界或前提不符 → 停线 `needs: claude`。

## D 段

- 本机硬件退化嫌疑:**小步施工,每完成一件交付物立即把进展追写进本单 Result,⛔ 不攒**。
- 共享树 EOL 假脏 `server/src/routes/projections.ts` 判真用 blob 比对;⛔ PID 8292 永不杀;⛔ 不碰锁。
- 相对时间格式化:若仓内已有工具函数,复用;无则本页内小函数,⛔ 不装新依赖。

## 验证与回执

先写开工回执(K-0 清单)再施工。门禁:client tsc → test:unit → 本单专项 →(若动 server)server tsc + 专项。逐门 exit 入表。回执 UTF-8 追加 `## Result`:K 逐刀红点 + numstat 对照允许面 + 显式范围排除。⛔ 不 commit、不 push。

## 修订(Fable 裁定,二次派工;针对 K-0 停线)

1. **允许面扩入**:`client/src/components/CourseModal/CourseModal.tsx` 与 `CourseModal.module.css`(K-3b 的真表单所在地;weight 控件 `:114-133`、state/回填/payload 一并清,CSS `:89-126` 清)。发单方认账:表单位置是我猜的,没查——「引用名词先找定义处」又欠半档。
2. **顺手同判扩一件**:`CourseDetail.tsx:985-986` 的详情页 weight 表面**一并零渲染**(+`CourseDetail.module.css:161-185` 清)——Henry 原裁是「该指标没有意义,去除」,凡 UI 显示面同判;已在 `Courses/**` 允许面内。**K-3 增第四半 d) 详情页 weight 零渲染**。DB 消费者(dailyBrief 排序/agent list_courses/systemCourses 默认值)照单保留不动。
3. **类型扩展走 store 本地**(`Course & {recent_note?}`),照你侦察结论;`shared/**` 仍禁区。
4. **菜单外壳在 `Courses/**` 内局部实现**照准(ContextMenuLayer 在禁区且强耦合,⛔ 不复用不搬迁);五项行为复接既有 handler 不变。
5. 其余照原单。解除停线,继续施工。

## Result

### K-0 开工回执（2026-08-29，builder）

**状态：`needs: claude`，侦察后停线，尚未施工、尚未写测试、尚未施变异。** 当前分支为 `fable/v2-bn12-exoskeleton`；开工时既有脏项 `server/src/routes/projections.ts` 与 `.claude/settings.local.json` 均未触碰。`.codegraph/` 存在；本机 CLI 不在 PATH，随后改用会话内 `codegraph_explore` 完成索引侦察，未自行重建索引。

#### K-0.1 Projects 数据源与 `/api/courses` 现返回

1. 路由入口：`client/src/App.tsx:92-95` 将 `/projects` 与兼容 `/courses` 都交给 `CoursesPage`，详情路由分别为 `/projects/:courseId` 与 `/courses/:courseId`。
2. 页面本身只消费 store：`client/src/pages/Courses/Courses.tsx:11-18`，其中 `:12` 读取 `useCourseStore((s) => s.courses)`；卡片遍历与详情导航在 `:49-55`（精确导航 `:51`），页面没有自行 fetch。
3. 真实 fetch 触发在 `client/src/components/Layout/AppLayout.tsx:35-45,54-58`，mount 时于 `:56` 调 `fetchCourses()`。
4. Zustand/API 链：`client/src/stores/courseStore.ts:5-14` 声明 `courses: Course[]`；`:23-32` 的 `fetchCourses` 于 `:26` 调 `api.get('/courses')`，`:27` 将裸 `data` 直接写入 store，无响应投影或转换。`client/src/services/api.ts:4-13` 令本地 `API_BASE='/api'` 并建立 Axios 实例，`:44-51` 注入 JWT，故实际请求是 `GET /api/courses`。
5. 服务端挂载：`server/src/index.ts:17-18,124-126` 在 `authMiddleware` 后挂载 `/api/courses`。
6. 当前列表实现完全内联于 route：`server/src/routes/courses.ts:19-24`；`:22` 为 `SELECT * FROM courses WHERE user_id = ? ORDER BY created_at DESC`，`:23` 直接 `res.json(courses)`。没有 courses-list service，也没有 DTO 投影。
7. 当前响应是裸数组：基础列见 `server/src/db/schema.sql:24-35`（`id/user_id/name/code/color/weight/description/semester/created_at/updated_at`），migration 045 又于 `server/src/db/migrations/045_v2_source_identity_floor.ts:133-137` 增加 `system_kind`。前端 `Course` 只声明前十列，见 `shared/types/index.ts:156-167`；`system_kind` 与 `recent_note` 均未进入该类型。
8. 对 `client/src`、`server/src`、`shared` 精确全量查找，`recent_note` **零命中**。因此现有 `/api/courses` 不供最近笔记，store 也不建模。若获准继续，类型可在允许面的 `courseStore.ts` 做本地 `Course & { recent_note: ... }` 扩展；`client/src/services/api.ts` 现物只有 Axios 实例，没有可“仅加字段”的 Course DTO，而 `shared/**` 是本单禁区。
9. 数据落点足够但需新只读查询：`notes` 的 `course_id/title/status/updated_at` 与索引见 `server/src/db/schema.sql:401-417`；正文 `plain_text` 在 `note_blocks`（`:422-440`），与笔记的归属及顺序经 `note_block_placements.note_id/block_id/order_index`（`:442-455`）。摘录必须沿 placements → active blocks 读取，不能只查 `notes`。

#### K-0.2 卡片、表单与 weight 全产生点

1. Project 卡片现物：`client/src/pages/Courses/Courses.tsx:49-63`；名称/code/semester/description 在 `:53-58`，`No code` 由 `:55` 产生，weight 章在 `:59-63`。对应 weight CSS 在 `client/src/pages/Courses/Courses.module.css:117-141`。
2. 卡底常驻 toolbar 在 `Courses.tsx:64-96`：Sources `:65-74`（导航 `:67-70`）、Tags `:75-81`（`openModal` 在 `:77`）、Edit `:82-88`（`openModal('course-edit')` 在 `:84`）、Trash `:89-95`（`setConfirmDelete` 在 `:91`）。整卡打开在 `:51`；删除既有 handler 与确认框接线在 `:21-31,116-123`。Create 两入口在 `:43-46,101-104`。
3. Create/Edit 共用入口：`client/src/App.tsx:54-56` 均渲染 `CourseModal`。真实表单位于 **`client/src/components/CourseModal/CourseModal.tsx`**：Create/Edit 分流 `:19-20`，weight state `:25`，编辑回填 `:30-39`（精确读取 `:35`），提交 payload `:47-54`（精确写入 `:51`），Priority Weight 控件 `:114-133`（交互写 state `:126`）。其 CSS 全在同为面外的 `CourseModal.module.css:89-126`。
4. store 仅透传 payload：`client/src/stores/courseStore.ts:34-44`。服务端 Create 继续接受 weight 并默认 2：`server/src/routes/courses.ts:34-47`（默认 `:42`）；Update 只在请求显式包含 weight 时改值：`:75-83`（精确条件 `:81`）。validator 的兼容可选字段在 `server/src/validators/index.ts:18-34`（精确 `:22,:31`）。因此移除表单字段后，Edit payload 不带 weight 即会自然保留既有 DB 值，服务端无需迁移或清值。
5. 工单限定的是“卡上章”与 Create/Edit 控件；另有详情页 weight 表面仍在 `client/src/pages/Courses/CourseDetail.tsx:985-986`（CSS `CourseDetail.module.css:161-185`）。DB 字段仍被 Daily Brief 排序、Agent `list_courses` 和 Home 系统项目默认值消费，分别见 `server/src/routes/dailyBrief.ts:55-76`、`server/src/agent/tools/executor.ts:17`、`server/src/services/systemCourses.ts:30-39`，均应按单保留。

#### K-0.3 既有右键/菜单复用盘点

1. 本单允许面内没有可直接复用的右键/菜单组件。
2. 成熟的 `ContextMenuLayer` 在明确禁区 `client/src/pages/Notes/canvasEngine/layers/ContextMenuLayer.tsx`：props `:105-109`、viewport clamp `:111-118`、组件 `:126-130`、外点/Escape 关闭 `:137-156`、action/自动关闭 `:160-164`、菜单项 `:166-213`、`role="menu"` 外壳 `:215-229`。它还强耦合禁区 `commandSurfaceService.ts:3-102` 的封闭 action union 与 `NoteDetail.module.css`（import 在 `ContextMenuLayer.tsx:53-58`），不能在不碰禁区/不扩 action 类型的前提下复用。
3. Calendar 只有页面内联范例，不是共享组件：`client/src/pages/Calendar/Calendar.tsx:430-441,1070-1097,1222-1266`，样式 `Calendar.module.css:534-575`。因此若范围获准，菜单外壳只能在 `Courses/**` 内局部实现；五项行为则继续复接 K-0.2 所列既有 handler，不新造业务行为。

#### K-0.4 停线原因

工单交付物 2 明令“Edit/Create Project 表单移除 Priority Weight 选择器”（本单 `:18`），但该必改表单的现物在 `client/src/components/CourseModal/**`；允许面（本单 `:41`）未包含该目录，禁越界规则在 `:42-43`。完成 K-3b 必然修改 `CourseModal.tsx`（并应清理其 weight CSS），不存在允许面内的等价施工路径。

**请求 Claude 裁定：**将 `client/src/components/CourseModal/CourseModal.tsx` 与 `CourseModal.module.css` 显式加入允许面后重新翻牌，或改写 K-3b 交付方案。在此之前保持 `status: ready` 原头不擅改，按协作协议仅在 Result 标 `needs: claude`；零产品码、零测试码、零锁、零禁区改动，未 commit、未 push。

### 二次派工复工回执（2026-08-29，builder）

Fable 修订已解除 K-0 停线，本轮从既有侦察继续施工。复工前复核：分支仍为 `fable/v2-bn12-exoskeleton`（HEAD `2e36fcc`）；工作树既有项仍只有 `server/src/routes/projections.ts` 的 EOL 假脏与未跟踪 `.claude/settings.local.json`，两者均排除于本单触及面。CodeGraph 已再次确认 `CoursesPage → courseStore → GET /api/courses` 链、`CourseModal` 的 weight state/回填/payload/控件，以及详情页 weight 表面均与 K-0 记录一致；本轮不重建索引、不碰锁、不翻 handoff 状态、不 commit、不 push。

### 交付物 4：最近笔记数据供给（完成）

1. `server/src/services/courseCards.ts:21-71` 新增只读 `listCourseCards`：每个 Project 只取 `updated_at` 最新的 active Note；excerpt 沿 `note_block_placements.order_index` 汇集 active block 的非空 `plain_text`，截到 200 字符。`server/src/routes/courses.ts:23` 的既有 `GET /api/courses` 改为调用该服务。无表、列、索引、migration、写路径或 validator 改动；POST/PUT 对旧 `weight` 字段的兼容行为原样保留。
2. `client/src/stores/courseStore.ts:5-14` 在 store 本地声明 `RecentCourseNote` / `CourseWithRecentNote`，`:17` 令列表使用本地交叉类型，`:37` 给 GET 响应加类型；`:53` 编辑时以 `{ ...旧卡, ...响应 }` 合并，避免 PUT 的旧响应形状顺手抹掉 `recent_note`。`shared/**` 零触碰。
3. **先红后绿（数据刀）**：常驻断言原文 `assert.deepEqual(project?.recent_note, { ... })` 在 `server/src/__tests__/v2CanvasPersistenceCutover.test.ts:597-602`；空项目断言原文 `assert.equal(emptyProject?.recent_note, null)` 在 `:603`。产品码落地前专项 exit 1，`:597` 实际为 `undefined`；落地后同一专项 1/1、exit 0。
4. **mutation 落地证明**：先把 `server/src/services/courseCards.ts:25` 单点改成 `NULL AS recent_note_id, -- mutation proof: erase the recent-note identity`，命令先打印该源码行再跑专项；结果仅红在 `:597`（actual `null`，expected 最近笔记对象），exit 1。随后还原为 `recent.id AS recent_note_id`，先打印还原行再复跑 1/1、exit 0。
5. 早期两次 `npx tsc --noEmit` 实际未起跑（PowerShell ExecutionPolicy 拦 `npx.ps1`，exit 1），未冒充产品红；改用 `npx.cmd tsc --noEmit` 后 client exit 0、server exit 0。
6. 本件 numstat（不含未跟踪新文件）：`courseStore.ts +14/-3`、`v2CanvasPersistenceCutover.test.ts +99/-0`、`routes/courses.ts +2/-2`；新文件 `courseCards.ts` 71 行。显式排除：`shared/**`、schema/migrations、`client/src/pages/Notes/**`、五个 12.9c 禁区文件、package/tsconfig、既有两项脏项均未触碰。

#### 交付物 4 勘误加固：混合时间格式同秒排序

只读复核指出上版 `datetime(updated_at) + raw string` 会把小数秒截平，再被 SQLite 空格格式与 ISO `T` 格式的字典序误导。新增同秒反例后，断言原文仍为 `assert.deepEqual(project?.recent_note, { ... })`（现行 `v2CanvasPersistenceCutover.test.ts:600-605`）：较晚的 `2026-08-29 15:30:00.900` 被较早的 `2026-08-29T15:30:00.100Z` 抢位，专项 exit 1，实际标题为 `Earlier fractional note`。`courseCards.ts:48` 改为 `ORDER BY julianday(candidate.updated_at) DESC, candidate.id DESC` 后，同一专项 1/1 exit 0，server tsc exit 0。前一小节记录的 `:597` 是加反例前的历史行号；断言正文未变，现行行号以本段为准。

### 交付物 1：瘦高生活痕迹卡（完成）

1. `client/src/pages/Courses/Courses.tsx` 同文件导出纯 `ProjectCard`，页面只接回原有 callbacks；头部改为色点、名称、可选 code 与独立 semester，彻底移除 `No code` fallback 与旧 project description。最近笔记分支提供 `Continue · <title>`、语义化 `<time dateTime>`、本页内相对时间函数及只在 trim 后非空时挂 DOM 的 excerpt；无最近笔记分支提供可点击的虚线空项目入口。`Courses.module.css` 将栅格改为 `minmax(208px, 1fr)`、卡与 Add Project 最小高 260px，excerpt 四行 clamp。旧 weight 章和 toolbar 仍在本件之后作为交付物 2/3 的独立红点，未在此冒充退场。
2. **先红后绿**：在产品改动前新增 `Courses.test.tsx`，旧实现 7/7 红；最终本件专项 7/7 exit 0，client tsc exit 0。现行判据原文与行号：K-1 标题 `expect(within(card).getByText('Matrix inverses')).toBeTruthy();`（`:104`）；时间 `expect(within(card).getByText('Today')).toBeTruthy();`（`:111`）；Continue 目标 `expect(mocks.navigate).toHaveBeenCalledWith('/notes/note-recent');`（`:119`）；K-2a excerpt `expect(within(card).getByTestId('project-card-excerpt').textContent).toContain('First line from the note');`（`:126-127`）；K-2b 旧 description 与空 excerpt DOM 均为 null（`:138-139`）；K-5 空项目点击后 `expect(mocks.navigate).toHaveBeenCalledWith('/projects/course-empty');`（`:150`）；无 code 判据与 semester 正控在 `:157-158`。
3. **K-1 时间 mutation**：先打印落地行 `Courses.tsx:31 if (daysAgo <= 0) return 'Yesterday'; // mutation proof: K-1 relative time`；定向测试仅 K-1 时间 1 条红于 `Courses.test.tsx:111`（找不到 `Today`），exit 1。还原后同一条 1/1 exit 0。
4. **K-1 Continue mutation**：先打印落地行 `Courses.tsx:96 onOpenNote(course.id); // mutation proof: K-1 Continue target`；定向测试仅 Continue 1 条红于 `Courses.test.tsx:119`（收到 `/notes/course-1`，期待 `/notes/note-recent`），exit 1。还原后 1/1 exit 0。
5. **K-2a mutation**：先打印落地行 `Courses.tsx:110 {false && ( // mutation proof: K-2a excerpt presence`；第一次 Vitest 在载入前触发 Node bundled-root-certificate native assertion，属未起跑、未算产品红；原变异保持落地后重跑，仅 K-2a 1 条红于 `Courses.test.tsx:126`（找不到 excerpt），exit 1。还原后 1/1 exit 0。
6. **K-2b mutation**：先打印落地行 `Courses.tsx:110 {true && ( // mutation proof: K-2b empty excerpt shell`；定向测试仅 K-2b 1 条红于 `Courses.test.tsx:139`（收到空 `<div data-testid="project-card-excerpt">`），exit 1。还原后 1/1 exit 0。
7. **K-5 mutation**：先打印落地行 `Courses.tsx:123 void course.id; // mutation proof: K-5 empty-project target`；定向测试仅 K-5 1 条红于 `Courses.test.tsx:150`（详情导航 0 次），exit 1。还原后全件 7/7 exit 0。
8. 本件当前 numstat：`Courses.tsx +189/-48`、`Courses.module.css +125/-13`；新文件 `Courses.test.tsx` 160 行。无依赖、package/tsconfig、禁区或既有脏项改动；未碰锁、未 commit、未 push。

### 交付物 2：Priority Weight UI 摘除（完成）

1. 卡片已删除 weight 章及对应 CSS；`CourseModal` 已删除 weight state、编辑回填、提交 payload 字段、Priority Weight 控件及其 CSS；详情页抽出可独立验证的 `ProjectIdentity` 后删除 weight 表面及 CSS，并在 code/semester 都为空时不挂空 `.courseMeta`。对六个 UI/CSS 文件精确查找 `Priority Weight|weightBadge|weightButtons|weightBtn|weight1|weight2|weight3` 零命中。
2. **数据库与兼容明确保留**：schema/迁移/validator 零改；`server/src/routes/courses.ts:35,42` 创建仍写 `weight` 且缺省为 2，`:81` 更新仍只在旧客户端显式提供 weight 时改值。新表单不再发送该 own field，因此既有项目保存其他字段时 DB weight 不被清空或覆盖。
3. **四半先红后绿**：K-3a 现物红于 `Courses.test.tsx:166`，收到卡片 `<span>High</span>`；K-3b 现物红于 `CourseModal.test.tsx:73`，收到 `<label>Priority Weight</label>`；K-3c own-field 现物红于 `CourseModal.test.tsx:79`（received true），同时独立合并正控 `expect({ ...existingCourse, ...submittedPatch }.weight).toBe(existingCourse.weight);`（`:85`）保持绿；K-3d 现物红于 `CourseDetail.test.tsx:43`，收到详情 `<span>High</span>`。清理后 3 files / 14 tests 全绿，client tsc exit 0。
4. 现行断言原文：K-3a `expect(within(card).queryByText('High')).toBeNull();`（`Courses.test.tsx:166`）；K-3b `expect(screen.queryByText('Priority Weight')).toBeNull();`（`CourseModal.test.tsx:73`）；K-3c `expect(Object.prototype.hasOwnProperty.call(submittedPatch, 'weight')).toBe(false);`（`:79`）与保值正控（`:85`）；K-3d `expect(screen.queryByText('High')).toBeNull();`（`CourseDetail.test.tsx:43`）。
5. **K-3a mutation**：先打印落地行 `Courses.tsx:131 <span>High</span> {/* mutation proof: K-3a card weight surface */}`；定向测试仅 K-3a 红于 `Courses.test.tsx:166`，exit 1；还原后 1/1 exit 0。
6. **K-3b mutation**：先打印落地行 `CourseModal.tsx:111 <label>Priority Weight</label> {/* mutation proof: K-3b form weight surface */}`；定向测试仅 K-3b 红于 `CourseModal.test.tsx:73`，exit 1；还原后 1/1 exit 0。
7. **K-3c mutation**：先打印落地行 `CourseModal.tsx:49 weight: existing?.weight, // mutation proof: K-3c payload own field`；K-3c 两测中仅 own-field 判据红于 `:79`，保值正控仍绿，exit 1；还原后 K-3c 2/2 exit 0。
8. **K-3d mutation**：先打印落地行 `CourseDetail.tsx:411 <span>High</span> {/* mutation proof: K-3d detail weight surface */}`；定向测试仅 K-3d 红于 `CourseDetail.test.tsx:43`，exit 1；还原后 1/1 exit 0。
9. 本件 numstat：`CourseModal.module.css -40`、`CourseModal.tsx -24`、`CourseDetail.module.css -25`、`CourseDetail.tsx +19/-14`、`CourseDetail.test.tsx +24/-1`；新文件 `CourseModal.test.tsx` 87 行。`Courses.*` 是交付物 1/2/3 的累计 diff，未在本段重复冒充单件数。未碰 DB、shared、package/tsconfig、禁区、锁或既有脏项；未 commit、未 push。

### 交付物 3：卡片操作菜单与 toolbar 退场（完成）

1. `ProjectCard` 内局部实现一个菜单状态与同一 `role="menu"` 外壳；卡片右键和 hover/focus/touch 可见的 ⋯ 均调用同一 `openProjectMenu`。菜单通过 `createPortal(..., document.body)` + `position: fixed` 脱离 `.page` 动画留下的 transform containing block 与卡片 overflow；坐标按 viewport clamp。五项只复接既有 callbacks：Open、Sources、Tags、Edit、Move to Trash，后者仍走 `setConfirmDelete(course)` → `ProjectDeleteDialog`，未新增 archive/trash API。
2. 旧四按钮常驻 toolbar 及 CSS 全删。⋯ 带 `aria-haspopup/expanded/controls`；菜单打开聚焦首项，支持 ArrowUp/ArrowDown/Home/End 循环；Escape 关闭并回焦入口，document 外点关闭；危险项沿用 error token；hover/focus/touch 可发现性与 reduced-motion 均在本页 CSS 内完成。
3. **先红后绿**：产品改动前 K-4 新增 10 条全部红，原 8 条保持绿；红因分别为右键无 menu、无 ⋯、五项不可达、旧 Sources toolbar 尚存，及关闭行为无外壳可测。落地后 `Courses.test.tsx` 18/18 exit 0，client tsc exit 0。
4. **两个入口判据原文**：右键 `expect(screen.getByRole('menu')).toBeTruthy();`（`Courses.test.tsx:175`）；⋯ 点击在 `:182-184`，同一 menu 断言在 `:186`。mutation 前先打印 `Courses.tsx:184 if (event.type === 'contextmenu') return; // mutation proof: K-4 context-menu entry`，仅右键入口红于 `:175`；还原 1/1 绿。随后先打印 `Courses.tsx:215 void rect; // mutation proof: K-4 ellipsis entry`，仅 ⋯ 入口红于 `:186`；还原 1/1 绿。
5. **Open**：断言 `expect(mocks.navigate).toHaveBeenCalledWith('/projects/course-1');`（`:198`）。mutation 前打印 `Courses.tsx:143 onClick={() => runMenuAction(() => undefined)}` 与 `:145 mutation proof: K-4 Open handler`；仅本项红（调用 0 次），还原 1/1 绿。
6. **Sources**：断言 `expect(mocks.navigate).toHaveBeenCalledWith('/projects/course-1?focus=sources');`（`:210`）。mutation 前打印 `Courses.tsx:147` 的 no-op handler 与 `:149 mutation proof: K-4 Sources handler`；仅本项红，随后还原绿。
7. **Tags**：断言 `expect(mocks.openModal).toHaveBeenCalledWith('tag-group-manager', { courseId: 'course-1', courseName: 'Linear Algebra' });`（`:222-225`）。mutation 前打印 `Courses.tsx:151` 的 no-op handler 与 `:153 mutation proof: K-4 Tags handler`；仅本项红，随后还原绿。
8. **Edit**：断言 `expect(mocks.openModal).toHaveBeenCalledWith('course-edit', { course: recentCourse });`（`:237`）。mutation 前打印 `Courses.tsx:155` 的 no-op handler 与 `:157 mutation proof: K-4 Edit handler`；仅本项红，随后还原绿。
9. **Move to Trash**：判据原文 `expect(mocks.projectDeleteDialog).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'course-1', projectName: 'Linear Algebra' }));`（`:251-254`）。mutation 前打印 `Courses.tsx:164` 的 no-op handler 与 `:167 mutation proof: K-4 Trash handler`；仅本项红（dialog props 调用 0 次），随后还原绿。
10. **toolbar 退场 mutation**：判据 `expect(within(card).queryByRole('button', { name: 'Sources' })).toBeNull();`（`:262`）。先打印落地行 `Courses.tsx:271 <button type="button">Sources</button> {/* mutation proof: K-4 legacy toolbar */}`；仅该判据红，随后还原。Escape 回焦判据在 `:273-278`，外点关闭判据在 `:288-292`，最终一并绿。
11. `Courses.*` 相对 HEAD 的三件累计 numstat 现为 `Courses.tsx +282/-50`、`Courses.module.css +193/-61`；新 `Courses.test.tsx` 294 行，其中本件新增 126 行。未碰 Notes、共享 ContextMenuLayer、依赖、package/tsconfig、锁或既有脏项；未 commit、未 push。

### K-6 最终门禁与范围回执（完成）

1. **client**：`npx.cmd tsc --noEmit` exit 0；`Courses.test.tsx` 定点 18/18、exit 0；`npm.cmd run test:unit` 全量 33 files / 271 tests、exit 0。既有 `CourseDetail.test.tsx` 与新增 `CourseModal.test.tsx`、`Courses.test.tsx` 均在全量中通过。
2. **server**：`npx.cmd tsc --noEmit` exit 0；最终以 `node --import tsx --test --test-name-pattern "GET /api/courses" src/__tests__/v2CanvasPersistenceCutover.test.ts` 复跑课程列表专项 1/1、exit 0。`npm.cmd run test:v2` 全量实际起跑 341 tests，339 pass / 2 fail、exit 1；两处分别为 `v2SourceMineruWiring.test.ts` 的 `spawnSync python.exe ENOENT`，以及 `v2SourceRegionCells.test.ts` 的既有 uv Python 路径失效 / MinerU code 101，均属本机 Python/MinerU 环境且落在 12.9c 明示禁区，本单未越界修理。日志中的 migration 047 “failed” 是预期拒绝用例内部输出，并非额外 `not ok`。
3. **仓级必跑门禁**：根目录 `npm.cmd run verify:v2-bn8-runtime` 完整 exit 0；其内客户端全测、client/server build、159 项 runtime boundary、60 组 Canvas model contract、Canvas performance seed、tool-face gates、`docs:check` 与 changed-file secret scan 全绿。构建仅保留既有 chunk-size / dynamic-import 提示与 Git LF→CRLF 提示，无失败。
4. **最终清面**：`git diff --check` exit 0；分支仍为 `fable/v2-bn12-exoskeleton`。触及产品/测试文件内不存在临时 mutation 落地残留；所有 mutation 均已在对应小节记录还原后的定点绿。最终跟踪文件 numstat（交接单本身除外）：`CourseModal.module.css -40`、`CourseModal.tsx -24`、`CourseDetail.module.css -25`、`CourseDetail.test.tsx +24/-1`、`CourseDetail.tsx +19/-14`、`Courses.module.css +193/-61`、`Courses.tsx +282/-50`、`courseStore.ts +14/-3`、server 专项 `+102/-0`、courses route `+2/-2`；新文件为 `CourseModal.test.tsx` 87 行、`Courses.test.tsx` 294 行、`courseCards.ts` 76 行。
5. **显式排除**：开工前既有 `server/src/routes/projections.ts` 仍只呈 EOL 假脏且 `git diff --raw --` 零输出；未跟踪 `.claude/settings.local.json` 原样未碰。`client/src/pages/Notes/**`、五个 12.9c source 文件、`shared/**`、schema/migrations、其他 handoff/analysis、package/tsconfig、锁均零触碰。未 commit、未 push；handoff 头仍保留 `status: ready`，交由调度方/Fable 翻牌。
