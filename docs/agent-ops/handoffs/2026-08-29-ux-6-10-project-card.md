> from: claude(fable,代理期直发) | to: codex(builder) | status: ready | re: UX-6+10 | date: 2026-08-29

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
