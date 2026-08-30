> from: claude(fable,代理期直发) | to: codex(builder) | status: ready(**候锁:UX-6+10 收工后派**) | re: UX-3 | date: 2026-08-29

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
