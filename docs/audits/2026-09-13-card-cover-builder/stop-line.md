> **状态 (Status)**: blocked
> **层 (Layer)**: 审计证据 / Builder stop-line receipt
> **日期 (Updated)**: 2026-09-13
> **权威 (Authoritative)**: 否（现物证据，待 HQ 裁定）
> **工单**: `docs/agent-ops/handoffs/2026-09-13-v14-card-cover-order.md`

# 卡面封面 v1：固定比例缺口停线

## 判据与现物

- 工单第 21 行（§二.2）要求：框固定为卡面输出比例，“从现有笔记卡 CSS 实际比例取，申报取值”。用户另明确“冲突或歧义=停线举证，禁止自作主张”。
- 现役 Notes 卡实际使用 `workspaceGrid`、`workspaceCard`、`workspaceCardOpen`：`client/src/pages/Courses/CourseDetail.tsx:222`、`:228`、`:231`。没有现成封面图区域。
- `client/src/pages/Courses/CourseDetail.module.css:250–254`：网格列宽是 `repeat(auto-fill, minmax(280px, 1fr))`，随容器宽度分配。
- 同文件 `:256–269`：卡片仅有 `min-height: 132px`；`:282–291`：打开按钮仅有 `min-height: 130px`。此文件没有 `aspect-ratio` 声明，也没有对上述卡片指定固定宽高。
- 同文件 `:1235–1253` 的旧 `noteGrid` / `noteCard` 未被现役 Notes 卡引用，且同样没有固定比例，不能作为取值依据。

因此 CSS 中没有唯一的既定 card 框比例。`280:132` 是两项最小尺寸的比值，不能冒充实际固定比例；任选视口测量也只能得到该视口、该内容下的瞬时比例。

## 待 HQ 裁定

请明确新增封面图区域 / card 取景框的固定输出宽高比。收到裁定后才能确定几何常量、取景器框、百分比投影与相应测试。

## 在飞状态

- 已读工单、上游报告（含 §三与 §四适用域注）及仓库入口权威文档，完成有限源码侦查。
- 功能代码、依赖与锁文件均未修改；没有安装依赖；没有构造凭据或测试数据。
- 测试执行数为 0；typecheck / build / client 全库 / server 定向 / 静态门 / 浏览器冒烟均未执行，不申报通过。浏览器可用性尚未探测，不申报“浏览器不可用”。
- 未执行任何 git 命令，未触碰 `.git`，未执行安全类测试，未读 `.env` key 值，未接触用户库。
- 工单保持 `ready`；尚未完工，因此不追加完成 `Result`，不翻 `done`。
- 本证据文件为新增文件（写入前已确认不存在）；既有文件修改数为 0。证据目录不存构建产物或原始日志。

## 验证入口已知限制

根 `package.json` 的 `verify:v2-bn8-runtime` 包含 `git diff --check` 和 `check:changed-file-secrets`，不能直接执行。工单 §七.4 已将 git / secrets 交 HQ 收口。本次未运行总门，也未用删减后的执行结果声称总门通过。
