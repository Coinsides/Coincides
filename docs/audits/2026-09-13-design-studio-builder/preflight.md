> **状态 (Status)**: active
> **层 (Layer)**: 审计 / Builder 停线判据
> **日期**: 2026-09-13
> **权威 (Authoritative)**: 否（事实收据，交互裁定待上游）

# 设计室壳：前置核对停线

判定：BLOCKED。尚未施工，不能申报设计室交付或验收通过。

## 停线证据

- 用户本轮指定 `docs/agent-ops/analysis/2026-09-13-appearance-benchmark-survey.md` §四为交互规格权威，并要求冲突或歧义停线举证。
- 报告第 51 行：通用语法包含「悬停真预览+点击应用(可逆类零确认)」；第 67 行将 §四通用语法明确交给设计室壳单。
- 工单第 9 行：设计室只管库存，禁止在设计室「应用到当前纸」，同时要求交互逐条以报告 §四为准。
- 工单第 25 行：点击套装卡只能选中或查看详情，禁止改任何纸；第 47 行再次禁止「应用到纸」类动作。
- 工单第 58 行：冲突停线举证，禁止自行决定。
- 待裁定：库存管理入口是否是报告 §四「悬停真预览／点击应用」的明确例外。若是，须明确例外范围；若不是，须消解工单的禁令及目标纸语境。builder 本轮没有选择其一，没有修改上游规格。

## 复用出口核对

| 复用点 | 现有代码证据 | 本轮实际复用 |
| --- | --- | --- |
| 缩略渲染 | `client/src/components/Skin/SkinFloatCard.tsx:198` 导出 `SkinSample`；第 200–205 行按真实 token 和材质渲染；第 368 行供浮卡 `PresetCard` 调用 | 0，未施工 |
| 池色数据 | `client/src/hooks/usePaletteColors.ts:112` 导出 hook，第 116 行返回既有 CRUD；`client/src/components/ColorPicker/UnifiedColorPicker.tsx:26` 使用同一 hook | 0，未施工 |
| 分组与排序 | `client/src/components/ColorPicker/paletteUtils.ts` 导出 `isHexColor`（5）、`splitPaletteName`（7）、`groupPaletteColors`（12）、`nameInGroup`（36）、`planPaletteMove`（42） | 0，未施工 |

复用出口不存在缺失问题；本次停线不以复用接口为理由。只读并行审计已交叉核对这些出口。

## 变更与验证边界

- 交付仅为本判据文件及工单末尾 `## Result`。工单原有 58 行逐字保留，状态保持 `ready`。
- 业务代码修改 0；新增挂载期 API 0；新增测试 0；执行测试 0；浏览器冒烟 0；未建立或接触任何数据库。
- 三端 typecheck/build、静态门、client 全库、skin/palette/suite 回归及 server 受影响面全部未运行，不主张任何测试通过。
- 导航、路由、五抽屉、套装管理、调色板管理与同步、留位界面均未实现。
- 未执行 git 命令，未访问 `.git`，未 commit，未执行安全类测试，未读取 `.env` 或其中 key 值，未接触用户库；没有生成合成测试值。
- CodeGraph 目录存在，但 shell 命令和已提供工具列表均无可用 CodeGraph 入口；采用限定路径的 PowerShell 只读检索。未索引仓库。
- 证据目录仅存本判据文件；编辑前镜像在临时目录，未放入本目录；无构建产物或原始日志。

## 编辑前镜像与 numstat

- 工单编辑前镜像：`C:/Users/70208/AppData/Local/Temp/ds-before-VTKHEv/order.md`。
- 原文件：5077 bytes、58 行；SHA-256：`cce3ef033c92a6cb8dadac7079220215dc2ba98a74f58e3806d571d8a4d6d066`。
- 本文件编辑前不存在，按空文件镜像计数。numstat 只统计本轮两份文档，不推断工作区其他变更。
- 测量方法：直接比较临时字节镜像与回读文件；验证工单仅追加；按新增／删除行计数，不使用 git。

| 文件 | 新增 | 删除 |
| --- | ---: | ---: |
| `docs/agent-ops/handoffs/2026-09-13-v14-design-studio-shell-order.md` | 35 | 0 |
| `docs/audits/2026-09-13-design-studio-builder/preflight.md` | 49 | 0 |
