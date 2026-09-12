> **状态 (Status)**: active（停线证据；不是完成收据）
> **层 (Layer)**: 审计 / Builder evidence
> **日期 (Updated)**: 2026-09-12（本机 America/Toronto；沿用工单指定的 2026-09-13 归档目录）
> **权威 (Authoritative)**: 否（现物与亲跑记录；分类调整待 HQ）

# STOP-1：批一的 Canvas 测试耦合与图纸不符

上游：[工单](../../agent-ops/handoffs/2026-09-13-v13-6-deadcode-purge-order.md)、[图纸](../../agent-ops/analysis/2026-09-13-deadcode-recheck.md)、[裁决](../../agent-ops/analysis/2026-09-13-v13-6-adjudication.md)。三份已完整读取。依据工单“疑难与图纸不符→停线举证”，在第一笔生产代码修改前停线。

## 现物证据

| 项 | 图纸判据 | 实际代码与测试 | 影响 |
|---|---|---|---|
| 一·20 | 图纸 140–144 行列“纯死可删（仅左臂）”，并要求确认无 Canvas 入参用例 | `client/src/pages/Notes/canvasEngine/pageFrameTypographyService.test.ts:117–130` 用例名明确包含 `leaves canvas hydration unchanged`；125–127 行传 `surfaceMode: 'canvas', metadata: {}` 并 `.toBe(hydratedProfile)`。同文件 104–115 行还有 Page/Canvas × A4/Letter 的显式覆盖保留测试 | `pageFrameTypographyService.ts:62–66` 若按图纸去掉 Canvas 左臂，空 metadata 会转到创建新默认 profile 的分支，违反现存对象身份断言。该项不能在不处置测试的情况下作为纯删除通过 |
| 一·10 | 图纸 68–72 行要求删前确认没有 Canvas 分支用例 | `client/src/pages/Notes/canvasEngine/hooks/useCanvasSurfacePointerController.test.tsx:8–13` 包含 Page/Canvas × 0.5/1.5 四组；39 行明确区分 Page 宽 640 与 Canvas 宽 760 | 这不是只剩 Page 的测试。其 Canvas 宽度依赖 `modePolicyService.ts:167–173` 的 workspace 宽度分支，须与图纸一·6 联动处置；不声称只删一·10 短路本身就一定红 |

以上属于测试耦合漏项，不是“Canvas 已产品化复活”的证据。当前裁决“全删、零复活”未被改写；builder 未自行扩充替身测试清单或调整四批归属。

## 亲跑基线

在生产与测试源码未修改的状态下执行：

```powershell
& 'C:\Program Files\nodejs\node.exe' scripts/run-text-range-validation.mjs --client-tests src/pages/Notes/canvasEngine/pageFrameTypographyService.test.ts src/pages/Notes/canvasEngine/hooks/useCanvasSurfacePointerController.test.tsx
```

结果：**2 文件、22/22 通过、0 失败、0 安全标题排除，exit 0**。Typography 为 18 条，pointer 为 4 条。原始输出：[stop-1-targeted-baseline.log](stop-1-targeted-baseline.log)。这是改前基线；没有执行删枝 mutation 或门改红演示。

隔离依据：`scripts/run-text-range-validation.mjs:16–28,53–60,89–91` 的定向分支使用环境白名单、`envFile:false`、`DB_PATH=:memory:`；两个测试和 `client/test/setup.ts` 均为模型/DOM 测试。未启动应用服务，未读 `.env` 值，未接触用户库，未运行 Git 或安全类测试。

## 验证入口附记

- `package.json:41` 的总门末尾包含 `git diff --check` 与 secrets 扫描；本工单已将这两项交 HQ，因此未直接运行总门。
- `scripts/run-isolated-coordinate-validation.mjs:39–41` 无条件调用 Git，未执行。
- `scripts/run-text-range-validation.mjs:104–115` 无参入口的旧清单缺新接入的两个门，且 127–128 行会调用 Git；未执行无参入口。此次只运行已经逐行核查的 `--client-tests` 分支。
- `.codegraph/` 存在；已先尝试 CodeGraph CLI，当前 PATH 无该命令，亦未发现可用 MCP。`rg` 同样不可用，随后以限于显式仓内路径的 PowerShell 读取定位。

## 续工所需

`needs: HQ`：将一·20 的 Canvas hydration 断言、一·10 的 Canvas 参数和宽度断言纳入测试处置图纸，明确与一·6 的同批关系。建议保留 Page 物理字号/首帧选择/显式 override、双缩放坐标等活语义，退役 Canvas 专属期待；此建议尚未实施。无需改变“全删、零复活”方向。

四批均未启动；生产代码与测试源码交付量为 **+0 / -0**。本次只交停线报告、基线日志与工单追加 Result。没有将停线包装为完成，也没有翻 `done`。
