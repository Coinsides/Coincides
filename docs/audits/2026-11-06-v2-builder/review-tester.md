> **状态 (Status)**: active
> **层 (Layer)**: 核验报告（上岛前复走）
> **日期 (Updated)**: 2026-11-07
> **权威 (Authoritative)**: 否（判语由 Tester(1) 给出，裁定与部署归 Main_Designer）

# V2（B-78、B-79、A-22）上岛前复走：Tester(1)

单据：`docs/agent-ops/handoffs/2026-11-05-a19-a20-image-pages-and-idle-save-order.md` 的「V2」与「V2 Result」。

## 判语

**放行。** 三项在修前修后的对照里都修好了，没有看到新的坏结果。下面三条小尾巴不挡上线。另外复走中撞上一个既有的大问题：Group Gallery 在笔记多的账号上加载失败。它与 V2 无关，但会让 A-22 的修法在大账号上看不见，单独报给 Main_Designer。

## 怎么测的

- **冻结**：HEAD `4b1f1852` 加 V2 清单的 7 个文件（另有 1 个新测试文件，见 `tester/snapshot-hashes.txt`），在副本里构建，不碰共享树。修前 = HEAD 的同版前端。
- **B-78、B-79**：两份前端各起一个本地静态服务，`/api` 经隧道转到岛上，只用我的测试账号；没有部署。数据是在我账号里新建的项目「实测·V2走查」，上传仓库自带的测试 PDF，投影后生成原页。
- **A-22**：我的岛上账号有 2030 篇笔记（历次矩阵留下的），Gallery 加载不出来（见下文「新发现」），所以 A-22 改在本地服务器的小账号上做，与 builder 的走法相同。Rebuild 走真界面。
- **操作**：无头 Chrome，CDP 真鼠标点击和滚轮事件。**真人手和触控板测不了。**

## B-79 原页头部可被滚走

先进原页，指针放在页头的「Text / Pages」切换上，滚轮向下 8 格。

| 窗口 | 修前：切换的位置 / 主区滚动 | 修后 |
|---|---|---|
| 1440×900、1280×600、1024×768、760×900 | 4/4 切换滚到 y=-76，主区滚 146px，点不到；接着点「Text」也点不中 | 4/4 切换停在 y=44，用 `elementFromPoint` 确认点得到，主区不动 |

- 修后主区被锁住（`overflow: hidden`），所以我专门核了原页本身还能不能滚到底：在 1280×600 下把滚轮放在页面上滚 20 格，修前修后都滚到了末尾（视口 1327/508，scrollTop 819），原页视口底边在 588，没被遮住。
- 修后主区仍停在打开时的 26px 初始滚动上。这是 builder 已记的既有现象，修后用户滚不回来，但被遮的只是页头上方的空白，切换和页面都完整可见。
- 截图：`tester/b79-pre-after-8-wheel-ticks.jpg`、`tester/b79-post-after-8-wheel-ticks.jpg`。

## B-78 悬浮切换盖住 Overview 的关闭键

先回到文本视图，打开 Overview，然后用真点击点它的关闭键。窄窗口下 Overview 折进了「看的方式」菜单，就从菜单进。

| 窗口 | 修前：关闭键中心实际命中 / 点击结果 | 修后 |
|---|---|---|
| 1440×900（直接）、1024×768 和 760×900（菜单） | 3/3 命中悬浮切换的「Pages」，点了就切到原页 | 3/3 命中关闭键，Overview 关闭，仍是文本视图，悬浮切换回来 |

截图 `tester/b78-pre-overview-open.jpg` 能直接看到：修前「Text / Pages」切换正好压在关闭键的位置。

## A-22 Rebuild 后内容组找不到

在投影笔记上建一个内容组，然后从 Source Library 行尾走真界面 Rebuild。

| 环节 | 修前 | 修后 |
|---|---|---|
| Rebuild 弹窗 | 「Content groups retain their snapshots but lose their live link to this projection.」 | 写明组会离开这篇笔记，新笔记的 Groups 面板里没有，去 Group Gallery 的「Not in any note」找 |
| Rebuild 前的 Gallery | 组在它的笔记下 | 同左 |
| Rebuild 后的 Gallery | 「No content groups in this folder yet.」，组看不见 | 底部「Not in any note」区列出该组，附说明，只读 |

截图：`tester/a22-*`。

### 小尾巴（不挡上线）

1. 「Not in any note」区里的组不计入左栏「All groups」和顶部「visible」的计数：修后列出 1 个组时，计数仍显示 0。
2. 说明文字写的是「这些组属于一篇已从 Source 重建的笔记」。经 API 不带笔记建的组也会列在这里：我在岛上为了造数据就建过一个，这时文字就不对了。Gallery 自己的「New group」总是挂在笔记下，所以真人走界面碰不到，只影响 API 或 Agent 建的组。
3. 新区只读，没有编辑、移动、删除，这是按裁定设计的。

## 新发现（既有，与 V2 无关，修前修后一样）

**Group Gallery 按笔记逐篇请求，笔记一多就加载失败。**

- 我的岛上测试账号有 15 个项目、2030 篇笔记。打开 Gallery 时一次发出约 2100 个 API 请求（每篇笔记的内容组和文件夹各一个）。
- Chrome 报 `net::ERR_INSUFFICIENT_RESOURCES`，页面显示「Gallery could not load. Failed to load content groups.」，修前修后都一样。
- 更糟的是，同一个标签页接着打开 Source Library，连页面自己的 JS 和 CSS 都加载失败，整页空白；修前修后都一样。
- 修后新加的「Not in any note」是另一个按项目的小请求（15 个），在主加载失败时仍能单独显示。但用户看到的整体仍是「加载失败」。
- 判级建议：🅱 偏重。Henry 的笔记数现在可能还少，但这个问题随使用线性变坏。笔记多到几百篇时 Gallery 就会变慢，到上千篇就打不开。Henry 账号的笔记数我不看，⛔碰他的数据，请 Main_Designer 用只读方式在服务器上核一下。
- 证据：`tester/v2-diag.mjs`（记录请求数、失败请求、控制台报错），`tester/island-gallery-attempt.rows.jsonl`。

## 没验到

- 真人手和触控板的滚动。CDP 滚轮是离散的 120px 一格，触控板惯性滚动是否同样被拦住，要 Henry 上线后试。
- 岛上大账号里的 A-22：被上面的 Gallery 问题挡住，改在本地验。
- 修后客户端全量：没有单独为 V2 跑全量；builder 的 2626/2626 是四单合在一起跑的。我在冻结副本上构建通过，并定向跑了 Gallery 的 4 个测试文件，26/26 过。V2 只改 CSS、Gallery 和文案，与另外三单没有文件重叠。

## 收尾

- 岛上「实测·V2走查」项目里的样本、内容组和一个无笔记组都留在我的账号里，没有删。
- 本地服务器上的数据是临时库，收尾时随临时目录一起清掉。
- 全程只用我的账号，没有碰 Henry 的数据，没有改产品代码，没有 git 写操作。
