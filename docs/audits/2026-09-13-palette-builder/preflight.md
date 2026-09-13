> **状态 (Status)**: pending-clarification
> **层 (Layer)**: 审计 / Builder 开工核对
> **记录日期**: 2026-09-12（运行环境日期；工单与证据目录使用 2026-09-13）
> **范围**: V14 之交批单 1；只读核对结果，非交付 Result

# 调色板工单开工核对

## 规格衔接待裁定

- 工单 `docs/agent-ops/handoffs/2026-09-13-v14-palette-assets-order.md:13` 只定义 `palette_colors`，明确「分组⛔独立结构：命名即分组」。
- 同工单 §三（第 39–43 行）限定接线为 SkinControls 高级颜色区，未定义设计室抽屉挂点。
- 权威报告 `docs/agent-ops/analysis/2026-09-13-appearance-benchmark-survey.md:54` 要求「多命名板，板尾常驻加号，hex 一等，至少留一板」；第 67 行又将设计室壳及抽屉骨架列为独立工单。
- 本轮用户明确要求逐条执行 §四调色板抽屉。因此不能自行把多板/抽屉要求记为未做后即宣称本单完成。

已提交的具体解释，尚待回复：以斜杠前缀派生命名板，板尾放加号，出厂板不可删保证至少一板；本单在统一取色器内落地，设计室抽屉随壳单挂接。不新增独立板/分组数据结构。

停线依据：工单 §七第 62 行「冲突停线举证⛔自作主张」。当前未写实现，工单保留 ready，未追加完成 Result。

## 引用闭包只读盘点

现役持久化落点 4 处：

| 表 | skin 路径 |
|---|---|
| users | settings.skin.overrides |
| courses | skin.overrides |
| notes | metadata.skin.overrides，包含回收站中的笔记 |
| boards | skin.overrides |

生产解析调用点：SkinControls、SkinEditor 预览、useNoteSkin、useBoardSkin。删色时除服务端事务外，还需处理已挂载消费者的旧引用，防止仅移除色池项导致现有页面回落预设色。定向断言必须比较删除前后消费者解析值的原始字符串，并验证持久化引用清零。

现物 SKIN_TOKEN_NAMES 为九个纸面 token 加四个 Board token，共 13 项。本单须保留既有词汇表，不按旧文案删减。

## 请求夹具盘点

生产挂点 full=4，processed=4，remaining=0：CourseModal、Settings/AppearanceSection、BoardPage、NoteChromeLayer。

现有明确需要登记的测试 full=17，processed=17，remaining=0；以下路径均相对于 client/src：

- components/Skin/SkinControls.test.tsx
- components/Skin/SkinEditor.test.tsx
- components/CourseModal/CourseModal.test.tsx
- pages/Settings/Settings.test.tsx
- pages/Notes/canvasEngine/layers/NoteChromeLayer.test.tsx
- pages/Boards/BoardNoteModal.rangeSession.test.tsx
- pages/Boards/BoardPage.bookmarks.test.tsx
- pages/Boards/BoardPage.chalk.test.tsx
- pages/Boards/BoardPage.item.test.tsx
- pages/Boards/BoardPage.layers.test.tsx
- pages/Boards/BoardPage.modal.test.tsx
- pages/Boards/BoardPage.selection.test.tsx
- pages/Boards/BoardPage.smoke.test.tsx
- pages/Boards/BoardPage.snapping.test.tsx
- pages/Boards/BoardPage.staging.test.tsx
- pages/Boards/BoardPage.tools.test.tsx
- pages/Boards/BoardPage.unboxing.test.tsx

浏览器合成传输 full=7，processed=7，remaining=0；以下路径均相对于 client/scripts：

- boardOpenNoteSmoke/mockApi.ts
- boardTextRangeSmoke/mockApi.ts
- boardToolsSmoke/mockApi.ts
- cFix1Smoke/mockApi.ts
- pageFrameHealingSmoke/mockApi.ts
- pageReadingSmoke/mockApi.ts
- paperInkSmoke/inkMockApi.ts

若将读取上移至皮解析 hook，还需纳入 useBoardSkin.test.tsx、useNoteCanvasDataAdapter.skin.test.tsx、useNoteCanvasDataAdapter.test.tsx、NoteTrayInteraction.integration.test.tsx。以上为开工时挂点盘点，不替代实现后的全库检查。

## 验证边界

- 根 verify:v2-bn8-runtime 含 git diff --check 和 secrets 扫描，不能直接整条执行；按工单由 HQ 补跑这两项，其余允许段拆跑并逐项记录。
- scripts/run-isolated-coordinate-validation.mjs 启动即调用 Git，不适用于本单。
- 服务端既有全量脚本含 providerCredentials.test.ts 等安全类测试，必须按禁区排除并申报实际执行集合，不能将过滤后的结果称为原始全量已通过。
- 客户端验证使用 COINCIDES_VALIDATION_ENV_DIR 指向合成空目录，服务端使用合成空 dotenv 文件与显式隔离数据库/资产路径。

## 当前执行状态

实现文件修改 0；迁移/seed 执行 0；测试执行 0；浏览器冒烟 0。未调用 Git，未访问 .git，未读取 .env 值，未接触用户库。此文件是本轮唯一新增的留档文件。
