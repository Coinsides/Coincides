> **From**: fable
> **To**: codex
> **Status**: done(两层制;13.2 附单 s5a;按补遗一完成 builder 施工与验证,待 HQ 复核)
> **日期 (Date)**: 2026-09-08
> **性质**: 缺陷修复单(client/server 定位后定;⛔ 用户库接触)

# 13.2 · 附单 s5a · v2 下失焦保存首发失败(恢复队列橙盒闪现)

## 〇 · 症状与已证事实

- **Henry 真库眼验报障**:任一笔记,选中 paragraph block 后点击空白处,一个橙色提示框光速闪现即消;
- **HQ 侦查结论**:橙色样式全 UI 排查,唯一符合者=`.blockEditRecoveryQueue`(NoteDetail.module.css:973,var(--warning) 橙框);机制推定=失焦保存首发被拒→入恢复队列(盒弹出)→立即重试成功→盒消失;
- 稳态写路径已实测全绿(POST blocks 201/PUT block-placements 200/coordinate-contract 200,test note 1 上 HQ 亲测);
- 4a 相关新逻辑:"v2 正式页面新写要求有效 frame 与 page_frame_local;跨 note 恢复按收据取帧集合,使用冻结契约;缺帧拒写并保留恢复队列"(4a Result)。

## 一 · 任务(冻结)

1. **复现**:合成 fixture(可扩展 pageReadingSmoke)重现该手势链(选中既有段→点空白→失焦保存)在 v2 旗标下的首发失败入队;拿到确切拒因(疑点优先级:冻结契约会话未就绪时序 / blur 保存与 frame 集合加载竞态 / draft-blur 与 placement 写的先后 / 恢复收据路径误触);
2. **修根因**:首发保存必须一次成功,⛔ 以"重试反正会成"掩盖;⛔ 放宽 v2 有效帧校验;
3. **次级(若存在合法瞬时入队场景)**:恢复队列盒渲染加 300ms 消抖(瞬时自愈不闪 UI)——仅在根因修复后仍有合法场景时做,⛔ 用消抖掩盖根因;
4. **零变化面**:⛔ 4a 语义层判定规则、⛔ 执行器、⛔ canvas 模式、⛔ 用户库。

## 二 · 验证(段纪律)

server+client typecheck/build;单测:该手势链 v2 下首发保存成功断言+入队路径回归(真失败仍入队);一条冒烟:fixture 实跑手势链,零恢复盒闪现、placement 落库正确。

## 三 · 回执与边界

apply_patch 追加 ## Result(根因陈述+numstat+验证输出+未做);⛔ commit(工作树交 HQ);⛔ 读 .env;⛔ 打印 key;不动 3001/5173。现物冲突⇒停线举证。

## Result

### 2026-09-08 · builder 停线回执：橙盒已复现，首发失败推定被现物推翻

**按 §三「现物冲突⇒停线举证」停止产品修改，Status 保留 ready，不宣称修复完成。** 合成 v2 数据库中，指定的「选中既有 paragraph → 点空白 → 失焦保存」确实触发恢复盒短暂出现，但实际是 **一次 PUT、首发 HTTP 200、零拒绝、零重试**。因此无法按 §一.1–2 的「首发被拒后恢复」前提继续施工；请 HQ 根据下列证据校正工单。

### 根因陈述与调用链

本次复现的根因是：**正常在途保存的防丢预写收据被直接展示成待恢复队列**，不是 v2 有效帧校验拒绝首发。

1. `client/src/pages/Notes/canvasEngine/blocks/TextBlockProjection.tsx:1152` 的 blur 保存携带当前 TextFlow；`layers/NoteWritingSurfaceLayer.tsx:2276`、`:3823` 将它传给 adapter。`hooks/useNoteCanvasDataAdapter.ts:1399` 的无变化短路要求 `!textFlowDraft`，故仅选中再失焦也会走保存。实测第 1 块由仅有 `body` 写成 `body,text_flow`，plain_text 不变。
2. `useNoteCanvasDataAdapter.ts:1420–1444` 在 HTTP 请求之前创建并持久化防丢收据；`:1524` 的 saving 状态更新触发渲染。`:529` 不区分在途与失败，直接列出该 note 的全部恢复收据；`layers/NoteRuntimeDocumentLayer.tsx:44` 据此显示橙盒。
3. `useNoteCanvasDataAdapter.ts:1526` 发出唯一一次 `PUT /note-blocks/:id`；正常响应分支 `:1587` 删除收据，随后橙盒消失。`server/src/routes/noteBlocks.ts:54–128` 是块内容 UPDATE，没有 placement 写入或 frame/coordinate-contract 判定。
4. 既有块恢复重发由 `useNoteCanvasDataAdapter.ts:1648–1671` 的显式 Apply 触发；本次未点击 Apply，网络记录也没有第二次 PUT。这里不能把收据存在解释成请求失败，也不能把正常响应后的移除解释成自动重试成功。

### 合成浏览器实跑证据

- 复用 `pageReadingSmoke/startTray.mjs` 的真实 client runtime、Express 路由和 SQLite 服务，在 `.codex-tmp/s5a/` 生成独立诊断副本；`initDb(':memory:')`，仅在此内存库设置 `coordinate_contract=v2`。两块为人工合成 paragraph，均已有合法 `tray-frame` 与 frame-local placement。Vite `configFile:false, envFile:false`，端口 **5184**，没有连接开发服务。
- 用新建 Chrome 标签实际点击第 1 段，再点击页内空白；没有改文字、调用保存函数或注入失败。仅附加 fetch/DOM MutationObserver 时间记录，未增加响应延迟、改变请求/响应或修改产品实现。
- 冻结契约 GET 和 canvas hydration GET 均先完成并返回 200；加载共 4 次业务 GET，失焦后只有下列 1 次业务 PUT，没有 placement 请求、恢复重发或错误后回读。

| 浏览器事件 | `performance.now()` / ms | 事实 |
| --- | ---: | --- |
| 点击已有段落 / textarea focusin | 26317.200 / 26322.300 | 获得编辑焦点 |
| 点击空白 DIV / textarea blur | 36109.300 / 36124.600 | 指定手势链 |
| PUT `/api/note-blocks/tray-block-1` | 36128.300 | 唯一一次保存请求 |
| 恢复盒加入 DOM | 36175.600 | 此时客户端尚未收到响应 |
| 同一 PUT 响应 | 36241.200 | **HTTP 200** |
| 恢复盒移出 DOM | 36269.900 | DOM 存续约 **94.3ms** |

后端独立请求账同样记录唯一 PUT 返回 200；SQL 回读内容已保存。所有 `canvas_placements` 的 id、x、y、width、height、frame_id、surface、metadata 与保存前逐项一致（`placementsUnchanged=true`）；两块布局分别为 `(0,260,760,100)` 与 `(0,420,760,100)`，frame 均为 `tray-frame`。94.3ms 是 DOM 观测时间，不冒充逐帧光栅录像。

原始合成证据：`.codex-tmp/s5a/browser-evidence.json`；SHA-256 `26fd431621bee212a82f7991adff095f077990c36787f4b5acbdc442181d3484`。复现入口：`node .codex-tmp/s5a/prepare.mjs`，再 `node scripts/run-isolated-coordinate-validation.mjs --cwd server -- node --import tsx ../.codex-tmp/s5a/start.mjs`，打开 `http://127.0.0.1:5184/scripts/pageReadingSmoke/tray.html`。`prepare.mjs`/`observer.js`/生成的 `start.mjs` 为本次临时诊断件，均在忽略目录；记录中只有合成数据。

### 验证、numstat 与未做

- 已完成：v2 真实浏览器手势链、前后端请求账对照、恢复盒生命周期观测、合成 SQLite 内容与 placement 回读，以及 `git diff --check`。这是缺陷前提的反例验证，**不是修复后的 PASS**。
- 因现物冲突停线，**未实施产品修复，未加 300ms 消抖，未增改产品单测，未执行 §二双方 typecheck/build、真失败入队回归或完整 `verify:v2-bn8-runtime`**；没有把这些门申报成通过。下一单若修展示，须保留防丢预写并区分在途操作与真正恢复项，再完整执行原验证要求。
- 产品代码 numstat **0/0**；本次仅追加本工单回执，最终文档 numstat **1 文件，+42/-0**。开工已有不相关未跟踪文件未改。
- 未读 `.env`、未打印任何密钥、未接触用户库、未修改 4a 语义规则/有效帧校验/执行器/canvas 模式；未 commit/push/PR。未操作或请求 3001/5173。已关闭自己的复现标签与 5184 fixture 进程（PID 35644），内存库随进程释放。
- 证据射程仅为上述合成路径与当前源码；**没有据此宣称 Henry 真库绝不存在另一个首发失败**。确定的是：相同橙盒可以由正常首发成功直接产生，工单所列机制不能再当作已证根因。

## 补遗一(2026-09-08,发单方 Fable;停线成立——工单根因推定被浏览器毫秒账推翻,改判展示语义缺陷)

1. **根因改判**:非"首发失败入队",而是**恢复队列 UI 把在途防丢预写收据当待恢复项展示**(在途 94ms 即橙盒寿命)。防丢预写机制本身是好设计,**保留**;
2. **修展示语义**:恢复队列橙盒只展示**终态失败/待人工 Apply** 的收据;在途(saving 中)收据⛔ 渲染进盒;真失败仍即时显示,⛔ 消抖⛔ 延迟掩盖;
3. **顺手修搭车病**:仅选中→失焦、内容零实质变化时⛔ 发保存——短路判据=body/plain_text/text_flow 与已存序列化相等则跳过(text_flow 真有新数据算实质变更,照常保存);
4. **测试**:①工单手势链在 v2 下零橙盒闪现且(无变化时)零 PUT;②真失败收据仍入盒并可 Apply 的回归;③有实质 text_flow 变更时保存照发;
5. 验证照原 §二;其余口径不变。按本补遗续作至完工 Result。

## Result

### 2026-09-08 · builder 完工回执（按补遗一续作）

**补遗一要求已实施，原 §二验证已实跑通过；工作树交 HQ，未 commit，不代作主观验收或放行。** 上方停线回执作为当时事实保留；其中「未实施产品修复／未运行完整验证」已由本次续作完成，不能再作为当前施工状态。

### 根因与实现

- 根因沿用补遗改判：防丢预写在 HTTP 之前持久化，旧 UI 无条件列出持久收据，把正常保存误展示成待恢复。没有重定性为首发失败，也没有引入消抖。
- `useNoteCanvasDataAdapter.ts` 复用既有 `outstandingBlockSaveOperationsRef`，给保存操作关联精确 `pendingRecoveryKey`；展示列表排除仍由该在途操作持有的收据。HTTP 拒绝时先解除展示过滤、通知渲染，再等待读回核对，因此读回慢也不会拖延失败展示；操作结束同样通知刷新，覆盖并发时 `savingBlockId` 未变的情况。
- 预写、持久化格式、读回核对、显式 Apply 和已有清理规则保留。重新挂载后没有本挂载持有的在途操作，遗留收据仍为待 Apply 项。**没有另建恢复库或第二份业务状态机关**：恢复内容仍在原 sessionStorage 队列，操作身份仍在原操作表；新增 version 只用于通知 React 刷新展示。
- 无变化判断移到真实保存载荷生成之后，复用 `blockMatchesIssuedSave` 比较 `plain_text` 与完整 `content_json` 的稳定序列化（包含 body、text_flow、字段值；对象字段顺序不影响，数组顺序保留）。相等则在创建收据／发 PUT 前返回 `saved/not_needed`。TextFlow 首次物化或角色等实质变化照常保存，不能只因 plain_text 相等而跳过。
- 并发保护：同 note/block 尚有在途操作时不走该短路，避免「原文 A → B 保存未决 → 用户改回 A」的最后一次编辑被旧快照比较吞掉。独立静态复核指出此边界后已修，并加入回归。

### 单测与原 §二验证输出

所有命令均由仓内 `scripts/run-isolated-coordinate-validation.mjs` 执行：强制 `DB_PATH=:memory:`、空 Vite envDir、独立临时素材目录，原始日志不打印或存盘，只回显汇总。

| 命令（repo 根执行） | 实跑结果 |
| --- | --- |
| `node scripts/run-isolated-coordinate-validation.mjs --cwd client -- node node_modules/typescript/bin/tsc --noEmit --pretty false` | exit 0，16s |
| `node scripts/run-isolated-coordinate-validation.mjs --cwd server -- node node_modules/typescript/bin/tsc --noEmit --pretty false` | exit 0，10s |
| `node scripts/run-isolated-coordinate-validation.mjs --cwd client -- npm run test:unit -- src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.test.tsx` | 1 文件，37 tests passed，exit 0，7s |
| `node scripts/run-isolated-coordinate-validation.mjs`（完整 `npm run verify:v2-bn8-runtime`） | exit 0，74s；客户端 **50 文件／466 tests passed**；registry 5/5、manifest 10/10、parity 10/10；双端 build、模型／性能 smoke、运行时边界、文档检查、diff 与 changed-file secrets 门全部完成 |

新增 7 个 v2 单测案例覆盖：序列化相等的显式 TextFlow／draft 两入口零 PUT、零预写；首次物化／角色变化各首发一次成功；held PUT 时持久收据存在而展示为空；真实拒绝在 held reconciliation GET 期间立即可见，随后明确 Apply 成功；双块并发独立过滤；A→B→A 不误短路。已有 remount、旧响应和 stale read 回归继续保留，需检查防丢时改读持久队列，需检查展示时读过滤后的列表。

### 合成浏览器实跑与落库

独立 `.codex-tmp/s5a-fix/` fixture 继续使用真实 client runtime、Express 路由和 SQLite；仅 `initDb(':memory:')` 的人工数据设置 v2。第 1 段预存 body + TextFlow，第 2 段预存 body；都已有合法 `tray-frame` 与 frame-local placement。Vite `configFile:false, envFile:false`，仅监听 **127.0.0.1:5184**。用 Chrome 新建标签实际点击／输入／失焦／Apply，未直接调用产品保存函数。

| 实跑阶段 | 请求、DOM 与 SQL 证据 |
| --- | --- |
| 第 1 段仅选中 → 页内空白 → 失焦 | **0 PUT、0 queue-shown**；内容和 placement 不变，无注入延迟或失败 |
| 实际追加 ` saved edit` 后失焦 | **1 PUT、首发 200**；测试夹具主动保持该 PUT 在途约 18.5s，期间和成功后均 **0 queue-shown**；SQL 回读正文与 TextFlow 同步保存 |
| 再追加 ` recover me` 后失焦 | 夹具仅对这一 PUT 注入合成 **503**；响应时刻 119785.2ms，queue-shown 119833.5ms，读回 200 为 119834.4ms；恢复盒在读回完成前出现，未设置延迟／消抖 |
| 点击橙盒 Apply | 仅由用户点击发起下一次 PUT，**200**；橙盒移除，SQL 正文及 TextFlow 均为 `Synthetic tray block 1 saved edit recover me` |
| 第 2 段仅选中 → 失焦 | 新增 TextFlow 属实质数据变更，**1 PUT、首发 200**；不新增 queue-shown。随后重复同一手势 **0 新 PUT、0 新 queue-shown** |

全链共 **4 PUT（200／503／200／200）**，仅合成失败产生一次恢复盒展示。每阶段 SQL 比较均 `placementsUnchanged=true`：所有 canvas placement 的 id、x、y、width、height、frame_id、surface、metadata 不变；两段仍分别 `(0,260,760,100)`、`(0,420,760,100)`。DOM 事件来自 MutationObserver，截图核验可见状态；不冒充逐帧录像或 Henry 真库验证。

合成原始证据在 `.codex-tmp/s5a-fix/01-noop.json` 至 `07-final.json`（忽略目录诊断件；永久回归在上述单测文件）：`01-noop.json` SHA-256 `32301b5c342de4381c0056c3be54e26ae5e7e84fc557ff5bf1ef3da8936d3daa`；汇总全链的 `07-final.json` SHA-256 `1572584694b9b8945fcef6c857f833065e39651e36ccc1662c9b35d542d09147`。重跑入口为 `node .codex-tmp/s5a-fix/prepare.mjs`，再 `node scripts/run-isolated-coordinate-validation.mjs --cwd server -- node --import tsx ../.codex-tmp/s5a-fix/start.mjs`，打开 `http://127.0.0.1:5184/scripts/pageReadingSmoke/tray.html`；合成控制门 `/api/__s5a-control` 分别接受 `holdNext`、`release`、`failNext`，只存在于此诊断件。

### numstat、清理与未做

- 产品代码 **1 文件 +34/-11**；回归测试 **1 文件 +290/-9**；本工单 **+51/-1**，仅更新 Status、追加本次 Result（既有停线回执与补遗正文未回改）。本次 tracked 变更总计 **3 文件，+375/-21**。
- 已关闭成功验证标签，已核对独立 5184 listener 并结束本次 fixture（PID 19372，内存库释放）；其常驻 wrapper 随主动终止返回非零，**这不是测试门失败**。首次导航建立的失联测试标签无法通过连接器关闭，交浏览器会话自动清理；不再有后台 fixture 服务。
- 未接触用户库、未读取 `.env`、未打印 key；未操作或请求 3001/5173；未修改 4a 语义判定／帧校验／执行器／canvas 模式机件；未 commit/push/PR。开工已存在的不相关未跟踪文件未改。
- 未跑用户真库、外部服务或主观体验验收，未扩大为其他版本收口。以上工程完成与证据只覆盖本单补遗一，交 HQ 后续复核与放行。
