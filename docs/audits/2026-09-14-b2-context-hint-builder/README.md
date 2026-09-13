> **状态 (Status)**: active
> **层 (Layer)**: 审计证据 / Builder receipt
> **日期 (Updated)**: 2026-09-14
> **权威 (Authoritative)**: 否（施工与验证收据；放行归 HQ）

# V14 14.2-B2 contextHint builder

工单：[2026-09-14-v14-2-b2-context-hint-order.md](../../agent-ops/handoffs/2026-09-14-v14-2-b2-context-hint-order.md)。执行环境日期为 2026-09-13，目录日期沿用工单单号。

## 交付与闭集

| 类型 | data | 现役来源 / 新增用途 |
|---|---|---|
| `l1_onboarding` | `{ isNewUser: boolean }` | Onboarding 原调用实际传 true；服务端仍按 type 进入 L1，未改成按布尔值判定 |
| `calendar` | `{ date: string }` | Calendar 的当前月份日期，原 `yyyy-MM-dd` 字符串语义不变 |
| `deck` | `{ deck_id: string, deck_name?: string }` | DeckDetail，名称仍可省略；仅缺 route ID 时不发射 |
| `note_view` | `{ note_id: string, page_index?: number }` | NoteDetail 被动环境语境，页码为 read_note 的 0-based 纸序 |
| `board_view` | `{ board_id: string }` | BoardPage 被动环境语境 |

盘点射程：`client/src`、`server/src`、`shared/types` 的 `openAgentWithContext`、`contextHint`、`context_hint`、`l1_onboarding`；现役显式调用共 3 处、3 型，无其他旧型需迁移。没有扫描 .git、.env、用户数据或仓库外历史副本。CodeGraph 目录存在但 CLI/MCP 不可调用；rg 不在 PATH，改用明确源码目录的 PowerShell/Node 检索。

shared 的 `types/agentContextHint.ts` 只含 union、interface 和类型映射；`types/index.ts` 使用 `export type *`。没有新运行时值进入 shared。client 标签闭集以 `satisfies Record<AgentContextHintType, string>` 覆盖全部成员。server 本地 `validators/agentContextHint.ts` 用 strict discriminatedUnion，逐型满足 shared 类型，并双向检查最终推断类型与契约相等；`sendMessageSchema` 的 hint 仍可省略，非法型/形状走既有 ZodError → HTTP 400。

显式打开 API 的三个本地调用同步改为传完整 discriminated hint 对象，避免 type/data 脱配；线上 payload 与三种现役语义保持。

## 被动发射与显示

- `uiStore` 分开保存显式 hint、环境 hint 与来源 owner；有效 selector 始终显式优先。旧来源卸载只能清自己的注册。
- `useAmbientAgentContextHint` 仅在面板打开时注册本地状态。关闭或离页清除；相同视图被用户关闭语境后，滚动不会把它重新加回；切换视图或重开面板恢复当前语境。
- `NoteDetail` 的 route context 经 `NoteRuntimeDocumentLayer` 接入 `useNoteAmbientAgentContextHint`。它独立读取既有 appMain 阅读位置，监听 scroll/resize/纸张布局和显示比例；不依赖导航侧栏是否打开，不拿持久化 selectedFrameId 代替阅读页。
- 纸序使用与 read_note 相同的稳定 `(y,x)` 排序。overview 保持进入时阅读页；没有纸张阅读位置时省略 page_index。BoardNoteModal 不带 NoteDetail 标记，不抢 board_view。
- `BoardPage` 从当前 boardId 注册语境；同组件切换 board ID 和卸载均有回归覆盖。
- AgentPanel 的显示与发送共用有效 selector；note/board 显示对象 ID，note 页码显示为人类页码。只有显式 hint 变化触发既有 focus effect，滚动不抢输入焦点。
- 用户发送后清一次性显式 hint，保留环境语境供下一条用户消息；关闭语境后发送可省略 hint。无新增挂载期 API、自动消息或自动工具调用。

## 服务端接线

`runAgent` 的 hint 入参收紧为共享 union。旧三型沿用原 `[Context: user is viewing TYPE — DATA]`；新增两型提供可读 note/board 描述，并以 “You may use read_note/read_board … when relevant” 提示模型可深读。没有增加预读、工具调用、消息循环或注册动词。消息、图片的文本块和持久化都消费同一 augmentedMessage。

## 验证口径

- 新增定向：client 3 文件、15/15；server 1 文件、5/5。覆盖闭集全部五型、可省略字段、2 个工单指定最小 HTTP 400 功能反控、真实 router/provider/persistence、note/board 生命周期、显式优先、可见语境与实际发送一致。
- client 全库最终：170 文件，1737/1737，零跳过/零排除。首次新增 board 测试过早统计原有异步读取，修正为等待已有 bookmarks 读取与状态刷新后重跑整库通过；未改产品代码或降低断言。
- shared `tsc -b shared`、client `tsc -b && vite build`、server `tsc` + manifest 检查/复制均通过。
- `verify:v2-bn8-runtime` 的非 git/secrets 子门逐项原样运行，机关脚本未修改。包括 test wiring、tech debt、client 全库、registry 5/5、manifest 10/10、parity 10/10、manifest/parity/runtime-import 边界、174 项 canvas boundary、gallery/rail/editor/source/legacy/freshness、60 组模型契约、构建、performance、docs。
- docs 初跑发现既有 agent-ops 索引缺本单及 B1 状态变化，运行原 `scripts/docs-index.mjs` 只刷新 `docs/agent-ops/INDEX.md`，未改生成器或历史正文。收据写回后再次检查。
- 完整 server 文件集合来自 `server/src` 与 `server/scripts` 的全部 84 个 `.test.ts`，使用既有隔离 suite wrapper，零排除；最终 768 项中 766 PASS、2 项 Python/MinerU 环境 FAIL，cancelled/skipped/todo 均 0。完整数字和最后结果见 `validation-summary.json`。
- 首次临时 runner 选错凭据目录（位于仓库内，既有 guard 拒绝）且缺 npm_execpath；只修正验证入口到系统临时空目录与实际 npm lifecycle 路径，未碰产品 guard。第二次整库有一条既有 wilderness fixture 的 created_at 跨秒比较差异，未改测试，继续全量复跑确认。

验证环境：DB_PATH=`:memory:`；资产/上传/Source blob 为独立临时路径；dotenv 指向自己创建的空文件，Vite envDir 为空目录；provider 环境凭据从继承环境移除。新写的凭据形合成值不超过 20 字符；UUID、note ID、board ID 和消息属于域数据。

## 浏览器与留项

浏览器冒烟结果另见 `browser-smoke.json`。browser-harness 因无权读取 Chrome DevToolsActivePort 不可用，后续使用已连接 Chrome 扩展通道进行真实页面操作；没有绕过权限或安装工具。真实 client build + 内存库 + 生产 routes + provider stub：Page 1、滚动后重开 Page 2、Board、离页无 hint 四条用户消息均 HTTP 200，provider 最后一条输入与界面显示相符。未发送前 provider 调用 0，最后恰好 4 次。消息历史仍正常保留先前 Context，离页清除的是当前消息 hint。

浏览器边界：原面板 backdrop 会挡住底层纸张滚轮，因此真浏览器页码变更采用关闭→滚动→重开验证；面板开着时的 scroll/scale 更新由常驻功能测试验证。直接 hash 离开笔记时曾出现一次保存提示，HTTP 观测没有失败请求；本单只申报语境转场和消息接线，不把这次走查当作保存边界验收，也未扩大范围修改保存机关。初版临时 host 缺 templates/source-anchors 路由，补齐生产 router 后重启完成正式走查；它不是产品缺路由。

Python/MinerU 环境红按工单留 HQ；未修或替换 Python 环境。git diff/secret scanner 明确留 HQ，零 git 命令、未读取 .git、未 commit/push/PR。未新设计安全对抗测试；既有功能和安全回归均进入原完整测试集合。未改依赖、机关本体、工具注册、a11y 树或用户库。

交付路径与基于开工快照的逐文件增删行数见 `numstat.json`；不使用 Git 基线。此目录只收整理后的证据，不含构建产物、原始测试日志或临时 smoke host。
