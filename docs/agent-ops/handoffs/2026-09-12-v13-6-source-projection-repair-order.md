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
