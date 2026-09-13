> **状态 (Status)**: done(二轮施工+HQ 装依赖/全量/真浏览器冒烟补齐+一处冒泡缺陷点修;收口见末尾)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-13
> **单号**: V14 之交批 · 单4 · 卡面封面 v1(上传+取景框+卡面显示)
> **上游**: `analysis/2026-09-13-appearance-benchmark-survey.md` §三(**交互规格权威**,含 react-easy-crop 选型)+`design/note-page-design.md` §装订面(封面图=装订件 cover 槽,资产引用+card/page 两取景框,非破坏)+排期裁定(Henry 09-12:卡面封面 v1=上传+取景框+卡面显示;page 框与封面页呈现档随 V14 真封面页批,⛔本单)

# 单4 · 卡面封面 v1

**性质**:笔记的门面。封面图=**装订件**,住 cover 槽(值=资产引用+按用途取景框参数集);本单只落 **card 框**(卡面固定比例)三件事:上传、取景、卡面显示。**非破坏铁律**:原图资产恒存恒不改,槽只存 {assetId, card 框百分比参数};渲染由参数推。

## 一 · 存储与契约

1. **cover 槽**:住 `notes.metadata.binding.cover`(notes.metadata 为既有 JSON 列,**零迁移**);shape=`{ assetId: string, card: { crop 百分比参数(x/y/width/height 或 react-easy-crop 的等价百分比集), zoom: number } }`;shared 类型落 `shared/types/` 新文件或就近既有文件,server 若有 metadata 校验面同步(照 B1e 五键台账先例申报校验点);
2. **资产=既有 canvas asset 管线**:上传走既有 `POST /api/canvas-assets/images`(multer 管线复用),显示走既有 `GET /api/canvas-assets/:assetId/blob`;⛔新存储域⛔新上传路由;metadata.source 标 `note_cover_upload` 以别于画布图;
3. **Remove 语义**:清槽(binding.cover 置空)⛔删资产——资产走既有 canvas asset 生命周期,⛔本单造回收逻辑;
4. **page 框⛔本单**:shape 预留 `page` 键位即可(⛔实现)。

## 二 · 取景器(范式 A 定框动图,弹窗式)

1. **选型**:`react-easy-crop`(新依赖,允许安装,锁 package-lock)——报告 §三.9 条款一一对应:cover 下限/restrictPosition/wheel+pinch+受控 zoom/百分比保存;
2. **形态**:弹窗式(Twitter/LinkedIn 谱系——卡面小,弹窗放大编辑);框固定=卡面输出比例(从现有笔记卡 CSS 实际比例取,申报取值),用户拖图/缩图,⛔框拖柄⛔比例切换;
3. **几何**:初始=cover 适配居中,zoom=1=cover fit 即**缩放下限**——任何状态框内⛔露底;拖动越界 clamp 碰墙即停;
4. **手势**:可见滑杆+滚轮双通道(滚轮以指针为锚);触屏捏合有 react-easy-crop 自带,⛔额外造;
5. **确认**:显式 Save/Cancel 双键⛔自动提交(破坏性才配确认之外的另一例外:取景是参数提交,双键是社交谱系照抄);
6. **再编辑入口与上传同批(硬条款,报告 §三.4)**:卡面悬停浮条「重新取景」+「更换封面」+「移除」——它就是非破坏存储的用户可见面;再编辑打开取景器时**回放已存参数**(⛔从头来)。

## 三 · 上传与更换弹层

1. v1 弹层=**上传一档**(文件选择/拖放);Notion 三 tab 骨架(出厂库/链接)**留位注记⛔实装**⛔造出厂封面库;
2. 上传成功→直接进取景器(定框动图)→Save 落槽;
3. Remove 恒右上(报告 §三.8)。

## 四 · 卡面显示

1. **聚合投影读槽**:笔记卡(项目详情页 Notes 列表的卡)读 `metadata.binding.cover`,按 card 框参数渲染封面;**⛔推断"首个媒体块"⛔任何回退猜测**——无槽=现状卡面零变;
2. 封面入口:卡面悬停浮条(§二.6);无封面的卡悬停给「添加封面」;
3. 其他卡面(Boards/Group 等)⛔本单。

## 五 · 台账义务(常备条款)

预期新增挂载期请求=卡面封面 blob GET(仅有槽的卡);渲染笔记卡的既有测试场景若因 cover 读取出新请求,全夹具台账普查显式登记或 mock;client **全库必跑**。

## 六 · 禁区

⛔page 框/封面页呈现;⛔动页眉/页码等其他装订件;⛔动皮契约与 token 词汇;⛔出厂封面库;⛔新存储域/新上传路由;⛔Agent 面;⛔安全类测试;⛔碰 .git;⛔commit;⛔读 .env key 值;⛔用户库接触;**新造凭据形合成值(口令/key/token/凭据用途的用户名邮箱)≤20 字符**——域数据字符串(标题/文件名等)不在射程,长度边界用例照跑;新依赖仅 react-easy-crop。

## 七 · 验收

1. typecheck+build 三端绿;`check:test-wiring`/`check:tech-debt-table` 绿;受影响静态门绿;
2. 定向新增:①槽存取往返(参数逐字回读;**原资产字节不变**断言)②几何(cover-fit 下限/clamp 碰墙/百分比换算,纯函数单测)③卡面投影读槽+无槽零变+⛔推断④Remove 清槽不删资产⑤再编辑回放已存参数;client 全库绿;server 受影响面绿;
3. 冒烟(隔离库+真浏览器,若沙箱浏览器仍不可用则申报留 HQ):上传→拖+缩放取景→Save→卡面即显→悬停浮条重新取景(参数回放)→改框 Save→卡面更新→Remove→卡面回落;
4. 证据落 `docs/audits/2026-09-13-card-cover-builder/`(⛔构建产物⛔原始日志目录,只留判据文件);git/secrets HQ 收口。

## 八 · 申报义务

Result 必含:交付清单+numstat(基于编辑前镜像)、cover 槽 shape 与校验点申报、card 框比例取值申报、react-easy-crop 版本、台账普查清单、测试数字、未做项(page 框/出厂库/链接 tab 等)。冲突停线举证⛔自作主张。

---

## 补遗一(HQ 裁定,2026-09-13 二轮)

裁:**card 取景框固定输出比例=2:1(宽:高)**。依据与口径:

1. 谱系=Notion 画廊卡封面横幅带(≈1.9:1,取整 2:1 便于几何与测试);报告 §三.1"多卡型比例=每型一个固定框"——笔记卡一型,一框,2:1;
2. 卡宽自适应与固定比例不冲突:卡面封面带用 CSS `aspect-ratio: 2 / 1` 满宽渲染,高度随卡宽变;取景框输出的是**百分比参数**,与渲染尺寸无关——这正是范式 A 的意义;
3. 封面带位置=卡顶满宽横幅(标题等现有内容下移,无封面的卡零变);
4. 工单"从现有卡 CSS 取比例"一句作废,以本补遗为准;比例常量落一处共享定义,几何测试围绕 2:1 写。

工单其余零变,续工。

---

## Result（二轮，2026-09-13；未完工，needs: HQ）

**本轮实现已落，但正式依赖安装受环境阻塞，未完工，header 保留 ready，不翻 done。** 这是实际在飞回执，不是完成/放行声明。

### 交付清单与镜像 numstat

编辑前镜像 `.codex-tmp/card-cover-round2-before/` 在本轮编辑前保存 1032 个限定路径文件。以下以行序列最短增删计算，统一 CRLF/LF；未用 git。源码/test/package wiring 统计如下，本工单追加回执和两个审计证据文件另列，不混入源码 numstat。

| + | - | 交付文件 |
|---:|---:|---|
| 14 | 39 | `client/src/pages/Courses/CourseDetail.tsx` |
| 123 | 0 | `client/src/pages/Courses/noteCover/NoteCoverEditor.module.css` |
| 130 | 0 | `client/src/pages/Courses/noteCover/NoteCoverEditor.test.tsx` |
| 155 | 0 | `client/src/pages/Courses/noteCover/NoteCoverEditor.tsx` |
| 100 | 0 | `client/src/pages/Courses/noteCover/ProjectNoteCard.module.css` |
| 153 | 0 | `client/src/pages/Courses/noteCover/ProjectNoteCard.test.tsx` |
| 203 | 0 | `client/src/pages/Courses/noteCover/ProjectNoteCard.tsx` |
| 92 | 0 | `client/src/pages/Courses/noteCover/geometry.test.ts` |
| 55 | 0 | `client/src/pages/Courses/noteCover/geometry.ts` |
| 17 | 0 | `client/src/pages/Courses/noteCover/repository.ts` |
| 2 | 0 | `client/src/pages/Notes/canvasEngine/canvasAssetRepository.ts` |
| 1 | 1 | `server/package.json` |
| 181 | 0 | `server/src/__tests__/v14CardCover.test.ts` |
| 1 | 1 | `server/src/routes/canvasAssets.ts` |
| 5 | 1 | `server/src/routes/notes.ts` |
| 30 | 3 | `server/src/services/canvasAssets.ts` |
| 28 | 0 | `server/src/services/noteCover.ts` |
| 3 | 2 | `server/src/validators/index.ts` |
| 29 | 0 | `server/src/validators/noteCover.ts` |
| 1 | 0 | `shared/types/index.ts` |
| 47 | 0 | `shared/types/noteCover.ts` |
| **1370** | **47** | **21 个源码/测试/编排文件** |

证据：[二轮验证及台账](../../audits/2026-09-13-card-cover-builder/round2-validation.md)、[numstat 及镜像/当前 SHA-256](../../audits/2026-09-13-card-cover-builder/round2-numstat.md)。一轮 stop-line.md 原文保留。

完整槽 shape：`notes.metadata.binding.cover = { assetId: string, card: { crop: { x, y, width, height }, zoom: number } }`；Remove 为 null；`page?: never` 只预留。

HQ 补遗的 2:1 已落实在 shared 唯一常量，原比例歧义已消除。本次剩余阻塞是依赖安装，不是比例设计问题。

### 环境阻塞

- 在 `client` 执行 `npm.cmd install react-easy-crop --save-exact --ignore-scripts --no-audit --no-fund`，npm 访问 `https://registry.npmjs.org/react-easy-crop` 返回 `EACCES`，exit 1。
- 仓库配置缓存 `npm-cache` 中 `npm.cmd cache ls react-easy-crop` 无条目；`client/node_modules/react-easy-crop/package.json` 不存在。系统另一缓存读取返回 `EPERM`；没有提权、改权限或绕过沙箱。
- **实际安装版本：无；client package.json 与 package-lock.json 均未成功写入该依赖。** 实现 API 参照官方源码的 **6.2.3**，这是目标版本，不是已安装/已锁定声明：[官方 package.json](https://raw.githubusercontent.com/ValentinH/react-easy-crop/main/package.json)。
- 需要 HQ 在可安装环境补齐正式依赖与锁文件，再续跑真实组件测试、client typecheck/build 和 client 全库。没有造替代包、声明文件或 mock 来冒充依赖安装。

### 已落源码

- `metadata.binding.cover` 类型、读槽 guard、POST/PUT runtime 校验、最新 metadata 合并保存；零迁移。
- 既有 multipart 上传携带 `source=note_cover_upload`；既有 blob GET。Remove 仅保存 `cover:null`。
- 既有资产引用计数纳入 cover；Note/Project 既有删除流程中的引用释放继续复用原机制。移除/替换封面本身均不触发资产释放。
- 项目 Notes 卡顶满宽横幅，取景与显示共享 `NOTE_CARD_COVER_ASPECT_RATIO=2`；图片宽高和偏移由百分比计算。
- 文件选择/拖放→取景→Save；重新取景、替换、移除浮条。无槽不读取图片、不推断首个媒体块。无封面卡原内容结构保留。
- 取景组件采用 react-easy-crop API，提供 cover fit、下限、clamp、滑杆、原生滚轮/捏合、Save/Cancel 和参数回放；**该真实组件尚未运行验证**。
- 保存后的 Notes 刷新不切全页 Loading；编辑会话图片绑定 draft.assetId；关闭弹层后恢复焦点。最后两项浏览器行为仍需实测。

### 校验点

| 点 | 当前行为 |
|---|---|
| shared `isNoteCover` / `readNoteCover` | 仅从 binding.cover 读，校验有限数值、面积、范围、zoom 下限；不补造默认封面 |
| server `noteCoverSchema` | x/y 为 0..100，width/height 为 (0,100]，x+width/y+height≤100（浮点容差 1e-6），zoom≥1；不取整；v1 不接受 page |
| create/update `noteMetadataSchema` | 原有开放 record 的 superRefine 委托 cover 校验，保留原 JSON Schema 与原始参数 |
| notes POST/PUT | 资产存在性走既有用户资产读取；binding 兄弟键合并保留 |
| canvas-assets POST images | source 标记分流，上传/存储/读取路由未新建 |
| 工具面 | manifest 检查 14 个 public 条目未过期；manifest 与 Agent 源码未修改 |

比例约束由客户端固定框输出保证。server 保存的是原图百分比范围；未新增图像处理、尺寸猜测或像素裁图。

### 测试结果

| 验证 | 结果 |
|---|---|
| 新几何纯函数 | 15/15 PASS |
| 新卡面/controller 集成 | 7/7 PASS，隔离 mock Editor，只证明卡面、上传与保存控制流 |
| 新真实 Editor suite | 已写 6 项；缺包导致无法收集，不计通过 |
| client 全库 | **失败**：160 文件通过、3 文件收集失败；已运行 1663 项全部通过 |
| 收集失败文件 | CourseDetail.test.tsx、NoteCoverEditor.test.tsx、NoteChromeLayer.test.tsx；共同原因：无法解析 react-easy-crop |
| client build/typecheck | **失败**：TS2307 缺 react-easy-crop 类型，以及该缺失导致的 3 个回调隐式 any；Vite build 未进入 |
| shared typecheck/build | PASS，`tsc -b ../shared/tsconfig.json` |
| server 新增 | v14CardCover.test.ts 4/4 PASS |
| server 受影响面 | v13MediaBlocks 11、v13NoteMetadata 7、v13PaperSkin 6，共 24/24 PASS；新旧合计 28/28 串行复跑通过 |
| server build/typecheck | PASS；manifest check → tsc → copy 完整通过 |
| check:test-wiring（最终） | 78 文件、78 wired、0 exempted、0 unwired，PASS |
| check:tech-debt-table | PASS；既有 TD-6/12/28 三项豁免未改 |
| canvas runtime / group gallery | 174 checks / 8 checks，PASS |
| groups rail / single editor / source experience | 全 PASS，source 静态与 model 均 PASS |
| legacy shutdown / relation freshness | 均 PASS |
| server-shared-runtime-import | 246 产品文件、0 违规、10 个允许类型导入，PASS |

新 server suite 使用新临时 SQLite 与新资产目录，包含数据库重开、列表逐字回读、原 blob 文件/HTTP 字节不变、资产 rows 不变、Remove 及共享引用生命周期断言。测试未启动用户应用或读取用户库。

client 验证全部使用空 `COINCIDES_VALIDATION_ENV_DIR`。ProvidersSection 既有四例为全 mocked 控件交互测试；没有运行权限绕过、secret scan、攻击或安全边界测试。没有运行 server test:v2 整套或总 verify:v2-bn8-runtime（后者含 git/secrets，留 HQ）。

### 挂载期请求与全夹具台账

| 场景 | 请求申报/处理 |
|---|---|
| CourseDetail.test.tsx 既有 5 例 | 夹具无 binding.cover；封面 blob GET=0；未增挂载期 mock；本次受缺包收集失败影响 |
| NoteChromeLayer.test.tsx 中项目 Trash 恢复流程 | 夹具无 binding.cover；封面 blob GET=0；本次受缺包收集失败影响 |
| DesignStudio.test.tsx | CourseDetail 显式 mock，不挂 Notes 卡 |
| ProjectNoteCard.test.tsx 新 7 例 | blob GET 明确 mock；有槽一次挂载 GET、无槽零 GET 有断言；URL 回收有断言 |
| 重新取景 | 用户触发后为 draft.assetId 单独 GET blob，保护编辑中外部换封面时的图像归属；不是无槽卡的挂载请求 |
| 上传后取景 | 用选中文件的临时 object URL；Save 后卡面才读正式 blob |
| Save/Remove | GET 最新 note metadata → PUT note → 仅刷新 Notes 列表；原资产不 DELETE |

其他 AppLayout/BoardPage 场景未实际挂载 ProjectNotesSection。Boards/Group 卡面源码未改。

### 未做与留 HQ

- 正式依赖安装与 package-lock 锁定；client 三个 suite 及全库全绿；实际取景组件 typecheck/build。
- **隔离库+真浏览器完整冒烟未执行。** CUA inventory 实测 apps=[]、browsers=[]；能找到浏览器可执行文件及 browser-harness，不等于浏览器不可用，也不等于已做冒烟。依赖缺失阻塞了应用验证，故本项明确留 HQ，未声称“浏览器已验证/不可用”。
- page 框/封面页、出厂封面库、链接 tab、其他装订件、皮/token 词汇、Agent 新入口均未实现。
- git/secrets 最终收口、主观放行留 HQ。全程零 git 命令、未碰 .git、未读 .env key、未碰用户库、未 commit。
- 新测试凭据用途合成值：`cover-user`（10）、`cover@example.test`（18）、`synthetic`（9）；均≤20。哈希、UUID、标题、文件名为域数据，不作凭据。

源码 numstat 见 `round2-numstat.md`：21 文件 +1370/-47，基于编辑前镜像。此目录仅判据文件；构建产物、镜像与临时日志均不放入审计目录。一轮 `stop-line.md` 原文保留。

---

## HQ 收口(fable,2026-09-13)

builder 二轮交付实质核验通过,留 HQ 三项全落:

1. **依赖装载**:`react-easy-crop@6.2.3` 入 client(builder 沙箱 EACCES 预料内);装后 client typecheck 0 错、**全库 163 文件 1694/1694 全绿**(缺包的 3 文件复活);
2. **真浏览器冒烟(§七.3 全旅程)**:隔离栈(全新合成库+真实 server+重建 dist)——悬停「添加封面」→拖放上图→取景器 2:1 定框+网格+zoom 滑杆 100%=cover 下限→滚轮缩放至 250%(滑杆跟随)+拖动重定位→Save→toast「封面已保存」+卡面 2:1 横幅即显所取之框→悬停浮条「重新取景/更换封面/移除”→重新取景**参数逐项回放**(250%+原框位,⛔从头来)→Cancel 零变→移除→toast「封面已移除」+卡面回落+「添加封面」复位;
3. **冒烟逮到一处真缺陷并点修**:封面弹层 drop zone 只 `preventDefault` 未 `stopPropagation`,拖放的图会冒泡到项目级源导入区**静默多导入一份源文档**(冒烟中实证:首滴多出一张"cover-smoke 源文档"卡)。HQ 依点状单文件授权修 `ProjectNoteCard.tsx`(onDragOver/onDrop 补 stopPropagation),定向 34/34 绿,重建后真浏览器复验:新滴仅产封面,Notes 计数不变;
4. server 全量沿单3 收口口径(493/492,唯一红=K-5 观察位项,本单 server 面 28/28 builder 在案);git/secrets 入收口单链。

单4 关门。之交批 4/5 落账,单5 导航窗格随即派发。
