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
