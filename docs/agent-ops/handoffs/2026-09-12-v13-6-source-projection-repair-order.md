> **状态 (Status)**: ready(施工夜第二单;Henry 09-12 认分诊全表+重投影裁定,睡前令"施工类全清"提前开工)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-12
> **单号**: 13.6 · 源投影修单(页对齐+常量统一+页渣剥离+封面+重投影 v1)
> **上游**: 09-12 会议记录 §七源投影诊断(三层病理+分诊,Henry 认);HQ 代码侦察(sourceProjectionMaterializer 全链);`current-state/page-frame-and-layout-contract.md`

# 源投影修单 · 页码契约与重投影 v1

**Henry 的验收基准(原话要义)**:"A4 文档放进来第一页就是第一页,标了第 3 页的东西就该在第 3 页找到。"

HQ 侦察已定位全部病根,下述行号为现物。现役 PDF 解析走 native-pdf(pdf-parse),MinerU 已接线未启用(9 页上限)——本单⛔动解析引擎选择,只修投影铸造与门面。

## 一 · 几何常量统一(治横向左切)

病根:materializer 私有常量(`sourceProjectionMaterializer.ts:17-26`:794/1123/650/inset{96,72,96,72})与纸面 A4 真源(`client/src/pages/Notes/canvasEngine/pageFramePrintScaleService.ts:21-23`:904/1278/760/inset{top:0,right:72,bottom:96,left:72})是两套。

1. 新建 `shared/types/pageGeometry.ts`:承载 A4 现役几何(width 904/height 1278/contentWidth 760/contentInset{0,72,96,72})——**数值取自 client 真源,零改动**;
2. client `pageFramePrintScaleService.ts` 的 A4 preset 改吃 shared 值(纯来源改写,派生逻辑零动;Letter 维持现状不迁);
3. materializer 全套常量改吃 shared A4 值;PAGE_GAP/PAGE_X/PAGE_Y/BLOCK_GAP 保留 materializer 本地(排版参数非纸几何);
4. 对齐测试:server 侧断言 materializer 写出的 frame 宽高/inset 与 shared 值一致。

## 二 · 页对齐 1:1 硬映射(治内容-页错位)

病根:`buildProjectionLayout`(:153-216)溢出换页(条件③)让帧数>原页数且 frame↔原页多对一;`estimateBlockHeight`(:147-151)纯文本估算与真排版无关。

1. **每原页恰一帧**:重写换页逻辑——帧只随 `block.page_index` 变化而新开;⛔ 溢出分帧;
2. **帧高允许生长**:某原页内容估算超标准高时,该帧 height=内容所需高(frame 几何逐帧持久化,异形页机制现成——B1c Web 长页同族先例);标准高为下限;
3. **frameId 改原页性**:`source-page-${source_page_index}`(此前=顺位 index,溢出分帧后指向漂移);`page_frame_extensions` 的 source_page_index 自此每帧唯一;
4. page_index 为 null 的 flow 块归入前一帧尾(无前帧则首帧);
5. **坐标契约**:先确认目标库 `database_meta` 契约值(13.2 后应为 v2)并在 Result 申报;v2 分支写 page_frame_local(x=0 起,y 从 inset.top 起),v1 防御分支保留零动。

## 三 · 页眉页脚渣剥离(native-pdf 启发式)

native-pdf 无 bbox,用重复模式识别,**保真⛔丢数据**:

1. 判据(两条任一):①归一化(trim+压缩空白)后同一行文本出现在 ≥max(3, ⌈页数×0.6⌉) 个页的页首/页尾两块内;②纯页码模式(`^\d{1,4}$`、`Page \d+ of \d+`、`第\d+页` 等,允许前后缀少量装饰字符);
2. 命中行⛔入正文块;**原文存底**:写入该帧 `page_frame_extensions.typography_json.source_page_furniture`(数组,含原文与判中规则)——剥离留收据;
3. 只在 native-pdf 路径生效;MinerU/markdown 路径零动;
4. 误判防线:单页文档零剥离;判据阈值写成常量+注释。

## 四 · heading 落库尊重(白捡件)

病根:`publishSourceProjection` :468 把 block_type 硬编码 'paragraph'、title 硬编码 NULL,即使 artifact 带 `writing_role:'heading'`(MinerU/markdown 路径会带)也被抹平。

修:block_type 尊重 artifact writing_role('heading'→'heading',validators 枚举已含);heading 块 title 列写其文本。native-pdf 无 heading 属实,机器先就位。

## 五 · 封面门面

`sourceProjectionMaterializer.ts:337-361`:

1. title=display_name **去扩展名**(仅去末位 .pdf/.md 等已知后缀;重名序号 ` (n)` 保留);
2. description(现硬编码 NULL :342)=`源文档 · ${页数} 页 · 导入于 ${YYYY-MM-DD}`(页数取 artifact.metadata.page_count,缺省取帧数);
3. 铸造期写入不受 sourceProjectionPolicy 只读闸限制(该闸管的是事后人改),确认零冲突即可。

## 六 · 重投影 v1(replace 语义+快照收据;架构裁定"原件恒在,投影可幂等重铸"的第一块地基)

**射程收紧(HQ 裁定,⛔越界)**:v1=整体替换,⛔新旧投影版本并存,⛔批注锚迁移(那是后续专项);安全线=快照收据+知情确认+外部引用拒绝。

1. **新迁移**(编号顺接现役):`source_reprojection_receipts(id, source_record_id, old_note_id, user_work_json, annotation_snapshot_json, created_at)`——append-only 收据表;
2. **API**:`POST /api/sources/:id/rematerialize`。无 `confirm:true` 时:只返回 `getProjectionUserWork`(`courseLifecycle.ts:54-114`)六类计数,零执行;带 confirm 才动工;
3. **external_block_placement_count > 0 ⇒ 409 `reprojection_blocked_external_refs`**(投影块被别的 note/board 引用时拒绝,⛔留孤儿块——v1 保守);
4. **同一事务**:dump 批注快照(annotation_truths+annotation_ranges 全行 JSON)+user_work 计数入收据表 → `UPDATE source_materializations SET status='publishing', projection_note_id=NULL`(与 045:90-93 CHECK 相容,⛔改 schema CHECK/UNIQUE)→ DELETE 旧投影 note(CASCADE 清带,快照已留)→ 走修后管线重铸 → 置回 materialized+新 note id;
5. **确定性 id**(为将来锚迁移打地基):新投影的 blockId/frameId 由 (source_file_id, artifact_block_id / source_page_index) 确定性派生(如 uuidv5 或 sha 截断),⛔ uuidv4——同源同件重投影两次 id 相同;
6. **UI**:Sources 页对 Ready 源加「重新投影」入口:确认框列 user_work 六类数字+"批注将被移除(已留快照收据)"文案;执行后刷新;外部引用被拒时给可读提示;
7. **并发防线**:parsing/publishing 中的源拒绝重投影(既有 claim 语义);`sweepOrphanSourceProjectionAssets`(:710-741)的 10 分钟窗口与重投影事务时长复核申报。

## 七 · 禁区

⛔动 MinerU/parser 选择与 COINCIDES_PDF_PARSER;⛔改 source_materializations 的 CHECK/UNIQUE;⛔批注锚迁移;⛔投影版本并存;⛔动 sourceProjectionPolicy 只读闸;⛔安全类测试;⛔碰 .git;⛔commit;⛔读 .env key 值;⛔用户库接触(全部隔离库/合成 artifact 复现)。

## 八 · 验收

1. typecheck+build 绿(shared/client/server);
2. 定向新增:①页对齐(合成 5 页 artifact→恰 5 帧,page N 块全在 frame N,超高页帧生长)②常量对齐断言③渣剥离(命中/不命中/单页零剥离/收据在 typography_json)④heading 落库⑤封面(去后缀/description)⑥重投影(无 confirm 只读计数/快照收据落表/批注清除/新 note 确定性 id/二次重投影 id 稳定/外部引用 409);既有 `v13CoordinateContract` 族回归绿;
3. **client 全库必跑**(动了 shared 与 pageFramePrintScaleService)+server 定向族+受影响秒级静态门;
4. 冒烟(隔离库+真浏览器):合成多页 PDF 导入→投影页数=原页数、无左切(块住 760 列)、封面题名无后缀带 description→重投影跑通且页貌一致;
5. 证据落 `docs/audits/2026-09-12-srcproj-builder/`(⛔构建产物)。

## 九 · 申报义务

Result 必含:交付清单+numstat、database_meta 契约值实测、六节逐节完成态、存量投影影响申报(旧投影不动,修复只惠新铸+重投影——如实写)、测试数字、未做项。冲突停线举证⛔自作主张。

## Result

**2026-09-12 · codex builder · 部分交付，冲突停线，未完成验收；header 保持 ready，不翻 done。**

### 停线证据与待裁定

1. §一要求 materializer 消费 shared 运行时几何值；现役 `scripts/check-server-shared-runtime-import.mjs:104–119` 明确只允许产品代码 `import type`，其余 shared import 均 FAIL（测试目录独立豁免）。`server/tsconfig.json` 的输出边界也要求解决 dev/prod 的实际模块路径。已向 Henry 提出仅为 pageGeometry 建立经过构建验证的运行时接线及精确白名单的裁定请求，**未收到答复，未改门、未用动态 import 或生成镜像绕门**。server 几何私值保持原状；shared 真源及 client A4 接线已写入。
2. 真浏览器已通过合成账号进入隔离 Sources 页面，但上传本次合成五页 PDF 时，浏览器自动审批拒绝，理由为用户拒绝该操作。已停上传，未改走 API/CDP/另一浏览器绕过。完整「导入→页貌→重投影→页貌一致」冒烟未完成。恢复需该具体隔离上传操作获得允许。

### 六节逐节状态

| 节 | 状态 | 现物及边界 |
|---|---|---|
| 一 几何统一 | **部分完成 / 停线** | 新增 `shared/types/pageGeometry.ts`，A4 904×1278、contentWidth 760、inset `{top:0,right:72,bottom:96,left:72}`；client A4 改读 shared，Letter 和派生算法不改。server shared 接线待上述裁定，所以横向修复尚不能申报完成。 |
| 二 页对齐 | **布局实现完成，几何联验待解锁** | 按原页建一帧，空页及仅 furniture 页保留；超高页增长，后页位置累加真实帧高；null flow 归原始顺序中的前页，无前页归首帧。frame ID 为 `source-<source_file_id 派生 UUIDv5>:source-page-N`，末段保留原页性，命名空间满足不同 Source 不碰撞。两个坐标 resolver 的 v1 防御分支零改；v2 为内容区局部坐标，待 A4 top=0 接入后与目标契约联验。 |
| 三 页渣剥离 | **实现及定向验证完成** | 仅 native-pdf；独立页计数达到 max(3,ceil(0.6×页数)) 且位于前/后两块的重复行，或纯页码行；阈值有常量及注释。原文、artifact block ID、行号、判中规则落 `typography_json.source_page_furniture`；单页零剥离；MinerU/markdown 原样保留。 |
| 四 heading | **实现及定向验证完成** | artifact heading 写 `note_blocks.block_type='heading'`，title 写文本，正文 TextFlow 写作角色保留。 |
| 五 封面 | **实现及定向验证完成** | 仅剥已知末位后缀，保留 `(n)`；description 按指定中文格式生成，优先 artifact page_count，缺省帧数；日期读 Source 原始 created_at，重投影不伪造导入日。铸造直写不经过事后人改只读闸，该闸零修改。 |
| 六 重投影 v1 | **实现及定向验证完成，浏览器联验未完成** | migration 069 追加六列收据表及 append-only triggers；历史 ID 不挂删除/改写 FK。POST 无 literal confirm:true 只返回六类计数；确认后重读引用、同一 immediate 事务留全行全状态批注快照→publishing/NULL→删旧 note 和其独立旧块→重铸→materialized。UUIDv5 块/帧身份同源同件稳定，note 是新 UUID。外部 note placement、canvas mount、board range、board note/group member、legacy board soul 均计入拒绝。Sources Ready 行及详情入口、六计数确认框、中英提示、执行刷新和可读409均已落。无版本并存、无批注迁移。 |

### database_meta 实测、存量与并发/资产申报

- 本次唯一目标是新建隔离库：migration 056 后 `database_meta=[]`，`readCoordinateContract` 默认 **v1**；只对该隔离库显式插入 `coordinate_contract=v2`，SQL 与服务读回均为 **v2**。证据：`docs/audits/2026-09-12-srcproj-builder/database-meta-setup.json`。**未查询用户库，不能声称用户库实测为 v2。** 定向测试也各自使用内存库并显式设 v2；既有 v1 读分支另测。
- **存量投影不动**：没有批量更新、迁移旧 frame/块或用户库操作。修复只作用于新铸及显式确认的重投影；目前 server 几何接线未完，所以这项修复尚未生效。B1e 已交付现物作为起点，未改其 Layout/墙编辑/皮肤行为。
- `parsing`/`publishing` 拒绝重投影；异步解析时保留旧 materialized 投影，进程内重复请求拒绝，写事务重新比对旧 note ID，另一连接先替换则拒绝；解析期间新增外部引用也会在事务内被查出。解析在事务外，删除和所有新写在一个同步 immediate 事务内。
- `sweepOrphanSourceProjectionAssets` 的 **600000ms 窗口零改**。合成带批注重投影整次调用（含解析及事务）实测 **3.25ms**，仅代表该合成规模，不宣称任意文档上限。图片复用原固定 asset 行及文件、事务内更新 origin_note_id；解析期与其他连接看到的已提交状态均仍有引用，不依赖窗口“碰运气”。定向测试在重投影后把 sweep 时钟推进 20 分钟，删除数仍为 0，图片字节不变。
- 同秒重投影的当前 operation batch 读取改沿新 note 的 operation_batch_id，避免 UUID 排序误取历史批次；原始 parser 选择、COINCIDES_PDF_PARSER、materialization CHECK/UNIQUE、Source 只读 policy 均未改。

### 交付清单与 numstat

- 几何：`shared/types/pageGeometry.ts`；`client/src/pages/Notes/canvasEngine/pageFramePrintScaleService.ts`。
- 投影链：`server/src/services/sourceProjectionMaterializer.ts`、`sourcePageFurniture.ts`。
- 重投影：`server/src/db/migrations/069_v13_source_reprojection_receipts.ts`；`server/src/services/sourceReprojection.ts`、`courseLifecycle.ts`、`sourceMaterialization.ts`；`server/src/routes/sources.ts`。
- Sources UI/API：`client/src/pages/Sources/{sourceApi.ts,SourceLibrary.tsx,SourceList.tsx,SourceDetailDialog.tsx,SourceLibrary.module.css,SourceReprojectionDialog.tsx}`；en/zh locale。
- 测试：`v13SourceProjectionRepair.test.ts`、`v13SourceReprojection.test.ts`、`v13CoordinateContract.test.ts`、`SourceReprojectionDialog.test.tsx`。
- 文档：本 Result；受 migration 069 影响而重新生成的 `docs/generated/object-inventory.md`；证据目录 `docs/audits/2026-09-12-srcproj-builder/`（测试日志/JSON/Markdown，不含构建产物、数据库或 PDF）。
- **逐文件 numstat**：产品/测试/生成清单/本 Result 共 **23 文件，+1589 / −91 行**；见同证据目录 `numstat.md` / `numstat.json`。统计基线为本次开工读取的工作树文本快照，按行 LCS 计算 `+/-`，明确不是 Git HEAD diff；没有调用 Git 或读取 `.git`。证据文件作为新增文件单列。

### 验证数字与未做项

| 验证 | 结果 |
|---|---|
| Client 全库收集 | **145 文件 / 1547 项**；144 文件、**1543 项 PASS**；凭据族 1 文件/4 项实际 skip；0 fail、0 unhandled。跳过状态已读 Vitest 结果树核验，不冒称无过滤全绿。 |
| 新 Sources UI 定向 | **9/9 PASS**，已含于全库，不重复累加。 |
| 新投影 + 新重投影 + 既有坐标族 | **23 项：20 PASS / 3 FAIL**；3 项均为 shared server 接线停线导致（A4 对齐 1、坐标联验 2）。保留红灯，不降预期。 |
| 新重投影独立复跑 | **8/8 PASS**，包含全状态全行快照、note/批注/旧块清除、稳定ID、当前batch、故障回滚、note/board拒绝、并发与late引用、图片复用、HTTP确认门；已含于上行。 |
| 既有 materialization 非安全白名单 | **9/9 PASS**；该文件另 2 项按安全禁令未执行，使用精确测试名白名单且核验实际输出。 |
| Manifest 序列化测试 | **10/10 PASS**。 |
| Shared/client/server typecheck + build | **PASS**；Vite envFile:false，输出留正常构建目录，不入 audit。 |
| 受影响静态/模型门 | **PASS**；canvas boundary 168 项、model 60 组、performance 5 场景；完整命令和日志见 `verification.md`。 |
| docs:check | 首轮 inventory 过期；重新生成与收据表对应事实清单后 **PASS**，保留首轮失败日志。 |
| 真浏览器五页 PDF 导入与重投影 | **未完成：上传审批拒绝**。只完成隔离登录及进入 Sources，不宣称页数、760列无左切或前后页貌已获浏览器验证。 |

未做：共享几何 server 运行时接线及其 3 项通过；浏览器完整上传冒烟；所有安全类测试；原样 `npm run verify:v2-bn8-runtime` 聚合（含 Git/密钥扫描及安全语义套件，与本单禁令冲突，已拆可执行子项）；`git diff --check`、changed-file secret scan、registry/parity 安全语义测试、4 项 client 凭据测试。**零 commit、零 `.git` 接触、零用户库接触、零 `.env` key 值读取。** 工单必须在两项阻塞解除并补齐验收后，才可翻完成。

---

## 补遗一(HQ 裁定,2026-09-12 施工夜二轮)

两处停线均举证成立,裁定如下:

### 裁一 · server 几何接线:⛔动静态门,改走"镜像+机械对齐"

§一.3 原文有疏漏——`check-server-shared-runtime-import.mjs` 禁 server 产品代码运行时 import shared 是现役机械闸,**零弱化零白名单**。改为:

1. materializer 的几何常量=**本地镜像值**(904/1278/760/inset{0,72,96,72}),注释明示"镜像自 shared/types/pageGeometry.ts,⛔手改,对齐由测试强制";
2. server 测试(测试目录豁免运行时 import)**import shared 真源逐字段断言镜像一致**——数值漂移即红,真相仍一份;
3. shared/types/pageGeometry.ts 与 client 接线保持已交付现物;§一.4 对齐测试即上述断言。

### 裁二 · 冒烟通道:上传走 API 直传,浏览器验页貌

上传动作不是被验对象。隔离冒烟改为:合成五页 PDF 经 `POST /api/sources`(node/curl 直传隔离 server)导入并 materialize;**真浏览器只做验证段**:①投影页数=原页数;②无左切(块住 760 列,frame 904 宽);③封面题名无后缀+description 在;④重投影(经 API confirm)后页貌一致+确定性 id 复核。⛔再尝试浏览器 UI 上传。

### 二轮范围

裁一接线+server 定向 3 红转绿+裁二冒烟补齐+Result 更新(含最终测试数字);其余六节交付现物零动。完成后 status 翻 done。

## Result · 补遗一二轮执行（2026-09-12，codex builder）

**裁一完成，server 原 3 红全部转绿；裁二 API→真浏览器→两次重投影已实际跑完，但发现新的浏览器页对齐阻塞。header 保持 ready，不冒领 done。** 上一份 Result 是首轮历史收据，以下是二轮最新结果；首轮两处停线已按补遗解除，当前停线原因已不同。

### 交付与六节状态

- **唯一产品变更**：`server/src/services/sourceProjectionMaterializer.ts` A4 本地镜像改为 904/1278/760/inset `{top:0,right:72,bottom:96,left:72}`，注释明示 shared 真源、禁止手改、测试逐字段强制对齐。PAGE_GAP/PAGE_X/PAGE_Y/BLOCK_GAP 不动。
- **唯一测试变更**：`server/src/__tests__/v13SourceProjectionRepair.test.ts` 保留测试侧 shared import，逐字段断言 frame 宽高、四个 inset 与 contentWidth；没有降低既有预期。
- **二轮产品/测试 numstat：2 文件，+14 / −6**（materializer +8/−5，测试 +6/−1）。按开工文本快照逐行 LCS 统计，非 Git diff；完整含本回执增量见 `docs/audits/2026-09-12-srcproj-builder/round2-numstat.json`。首轮 23 文件 +1589/−91 为当轮历史统计，不冒充二轮新增量。
- shared/client A4 接线、其余六节实现、静态门及白名单均零动。独立复核：**21 个列明保留文件**哈希与二轮基线一致，其中 **20 个首轮交付文件**也与首轮最终哈希一致；第 21 个是 shared-runtime-import 静态门。两件授权修改文件的基线/最终哈希均核验。此为明确交付集的边界证明，不宣称全库扫描。

| 节 | 二轮后状态 |
| --- | --- |
| 一 几何统一 | **完成**：按 HQ 镜像+机械对齐裁定落地，测试与门通过。 |
| 二 页对齐 | **服务端通过，浏览器验收阻塞**：SQL 实测 page N 块全在 frame N；客户端 hydration 失配导致正文落默认连续布局，详见下节。该客户端链本轮未改。 |
| 三 页渣剥离 | 现物零动；定向通过，合成 PDF 页眉页脚在 typography 收据保留、正文剥离。 |
| 四 heading | 现物零动；定向通过。 |
| 五 封面 | 现物零动；浏览器前后均显示无后缀题名及指定 description。 |
| 六 重投影 v1 | 现物零动；8/8 定向通过，隔离真实 HTTP 两次确认替换成功，稳定 ID/收据/新 note 均验证；整体浏览器放行仍受页对齐缺陷阻塞。 |

### 裁二冒烟与新停线证据

1. 全新隔离库 `.codex-tmp/srcproj-13-6/smoke-run-wkxsqo/synthetic-smoke.db`，非用户库副本。初始 `database_meta=[]`/默认 v1；seed 仅对该库显式置 v2，后续 SQL 快照读回 **v2**。**没有查询用户库，不能申报用户库契约值。**
2. 合成五页 PDF 经现役 **`POST /api/sources/upload`** 上传（201）并 `/materialize`（202）铸造；补遗简写 `/api/sources`，实际路由据现物执行，路由零修改。未再尝试浏览器 UI 上传。
3. SQL：**5 帧 / 5 块**，帧 904×1278、内容列 760、四 inset 对齐，页块一一对应。Chrome：Overview **5** 个帧入口；普通阅读块均住 760 列、左右边界等于内容列，无正文左切；封面 `Projection Alignment (2)`，description `源文档 · 5 页 · 导入于 2026-09-12`。
4. 无 confirm 预览六类计数全为 0，note ID 不变；两次 API `confirm:true` 各生成新 note，共两份快照收据。初次/一次/二次投影的全部 frame 行及选定 block 行深比较一致，块/帧 ID 稳定；旧 note 已清。第一轮真实 HTTP 重投影 **16.96ms**，只代表本合成样本。
5. **新阻塞**：浏览器五页正文全部连续出现在首帧，DOM top=`0/276/552/828/1104`，总览第 2–5 帧为空；点击 `Read page 3` 到空白区。重投影前后同样复现。Preview Boundary seed 显示 Primary frame 1 有 5 块、其余 4 帧均 0。**帧数相同、重投影前后页貌相同，不等于原页对齐验收通过。**
6. 只读定因：`/notes/:id/blocks` 的 `placement_id` 为裸 UUID，而 canvas `blockLayouts[].placement_id` 为 `canvas-placement:<UUID>`；`canvasObjectRepository.ts` 按前者查后者，**5/5 失配**，于是未 hydrate `canvas_layout` 并落默认连续布局。SQL 中的 frame_id 完整正确。证据 `round2-browser-hydration-api.json`、`round2-browser-finding.md`。
7. 按本轮“**其余六节交付现物零动**”以及原单“**冲突停线举证⛔自作主张**”，未改客户端 hydration/默认布局，也未用手工改隔离库绕过。此缺陷需 HQ 追加最小修单后再验，故不满足“完成后翻 done”的前提。

### 最终验证数字、存量与未做项

| 验证 | 结果与来源 |
| --- | --- |
| Server 三族（二轮亲跑） | **23/23 PASS，0 fail / 0 skip**：投影修复 10、重投影 8、坐标契约 5；首轮 3 FAIL 全部转绿。 |
| Server typecheck + build（二轮亲跑） | **PASS**。 |
| 受影响静态/模型组（二轮亲跑） | **13 阶段 PASS**，含 runtime-import 233 产品文件/0违规/7 type-only、canvas 168、model 60、performance 5 场景、docs:check。 |
| Client 全库（沿用首轮，二轮 client/shared 零动） | **145 文件 / 1547 项收集，1543 PASS，4 凭据项显式 skip**；不是二轮重跑，不冒称无过滤全绿。 |
| Shared/client typecheck + build（沿用首轮） | **PASS**；本轮未改相关现物。 |
| 首轮其余定向（沿用，不重复累加） | materialization 非安全精确测试名集合 **9/9**；manifest **10/10**；Sources UI **9/9** 已含 client 全库。 |
| 隔离 API + 浏览器 | API/宽度/封面/稳定 ID/重投影一致性通过；**原页→浏览器页对齐 FAIL**，不是未执行。三组前后截图逐字节相同，反而确认错误页分布也稳定复现。 |

- **存量投影零操作**：只新铸/重投影本轮合成 Source，未接触用户库。几何修复已可惠及后续新铸和显式重投影；不会追改旧投影。客户端页定位缺陷另待修。
- 并发、事务、资产 sweep 仍为首轮现物，**600000ms 窗口零动**；首轮解析/事务/图片复用测试仍有效，本轮 8 项重投影回归复跑通过。未声称任意规模耗时上限。
- 证据落 `docs/audits/2026-09-12-srcproj-builder/round2-*`，含 `round2-verification/` 的测试日志、API/SQL/DOM JSON、真实截图、边界哈希、冒烟说明；不含构建产物、PDF 或数据库。专用标签页已关闭，任务进程/端口关闭见 `round2-smoke-shutdown.json`。
- 未做：超范围的客户端 hydration 修复及其回归、所有安全类测试、原样 runtime 聚合（含 Git/密钥扫描/安全语义分支，与禁令冲突）、Git diff/secret scan、凭据 4 项、用户主观验收。**零 commit、零 `.git` 接触、零用户库接触、零 `.env` key 值读取。**

---

## 补遗二(HQ 裁定,2026-09-12 施工夜三轮:placement id 同形修)

二轮浏览器阻塞(五页挤首帧)根因收账:`note_block_placements` 侧 placement_id(裸 UUID)与 `canvas_placements` 侧(`canvas-placement:<UUID>` 前缀形)失配,hydration 查不到 canvas_layout 落默认连续布局。

**HQ 判断**:现役真机上旧 materializer 铸的投影(33 页 IELTS)分页 hydration 是通的——强烈指向失配为**本单确定性 id 改动引入的形状回归**(两表 id 的对应关系被派生逻辑写岔),而非现役缺陷。

### 三轮指令

1. **先取证**:对照 git 历史中旧 materializer(HEAD 现役版)两表 id 的写入形状与对应关系,确认现役契约(哪张表带前缀、client 按什么键匹配);
2. **分支 A(预期)**:新铸造的确定性 id 恢复与现役**同形**——对应关系照旧,只把随机换确定;⛔改 client hydration/canvasObjectRepository/契约面;
3. **分支 B(若取证证明现役同样失配)**:停线举证(SQL+现役形状对照),⛔修,交 HQ 另裁;
4. 修后:server 定向复绿+浏览器复验(五页各住其帧、Read page 3 到位、重投影后同验)+确定性 id 复核(二次重投影 id 稳定)仍成立;
5. Result 更新;全部通过后 status 翻 done。

射程=materializer id 派生;其余现物零动。禁区照旧。

## Result · 补遗二三轮取证（2026-09-12，codex builder）

**分支 B：现役 HEAD 同样存在两表 placement ID 失配。按补遗二第 3 步停线举证，未修代码；header 保持 ready，不翻 done。** HQ 所述“确定性 ID 改动引入形状回归”的预期，与本轮 HEAD/工作树取证不符。以下仅追加本轮事实，不回改前两轮收据。

### 1. 现役与当前形状对照

取证 HEAD：`73eb8627abf083f77d60c77ca56cab5ea599382b`；HEAD 中最后修改 materializer 的提交为 `9d512bfda14bb4ff878398b9dd7a928cf97b4b67`（2026-09-08，`feat(coords): dual coordinate contract v1/v2 (13.2 s4a)`）。Git 仅运行只读 `show/log`，无 Git 写操作。

| 链路 | HEAD 现役版 | 三轮开工工作树 |
| --- | --- | --- |
| note placement 派生 | materializer L192：`notePlacementId = uuidv4()` | L211：仍为 `uuidv4()`，不是确定性 ID |
| canvas placement 派生 | L199：`canvas-placement:${notePlacementId}` | L218：同一前缀及同一 notePlacementId |
| 两表写入 | L514–515 写 `note_block_placements.id = block.notePlacementId`；L557–558 写 `canvas_placements.id = block.canvasPlacementId` | L549–550 / L592–593：对应关系相同 |
| blocks API | `server/src/services/notes.ts` L151–153：`nbp.id AS placement_id` | 相同，返回裸 UUID |
| canvas API | `server/src/services/canvasObjects.ts` L1747–1766 读取 `cp.*`；L1776–1779 将 `row.id` 原样写入 `blockLayouts[].placement_id` | 相同，返回带前缀 ID，没有剥前缀 |
| client hydration | `canvasObjectRepository.ts` L74–81：以 layout 的 placement_id 建 Map；block 有 placement_id 时仅精确查此键，未命中不会 fallback 到 block_id | 相同 |

**现物中确定性化的是 block/frame 身份，placement 的 UUIDv4 与两表前缀关系并未因本单改变。** 单纯“照旧同形、随机换确定”仍会留下裸值与前缀值的精确键失配。更改其中一表的对应规则已不能申报为恢复 HEAD 同形，故本轮不实施分支 A，也不改 client/DTO/契约。

### 2. SQL 实证与射程

- 仅以 `better-sqlite3` 的 `{readonly:true, fileMustExist:true}` 重读二轮已记录的**合成隔离库** `.codex-tmp/srcproj-13-6/smoke-run-wkxsqo/synthetic-smoke.db`。仅执行列明的 SELECT，不启动应用、不初始化数据库、不新铸或重投影。库文件读取前后 SHA-256 一致。
- 对象为合成 `Projection Alignment (2).pdf`，Source `d2ef33a3-8964-44b8-8c7c-a26b62197e23`，当前 note `f1da6fbd-c389-453f-9c91-c2adf926e054`；`database_meta.coordinate_contract = v2`，5 帧、5 个块 placement。
- 通过 `note_block_placements → content_mounts → canvas_placements` 按同 note / 同 block 关联：**精确 ID 相等 0/5；`canvas_placements.id = 'canvas-placement:' || note_block_placements.id` 为 5/5**。五个 note placement 全为 UUIDv4。示例：`96aea1d0-b2ae-4917-b59e-b2f24354dc8b` 对 `canvas-placement:96aea1d0-b2ae-4917-b59e-b2f24354dc8b`，原页 1、frame 末段 `source-page-1`。
- SQL 当前 note 与五个 placement ID 同二轮 `round2-browser-hydration-api.json` 一致；该二轮浏览器证据的 5/5 hydration 未命中与本轮只读 SQL 相互对应。**本轮 SQL 不是 HEAD 新铸造实跑**；HEAD 结论来自完整派生/写表/DTO/客户端链的只读源码对照。
- **未接触 33 页 IELTS 用户投影或任何用户库**，因此不能解释其历史写入路径或反证 HQ 报告的真机现象。可交 HQ 的确定事实是：所指定 HEAD 旧 materializer 与当前工作树在这两表的 ID 形状上相同，读取链不会将二者变成相等键。

### 3. 五步执行状态与验证申报

| 补遗二步骤 | 本轮结果 |
| --- | --- |
| 1 先取证 | 完成：HEAD/当前派生、两表写入、两侧 DTO、client 精确匹配及隔离 SQL，另经独立只读 agent 复核。 |
| 2 分支 A | 未进入；“确定性改动导致 ID 形状回归”前提不成立。 |
| 3 分支 B | **触发并执行：停线、零修复、留证，交 HQ 另裁。** |
| 4 修后验收 | 未进入，因第 3 步明确禁止修复。本轮未重跑 server 定向、浏览器五页/Read page 3、两次重投影及稳定 ID 检查；不把前两轮数字冒称本轮通过。 |
| 5 Result/status | 本 Result 已追加；未满足全过条件，仍为 `ready`。 |

六节现物均零修改：一几何、三页渣、四 heading、五封面保持二轮完成态；二页对齐仍为服务端通过/浏览器阻塞；六重投影保持二轮服务端及隔离 API 证据，整体浏览器验收仍受同一缺陷阻塞。二轮 server **23/23 PASS**、typecheck/build/静态门与首轮 client **1543 PASS / 4 skip** 仅为历史结果，本轮新增测试执行数 **0**，新增浏览器执行数 **0**。

### 4. 交付、边界与未做项

- **产品/测试变更：0 文件，+0 / −0**。materializer、client hydration、契约及其他产品现物均未编辑；存量投影和用户库零操作，没有新修复生效可申报。
- 追加本 Result；新证据为 `docs/audits/2026-09-12-srcproj-builder/round3-placement-id-evidence.json`（含完整只读 SQL、五行 ID、Git 命令、源码哈希及边界）、`round3-source-excerpts.md`（HEAD/当前行号摘录）、`round3-numstat.json`（本轮文本增量与收尾哈希）。采集脚本及文本基线仅在 `.codex-tmp/srcproj-13-6/round3/`；audit 不含数据库、PDF 或构建产物。
- **明确范围的边界证明**：二轮 boundary 清单的 23 个产品/测试/静态门文件全部与二轮最终 SHA-256 一致；另对本轮四段读取链文件做开工/收尾哈希比对。此为点名文件范围，非全库扫描。
- 未做：分支 A 修复、所有修后验收、原样 `npm run verify:v2-bn8-runtime` 聚合、所有安全类测试、Git diff/secret scan、用户主观验收。**零 commit、零 Git 写操作、零 `.env` key 值读取、零用户库接触**。依用户本轮明确授权仅以 `git show/log` 读取历史，不能再沿用前轮“零 `.git` 接触”的表述。

---

## 补遗三(HQ 裁定,2026-09-12 施工夜四轮:hydration 匹配归一最小修)

三轮分支 B 取证收账:裸 UUID(note_block_placements)/前缀形(canvas_placements)失配为**现役既有形状**,HEAD 同形,0/5 精确匹配——非本单回归。HQ 改判:此即真机源投影"内容与帧脱钩、跨页连排装错货"病理(A 层)的最后一块根因——v2 契约下 hydration 断链落默认连续布局,与 IELTS 33 页实勘现象吻合。**准许最小 client 修**。

### 四轮指令

1. **先勘匹配链**:canvasObjectRepository 该匹配键的全部消费点(读匹配与写回两向),列清单入 Result;
2. **最小修=读匹配归一化**:匹配时对两种形状归一(裸 UUID ↔ `canvas-placement:<UUID>` 前缀互认),**只修读匹配**;写回路径的 id 形状零动(墙 clamp/layout_updates 等写口维持现役形状);⛔改 API 输出形状⛔改 materializer id 写入⛔改两表 schema;
3. 定向:归一匹配单测(两形状都命中/无关 id 不误配)+受影响族回归(canvasObjectRepository/placement 消费者)+client 全库;
4. 浏览器复验:五页各住其帧、Read page 3 到位、重投影后同验、确定性 id 复核;
5. **存量申报**:此修生效后,存量 v2 投影(含真机 IELTS)在不重投影的前提下 hydration 是否即刻受惠(读侧修=应当即惠存量),Result 里以隔离库旧形状数据实证并申报;
6. Result 更新;全过翻 done。

射程=client 读匹配单点+测试;禁区照旧。
