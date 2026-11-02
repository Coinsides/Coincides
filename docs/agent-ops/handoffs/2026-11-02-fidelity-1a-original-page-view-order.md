> **from**: claude(Main_Designer)
> **to**: 临时工程对话1(builder)
> **status**: draft(候 Henry 翻牌;**翻牌通过前零施工**)
> **单号**: VPS-F11 段二 · 保真 1a —— 页影像层 + 原页视图
> **上游**: 《知识建制更新 plan》(已翻牌)分期表第 1 期;F11 段一侦察回执(`2026-11-01-vps-f11-page-fidelity-order.md` 尾部 Result);保真终局形态三拍(claude-log §247:快照人面+隐身转写+锚全契约+重转写纠错);11-02 五路设计侦察(引证散落文内,格式 file:line)

# 保真 1a · 页影像层 + 原页视图(PDF 第一期)

## 〇 · 目标一句话

用户导入 PDF 后,Source 阅读视图提供一个与现有文本视图**并列**的「原页」视图:页为单位、服务端栅格化影像为底,应用里的一页 = 原件的一页(排版/公式/图片不丢不变形);「Source p.N」可一键跳到对应原页。转写层本期**不动**。

## 一 · 射程与不做

**做**(PDF 一种格式,照 11-01「逐个点亮」分期律):
1. 服务端:物化后逐页栅格化 → 页影像落 canvas_assets → 页登记册(新表)→ 取页清单路由 → 删除/重物化清理闭环 → 记录原页尺寸;
2. 客户端:原页视图(懒窗列表)+ 视图切换 + 「Source p.N」跳原页 + Agent focus note_page 命令落点。

**不做**(负空间,写进验收的「未变」项):
- ⛔ docx(第二期,LibreOffice 转换前置后完全复用本期通路——一段话展望,不施工);
- ⛔ 转写层任何改动(云转写换血 = 1b);⛔ bbox/十角色(1b 供给);
- ⛔ 投影笔记退场 / 遗产处理(合龙期 1c;本期两视图并列,文本视图原样活着);
- ⛔ 原页视图上选字 / 标注 / 划线问 Agent(文本层随 1b 转写契约来,**不走** client 端 pdf.js);
- ⛔ 缩略图条、打印集成、多分辨率;⛔ MinerU 任何改动(岛上不宜默认,段一已判);
- ⛔ stripSourcePageFurniture 跨页重复正文误剥问题(段一「附带发现」申报):页影像层不受其影响,处置归 1b 转写换血一并解决——在此记档防掉地;
- ⛔ 旧 documents 链(TD-43 已停喂)与 source_snapshots(死链,见 D2 理由)。

## 二 · 设计决策(D1–D7,各带理由)

### D1 · 服务端存影像,否决两条备选路

- **否决 client 端 pdf.js 按需渲染**:零存储但 ① client 零 pdfjs 依赖(client/package.json:22-38 全量核过)要新增;② 终局要在页面上做锚点回跳高亮与 Agent 引用落点(§247 锚全契约),iframe/自绘 pdf.js 层都把「页」关在我们的覆盖层体系之外;③ Agent/云转写(1b)在服务端读页,server 侧迟早要有影像。
- **否决浏览器自带 PDF viewer(blob URL + iframe)**:同理由 ②,覆盖层做不了,终局死路;顺带移动端/Tauri webview 行为不一致。
- **采**:物化链内用现行 pdf-parse 2.4.5 的 `getScreenshot`(与 `getText` 同一 `PDFParse` 实例族,sourceArtifact.ts:277-323;零新依赖,段一实测 0.3s/页、PNG 1240px 约 248-314KB/页;参考脚本 docs/audits/2026-11-01-vps-f11-builder/raster.mjs)。格式**定案 PNG、宽 1240px**:getScreenshot 硬编码 PNG 输出(node_modules 内 PDFParse 实现 toBuffer('image/png'),ParseParameters 无格式参数),换 WebP 得解码重编码、还要直引 pdf-parse 的传递依赖——额外 CPU 又与依赖纪律相抵,本期不做,候真有磁盘压力再立单。

### D2 · 页影像骑 canvas_assets,不另立存储域

- 先例:图片类 Source 物化已把影像写成 canvas_assets 行,确定性 id `source-materialization-asset:${materializationId}`、storage_key `${userId}/source-materializations/${materializationId}${ext}`(sourceProjectionMaterializer.ts:123-124)。
- 骑它白得四件:取图路由 `GET /api/canvas-assets/:assetId/blob`(routes/canvasAssets.ts:57-62)、客户端缓存钩子 `useMediaImageAsset`(模块级 Map + blob + decode + revoke,useMediaImageAsset.ts)、补偿清理域(managed_file_cleanup_jobs.storage_domain CHECK 只收 'source_blob'|'canvas_asset',046:103-104——第三目录就要动 CHECK,骑行则免)、孤儿扫除 sweepOrphanSourceProjectionAssets(已扫 source-materializations/ 目录,sourceProjectionMaterializer.ts:749-780)。
- **页影像行硬契约(四件,缺一翻车)**:①id `source-page-image:${materializationId}:${pageNumber}`;②storage_key `${userId}/source-materializations/${materializationId}-page-${pageNumber}.png`;③**metadata 必须含 `managed_by:'source_materialization'`**——孤儿扫除的「被保护集合」只收带此标的行(sourceProjectionMaterializer.ts:758-761),漏标 = 每次服务启动的 sweep(index.ts:87)把 mtime 超 10 分钟的页影像文件当孤儿整目录删光,行在文件亡、blob 404,且「生成后立测」的验收抓不到;metadata 并附 source_record_id/materialization_id/page_number 便对账;④**origin_note_id = 投影 note id**(照图片 Source 先例 sourceProjectionMaterializer.ts:643,删除兜底靠它,见 D6)。canvas_assets 现成 width/height 列(canvasAssets.ts:35-36)写入影像实际像素。
- **不用** source_snapshots:它是旧 documents 链产物、现行 Source 路零引用(F11 段一问三已判死),不复活。

### D3 · 新表 source_pages 作页登记册(迁移一支,编号取开工时现头+1,现头 084)

```sql
CREATE TABLE source_pages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_record_id TEXT NOT NULL REFERENCES source_records(id) ON DELETE CASCADE,
  materialization_id TEXT NOT NULL REFERENCES source_materializations(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  pdf_width REAL, pdf_height REAL,          -- 原页尺寸(PDF 点),终局 frame 保真与 bbox 映射的地基
  image_asset_id TEXT REFERENCES canvas_assets(id) ON DELETE SET NULL,
  image_width INTEGER, image_height INTEGER,
  created_at TEXT NOT NULL,
  UNIQUE (materialization_id, page_number)
);
```

- 理由:现状**无任何地方**记录原页尺寸(全库核过:native-pdf 只留 page.num;MinerU 的 page_size 只用来归一化 bbox 后即弃,sourceMaterialization.ts:300-309;frame 的 904×1278 是写死的 A4 排版常量,sourceProjectionMaterializer.ts:22-35)。登记册 = 原页视图的数据源 + 守恒检查的对账面 + 1b bbox 映射的坐标地基。
- 进度/状态落 source_records.metadata(现成干净扩展点:默认 '{}',建后无人更新,sourceRecords.ts:191):`{"page_images":{"expected":N,"completed":M,"status":"pending|partial|complete|failed","updated_at":...}}`。

### D4 · 栅格化时机:物化发布之后,逐页渐进,失败不碍文本链

- 插入点:executeClaimedSourceMaterialization 内 publishSourceProjection 成功、状态翻 'materialized' **之后**追加页影像段(sourceMaterialization.ts:442-504)。⛔塞进 pdfParser.parse 内部——会共享 120s withTimeout 预算(sourceArtifact.ts:150,454),公式密集/长文档必爆。
- 逐页 `await`(每页一让事件循环)——解析本就跑在主循环、无 worker_threads(全 server/src 零命中),整批同步会卡死 API 进程;参照 mineru 串行闸形状可给栅格化加一道并发闸(sourceMaterializationConcurrency.ts:5-22)。
- 每页完成即落 source_pages 行 + 资产行(页级事务),原页视图边生成边可看;全部完成翻 metadata status。
- 失败语义:单页失败记页号续跑,整段失败 metadata.status='failed'——**不**把 materialization 打回 'failed'(文本投影已发布,阅读不受影响;failMaterialization 本有 status IN ('parsing','publishing') 守卫,sourceMaterialization.ts:257-263,漏出的异常也打不回去——但页影像段仍须**整体 try/catch 自吞**,别赌守卫);重试通道 = 重物化(D6)或后续补轻量重跑入口(本期不做)。⚠️追加段会拉长 scheduled map 占位与 waitForScheduledSourceMaterializations 的等待(sourceMaterialization.ts:517-543),等它的既有测试超时预算要核一遍并回执申报。
- 服务重启续跑:启动 sweep 族已有先例(index.ts:83-94);本期简化为「status∈{pending,partial} 的登记册在启动时重 schedule」,照 resumeReceivedSourceMaterializations 形状(sourceMaterialization.ts:592-609)。

### D5 · 读面两条路由(挂 routes/sources.ts 现有 router,authMiddleware 已覆盖)

1. `GET /api/sources/:sourceId/pages` → `{ status, expected, pages: [{page_number, asset_id, image_width, image_height, pdf_width, pdf_height}] }`;
2. `GET /api/sources/by-projection-note/:noteId/pages` → 同形(服务端经 source_materializations.projection_note_id 反查;⚠️该列**无 schema 级 UNIQUE**——046:43-44 的 UNIQUE 在 source_record_id 上;实践中 publish 每次新建 note 故一一对应,查询按最新取一行并断言)。客户端打开的是投影笔记,手里只有 noteId,一跳到位。
- 取图本身复用 /api/canvas-assets/:id/blob,**不开**新 blob 路由。鉴权是纯 Bearer 头(middleware/auth.ts:19-26),裸 `<img src>` 全站不通——客户端一律走现成 blob 钩子,别试图直链。

### D6 · 删除与重物化闭环

- 删除:页影像行因 D2 契约④(origin_note_id=投影 note),被 releaseNoteCanvasAssets 的 **origin_note_id 兜底路**自动覆盖(canvasAssets.ts:380-385;引用计数路确实抓不到无块引用的资产,兜底路才是真机制)。在 deleteSourceWithCompensation 事务内(sourceLifecycle.ts:158-193)另按登记册显式收一遍作对账双保险(重复 release 是无害 no-op,canvasAssets.ts:193-194),并确认 source_pages 行随 FK CASCADE 清光。
- 重物化(**现物已核,非未覆盖区**):rematerializeSource **复用同一条 source_materializations 行、同一个 id**(UPDATE … WHERE id = current.id,sourceReprojection.ts:119-124)——没有「新旧物化」之分。重物化路径须先清旧 source_pages 行与旧资产(或照 sourceProjectionMaterializer.ts:635-638 的 ON CONFLICT 覆盖先例);同一文件重物化时页影像内容本身仍有效,builder 可评估直接复用免重栅格化,回执申报取舍。previewSourceReprojection 预览路(routes/sources.ts:137-146)确认零页影像副作用。

### D7 · 客户端原页视图:兄弟分支 + 懒窗 + tab 级视图态

- **挂点**:NoteRuntimeDocumentLayer 层做 NoteWritingSurfaceLayer 的**兄弟分支**(样板:NoteOverviewLayer 的挂法,NoteRuntimeDocumentLayer.tsx:248-250);⛔进 NoteWritingSurfaceLayer(2200+ 行巨型层)腹地。切换控件放 NoteChromeLayer(它以 noteTools 注入,本就在写作面之外,NoteCanvasRuntime.tsx:44-46;锁徽章已在那里,NoteChromeLayer.tsx:416)。只对 source 投影笔记显示(sourceProjectionPolicy.isSourceProjection,sourceProjectionPolicy.ts:11-21)。
- **视图态**:照 usePageReadingViewportController 模式(usePageReadingViewportController.ts:19-51)——controller 内 useState,初值/回写走 documentTabsStore.remember(DocumentTab 加兄弟字段,如 `sourceView: 'text'|'pages'` + 当前页);刷新即弃、换 tab 恢复,与现有阅读态语义一致。⛔新开全局 zustand store。
- **渲染**:竖排页列表,页壳按登记册宽高比定高;懒窗照 NoteOverviewLayer 手写窗模板(overviewPageIsVisible 上 1 屏下 2 屏,overviewLayout.ts:34-36)——窗内才经 useMediaImageAsset 取 blob,窗外占位壳。⛔引入虚拟化库。缺影像的页(partial/pending)渲染「生成中」占位。
- **跳转**(已核现物,改造射程大于「按钮加动作」):View 按钮的渲染被 anchor 存在性门控(`{anchor && …}`,BlockSourceReferenceLayer.tsx:44-54),anchor 走旧 /source-anchors 链、生成要求 document_id 非空(sourceAnchors.ts:79-80),而 v2 物化写 note_block_sources 时 document_id 恒 NULL(sourceProjectionMaterializer.ts:510-514)——**v2 源今天压根不渲染 View 按钮**。本单改造:渲染条件改为「anchor 存在**或**登记册有该页」,页清单数据经 props 下传到该层;登记册有页 → 「查看原页」切原页视图滚至第 N 页;仅 anchor 有(legacy 源)→ 维持旧文本弹窗行为(NoteFloatingPanelLayer.tsx:20-49)。
- **Agent 落点**:agentUiStore 已认 `focus_object target.type='note_page' + page_index`(agentUiStore.ts:40)——原页视图激活时响应该命令滚到对应页;只接线这一条,不扩命令集。
- 文案:新增键挂 locales/en、zh 两份 translation.json(i18n.ts 惯例);切换控件交互照日历 month/week 分段按钮形状(Calendar.tsx:689-702)。

## 三 · 验收(测试面=功能/数据/回归)

**功能**:
1. 导入多页 PDF(真实教材样本,非合成)→ 原页视图页数与原件一致、顺序正确、宽高比不变形、公式/图/版式肉眼可辨;
2. 文本/原页切换往返,tab 级记忆生效;「Source p.N」跳转落在正确页;
3. 生成中打开:partial 状态下已完成页可看、未完成页有占位,完成后补齐;
4. 删除 source → source_pages 行、canvas_assets 行、磁盘文件三清(给出计数前后对照);
5. 非 source 笔记无切换入口、行为零变化;
6. 重启续跑:partial 状态下杀进程重启 → 登记册续跑补齐至 complete;
7. Agent focus:原页视图激活时,note_page+page_index 的 focus 命令滚动到对应页。

**数据**:status='complete' 时守恒式 `COUNT(source_pages) == getInfo().total == metadata.page_images.expected` 成立,每行 pdf_width/pdf_height、image_asset_id 非空;partial/failed 时 completed 计数与失败页号有记录(守恒式只在 complete 态断言);**扫除安全**:页影像文件 mtime 置老后跑一遍启动扫除(sweepOrphanSourceProjectionAssets),活页影像零删除;重物化后登记册/资产与现行物化一致(同 id 复用,见 D6)。

**回归**:文本视图与现有选区/问 Agent 零变化(View/跳转终点按 D7 变更为**预期内**,不计回归);`check:source-experience`(client/package.json:18)过;两侧 tsc 0;新服务配针对性测试;既有测试全绿;`npm run check:changed-file-secrets` 过。

## 四 · 风险与止损

- **CPU**:栅格化在主循环,逐页让出 + 并发闸;若真机(岛规格)实测单页 >1.5s 或明显压 API 延迟,降分辨率(1240→992)或限「仅手动触发生成」,回执申报后再议;
- **磁盘**:PNG@1240 约 248-314KB/页(段一实测,单页峰值个案 729KB),uploads/ 在 .gitignore(37 行)不进仓;备份策略归运维侧(页影像可再生成,源 PDF 在即可重打)——单内只需保证 D6 清理闭环成立;
- **一页一请求**:懒窗 + 模块级缓存钩子兜底;若 Tester 轮发现长文档滚动卡,再议预取窗口,本期不过度设计;
- **止损线**:若 getScreenshot 在真实教材上有渲染缺陷(字体缺失/公式烂),存证回报,换 pdfium 路线的选型讨论回 Main_Designer,⛔自行引新依赖。

## 五 · 纪律(现役全套照抄)

⛔一切 git 写操作;⛔读 .env 的 key 值;⛔动依赖锁文件(pdf-parse 已在库,严禁新增/升级依赖);⛔真实模型调用(本单全程用不到模型);⛔共享树换码对照(对照实验只在 scratchpad 副本);合成凭据 ≤20 字符或带 `synthetic-key-not-real-` 标;措辞中性,测试面=功能/数据/回归,⛔任何安全类测试设计;迁移照 foreignKeysOff 运行器纪律(migrate.ts:25-36,仅在需要时置位);时间盒照段,证据落 `docs/audits/2026-11-02-fidelity-1a-builder/`。

## 六 · 分段与回执

- **段 1**:迁移 + 栅格化段 + 登记册 + 两条读路由 + 删除闭环 + 重物化闭环(旧页行/资产清理或同 id 复用,取舍回执申报——现物已核见 D6)(服务端整段,带针对性测试);
- **段 2**:客户端原页视图 + 切换 + 跳转 + Agent 落点 + 文案;
- 每段完工在本文件尾部 `## Result` 追加回执(执行状态/证据路径/两侧 tsc/测试清单/申报项),完工发短讯。单 builder 串行,本单在 Henry 翻牌后开工,排建制Ⅰ之前。

## 七 · 翻牌点(Henry)

1. **存影像路线**(D1:服务端栅格化落盘,否决 client pdf.js 与浏览器自带 viewer)——认/改;
2. **第一期原页视图只管看和跳**:选字/标注/划线问 Agent 留在文本视图,原页上的文本层等 1b 转写契约(bbox)再来,⛔走 pdf.js 文本层——这条直接影响你的阅读体验,段一侦察特意点名要过你(认/改);
3. (报备,已自决不候拍)格式定案 PNG@1240px——getScreenshot 只出 PNG,WebP 重编码不值当,候真有磁盘压力再立单。

翻牌通过前零施工;通过后本单直开,建制Ⅰ随后串行。
