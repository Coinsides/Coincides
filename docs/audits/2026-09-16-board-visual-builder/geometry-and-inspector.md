> **状态**: completed（builder 定向证据，不代替 HQ 放行）
> **日期**: 2026-09-16
> **范围**: 板视觉纯几何与只读排版体检器

# 几何与体检蒸馏件

几何只处理板坐标、圆弧与矩形，不引用持久化、内容、Relation 或 Agent 域。

| 实现 | 位置 | 核验 |
|---|---|---|
| 两端点 + bend 三点圆弧，零 bend 保留直线；短线钳制 | `shared/boardVisualGeometry.ts:37` | 正负 bend、圆心等距、弧中点、重合端点 |
| 沿弧长 0–1 位置、最近点、中点吸回、真实切线 | `shared/boardVisualGeometry.ts:67`、`:79`、`:97` | 参数往返、切线垂直半径、中点吸回 |
| 圆角矩形解析求交、四边锚位、自由端点、箭头外退间隙 | `shared/boardVisualGeometry.ts:135`、`:144`、`:170` | 角部交点、卡移动跟随、显式背向锚箭头仍在卡外 |
| 标签矩形与圆弧求交后跳过占据区间 | `shared/boardVisualGeometry.ts:243` | 直线与圆弧分别切为两段，无标签底色假设 |
| 一次性生成/显式重新取道 | `shared/boardVisualGeometry.ts:256` | 无挡卡微弯、挡卡绕短侧、16 板坐标呼吸间距、多挡卡、移动不自动重算 |
| 纯文本换行与水平标签矩形 | `shared/boardVisualGeometry.ts:297` | ~120px 正文宽，显式换行，中心位置不旋转 |
| 五类只读体检器 | `server/src/services/boardLayoutInspector.ts:121` | 五类各有阳性夹具、合并阳性夹具、干净板零报告、输入不变 |

server 的 `rootDir=src` 与既有 shared runtime-import 门不允许产品代码运行时导入 `shared`。沿用项目 `graphemes.ts` 模式，`server/src/services/boardVisualGeometry.ts` 与 shared 文件保持字节一致；定向测试同时锁文件字节及跨端行为，没有新增运行时跨界。

体检接口为 `inspectBoardLayout({ cards, edges }, options?)`：卡片为 `{id,x,y,w,h}`；边为 `{id,fromId?,toId?,points,label?}`，`points` 是板坐标路径采样，`label` 是水平矩形。输出 `{issues,counts}`，每项包含类别、严重度、涉及项目 ID、坐标与范围。无数据库依赖、无修改、无阻断、无消费者接线。近平行检测累计覆盖长度且去掉重复采样区间，采样密度变化不会把相同曲线路径漏掉。

默认体检参数：卡重叠超过较小卡面积的 10%，且面积至少 64；近平行角度 8°、距离 4、累计重叠长 24（均为板坐标）。参数是检测阈值，可由未来消费者覆盖；本单没有自动整理消费者。

定向命令：`cd server; node --import tsx --test src/__tests__/v14BoardVisualGeometry.test.ts src/__tests__/v14BoardLayoutInspector.test.ts`。**28 / 28 通过，0 失败、0 跳过**（几何 19、体检 9）。server 类型检查 `node node_modules/typescript/bin/tsc --noEmit --pretty false` 通过。原始日志只在 `.codex-tmp/board-visual-builder/geometry/`。

实现边界：弧线一次性避让只枚举两侧圆弧，不升级成肘线/持续路由器。若另卡覆盖自由端点，任何满足固定端点的圆弧都无法清障；函数保持有限微弯，由只读体检报告未避让穿卡。体检只接几何投影，不读取真实板数据库，不接 Agent 或评测消费流程。
