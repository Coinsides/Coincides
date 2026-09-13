> **状态 (Status)**: done
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-13
> **单号**: V14 之交批 · 单5 · 导航窗格两步(壳+页面/搜索签)
> **上游**: `design/note-page-design.md` §3.4(三页签照 Word,Henry 拍;住文档区左舷⛔依赖壳)+§四.5(之交批两步=壳+页面/搜索签先行,**标题树候 heading 归 V14**)+会议记录 09-12 §四(标题的本体解=writing_role 扩展,⛔本单)

# 单5 · 导航窗格两步

**性质**:文档三边格局的左舷=结构位。照 Word 导航窗格形态:可开关的左侧停靠面板,三页签(标题/页面/结果);本单实装**页面签+结果签**,标题签**留位**。非模态——开着窗格一切编辑照常。

## 一 · 壳

1. **停靠位**:笔记文档区**左舷**(⛔盖 navigator 侧栏——是文档区内的第二纵列);独立滚动;开关钮入笔记工具栏既有「View options」族或平级新钮(申报落点);
2. 开合状态+宽度(若可调)持久化(localStorage,照浮卡位置记忆先例);
3. 非模态:窗格开着,纸面编辑/滚动/浮卡一切照常;Esc ⛔关窗格(它不是弹层);
4. **窄屏退化**:参照右舷侧桌口径退化为抽屉浮层(申报断点取值);
5. **⛔依赖桌面壳**(V14.5 壳批另说)——窗格完全活在现有笔记页布局内。

## 二 · 三页签

1. **页签条**:标题/页面/结果,顺序照 Word;当前签高亮,切签记忆(会话内);
2. **标题签=留位**:占位文案(一句话:标题树将随章节块 heading 一起到来)——⛔实装树⛔动 writing_role/TextFlow 契约⛔heading 任何铺垫代码;
3. **页面签(实装)**:单列页缩略,**复用既有 Page overview(E4)的缩略渲染机制**(⛔第二套缩略实现,复用点申报);当前页高亮并随滚动跟随;点击缩略=跳至该页;
4. **结果签(实装)**:纸内文本搜索——输入框+防抖;检索射程=**当前笔记已加载文本内容**(client 内,⛔server 检索面⛔embedding⛔跨笔记);结果列表=命中片段(命中词加亮)+所在页码;点击结果=跳至该块并临时高亮;零结果态文案;搜索词清空=列表清空。

## 三 · 台账义务(常备条款)

预期**零新增挂载期 API**(页面签/结果签均食用已加载数据)。若实现确需新请求:全夹具台账普查显式登记。client **全库必跑**。

## 四 · 禁区

⛔标题树实装与任何 heading/writing_role/TextFlow 契约变动;⛔依赖桌面壳;⛔server 检索面;⛔动右舷(Staging/Groups);⛔Agent 面;⛔安全类测试;⛔碰 .git;⛔commit;⛔读 .env key 值;⛔用户库接触;**新造凭据形合成值(口令/key/token/凭据用途的用户名邮箱)≤20 字符**——域数据字符串不在射程;⛔新依赖。

## 五 · 验收

1. typecheck+build 三端绿;`check:test-wiring`/`check:tech-debt-table` 绿;受影响静态门绿;
2. 定向新增:①壳开关+持久化+非模态(开窗格后编辑照常)②页面签(缩略与 Overview 同源/当前页高亮跟随/点击跳页)③结果签(命中/跳块/零结果/清空)④标题签留位;client 全库绿;
3. 冒烟(隔离库+真浏览器,不可用则申报留 HQ):开窗格→页面签缩略+当前页高亮→点缩略跳页→切结果签搜索→点结果跳块高亮→标题签占位→窄屏退化→关窗格重开状态记忆;
4. 证据落 `docs/audits/2026-09-13-nav-pane-builder/`(⛔构建产物⛔原始日志目录,只留判据文件);git/secrets HQ 收口。

## 六 · 申报义务

Result 必含:交付清单+numstat(基于编辑前镜像)、开关钮落点与窄屏断点申报、缩略复用点申报、测试数字、未做项(标题树等)。冲突停线举证⛔自作主张。

---

## 补遗一(HQ 裁定,2026-09-13 二轮)

裁:**凭据设置 UI 的既有功能回归(ProvidersSection.test.tsx 等,全 mock+合成值)⛔属于禁跑射程,照跑**。「⛔安全类测试」的射程=**新设计**安全对抗类用例(渗透式/越权探测式);既有回归套件例行整跑历来明文允许(红线原文在案)。client 全库必跑维持原样,零排除。工单其余零变,续工。

## Result（二轮，2026-09-13，Codex builder）

本单全文及补遗一施工完成，status 翻 done，交 HQ 复核与放行。client 全库例行整跑包含原有凭据设置 UI 回归，零排除；没有新增安全对抗类用例。

### 交付清单与落点申报

- **壳与入口**：`NoteRuntimeDocumentLayer` 内新增非模态左侧停靠窗格；`NoteWritingSurfaceLayer` 的 Page reading controls 中，紧邻 View options 增加 Navigation pane（PanelLeft）按钮。编辑纸面保持挂载，独立滚动，Esc 不关窗格。
- **状态与断点**：localStorage 键 `coincides:note-navigation:open` 保存开合；宽屏固定 256px，无宽度调整，因此无可调宽度持久化。`max-width: 900px` 退化为文档区内 288px 非模态抽屉，停靠占位为 0，不覆盖原 navigator。页签在 runtime 会话内保留，关开不丢失；刷新后默认 Pages。
- **Pages 与 E4 复用**：从 `NoteOverviewLayer` 抽出 `NotePageThumbnail.tsx/.css`，两入口共用 `NotePageThumbnail → NoteReadOnlyPageContent → BlockEditorLayer/ink`；没有第二套内容缩略渲染。导航单列按可见范围懒挂载，跟随当前纸页并点击跳页。浏览器发现的 runtime 对象刷新抢回缩略浏览位置问题已修复，增加连续重建回归。
- **Results**：`noteNavigationSearch.ts` 搜索当前笔记已加载纸内文字和实时草稿，含页头、代码、公式字段；180ms 防抖、命中片段加亮、机械页码、跳块与 2.2 秒临时高亮、零结果和清空状态。跨页块显示真实页集合并跳至首片段，不伪造字符到页映射。
- **Headings**：仅一句占位文案，三个页签依次为 Headings / Pages / Results，支持键盘切签。
- **证据**：[验证判据](../../audits/2026-09-13-nav-pane-builder/verification.md)、[挂载请求与全夹具台账](../../audits/2026-09-13-nav-pane-builder/mount-request-census.md)、[镜像 numstat 与文件哈希](../../audits/2026-09-13-nav-pane-builder/numstat.json)。审计目录没有构建产物或原始日志。

### 请求台账申报

新增 endpoint 为 **0**；文字、代码、公式、ink 和搜索本身无额外挂载请求。媒体与 Item 引用为完整复用 E4，只读缩略会增加既有 `GET /canvas-assets/:assetId/blob` 与 `POST /items/summaries` 的调用次数；懒挂载离开再返回会重读。按第三节登记例外，不能申报所有类型零新增挂载请求。已普查全部 167 个 client test/spec 文件的相关挂载链与 mock，新增真实 renderer 请求测试 2 项；首挂、普通重渲染、离开后重挂和资源释放均有精确次数判据，既有夹具没有放宽默认处理器。

### 验证数字与真浏览器

- **client 全库**：167 文件、1722 测试全部通过，零排除；包含 `ProvidersSection.test.tsx` 既有 4 项。新增定向 28 项：搜索 10、控制器/页头 3、页面签 6、真实挂载请求 2、runtime 集成 7。既有 E4 14 项与 runtime document 全部 22 项同时通过。
- **类型与构建**：client/shared/server 三端 typecheck + build 全通过；client 构建仅有 Vite 大 chunk 提示。
- **门禁**：原 runtime 总链 23 段，按第五节将 Git/secrets 两段留 HQ；其余 21/21 分别执行通过，未调用含禁项的整条入口。test-wiring 78/78（零豁免/漏接），canvas boundary 174，registry 5/5、manifest 10/10、parity 10/10；manifest/parity 14 条 public，server/shared import 246 文件零违规；gallery 8，模型 smoke 60 组，性能 smoke 5 场景；其余受影响静态门及 docs:check 均通过。准确命令清单见验证判据。
- **真实 Chrome + 隔离库**：六页、18 文字块夹具完成开窗格、缩略跳第 5 页、纸面滚动跟随第 6 页、`cobalt` 命中第 1/5 页、点结果跳块高亮、标题占位、Esc、窄屏、关开页签记忆和开/关跨刷新持久化。窗格开启时正常编辑正文，保存并刷新后仍能检索。实测 901px 为 256px 停靠，900px 为 288px 抽屉，800px 窄屏也通过。浏览器可用且已完成，不留不可用项给 HQ。
- docs 索引首次检查发现已有过期条目，保留修改前镜像后用既有生成器刷新；复验通过，并在本次 done 状态写回后再次更新检查。原始失败日志保留在临时区，审计判据明确记录修复与复验。

### 基于编辑前镜像的 numstat

基准为 `.codex-tmp/nav-pane-round2/before/` 的编辑前字节镜像，采用 CRLF 归一化的逐行 LCS，**没有使用 Git**。下表代码路径以 `client/src/pages/Notes/canvasEngine/` 为前缀；附带文件按仓库路径列出。统计覆盖交付源码/测试、索引、工单与 Markdown 判据；不含临时助手、日志、构建产物或 numstat.json 自身。

| 文件 | 新增行 | 删除行 |
| --- | ---: | ---: |
| `hooks/useNoteNavigationController.ts` | 105 | 0 |
| `hooks/useNoteNavigationController.test.tsx` | 121 | 0 |
| `layers/NoteNavigationPane.tsx` | 98 | 0 |
| `layers/NoteNavigationPane.css` | 60 | 0 |
| `layers/NoteNavigationPages.tsx` | 93 | 0 |
| `layers/NoteNavigationPages.css` | 23 | 0 |
| `layers/NoteNavigationPages.test.tsx` | 232 | 0 |
| `layers/NoteNavigationPages.requests.test.tsx` | 140 | 0 |
| `layers/NotePageThumbnail.tsx` | 56 | 0 |
| `layers/NotePageThumbnail.css` | 30 | 0 |
| `layers/NoteOverviewLayer.tsx` | 4 | 41 |
| `layers/NoteOverviewLayer.css` | 0 | 29 |
| `layers/NoteOverviewLayer.test.tsx` | 2 | 1 |
| `layers/NoteRuntimeDocumentLayer.tsx` | 21 | 3 |
| `layers/NoteRuntimeDocumentLayer.test.tsx` | 234 | 1 |
| `layers/NoteWritingSurfaceLayer.tsx` | 9 | 1 |
| `noteNavigationSearch.ts` | 137 | 0 |
| `noteNavigationSearch.test.ts` | 170 | 0 |
| **源码与测试小计（18 文件）** | **1535** | **76** |
| `docs/agent-ops/INDEX.md` | 5 | 2 |
| `docs/agent-ops/handoffs/2026-09-13-v14-nav-pane-order.md` | 63 | 1 |
| `docs/audits/2026-09-13-nav-pane-builder/mount-request-census.md` | 76 | 0 |
| `docs/audits/2026-09-13-nav-pane-builder/verification.md` | 97 | 0 |
| **合计（22 文件）** | **1776** | **79** |

### 未做项与 HQ 收口

未实装标题树、未写 heading 铺垫、未改变 writing_role/TextFlow 契约；未依赖桌面壳，未改右舷 Staging/Groups 实现或 Agent 面；无 server 检索、embedding、跨笔记检索或新依赖。搜索不读取资产或另外加载的 ItemSummary 正文。未新设计安全对抗用例，未读 `.env` key，未接触既有用户库；本次新写合成凭据常量均 ≤20 字符。

全程零 Git 命令、未接触 `.git`、无 commit。`git diff --check` 与 changed-file secrets 按第五节留 HQ，主观验收和放行也留 HQ；此 done 表示本单 builder 交付完成。

---

## HQ 收口(fable,2026-09-14)

builder 二轮交付核验通过(一轮停线系「安全类测试」措辞射程问题,补遗一裁凭据 UI 回归照跑):

1. builder 数字:client 全库 **167 文件 1722/1722 零排除**,三端 typecheck/build 绿,21 项 runtime 子门绿,隔离库真浏览器冒烟 builder 自跑通过;
2. HQ 抽检(隔离栈真浏览器):工具栏「Navigation pane」钮(Page overview 旁)→窗格开于文档区左舷,Headings/Pages/Results 三签→Pages 单列缩略+当前页高亮→写一行字→Results 搜索命中(1 result+页码+命中片段)→Headings 留位文案照单;
3. **server 全量(HQ 补跑)497/497 零红**——含同链搭载的两处 agent 点修(providers 模型串/orchestrator 工具事件),K-5 观察位项本轮亦绿;
4. git/secrets 入收口单链。

单5 关门——**之交批 5/5 全落账**。V14 主线随即开工(14.1-A0 executor 普查侦察单)。
