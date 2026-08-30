> from: claude(fable,代理期直发) | to: codex(builder) | status: done | re: UX-3 | date: 2026-08-29

# UX-3:Group Gallery 左栏「去处化」改造(方案「去处与摆法」v3,Henry 已拍)

## 定位

走查 3(左导航一团乱麻)。方案定案见 artifact「去处与摆法」v3 与 `analysis/2026-08-29-ux-walkthrough-findings.md` #3 节。**设计论点:左栏答「我要去哪」,中栏答「这里怎么摆」——导航按使用组织,⛔ 不按存储组织。**

现物:`client/src/pages/GroupGallery/`(GroupGallery.tsx / groupGalleryData.ts / groupGalleryShellModel.ts)——左栏枚举全部容器(WORKSPACE/PROJECTS/NOTES 混排),空货架(「groups 0」)照显,烟测项目与无名笔记全员上榜,滚动十余屏。

## 交付物

1. **左栏重建为固定去处**:
   - `全部组`(默认选中,计数)· `最近`(按组 updated_at)· 分隔线 · `按项目`小节:**仅列出「有组的」项目**(Workspace 有组时作一行;计数含该项目级+其笔记级组);
   - **⛔ 笔记不再出现在左栏**;**⛔ 空容器(0 组的项目/笔记)零渲染**;
   - 搜索框保留在顶部。
2. **中栏组卡加「出处徽标」**(卡底一行,faint):
   - 项目级组:`[项目色点] 项目名 · 项目级`;
   - 笔记级组:`[项目色点] 项目名 · 笔记名`——**无名笔记显示「未命名 · M/D」**(取笔记创建/更新日期);
   - **单击徽标导航至该笔记/项目**(复用既有路由)。
3. **新建落点规则**:左栏选中某项目 ⇒ New group/New folder 落该项目级;选中「全部/最近」⇒ 落 Workspace 级。⛔ 不改后端归属模型(scope 树数据原样,纯导航/展示重构)。
4. **中栏三视图(Folder/Topic/Type)与既有 folder 体系不动**——用户建的 folder 留在中栏 Folder view 里管理。

## 侦察先行(K-0,写进开工回执,逐点附行号)

1. 左栏树的数据推导链(哪个 service/model 产容器行);
2. **「folder」的双义排查**:用户建的 groupFolders 实体 vs 左栏 scope 容器——两者关系逐点列举;若方案与 folder 数据模型冲突(如左栏行本身承载 folder CRUD),停线 `needs: claude`;
3. 「current folder」概念的全部消费者(New group 落点、底部状态条、breadcrumb);
4. `client/scripts/groupGalleryShellContractCheck.mjs` 现锚点清单——本单**允许**按新方案更新该契约(显式改动,Result 里逐条列出改了哪些锚点与理由;⛔ 不许为过检偷留已删 UI 的旧锚点)。

## 必红判据(每刀红点记断言原文+行号;施变异先出示落地证明)

- **K-1**(先红后绿,两半独立):a) 左栏渲染固定去处(全部/最近/按项目);b) **0 组容器零渲染**(fixture:一个空项目 + 一个空笔记 ⇒ 左栏无其行;红 = 现状照显)。
- **K-2**(两半独立):a) 项目级组卡显项目徽标;b) 笔记级组卡显「项目 · 笔记名」;无名笔记显「未命名 · 日期」(⛔ 裸 "Untitled note")。
- **K-3**:单击徽标 ⇒ 导航目标正确(项目级→项目页,笔记级→该笔记)。
- **K-4**(两刀独立):选中项目建组 ⇒ 归属该项目;全部/最近下建组 ⇒ 归属 Workspace。
- **K-5**(回归反例):搜索仍可用;三视图切换不回归;既有组的打开/编辑路径不回归。
- **K-6**(门禁):client `npx tsc --noEmit` 0;`npm run test:unit` 全绿;`groupGalleryShellContractCheck` 按更新后契约绿(改动清单在案);既有 Gallery 相关测试绿。

## 允许面与禁区

允许面:`client/src/pages/GroupGallery/**` · `client/scripts/groupGalleryShellContractCheck.mjs`(契约更新,显式申报)· 既有 Gallery 相关测试文件(加断言)· 侦察证明必须时 `client/src/stores/`、`client/src/services/api.ts` 内 gallery 相关小改(逐个 Result 申报理由)。
禁区:`client/src/pages/Courses/**`(UX-6+10 面)· `client/src/pages/Notes/**` · `server/**`(本单纯前端;若侦察证明必须动 server 停线申请)· `shared/**` · `sourceFileIntake.ts` 等 12.9c 在飞面 · `.claude/**` · 其他 handoff/analysis · tsconfig/package.json · migrations。
越界或前提不符 → 停线 `needs: claude`。

## D 段

- 本机硬件退化嫌疑:**小步施工,每完成一件交付物立即追写 Result,⛔ 不攒**。
- EOL 假脏 `server/src/routes/projections.ts` blob 判真;⛔ PID 8292 永不杀;⛔ 不碰锁。

## 验证与回执

先写开工回执(K-0)再施工。门禁:client tsc → test:unit → 本单专项 → gallery 契约。逐门 exit 入表。回执 UTF-8 追加 `## Result`:K 逐刀红点 + 契约锚点改动清单 + numstat 对照允许面 + 显式范围排除。⛔ 不 commit、不 push。

## Result

### 开工回执 — K-0 侦察（2026-08-29，builder）

**基线与隔离**

- 分支实测为 `fable/v2-bn12-exoskeleton`；本单头为 `status: ready`。
- 开工前已有脏项：`server/src/routes/projections.ts`（工单已注明 EOL blob 判真）与 `.claude/settings.local.json`（未跟踪）。两者均属禁区/非本单改动，保持不碰；后续 numstat 必须显式排除。
- `.codegraph/` 存在；shell CLI 不在 PATH，已先用延迟加载的 CodeGraph MCP 侦察，再只对其未返回的明确文件/行段做只读补查。

**K-0.1 左栏数据推导链**

1. `groupGalleryData.ts:111-133` 从 `GET /courses` 取得项目，再逐项目 `GET /notes?course_id=...`，逐笔记并行加载 groups / folders / purposes，最终铺平成「每笔记一条」`GalleryRecord[]`；记录形状在 `groupGalleryData.ts:31-37`。
2. groups 由 `loadContentGroupsForNote` 产生：`contentGroupRepository.ts:19-40` 以 `course_id + note_id` 调 `/content-groups`，并合并 entity/legacy；folders 由 `loadGroupFoldersForNote` 产生：`groupFolderRepository.ts:44-75` 以同一 `course_id + note_id` 调 `/group-folders`，正规化并在必要时导入 legacy metadata。
3. `GroupFolderV1` 的实体形状是 `id/title/parent_folder_id/scope/origin/system_root/status/order/timestamps`（`runtimeDataTypes.ts:452-470`）；workspace/project/note system roots 由 `ensureGroupFolderRoots` 生成（`groupFolderService.ts:120-151`）。
4. 页面将 records 按项目聚合（`GroupGallery.tsx:203-213`），找 workspace root（`:215-222`），再把 system roots 与 user folders 一起交给 `renderFolderBranch` 递归（`:443-469`）；旧左栏 JSX 的 Workspace/Projects/Notes 全枚举在 `:522-576`。因此旧「容器行」不是独立导航 DTO，而是由 `GalleryRecord + GroupFolderV1.scope/system_root` 现场派生。

**K-0.2 `folder` 双义与冲突裁定**

- **持久化实体义**：`group_folders` 的客户端实体为 `GroupFolderV1`（`runtimeDataTypes.ts:452-470`）；用户 folder 由 `createGroupFolder` 生成（`groupFolderService.ts:68-93`），parent/children、rename、delete、path 分别由 `groupFolderService.ts:154-200,220-290` 维护，保存走 `groupFolderRepository.ts:78-85`。ContentGroup placement 只记录 `folder_id`（`runtimeDataTypes.ts:224-243`；创建写点 `contentGroupService.ts:975-1004`）。
- **左栏 scope-container 义**：旧左栏把 `system_root=true` 且 scope 为 workspace/project/note 的 folder 当容器入口，又把其 user-folder children 递归混排；项目标题/笔记 Link 还是另一层非-folder 脚手架（`GroupGallery.tsx:529-575`）。这是展示层混义，不是第二套 folder 数据。
- **是否承载 CRUD**：`renderFolderBranch` 行本身只有 selection（`GroupGallery.tsx:443-469`，点击写点 `:458`），没有 create/rename/delete mutation。CRUD 控件位于 header 与中栏 scope bar：New folder `:494-502` → handler `:318-330`；Rename/Delete `:608-632` → handlers `:332-360`；Move here `:681-688` → handler `:362-376`。它们共享 `selectedFolder` 上下文，但没有被左栏 DOM 或后端模型绑死。
- **裁定**：不触发 `needs: claude`。按本单把「destination selection」从 `selectedFolder` 拆出；同一套 user-folder selection/CRUD 迁留在中栏 Folder view，实体、placement、保存 API 均不变，正好兑现工单第 22 行。⛔ 不删除 folder 实体、不改 scope 树、不改 server。

**K-0.3 `current folder` 全部消费者**

- 状态不是纯 folder，而是 `noteId::folderId`：key helper 在 `groupGalleryData.ts:48-56`；state/URL 初始化与默认 note root 在 `GroupGallery.tsx:148,176-189`；解析为 `selectedFolderRecord + selectedFolder` 在 `:191-197`；选择写回 URL 在 `:298-306`。它同时承担「folder/scope」与「具体 note carrier」两职。
- 视图：scope 扩缩在 `GroupGallery.tsx:100-113`；Folder view 的 folder-id 过滤、Topic/Type 的 record 限域在 `:224-243`；section 标题在 `:245-264`；summary 在 `:593-596`。
- New folder：继承当前 scope、挂当前 parent、保存到当前 record 并选中新 folder（`:318-330`）。Rename/Delete/可删判定在 `:266-270,332-360`。Move here 目标为当前 folder id（`:362-376,681-688`）。
- New group：folder placement 取当前 folder，但强制的 `project_id/note_id/canvas_id` 和保存目标仍取 `selectedFolderRecord.note`（`GroupGallery.tsx:390-409`；模型要求 `contentGroupService.ts:975-1004`）。故新 fixed destination 仍须机械选择一个现有 note record 作 carrier；不能假装后端已有无-note group。
- breadcrumb/current-folder 管理面在 `GroupGallery.tsx:121-138,272,599-633`；底部状态条在 `:723-725`；header 返回由当前 record 导航在 `:512-518`。
- 既有打开/编辑路径不依赖当前 folder：`openEditor` 从 group 自身 placement 生成 `/group-gallery/editor?...`（`:378-388`），卡主体调用在 `:690-713`。既有项目/笔记路由为 `/projects/:courseId` 与 `/notes/:noteId`（`App.tsx:92-96`）。

**K-0.4 `groupGalleryShellContractCheck.mjs` 现锚点与本单处置**

1. `:36-40`「Gallery keeps organize surface role」：三锚 `CONTENT_GROUP_SURFACE_ROLES.gallery` / `data-content-group-surface` / `data-content-group-role`，**全保留**。
2. `:42-51`「resource manager shell anchors」：`Group Gallery/Search/New folder/New group/Folder view/Topic view/Type view/Current folder`。前七项保留；`Current folder` 不再可证明左栏/新建目标，须改为 fixed destinations（All/Recent/By project）与 destination 落点锚。若中栏仍有 folder 文案，也不得拿它冒充新导航契约。
3. `:53-59`「card OpenDesign anatomy」：`typeLabel/topicLabel/sourceLabel/statusLabel/memberCountLabel`。type/topic/status/member 保留；旧 `sourceLabel` 在 `groupGalleryShellModel.ts:56` 会裸回退 `Untitled note`，与 K-2 冲突，须改为项目+笔记/日期的 origin badge 明确字段。
4. `:61-69` CSS 锚：`.galleryShell/.folderPane/.modeTabs/.groupCard/.cardRoleTab/.statusChip/.topicDot`。shell/mode/card/role/status/topic 保留；旧 `.folderPane` 不足以证明「去处化」，须增加/替换 destination-nav 与 origin-badge 锚。
5. `:71-79` deferred-system 禁词断言：**全保留**。
- 现有 Gallery 专项单测为 0；`client/package.json:10` 的 `test:unit=vitest run` 自动收同目录 `*.test.ts(x)`。本单将在允许面内新增纯模型/组件断言，覆盖 0 组过滤、项目计数、徽标文本/导航及 project-vs-workspace 新建落点；不靠字符串契约冒充行为测试。

**K-0 结论**：现物与工单描述相符；唯一关键耦合是 `selectedFolderKey` 同时夹带 note carrier，已列为施工时必须拆解且保持后端归属不变的约束。准予进入 K-1；禁区与既有脏项保持冻结。

### K-1 红点（先测现状，2026-08-29）

- 专项：`client npm.cmd run test:unit -- src/pages/GroupGallery/GroupGallery.test.tsx` → **exit 1，2/2 red**。（PowerShell 禁止 `npm.ps1`，故本机后续统一用同一 npm 的 `npm.cmd` 入口；这不是产品红点。）
- **K-1a 固定去处**：断言原文 `expect(await screen.findByRole('button', { name: '全部组 1' })).toBeTruthy();`（`GroupGallery.test.tsx:153`）→ 红点原文 `Unable to find role="button" and name "全部组 1"`。其余同刀断言在 `:154-156`：`最近`、`按项目`、`Active Project 1`。
- **K-1b 空容器独立刀**：先以 `await screen.findByText('Group active')`（`:162`）证明页面已加载，不依赖 K-1a；断言原文 `expect(screen.queryByText('Empty Project')).toBeNull();`（`:163`）→ 红点原文 `AssertionError: expected <span></span> to be null`，received 为 `<span>Empty Project</span>`。同刀的空 note 断言在 `:164`。这正面复现工单所述「0 组项目/笔记照显」。

### K-1 完成交付 — 固定去处 + 0 组零渲染（立即追写）

- 新增纯派生模型 `groupGalleryNavigationModel.ts:45-96`：`all/recent/workspace/project:*` 四种 destination；`recent` 全局按 group `updated_at` 降序；Workspace 仅有 workspace-scope group 时出现；项目 count 只合计该项目的 project+note scope groups；`count === 0` 在 `:80` 直接不产 nav row。
- 左栏已重建为纯 fixed-destination nav（`GroupGallery.tsx:532-582`）：`全部组` 默认选中并带总数、`最近`、分隔线、`按项目`；左栏不再渲染 Note，也不再递归 `GroupFolderV1`。
- destination 与 folder selection 已拆开；切 destination 会清 `note_id/folder_id`，查询/Topic/Type 以 destination group set 为上游。原 folder tree/selection/CRUD 未删除，已迁入中栏 Folder view navigator（`GroupGallery.tsx:589` 起；CSS `GroupGallery.module.css:1694-1736`）。
- **K-1a mutation**：先落地并打印 `groupGalleryNavigationModel.ts:93 label: '所有组'`，再跑专项 → `GroupGallery.test.tsx:153` 原断言 `expect(await screen.findByRole('button', { name: '全部组 1' })).toBeTruthy();` 稳定红于 `Unable to find role="button" and name "全部组 1"`；还原打印为 `label: '全部组'` 后该刀绿。
- **K-1b mutation**：先落地并打印 `groupGalleryNavigationModel.ts:80 if (count < 0) return;`，再跑专项 → `GroupGallery.test.tsx:163` 原断言 `expect(screen.queryByText('Empty Project')).toBeNull();` 稳定红于 `AssertionError: expected <span …></span> to be null`，received `Empty Project`；还原打印为 `if (count === 0) return;` 后该刀绿。
- K-1 专项最终：`npm.cmd run test:unit -- src/pages/GroupGallery/GroupGallery.test.tsx --reporter=dot` → **exit 0，2/2 passed**。

### K-2 红点（先测现状，立即追写）

- `npm.cmd run test:unit -- src/pages/GroupGallery/GroupGallery.test.tsx -t "K-2" --reporter=dot` → **exit 1，3/3 red**。
- **K-2a 项目级**：断言原文 `expect(await screen.findByRole('button', { name: 'Active Project · 项目级' })).toBeTruthy();`（`GroupGallery.test.tsx:206`）→ `Unable to find role="button" and name "Active Project · 项目级"`。
- **K-2b 笔记级**：断言原文 `expect(await screen.findByRole('button', { name: 'Active Project · Active note' })).toBeTruthy();`（`:212`）→ `Unable to find role="button" and name "Active Project · Active note"`。
- **K-2b 无名笔记日期**：断言原文 `expect(await screen.findByRole('button', { name: 'Active Project · 未命名 · 8/29' })).toBeTruthy();`（`:218`）→ `Unable to find role="button" and name "Active Project · 未命名 · 8/29"`；裸 fallback 禁止断言在 `:219`。

### K-2 完成交付 — 出处徽标（立即追写）

- Gallery 本地扩展了真实 API 已返回但旧 Note client type 未声明的可选时间戳（`groupGalleryData.ts:31-38,121`）；⛔ 未动禁区 `pages/Notes/**`。
- 卡模型在 `groupGalleryShellModel.ts:35-40,66-90` 由 group placement folder 的 `scope.kind` 判定出处：project scope → `项目名 · 项目级`；note scope → `项目名 · 笔记名`；无名时优先 note `updated_at`、再退 `created_at`，稳定格式 `未命名 · M/D`；workspace 有诚实独立文案。项目色由 `originColor` 带入。
- 卡底新增独立 faint 可点击徽标（`GroupGallery.tsx:709-710,765-775`；CSS `GroupGallery.module.css:1980-2016`），没有在主卡 `<button>` 内嵌按钮；旧 `From Untitled note` 已移除。
- **K-2a mutation**：先打印落地 `groupGalleryShellModel.ts:68 scope.kind === 'missing-project-scope'`，项目组被误判 note 后，`:206` 原断言稳定红于 `Unable to find ... "Active Project · 项目级"`；已还原 `scope.kind === 'project'`。
- **K-2b named mutation**：先打印落地 `:75 : galleryNoteLabel(sourceNote)`（故意丢项目名），`:212` 原断言稳定红于 `Unable to find ... "Active Project · Active note"`；已还原 `${sourceProject.name} · ...`。
- **K-2b date mutation**：先打印落地 `:38 note.created_at || note.updated_at`，fixture 从应显 8/29 退成 8/28，`:218` 原断言稳定红于 `Unable to find ... "Active Project · 未命名 · 8/29"`；已还原 `updated_at || created_at`。
- K-2 还原后专项全体：**exit 0，5/5 passed**（K-1 2 + K-2 3）。

### K-3 红点 1/2 — 项目级徽标路由（立即追写）

- 先打印变异落地证明：`groupGalleryShellModel.ts:79 ? \`/projects/wrong-${sourceProject.id}\``，再只跑项目徽标导航用例。
- 断言原文 `expect(screen.getByTestId('location-probe').textContent).toBe('/projects/project-active');`（`GroupGallery.test.tsx:238`）稳定红：`Expected: "/projects/project-active"`，`Received: "/projects/wrong-project-active"`。
- 已立即还原为 `groupGalleryShellModel.ts:79 ? \`/projects/${sourceProject.id}\``；未读取还原后的绿，待第二刀完成后统一读 K-3 还原态。

### K-3 红点 2/2 — 笔记级徽标路由（立即追写）

- 先打印变异落地证明：`groupGalleryShellModel.ts:80 : \`/notes/wrong-${sourceNote.id}\``，再只跑笔记徽标导航用例。
- 断言原文 `expect(screen.getByTestId('location-probe').textContent).toBe('/notes/note-active');`（`GroupGallery.test.tsx:245`）稳定红：`Expected: "/notes/note-active"`，`Received: "/notes/wrong-note-active"`。
- 已立即还原为 `groupGalleryShellModel.ts:80 : \`/notes/${sourceNote.id}\``；下一步读取完整 K-3 还原态。

### K-3 完成交付 — 出处徽标导航（立即追写）

- `GroupGallery.tsx` 的卡底徽标用独立按钮调用 `navigate(card.originRoute)`；项目级目标由 `groupGalleryShellModel.ts:79` 生成 `/projects/:id`，笔记级目标由 `:80` 生成 `/notes/:id`。
- 两刀均已还原；还原证明打印 `groupGalleryShellModel.ts:76-80` 的真实项目/笔记路径后，专项全体 **exit 0，7/7 passed**。
- `impeccable` product register 核对影响：徽标保持标准按钮语义、独立可访问名称与低噪声状态，不嵌套交互控件；未引入新视觉系统或越出工单设计。

### K-4 红点（现状基线，立即追写）

- `npm.cmd run test:unit -- src/pages/GroupGallery/GroupGallery.test.tsx -t 'K-4' --reporter=dot` → **exit 1，3/3 red**；三种 destination 下 `New group` 均因旧逻辑只认 `selectedFolderRecord` 而保持 disabled，save spy 为 0。
- **项目刀**：断言原文 `await waitFor(() => expect(mocks.saveGalleryRecord).toHaveBeenCalledTimes(1));`（`GroupGallery.test.tsx:266`）→ `expected "spy" to be called 1 times, but got 0 times`；真实落点断言原文 `expect(savedGroups.at(-1)?.folder_id).toBe('project-root-active');`（`:268`）。
- **Workspace 刀（全部组/最近独立样例）**：共同动作断言原文 `await waitFor(() => expect(mocks.saveGalleryRecord).toHaveBeenCalledTimes(1));`（`:280`）→ 两例均 `expected "spy" to be called 1 times, but got 0 times`；真实落点断言原文 `expect(savedGroups.at(-1)?.folder_id).toBe('workspace-root-active');`（`:282`）。

### K-4 mutation 红点 1/2 — 项目落点（立即追写）

- 先打印落地 `groupGalleryNavigationModel.ts:125 candidate.scope.kind === 'note' && ...`，把项目 destination 故意错投 note root，再读单用例。
- 断言原文 `expect(savedGroups.at(-1)?.folder_id).toBe('project-root-active');`（`GroupGallery.test.tsx:268`）稳定红：`Expected: "project-root-active"`，`Received: "note-root-active"`。
- 已立即还原为 `candidate.scope.kind === 'project'`；未读取还原绿，待第二刀结束。

### K-4 mutation 红点 2/2 — Workspace 落点（立即追写）

- 先打印落地 `groupGalleryNavigationModel.ts:126 : candidate.scope.kind === 'note'`，把 all/recent 故意错投 note root，再读两例。
- 断言原文 `expect(savedGroups.at(-1)?.folder_id).toBe('workspace-root-active');`（`GroupGallery.test.tsx:282`）在“全部组”“最近”两例均稳定红：`Expected: "workspace-root-active"`，`Received: "note-root-active"`。
- 已立即还原为 `candidate.scope.kind === 'workspace'`；下一步补 New folder 同源落点断言，再读完整还原态。

### K-4 完成交付 — destination 新建落点（立即追写）

- 新增纯前端 `resolveGalleryCreationTarget`（`groupGalleryNavigationModel.ts:112-130`）：`project:*` 解析到该项目 active system project root；all/recent/workspace 解析到 active system workspace root。所选 record 仍作为既有必填 `project_id/note_id/canvas_id` 的机械 carrier，⛔ 未改后端归属模型。
- `GroupGallery.tsx:225-232` 生成 creation target；中栏若明确选了 folder，仍优先保持既有 folder 管理/子级创建能力，否则使用左栏 destination root。`handleCreateFolder`（`:335` 起）与 `handleCreateGroup`（`:408` 起）共用此目标；两按钮不再因未选中旧左栏 folder 而误禁用。
- 还原证明先打印 `groupGalleryNavigationModel.ts:121-127`：project 分支为 `scope.kind === 'project'`，其余分支为 `scope.kind === 'workspace'`；K-4 专项 **exit 0，6/6 passed**（项目/all/recent 的 New group 与 New folder 均核对真实 save 参数、parent 与 scope）。

### K-5 mutation 红点 1/3 — 搜索（立即追写）

- 先打印落地 `GroupGallery.tsx:238 if (trimmedQuery) return allGroups;`，故意让非空 query 跳过过滤，再读搜索用例。
- 断言原文 `expect(screen.queryByText('Group unnamed')).toBeNull();`（`GroupGallery.test.tsx:326`）稳定红：`expected <span class="_cardTitle_..."></span> to be null`，received 为 `Group unnamed`。
- 已立即还原为 `if (!trimmedQuery) return allGroups;`；未读取还原绿，待三刀结束。

### K-5 mutation 红点 2/3 — 三视图状态（立即追写）

- 单改 `setMode('folder')` 仍被 URL 同步 effect 恢复成目标 mode，行为未坏、测试保持绿，故不是有效反例并已还原；随后选取真正破坏持久 mode 的一刀，先打印落地 `GroupGallery.tsx:327 patchGallerySearchParams({ mode: 'folder' });`。
- 断言原文 ``expect(container.querySelector(`[data-gallery-mode="${mode}"]`)).toBeTruthy();``（`GroupGallery.test.tsx:335`）在 Topic view 稳定红：`expected null to be truthy`。同刀后续 Type/Folder 未执行；卡仍在的独立断言原文位于 `:336`。
- 已立即还原为 `patchGallerySearchParams({ mode: item });`；未读取还原绿，待第三刀结束。

### K-5 mutation 红点 3/3 — 既有组打开路径（立即追写）

- 先打印落地 `GroupGallery.tsx:405 /group-gallery/wrong-editor?...`，再读既有组打开用例。
- 断言原文 `expect(screen.getByTestId('location-probe').textContent).toBe(...)`（`GroupGallery.test.tsx:347-349`）稳定红：expected `/group-gallery/editor?note_id=note-active&group_id=active&folder_id=note-root-active&mode=folder`，received 同参数但路径为 `/group-gallery/wrong-editor?...`。
- 已立即还原为 `/group-gallery/editor?...`；下一步读取 K-5 完整还原态。

### K-5 完成交付 — 回归护栏（立即追写）

- 新增组件回归：搜索输入会从两张卡中剔除不匹配卡；Folder/Topic/Type 三视图逐一核对真实 `data-gallery-mode` 且卡持续可见；点击既有卡主体核对 editor pathname 与 `note_id/group_id/folder_id/mode` 全参数（`GroupGallery.test.tsx:315-351`）。
- 还原证明先打印 `GroupGallery.tsx:238,327,405` 的真实过滤短路、真实 mode URL 写入、真实 editor 路径；K-5 专项 **exit 0，3/3 passed**。
- 这一步只加断言并保持既有搜索、视图和编辑入口实现；没有扩写新交互或碰 Notes/editor 禁区。

### 契约与文案收束交付（立即追写）

- `groupGalleryShellContractCheck.mjs:37-41` 的 organize surface 三锚完整保留；`:43-51` 的 resource-manager 基础锚保留 Group Gallery/Search/New folder/New group/三视图，删除不能再证明新左栏语义的 `Current folder`。
- 新增 `:53-61` fixed-destination/creation-target 锚：固定去处 aria、全部组、最近、按项目、`destinationKey`、`resolveGalleryCreationTarget`、状态栏真实新建目标文案。
- 卡 anatomy 在 `:63-71` 把已退役且未消费的 `sourceLabel` 替换为 `originLabel/originColor/originRoute`；CSS 在 `:73-85` 不再拿泛化 `.folderPane` 冒充新设计证明，改锚 `.destinationNav/.destinationRow/.folderWorkspace/.cardOriginBadge/.originDot`，并保留 shell/mode/card/role/status/topic。
- 新增 `:87-95` 反向锚，禁止 `Current folder`、旧 current-folder 新建/状态文案、裸 `Untitled note` 与旧 `sourceLabel` 回流；deferred-system 全禁词在 `:97-105` 原样保留。
- 页面 breadcrumb 改用统一 `galleryNoteLabel`，scope/status 明确区分 `Selected folder` 与 `Destination target`，状态栏展示 New group/New folder 的真实 root/folder；没有删除中栏 folder tree/CRUD。
- 即时验证：Gallery 契约 **exit 0，7/7 checks**；Gallery 专项 **exit 0，16/16 passed**。

### K-6 门禁红点 — client tsc 首跑（立即追写）

- `client npx.cmd tsc --noEmit` → **exit 2**。原文共 6 处 `TS2550: Property 'at' does not exist on type ... Do you need to change your target library?`，位于 `GroupGallery.test.tsx:268,282,292,293,307,308`。
- 处置限定为把测试的 `.at(-1)` 改成等价的 `array[array.length - 1]`；⛔ 不改禁区 tsconfig/package，不改变断言语义。修复后从 tsc 第一门重新开始读完整门序。

### K-6 门禁进度 1/4（立即追写）

| 顺序 | 门 | exit | 结果 |
|---:|---|---:|---|
| 1 | `client npx.cmd tsc --noEmit`（修复后重跑） | 0 | 绿 |

- 仅新增测试本地 `last<T>` 等价 helper；tsconfig/package 未动。下一门：client 全量 `test:unit`。

### K-6 门禁进度 2/4（立即追写）

| 顺序 | 门 | exit | 结果 |
|---:|---|---:|---|
| 1 | `client npx.cmd tsc --noEmit` | 0 | 绿 |
| 2 | `client npm.cmd run test:unit -- --reporter=dot` | 0 | **34 files，287/287 passed** |

- stderr 仅有既有 React Router future-flag 提示与 natural-writing 缺块回滚诊断日志，无失败。下一门：本单 Gallery 专项。

### K-6 门禁进度 3/4（立即追写）

| 顺序 | 门 | exit | 结果 |
|---:|---|---:|---|
| 1 | `client npx.cmd tsc --noEmit` | 0 | 绿 |
| 2 | `client npm.cmd run test:unit -- --reporter=dot` | 0 | 34 files，287/287 passed |
| 3 | `client npm.cmd run test:unit -- src/pages/GroupGallery/GroupGallery.test.tsx --reporter=dot` | 0 | **16/16 passed** |

- 专项 stderr 仅 React Router future-flag 提示。下一门：更新后的 Gallery 机械契约。

### K-6 工单规定四门完成（立即追写）

| 顺序 | 门 | exit | 结果 |
|---:|---|---:|---|
| 1 | `client npx.cmd tsc --noEmit` | 0 | 绿 |
| 2 | `client npm.cmd run test:unit -- --reporter=dot` | 0 | 34 files，287/287 passed |
| 3 | `client npm.cmd run test:unit -- src/pages/GroupGallery/GroupGallery.test.tsx --reporter=dot` | 0 | 16/16 passed |
| 4 | `client npm.cmd run check:group-gallery-shell` | 0 | **7/7 checks** |

- 四门按指定顺序全绿。继续跑邻接边界/legacy/model 与仓库总门，不把四门绿误写成全仓已完。

### 邻接门进度 1/3（立即追写）

- `client npm.cmd run check:canvas-runtime-boundary` → **exit 0，159/159 checks**；其中 Gallery entity GroupFolder repository、placement route、禁写 GroupFolder metadata 三项均绿。

### 邻接门进度 2/3（立即追写）

- `client npm.cmd run check:v2-bn11-legacy-shutdown` → **exit 0**，V2.BN.11.1 legacy shutdown contract passed；Gallery 未回流 Petal/Fragment 退役语义。

### 邻接门 3/3 完成（立即追写）

- `npm.cmd run smoke:canvas-engine-model-contract` → **exit 0，60/60 groups**；ContentGroup/GroupFolder、surface role、entity cutover 等模型契约全绿。
- 三个邻接门均绿。下一步跑仓库强制总门 `verify:v2-bn8-runtime`，然后做允许面 numstat/禁区排除。

### 仓库总门完成（立即追写）

- `npm.cmd run verify:v2-bn8-runtime` → **exit 0**。链内通过：287/287 unit、tool-face registry/manifest/parity、server-shared boundary、159 runtime boundary、Gallery 7 checks、rail/editor/source/legacy/relation 契约、60 canvas model groups、client+server build、performance seed、docs checks、`git diff --check`、changed-file secret scan。
- 仅出现既有/非阻断提示：React Router v7 future flags、tool-face recursive-reference fallback、Vite dynamic-import/chunk-size、Git LF→CRLF 提示；无失败。
- 总门期间没有杀进程、没有碰锁、没有 commit/push。下一步只读核对 diff/numstat/禁区与变异残留。

### 最终审计补刀红点 — 中栏条件行（立即追写）

- 只读 diff 发现 `.page .galleryPane` 仍是旧三行 `44px 42px minmax(...)`，但 Folder 模式迁入 navigator 后已有 toolbar/navigator/scope/groups 四个子项；这会让 scope 与 cards 落入错误/隐式 row。
- 先新增契约 `Gallery middle pane reserves the conditional folder navigator row`（`groupGalleryShellContractCheck.mjs:87`）再跑，**exit 1**；红点原文：`Missing: grid-template-rows: 44px auto 42px minmax(0, 1fr);, grid-row: 1;, grid-row: 2;, grid-row: 3;, grid-row: 4;`。
- 下一步只改 Gallery CSS：第二行 `auto`，Folder navigator 缺席时收缩为 0；四个区域显式占 row 1-4。随后重跑契约与受影响门。

### 最终审计补刀完成 — 中栏条件行（立即追写）

- 落地证明：`GroupGallery.module.css:1649` 为 `grid-template-rows: 44px auto 42px minmax(0, 1fr)`；toolbar/folder navigator/scope/cards 分别在 `:1654,:1697,:1689,:1775` 显式占 row 1/2/3/4。
- 更新后的 Gallery 契约 **exit 0，8/8 checks**。Folder view 有四行；Topic/Type 缺少 navigator DOM 时第二行 auto 收缩，不挤占 scope/cards。

### 补刀后门禁进度 1/4（立即追写）

- `client npx.cmd tsc --noEmit` → **exit 0**。

### 补刀后门禁进度 2/4（立即追写）

- client 全量 `npm.cmd run test:unit -- --reporter=dot` → **exit 0，34 files，287/287 passed**；stderr 仍仅既有 Router 提示与 natural-writing 诊断日志。

### 补刀后门禁进度 3/4（立即追写）

- Gallery 专项 → **exit 0，16/16 passed**；stderr 仅 Router future-flag 提示。

### 补刀后四门完成（立即追写）

| 顺序 | 门 | exit | 结果 |
|---:|---|---:|---|
| 1 | client tsc | 0 | 绿 |
| 2 | client 全量 unit | 0 | 34 files，287/287 |
| 3 | Gallery 专项 | 0 | 16/16 |
| 4 | Gallery 契约 | 0 | **8/8 checks** |

- 补刀后的最终源码已重新通过工单规定四门。下一步重跑一次仓库总门，确保 build/diff/secrets 也针对最终 CSS/契约。

### K-4 precedence 裁定与反证（立即追写）

- 裁定：左栏 destination 提供默认 root（project 或 Workspace）；用户随后在中栏 Folder view 明确选择 folder 时，这是“这里怎么摆”的更精确目标，优先于默认 root。如此保留 nested folder 新建与组落点，状态栏也显示真实 folder；点击任一左栏 destination 会清除该精确选择并恢复对应 root。
- 新增用例先点 `Active Project`，再在 `Folder view navigator` 点 `Note groups`，真实 save 参数必须落 `note-root-active`。基线 **1/1 passed**。
- mutation 先打印落地 `GroupGallery.tsx:230 const creationTarget = destinationCreationTarget;`（故意忽略中栏选择），再读断言原文 `expect(last(savedGroups)?.folder_id).toBe('note-root-active');`（`GroupGallery.test.tsx:324`）稳定红：`Expected: "note-root-active"`，`Received: "project-root-active"`。
- 已还原中栏 selected folder precedence。因新增最终测试，下一步再跑最终四门与总门；不沿用测试加入前的绿结论。

### 中栏行补刀后的总门快照（立即补记）

- 在 precedence 测试加入前、但四行 CSS 与 8-check 契约均已落地的字节上，`npm.cmd run verify:v2-bn8-runtime` → **exit 0**（含 client/server build、diff check、secret scan）。
- 随后新增了 K-4 precedence 测试，故该快照不冒充最终字节门禁；将从 client tsc 重新跑最终四门并再跑总门。

### 最终字节门禁进度 1/4（立即追写）

- client tsc → **exit 0**。

### 最终字节门禁进度 2/4（立即追写）

- client 全量 unit → **exit 0，34 files，288/288 passed**；新增的 1 条是 K-4 precedence。

### 最终字节门禁进度 3/4（立即追写）

- Gallery 专项 → **exit 0，17/17 passed**；stderr 仅 Router future-flag 提示。

### 最终字节工单四门完成（立即追写）

| 顺序 | 门 | exit | 最终结果 |
|---:|---|---:|---|
| 1 | client tsc | 0 | 绿 |
| 2 | client 全量 unit | 0 | 34 files，288/288 |
| 3 | Gallery 专项 | 0 | 17/17 |
| 4 | Gallery 契约 | 0 | **8/8 checks** |

- 以上覆盖四行 CSS、8-check 契约、K-4 precedence 测试的最终字节。继续最后一次仓库总门。

### 最终字节仓库总门（立即追写）

- `npm.cmd run verify:v2-bn8-runtime` → **exit 0**。
- 最终总门覆盖：client 全量 unit **34 files / 288/288**、Canvas runtime boundary **159/159**、Gallery shell contract **8/8**、Canvas engine model contract **60/60**、client/server build、性能门、文档检查、`git diff --check` 与 changed-file secret scan，全部通过。
- stderr 仅有既有的 Router future flags、recursive reference fallback、Vite chunk/dynamic-import 与 LF/CRLF 提示；无失败项。

### 最终范围审计（立即追写）

- `git diff --check -- client/scripts/groupGalleryShellContractCheck.mjs client/src/pages/GroupGallery docs/agent-ops/handoffs/2026-08-29-ux-3-gallery-nav.md` → **exit 0**。
- tracked 施工面 numstat（本回执落盘前快照）：
  - `client/scripts/groupGalleryShellContractCheck.mjs`：`+38/-4`
  - `client/src/pages/GroupGallery/GroupGallery.module.css`：`+150/-3`
  - `client/src/pages/GroupGallery/GroupGallery.tsx`：`+194/-117`
  - `client/src/pages/GroupGallery/groupGalleryData.ts`：`+7/-2`
  - `client/src/pages/GroupGallery/groupGalleryShellModel.ts`：`+36/-4`
  - 本工单 Result：`+288/-0`（本回执及随后 `status` 前移属于协议收口字节）。
- `git diff --numstat` 不含的两个新增交付物已显式计入：
  - `client/src/pages/GroupGallery/GroupGallery.test.tsx`：**367 行**
  - `client/src/pages/GroupGallery/groupGalleryNavigationModel.ts`：**135 行**
- 变异残留逐实现文件复核：`wrong-`、`wrong-editor`、`missing-project-scope`、`所有组`、`count < 0`、`错误 query`、`.at(-1)` → **0 命中**。本机无 `rg`，依纪律用 PowerShell `Select-String` 完成同范围复核。
- 允许面核对通过：UX-3 只改 Gallery 目录、Gallery 机械契约与本工单。开工前既有 `server/src/routes/projections.ts` 和 `.claude/settings.local.json` 明确排除，未触碰；未碰锁、未 commit、未 push。
