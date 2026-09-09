> **状态 (Status)**: ready
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-09
> **上游**: 13.4 段 plan 修订二波次二(`plans/v13-4-projection-itemization-plan.md`);现物证据=单 0 侦察 §一(`analysis/2026-09-09-v13-4-s0-recon.md`)
> **单号**: 13.4 单 1 · item 化地基

# 13.4 单 1 · item 化地基

**使命**:item 作为 board_members 第三种投影上板(全链:写门→resolver→候选→卡面→导航);CG/Gallery/板共享 Item 读侧;深水题(Board–Item 身份桥/块卡绑定)**只量水深不实装**。

## 一 · 实装面

### B1 · member kind `item` 开闸全链
- 写门:`server/src/validators/boards.ts:45` 枚举加 `item`;client `boardTypes.ts:32` 同步;数据库 CHECK 已留位⛔动;
- resolver:`server/src/services/boards.ts:149` 族补 item 实读——当前正文(plain_text)摘要、type/topic、origin note_id(有则给导航)、active/retired/missing 状态(现有三态判定保留);⛔ 只 SELECT status;
- 候选:`boardRepository.loadBoardCandidates` 增 item 来源(既有 items list API);picker 分组展示(note/CG/item);
- 卡面:BoardPage 按 kind=item 渲染正文摘要+状态徽章;retired/missing 走既有降级卡样式,⛔ 静默空白;
- 导航:双击 item 卡——有 origin note 则开笔记(沿 reference.note_id 既有路径);无 origin 的 standalone item **禁用双击并给 title 提示**(v1 ⛔ 建独立 item 目的地页,HQ 已裁);
- 刷新:沿既有"GET 时重解析"契约;若便宜,itemRepository 的 update/retire 成功后失效板候选缓存(⛔ 大改订阅机制)。

### B2 · 共享 Item 读侧 adapter
- 按单 0 侦察最小接线候选:抽共享"Item 摘要解引用"读侧(按 item id 去重批量),Gallery(`groupGalleryData.ts:63` 族,item 成员预览现为空)与板候选两个消费者共用;
- 若需新批量端点,DTO 只服务这两个消费者;⛔ 正文写回 membership;⛔ 重铸旧 block/annotation/content_range 成员;workbench 逐卡加载现路径不动。

## 二 · 量水深报告(⛔ 实装,报告交 HQ)

产出 `docs/agent-ops/analysis/2026-09-09-v13-4-s1-item-depth.md`,三题各给最小实现面+改动清单+风险,⛔ 代裁:
1. **Board–Item 身份桥**:候选 A(boards.item_id 一对一 FK)与 B(共主键)成本对比;三前置题逐一列选项——identity item 的正文/标题谁拥有(板名同步?)、普通 item edit/retire 对板身份的边界、存量板回填;
2. **块卡绑定(编入/安家)**:block 承载 item 正文的最小机制——绑定字段落点、编辑单写/双写路径、板投影读宿主、"摘出"逆动作、迁移面;引用 07-12 relation-item-graph 三层结构与 09-09 安家模型(段 plan 修订二已拍裁定四);
3. **板上铸卡 origin 扩展**:items origin 目前 note/course,扩 board 出生地的 schema 与消费面射程(单 9 前置)。

## 三 · 裁量与停线

- 停线举证不改判;现物与本单行号/假设冲突→申报;
- ⛔ 新 event verb;⛔ 动 047 既有表结构;⛔ 动 castItem 认领语义。

## 四 · 验证(单内纪律)

- typecheck + build 全绿;既有测试回归不破;
- 冒烟四条:①mount 一个 item 上板,卡面显当前正文摘要,重开仍在;②retire 该 item,板卡显 retired 降级(⛔消失);③含 item 成员的组在 Gallery 预览显当前正文(不再空);④standalone item 卡双击禁用有提示,有 origin 的双击开笔记。

## 五 · Result 格式

`## Result`:numstat + 四冒烟逐条 + 量水深报告路径 + 未做清单 + 停线事项;**⛔ commit**;⛔ 读 .env;⛔ key 出境;⛔ 用户库接触;⛔ 安全类测试(总门末项凭据扫描留 HQ 例行补跑)。

## Result

2026-09-09 · Codex builder · B1/B2 工程实现与单内冒烟完成，工作树交 HQ 复核代账；文档索引门报红留停线（见末节），status 未翻 done；未 commit，未作主观验收或放行。

### 实装与边界

- **B1**：server/client 的 member 写门开放 `item`，`text_range` 仍关闭；Board GET resolver 实读当前 `plain_text` 摘要、type/topic、origin note 和 Item 状态。板卡显示摘要、Active/Retired/Missing 徽章，retired/missing 保留原投影和既有虚线降级卡；standalone 没有双击处理器并有 title 提示，origin note 沿现有导航打开。
- **B2**：新增 `POST /items/summaries` 和 `ItemSummary` DTO，200 IDs 一批、去重、纯 SELECT，缺失项省略；client 共享 adapter 的独立 Map 供 Gallery（含既有 SingleEditor）与板候选消费。板候选从既有 items list 读取 active Item，并用该结果填充摘要 Map，避免对同批 active Item 再请求；CG 里的其余 Item 按 ID 批量补读。Notes/Groups/Items 分组，type/topic 可搜索。
- **刷新**：保留 Board GET 重解析；进入/切换板、重开 picker 时重新读候选，并防止较旧请求覆盖新结果。现物没有共享候选缓存；未为可选失效另建订阅机制。Gallery 重开重新解引用，保存组/文件夹继续沿原保存契约，不因追加预览读取失败而误报保存失败。
- membership 不存正文，旧 block/annotation/content_range 成员不重铸；Item workbench 的逐卡加载未改。没有修改数据库 schema、047、`castItem` 认领语义或新增 event verb。

### numstat

以下为本单实现、测试与量水深报告，**25 文件，+1010 / -141**；不含本工单 Result 自身与开工已存在的未跟踪文件。新增文件按全部新增行计，未暂存。

```text
add  del  path
6    5    client/src/pages/Boards/BoardPage.smoke.test.tsx
49   18   client/src/pages/Boards/BoardPage.tsx
156  0    client/src/pages/Boards/BoardPage.item.test.tsx
4    0    client/src/pages/Boards/Boards.module.css
51   7    client/src/pages/Boards/boardRepository.test.ts
46   12   client/src/pages/Boards/boardRepository.ts
8    2    client/src/pages/Boards/boardTypes.ts
1    0    client/src/pages/GroupGallery/GroupGallery.tsx
2    2    client/src/pages/GroupGallery/SingleContentGroupEditor.tsx
17   4    client/src/pages/GroupGallery/groupGalleryData.ts
98   0    client/src/pages/GroupGallery/groupGalleryItemSummary.test.tsx
3    1    client/src/pages/GroupGallery/groupGalleryShellModel.ts
8    5    client/src/pages/GroupGallery/singleContentGroupEditorShellModel.ts
47   0    client/src/services/itemSummaryReader.ts
49   0    client/src/services/itemSummaryReader.test.ts
1    0    server/package.json
7    6    server/src/__tests__/v13BoardServices.test.ts
140  0    server/src/__tests__/v13ItemFloor.test.ts
92   73   server/src/routes/items.ts
14   4    server/src/services/boards.ts
25   0    server/src/services/itemSummaries.ts
2    2    server/src/validators/boards.ts
4    0    server/src/validators/index.ts
10   0    shared/types/itemSummary.ts
170  0    docs/agent-ops/analysis/2026-09-09-v13-4-s1-item-depth.md
```

### 四冒烟逐条

| # | 结果 | 实际证据与范围 |
|---|---|---|
| ① mount Item，卡面显当前正文，重开仍在 | **PASS** | `v13ItemFloor.test.ts` 经真实 Item/Board HTTP 路由在自建 `:memory:` 库创建、挂载、PUT 正文、再次 GET，断言新摘要与原几何；`BoardPage.item.test.tsx` 以生产页面/仓储/hook 走 Items picker，断言当前摘要、状态、topic 和重开后的同一投影 ID，mount payload 不含正文或摘要。 |
| ② retire 后板卡 retired 降级且不消失 | **PASS** | 同一 server 冒烟经真实 retire 路由后 GET，成员数量/几何和 membership 行不变，reference 为 unavailable/item_retired；client 冒烟重开后断言 Retired、既有降级样式标记及说明。另核 missing 同样留卡。 |
| ③ 含 Item 的组在 Gallery 显当前正文 | **PASS** | `groupGalleryItemSummary.test.tsx` 挂生产 Gallery，跨两 record 同 Item 去重一次请求，首读有正文，重开读修订正文；兼核 SingleEditor 摘要、旧成员保持与保存不反写。adapter 另核 201 个唯一 ID 分两批、缺失项、读取失败显式抛出；板 CG 候选复用列表 seed。 |
| ④ standalone 禁双击有提示；origin 双击开笔记 | **PASS** | `BoardPage.item.test.tsx` 断言 standalone title、双击不导航、Open note 禁用；另挂带 origin 的 Item，双击到 `/notes/origin-note` 路由。server 冒烟核真实 origin note 回包和 standalone 的 null。 |

**证据边界**：client 是合成 HTTP transport 下的生产 React DOM/仓储/hook 自动冒烟；server 是真实服务/路由＋自建内存数据库的 post-auth HTTP 冒烟，不使用鉴权或凭据。未宣称真人浏览器体感、用户数据验收或跨端真实浏览器旅程。

### 验证

- client 定向回归：`npm.cmd --prefix client run test:unit -- src/pages/Boards src/pages/GroupGallery src/services/itemSummaryReader.test.ts`，**11 文件 / 69 测试 PASS**。
- server 定向回归：`v13BoardServices.test.ts`＋`v13ItemFloor.test.ts` **6/6 PASS**；`v13BoardRoutes.test.ts` **2/2 PASS**。可用新增 `npm.cmd --prefix server run test:v13-item-floor` 重跑同一组合；没有运行其它 server 全套测试。
- typecheck/build：`node server/node_modules/typescript/bin/tsc -b shared`、`npm.cmd run build:client`、`npm.cmd run build` **PASS**。首次 server build 因新 shared DTO 尚未生成声明报 TS6305，先构建 shared 后通过；并在修正默认导出后重跑 server build 通过。client 构建保留现有 chunk/import 警告，无错误。
- Vite/Vitest 使用新建空目录 `.codex-tmp/v13-4-s1-empty-env` 作为 `COINCIDES_VALIDATION_ENV_DIR`，未读取 `.env`。PowerShell 的 `npm.ps1` 被执行策略拒绝后改用现成 `npm.cmd`，没有修改执行策略。
- `check:group-gallery-shell`（8 checks）、`check:single-editor-shell`、`check:tool-face-parity`（14 public entries）、`check:server-shared-runtime-import`（0 violations）及 `git diff --check` **PASS**。server build 内的 manifest check/copy 通过，未改 manifest。
- 其余可跑的总门子项：`check:canvas-runtime-boundary`（159 checks）、`check:groups-rail-shell`、`check:v2-bn11-legacy-shutdown`、`check:v2-bn11-relation-freshness`、`check:source-experience`（结构＋合成模型）、`smoke:canvas-engine-model-contract`（60 groups）、`smoke:canvas-engine-performance`（5 场景，12.72ms）、`test:tool-face-manifest`（10/10）全部 **PASS**。
- **`docs:check` FAIL**：第一段 `docs-index.mjs --check` 报 `docs/agent-ops/INDEX.md` 过期并 exit 1；其后 inventory/glossary 子段因 `&&` 未执行。没有绕过该结果或更新索引冒报全绿，证据/承接见停线节。
- 量水深报告的 UTF-8、完整路径和 28 处源码行号静态核对通过。React/独立只读复核未发现剩余实质问题。

### 量水深报告

[`docs/agent-ops/analysis/2026-09-09-v13-4-s1-item-depth.md`](../analysis/2026-09-09-v13-4-s1-item-depth.md)。三题均有最小实现面、改动清单、风险及待裁选项：Board–Item A/B 和三前置题；安家字段/单写或物化镜像/宿主读取/摘出/迁移；board origin schema 与消费面。**没有实装或代裁**。关键深度：家址不能只靠 block_id（现物有多 placement），正文绑定牵涉 Snapshot/freshness 与所有写门，board 出生地不等于放开 CG pool 认领。

### 未做

- 三道深水题的任何实现/迁移/回填；独立 Item 目的地；text_range 开门；大改订阅机制。
- `.env` 读取、key 外传、用户数据库读写、安全类测试、凭据扫描、外部账号/模型调用。
- 未整条运行包含安全末项的 `verify:v2-bn8-runtime`：全量 `test:unit` 改跑相关范围；含安全暴露断言的 `test:tool-face-registry`、`test:tool-face-parity` 未跑（已跑的是不执行案例的静态 `check:tool-face-parity`）；末项 `check:changed-file-secrets` 按本单交 HQ 补跑。已跑子门与定向回归如上，不冒报全总门 PASS；安全混合测试不在本次追加补跑授权内。
- 未启动产品服务、使用 3001/5173、做真人体感验收；未 commit/stage/push/PR/merge；未改 agent 指令、权限配置、current-state、索引或段 plan。开工既有未跟踪文件未读取/改动。

### 停线事项

**停线 S1-DOC：文档索引门红，交 HQ 收口，不翻 done。** `docs:check` 的输出为“过期: docs/agent-ops/INDEX.md / 1 个 INDEX 过期”，日志在 `.codex-tmp/v13-4-s1-docs-check.log`。现索引写 291 份，实际 Markdown（排除 INDEX）292 份，且索引不含本单新报告 `analysis/2026-09-09-v13-4-s1-item-depth.md`。未手改/重新生成权威索引；由 HQ 合并本单文档、更新生成索引后重跑 `docs:check`，本线程不把这一红门改判为通过。

**无新增的工单语义/实装假设冲突。** 单 0 与本单的 standalone 导航和深水范围差异按本单已裁收窄，不改判。工单少数行号随既有波次一改动平移，核对函数/行为一致。CodeGraph MCP/CLI 及 `rg` 当前不可用，优先尝试后使用限定路径 PowerShell 取证，未另建索引。

本次发现并已修复的工程集成问题：路由工厂若 `export default createItemRouter()` 会被现有 parity AST 检查器漏认；已保留 `const router = createItemRouter(); export default router;` 形式，随后 parity/build 全绿，没有修改检查器或豁免。后续三题裁量仍交 HQ，未据报告自行开工。
