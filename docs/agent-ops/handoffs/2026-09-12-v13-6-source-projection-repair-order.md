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
