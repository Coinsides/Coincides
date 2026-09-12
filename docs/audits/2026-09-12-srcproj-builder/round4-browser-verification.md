> **状态 (Status)**: frozen
> **层 (Layer)**: 验证收据 / Evidence
> **日期 (Updated)**: 2026-09-12
> **权威 (Authoritative)**: 否；隔离样本实测，不代表用户库验收。

# 13.6 补遗三四轮：存量 hydration 与重投影浏览器复验

**PASS：既有五页合成投影无需重投影即可恢复页归属；两次显式 API 重投影后，五页分布、第三页跳转、宽度与封面保持一致。**

## 对象与隔离

- 从二轮已记录的 `smoke-run-wkxsqo` 合成目录原字节复制 DB/WAL/SHM 及素材到 `.codex-tmp/srcproj-13-6/round4/old-projection-clone-CnUkS8/`。原目录不是用户库或用户库副本；原三文件从复制前至收尾 SHA-256 均相同。
- 本轮 server `http://127.0.0.1:61934`，client `http://127.0.0.1:61935`。使用已存在的合成账号；不 seed、不上传、不先铸新投影。应用子进程使用空 dotenv、隔离素材目录及 fresh 临时 provider store，Vite `envFile:false`。
- 原 source `d2ef33a3-8964-44b8-8c7c-a26b62197e23`；旧 note `f1da6fbd-c389-453f-9c91-c2adf926e054`。旧库 `database_meta.coordinate_contract=v2`，5 帧、5 块、2 份二轮收据。API 两侧 placement ID 仍为裸 UUID / `canvas-placement:<UUID>`：精确相等 0/5，已知前缀对应 5/5。
- browser-harness 连接时因无法读本机 `DevToolsActivePort` 失败；随后用已提供的 CUA Chrome 扩展控制专用新标签页。没有提高权限或再尝试浏览器上传。没有打开用户 Coincides 标签页。

## 执行顺序与断言

1. **旧投影直接打开**：五个 Overview 页卡各显示 `Original page N starts here`，每卡只有一个原页开头；实际截图显示第 1–5 页分别承载各自正文。Preview Boundary seed 每帧 **1 块**，Crossing **0**、Workspace **0**。
2. 点击 **Read page 3**：第三页正文与 `Source p.3` 出现在视口顶端。实测块 top **23.9607px**、bottom **323.3674px**；仅第 3 页正文完全在视口内，其余页在上/下方。
3. **先封存存量实证**：浏览器操作后对列明 projection truth 全量选定行深比较，与启动前旧 SQL 快照完全相等；旧 note、两表 placement ID、帧/块内容及几何、时间戳、2 份收据均没变。见 `round4-old-projection-after-browser.json`。此时本轮 materialize/rematerialize 调用数均为 **0**。
4. 第一次 `POST /api/sources/:id/rematerialize`：先无 confirm 预览，SQL 深比较无变化；再 `confirm:true`，生成 note `d7255d50-83f5-45a1-87bc-5897be053c43`，收据 **2→3**，实测整次 HTTP **80.01ms**。加载新 note 后重复五页总览、Read page 3 及阅读布局取证，全部通过。
5. 第二次相同 API 流程：生成 note `c6746866-4f3d-4e2d-98c7-688e4e56ed17`，收据 **3→4**，HTTP **16.51ms**。再亲验总览、Read page 3、Preview 每帧 1 块及封面，全部通过。耗时只代表该合成规模。
6. 两次重投影前后，全部 **5 个 block ID、5 个 frame ID 及选定持久几何/正文**深相等；旧 note 被清除。**placement ID 继续 UUIDv4 裸值/前缀配对，不宣称 placement ID 确定性**。最终浏览器读取前后选定投影 SQL 再次深相等。

## 三阶段一致的实际布局

| 原页 | DOM top（CSS px） | 块宽 | 对应帧 y | Read page 入口 |
| --- | ---: | ---: | ---: | --- |
| 1 | 80 | 760 | 80 | 页 1 正文 |
| 2 | 1394 | 760 | 1394 | 页 2 正文 |
| 3 | 2708 | 760 | 2708 | 页 3 正文，亲点到位 |
| 4 | 4022 | 760 | 4022 | 页 4 正文 |
| 5 | 5336 | 760 | 5336 | 页 5 正文 |

每个块 left=0、height=276，位于自身帧内容区；块两侧 DOM 像素边界与 760 内容列两侧一致。纸宽来自实体帧 **904** 与 DOM `--formal-page-width:904px`，两者一致。没有用截图的缩放像素宽冒充 CSS 760。封面三阶段均为 `Projection Alignment (2)`，description 为 `源文档 · 5 页 · 导入于 2026-09-12`。

与二轮 **0/276/552/828/1104** 的连续错误布局不同，本轮三阶段 DOM top 都等于各自持久帧 y。归属、像素几何和文本分别来自 SQL、DOM、Overview 与截图；不把“前后同貌”单独当作页对齐证据。机械核对结果见 `round4-browser-comparison.json`。

## 如实保留的观察与边界

- 第一次 API 替换时旧 note 仍在浏览器挂载，随后 SPA 导航出现 `Changes could not be saved...`；保存了 `round4-first-spa-stale-note-ax.txt`。对新 note 执行完整 reload 后读取正常；第二次先关闭旧页再 API 替换、打开新页，未再出现该提示。该外部替换期间旧页面的保存/导航行为未作修复，也不申报无刷新切换通过；本单页对齐验收基于重新读取新 note。
- Read page 3 的 AX 抓取仍含底层 `1 / 5` 文本；判断跳转以实际第三页正文及视口矩形为准，未据此文本冒称页码指示器同步正确，也未扩大范围修改导航 UI。
- **存量结论的射程**：拥有有效 frame/geometry 且仅因这两种 placement ID 形状失配的 v2 投影，在运行修后 client 并再次加载/刷新 hydration 时直接受惠，无需重投影。**真机 IELTS 未打开、未实测**；若其满足同一形状与有效持久布局条件，应沿同一读取链受惠，这是条件推论。旧数据自身几何错误、原页映射错误或缺布局，不会被读键归一修复。
- 证据文件为 `round4-old-*`、`round4-first-*`、`round4-twice-*`、`round4-reproject-{1,2}.json`、`round4-browser-comparison.json`。图片均来自真实 Chrome 截图；没有合成 UI 图。audit 不含数据库、PDF、构建产物、登录 token 或密码。

任务标签页均已关闭；进程/端口收尾另见 `round4-smoke-shutdown.json`。
