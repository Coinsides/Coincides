> **状态 (Status)**: blocked（依赖安装环境阻塞，未完工）
> **日期**: 2026-09-13
> **层**: Builder evidence / 非放行结论
> **工单**: `docs/agent-ops/handoffs/2026-09-13-v14-card-cover-order.md`

# 二轮实现与验证判据

HQ 补遗的 2:1 已落实在 shared 唯一常量，原比例歧义已消除。本次剩余阻塞是依赖安装，不是比例设计问题。

## 环境阻塞

- 在 `client` 执行 `npm.cmd install react-easy-crop --save-exact --ignore-scripts --no-audit --no-fund`，npm 访问 `https://registry.npmjs.org/react-easy-crop` 返回 `EACCES`，exit 1。
- 仓库配置缓存 `npm-cache` 中 `npm.cmd cache ls react-easy-crop` 无条目；`client/node_modules/react-easy-crop/package.json` 不存在。系统另一缓存读取返回 `EPERM`；没有提权、改权限或绕过沙箱。
- **实际安装版本：无；client package.json 与 package-lock.json 均未成功写入该依赖。** 实现 API 参照官方源码的 **6.2.3**，这是目标版本，不是已安装/已锁定声明：[官方 package.json](https://raw.githubusercontent.com/ValentinH/react-easy-crop/main/package.json)。
- 需要 HQ 在可安装环境补齐正式依赖与锁文件，再续跑真实组件测试、client typecheck/build 和 client 全库。没有造替代包、声明文件或 mock 来冒充依赖安装。

## 已落源码

- `metadata.binding.cover` 类型、读槽 guard、POST/PUT runtime 校验、最新 metadata 合并保存；零迁移。
- 既有 multipart 上传携带 `source=note_cover_upload`；既有 blob GET。Remove 仅保存 `cover:null`。
- 既有资产引用计数纳入 cover；Note/Project 既有删除流程中的引用释放继续复用原机制。移除/替换封面本身均不触发资产释放。
- 项目 Notes 卡顶满宽横幅，取景与显示共享 `NOTE_CARD_COVER_ASPECT_RATIO=2`；图片宽高和偏移由百分比计算。
- 文件选择/拖放→取景→Save；重新取景、替换、移除浮条。无槽不读取图片、不推断首个媒体块。无封面卡原内容结构保留。
- 取景组件采用 react-easy-crop API，提供 cover fit、下限、clamp、滑杆、原生滚轮/捏合、Save/Cancel 和参数回放；**该真实组件尚未运行验证**。
- 保存后的 Notes 刷新不切全页 Loading；编辑会话图片绑定 draft.assetId；关闭弹层后恢复焦点。最后两项浏览器行为仍需实测。

## 校验点

| 点 | 当前行为 |
|---|---|
| shared `isNoteCover` / `readNoteCover` | 仅从 binding.cover 读，校验有限数值、面积、范围、zoom 下限；不补造默认封面 |
| server `noteCoverSchema` | x/y 为 0..100，width/height 为 (0,100]，x+width/y+height≤100（浮点容差 1e-6），zoom≥1；不取整；v1 不接受 page |
| create/update `noteMetadataSchema` | 原有开放 record 的 superRefine 委托 cover 校验，保留原 JSON Schema 与原始参数 |
| notes POST/PUT | 资产存在性走既有用户资产读取；binding 兄弟键合并保留 |
| canvas-assets POST images | source 标记分流，上传/存储/读取路由未新建 |
| 工具面 | manifest 检查 14 个 public 条目未过期；manifest 与 Agent 源码未修改 |

比例约束由客户端固定框输出保证。server 保存的是原图百分比范围；未新增图像处理、尺寸猜测或像素裁图。

## 测试结果

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

## 挂载期请求与全夹具台账

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

## 未做与留 HQ

- 正式依赖安装与 package-lock 锁定；client 三个 suite 及全库全绿；实际取景组件 typecheck/build。
- **隔离库+真浏览器完整冒烟未执行。** CUA inventory 实测 apps=[]、browsers=[]；能找到浏览器可执行文件及 browser-harness，不等于浏览器不可用，也不等于已做冒烟。依赖缺失阻塞了应用验证，故本项明确留 HQ，未声称“浏览器已验证/不可用”。
- page 框/封面页、出厂封面库、链接 tab、其他装订件、皮/token 词汇、Agent 新入口均未实现。
- git/secrets 最终收口、主观放行留 HQ。全程零 git 命令、未碰 .git、未读 .env key、未碰用户库、未 commit。
- 新测试凭据用途合成值：`cover-user`（10）、`cover@example.test`（18）、`synthetic`（9）；均≤20。哈希、UUID、标题、文件名为域数据，不作凭据。

源码 numstat 见 `round2-numstat.md`：21 文件 +1370/-47，基于编辑前镜像。此目录仅判据文件；构建产物、镜像与临时日志均不放入审计目录。一轮 `stop-line.md` 原文保留。
