# 编辑器组返修第二轮 · builder 证据(2026-11-07)

回执在订单文件尾部「编辑器组返修第二轮 Result(builder 2026-11-07)」。本目录只放原样输出；原始输出里的本机路径已换成 `<tmp>/`、`<scratch>/`、`~/` 占位。

## 被测对象

- 源码：`9bc45e69` + 22 个文件(第一轮 21 个 + 本轮新增 `hooks/headingStructureWatchdog.realAdapter.test.tsx`)。逐文件 sha256 和「同第一轮 / 第二轮改 / 新增」标记见 `final/source-sha256-r2.txt`，清单见 `final/files22.list`。
- 包：主 JS `index-BlJnjQci.js`，63 个文件，哈希见 `final/dist-r2.sha256`。ops 包 `editor-rework-r2/` 带 `dist/` 和 `src/`，两份哈希与本目录一致。
- 对照：冻结版(`dist-edfrozen`)、修前版(A-18 之前，`dist-before`)、纯 21 文件包(`dist-edfix`，主 JS `index-TKMm6sxh.js`)。

## 哪些数算数

| 目录 | 是什么 | 算不算 |
|---|---|---|
| `client3/` | 最终文件集上的类型检查、客户端全量、K1 真适配器测试连跑 20 次、全部阳性对照(`red-controls.txt`) | **算数**，单测与阳性对照以这里为准 |
| `final/` | 最终包的构建、三个检查脚本、r04@57、K 臂 r2(两种 harness 下结论相同，见下)、dist 跑前跑后哈希 | **算数**。其中的 `client-full.raw` 早于 K1 测试最后两次只改断言的修改，`client3/` 取代它 |
| `final/*.old-harness.json` | 旧 harness 下的注入矩阵 | **不算数**，只留作对照；以 `per-note/` 为准 |
| `per-note/` | 按笔记读存档的修正 harness：注入矩阵四版(r2 / 冻结 / 修前 / 纯)、H-L 三版、K 冻结版、代理层 3b 两臂、两行诊断(完整请求日志) | **算数** |
| `harness-control/` | 度量器自己的阳性对照：真丢的一行(冻结版 · 慢回包 · 卸载)，同样的字塞进别的笔记的键 | **算数**：旧 harness 误判 ②2，新 harness 判 ③2 |
| `k1-early/` | 本轮早期的 K 臂(纯 / 冻结 / 本轮早期构建)和 K1 诊断构建(`k-diag.log`，控制器打点，定位拒批) | 纯包与冻结版的 K 数算数(这两版的 dist 没变)；本轮早期构建的数只作参考 |

## 工具(`tools/`)

- `matrix25.mjs`：注入矩阵。本轮新增 K 臂(改角色那次保存在代理里扣 12 秒或 25 秒，然后放行 / 失败 / 整页卸载)、3b 代理层两臂、`h_HL`(CDP Fetch 在**浏览器请求阶段**扣住带 `body` 的 text-save，150ms 后整页离开，12 秒后重开)、`SEED_OTHER` 自测钩子。
- `matrix25b.mjs` / `classifyb.mjs`：修正后的 harness 与分类器。只认以本行笔记 id 结尾的存档键；每行另记重开后实见(框、提示、本笔记存档)，归类以实见为准。
- `proxy-fail2.mjs`：代理层注入：`stall` / `stallfail` / `stall25`(扣一次 text-save)、`holdsaves` / `blackhole`(text-save 在代理处拖住或吞掉，**浏览器已发出**)。
- `proxy-diag.mjs` / `matrix-diag.mjs`：诊断副本，记录每个写请求的时间和它携带的单元。
- `useHeadingStructureController.diag.ts` + `k1diag.sh`：K1 诊断构建(纯包源码加打点)。
- `r2final.sh` / `r2rest.sh`：本轮跑法。

## 三类

①落库正确；②没自动落，但留住可取用(框 / 本笔记存档 / 失败保存的 Retry-Undo 态)；②′字已落库、同块未拆；③丢失、重复或落错块。
