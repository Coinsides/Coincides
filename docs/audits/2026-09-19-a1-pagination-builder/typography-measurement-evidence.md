> **状态 (Status)**: builder evidence (2026-09-19)
> **范围**: A1 估高、真实字型度量、回填；不代替完整分页旅程验收

# A1 字型度量实测

最终实测：Chrome / CUA 执行 `http://127.0.0.1:5177/measurement-bundle.html`，由既有 esbuild 把 `.codex-tmp/a1-pagination/measurement-probe.ts` 及真实服务打包（`build-measurement.cjs`，无新依赖）。输入为 HQ `ch1-fixture.txt` 经现役 TextUnit parser 得到的 62 units（31 非空）、2672 UTF-16 字符；在既有夹具基础上给部分 unit 增加 1–3 级缩进。每组同时测量按字宽预估、DOM Range 行框、原生 textarea 的自然换行数，以及应用同源字体样式的 grid 行的实际高度。另以同一文本整体投影为 code_line，验证角色缩放的真实字体度量。

| 场景 | 版心宽 | 估高 | DOM 高 | 初始偏差 | 估计/实测行数 | 回填后 plan↔渲染高偏差 |
|---|---:|---:|---:|---:|---:|---:|
| A4/default，15px/22px/段距0 | 760 | 2442.75 | 2420.71875 | 22.03125px / 0.9101% | 100 / 99 | 0px |
| Letter/大字，20px/30px/段距8 | 650 | 4374.29545 | 4344.28125 | 30.01420px / 0.69089% | 127 / 126 | 0px |
| 异形窄页，15px/22px/段距3 | 370 | 3767.75 | 3767.71875 | 0.03125px / 0.0008294% | 156 / 156 | 0px |
| code_line，默认 Typography | 760 | 2223.2 | 2245.078125 | 21.878125px / 0.97449% | 92 / 93 | 0px |
| code_line，20px/30px/段距8 | 650 | 4135.68182 | 4136.03125 | 0.34943px / 0.008448% | 123 / 123 | 0px |

五组原生 textarea 与 DOM plan 的换行数不一致 unit 均为 **0**。原生 `scrollHeight` 整数舍入造成的最大单 unit 内容高差为 **0.40625px**；fractional CSS line box 保留后总体渲染高差为 0px。五组所有行按 UTF-16 范围拼接均无丢字，重复测量命中同一缓存对象。

**阈值与回填**：高度误差 >0.5px，或任何行首/行尾 UTF-16 偏移差异，记录一次 correction；浏览器实际行框立即作为唯一 flow plan 的测量输入，避免即使总高接近仍有不同断行。窄页场景虽然总高偏差仅0.03125px，但存在断行位置差异，因此仍校正。缓存只含派生数据、上限256项，key包含内容/宽度/Typography/单位角色与缩进/续片偏移；font loadingdone 清缓存并通知主调用层重排。纯函数与 jsdom 无真实布局时明确 source=estimate，不把零布局冒充实测。

**同源规则**：`typographyTextMetrics` / `typographyTextCssProperties` 提供编辑片段、DOM mirror 共用字体与换行属性。heading / code 的字号分别为 `21 × fontSize/15`、`14 × fontSize/15`；行高分别为 `28.35 × lineHeight/22`、`21.7 × lineHeight/22`，分母取 DEFAULT profile，默认外观保持，所有角色随用户的字号、行高与段距响应。heading 字族随配置；code 保留语义 monospace。实测 20/30 配置下，heading 为28px/38.65909px，code为18.66667px/29.59091px。quote 保留内缩。水平 chrome 校准为 padding9×2+border1×2=20px；垂直16px；缩进24px/级；unit最小28px；段距与 heading margins 纳入最终行高度。页面实际使用情况由主线程集成测试另证。

最终原始数据：`.codex-tmp/a1-pagination/measurement-browser-evidence-final.json`；初轮（角色比例修正前）数据保留 `measurement-browser-evidence.json`。定向测试日志：`measurement-tests.log`（14/14，含角色字号/行高独立响应、折叠隐藏 unit 保留逻辑偏移与 Shift+Enter 尾部空行）。首轮 client 全量：`client-full-measurement-pass.log`（155 files / 1582 tests通过；22 suites因并行施工的组件文件尚未落地无法导入，待最终全库重跑覆盖，不能申报全库绿）。


补记：19:50 启动的低并发 client 全库通过 181 files / 1832 tests，命令 `npm.cmd --prefix client run test:unit -- --maxWorkers=2`，原始日志 `client-full-two-workers-final.log`。此轮采集早于尾部空行修复与新增 hook 收敛测试；后者独立发现 pending 保存期间同 IDs 的墙几何新版本被签名吞掉，主线程补齐 signature 中的 collection 后，19:56 重跑 **4/4 通过**（`page-flow-hook-tests.log`）。最终总体验证以主回执为准。

19:57 树快照复跑（113.01s）：**182 files / 1840 tests 全通过，exit 0**，同一 `--maxWorkers=2` 命令，日志 `client-full-final-tree.log`。已包含末尾空行、hook 收敛修复及当时新增跨片测试；随后角色随 Typography 缩放与来源条/光标修复继续施工，此旧快照不冒认最终树。随后该快照 client TypeScript `--noEmit` 检查 **exit 0**，日志 `measurement-final-typecheck.log`。最终完整树统计由主回执及验证报告申报。

**冻结产品后的最终交接验证（20:10:54 启动）**：`npm.cmd --prefix client run test:unit -- --maxWorkers=2` **183 files / 1853 tests 全通过，exit 0，114.37s**，新日志 `.codex-tmp/a1-pagination/client-final-handoff.log`。同一冻结树 `node.exe client/node_modules/typescript/bin/tsc -p client/tsconfig.json --noEmit --pretty false` **exit 0，36.5755169s**，新日志 `.codex-tmp/a1-pagination/client-final-handoff-typecheck.log`。此轮包含角色 Typography 比例、来源条、hard newline 与 soft-wrap affinity 的最终修复，替代上述旧树快照作为 client 交接总量；并未修改测试超时或排除测试。

