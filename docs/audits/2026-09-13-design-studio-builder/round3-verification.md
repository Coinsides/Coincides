> **状态 (Status)**: active
> **层 (Layer)**: 审计 / Builder 验证判据
> **日期 (Updated)**: 2026-09-13
> **权威 (Authoritative)**: 否（施工与验证收据，不代替 HQ 放行）

# 设计室壳三轮验证

## 判定边界

补遗一、二均执行，没有新的规格冲突。五抽屉壳、套装与池色管理及自动化测试已经交付；工单 §七.3 的隔离库真浏览器旅程尚未完成，不能据单元测试替代并宣告完工。工作树交付保留，工单保持 `ready`。

## 交付与复用

- `AppLayout.tsx` 在 Group Gallery 与 Settings 之间加入设计室入口；折叠导航仍有可访问名称。`App.tsx` 注册 `design-studio/:drawer?`。既有 HashRouter 的浏览器形式为 `/#/design-studio/palette`。
- `DesignStudio.tsx` 与其 CSS 提供五抽屉、URL 当前态、缺省套装与未知抽屉回落、搜索及三个说明留位。
- `SuiteDrawer.tsx` 直接导入 `SkinFloatCard.tsx` 的 `SkinSample`，通过 `skinPresets.ts/resolveSkin` 传入真实 token、部件与材质；无第二份缩略实现。我的套装置前、出厂四卡只读、点击只读详情、右键/菜单管理、就地改名、无确认删除。
- 套装 CRUD 与 detach 完全复用 `hooks/useSkinSuites.ts`；材质和池色解析使用既有 `hooks/usePaletteColors.ts`。未修改上述 hooks 或浮卡内部。
- `PaletteDrawer.tsx` 完全复用 `hooks/usePaletteColors.ts` 的共享缓存与 CRUD；`ColorPicker/paletteUtils.ts` 的 `groupPaletteColors/isHexColor/nameInGroup/planPaletteMove/splitPaletteName` 负责分组、校验与拖排。用户区置前、常驻加色、就地改名改值、菜单删除、拖排及键盘替代、出厂管理禁用均已接入。
- 菜单通过 portal 避免滚动容器裁切，提供焦点返回与键盘操作；中文输入法确认不会误触发提交。三留位没有新数据结构。

## 请求与夹具台账

新增 API 路由、请求类型与数据契约均为 0。设计室新路由是已有请求的新消费者：套装抽屉读取 `/skin-suites` 与 `/palette-colors`，池色抽屉只读 `/palette-colors`，均由共享 hook 去重；留位抽屉无资产请求。根布局原有请求不变，没有增加全局挂载请求。

新增 3 个夹具文件：壳测试保留真实 App 路由和 navigator，隔离无关页面及 overlays；套装与池色测试保留真实 hooks、store、缩略与取色器，API mock 对未登记 URL 显式失败。套装测试断言 GET 集合恰为两项。既有夹具与测试文件零修改，client 全库不排除任何用例。

## 自动化结果

| 项目 | 最终结果 | 判据 |
| --- | --- | --- |
| 新增壳测试 | 6/6 | 真实 App 入口/五抽屉/URL/缺省/回落/留位 |
| 新增套装测试 | 7/7 | 同一 SkinSample 字节、分组顺序、改名同步、删除完整外观 detach、只读详情、错误与键盘/IME |
| 新增池色测试 | 9/9 | 同挂取色器即时看到改名/hex/新色、factory 禁用、删除保色、分组搜索、拖排/键盘、错误/空库/IME |
| client 全库 | 160 文件，1666/1666，零 skip | `npm.cmd --prefix client run test:unit`，包含上述 22 条及既有书签长度边界 |
| 既有 skin/palette/suite 族 | 14 文件，120/120 | 已含于 client 全库，不重复加总 |
| server 外观族 | 22/22 | `v13PaperSkin.test.ts`、`v14PaletteColors.test.ts`、`v14SkinSuites.test.ts`，通过既有隔离 runner |
| registry/manifest/parity 单元 | 5/5 + 10/10 + 10/10 | 普通注册、清单与静态路由覆盖测试 |
| 模型/性能 | 60 组 + 5 场景 | 两项既有 Canvas smoke，单列于单元计数外 |
| 三端 typecheck/build | PASS | shared/server noEmit 与构建通过；client 测试 ES2020 索引兼容修正后 tsc -b/build 通过 |
| wiring/tech-debt | PASS | 77/77 server 测试接线，0 豁免、0 漏挂；债表沿用其现有历史豁免 |
| 受影响静态门 | PASS | 下列完整清单 |
| docs:check | PASS | 既有生成器补入工单索引后，全链重验通过 |

静态门：`check:canvas-runtime-boundary`、`check:group-gallery-shell`、`check:groups-rail-shell`、`check:single-editor-shell`、`check:source-experience`、`check:v2-bn11-legacy-shutdown`、`check:v2-bn11-relation-freshness`、`check:tool-face-manifest`、`check:tool-face-parity`、`check:server-shared-runtime-import`。普通单元去重合计 1713 条通过（1666 + 22 + 25）。

Vite 测试和构建统一显式设置 `COINCIDES_VALIDATION_ENV_DIR` 到新建空目录，未让默认 `.env` 参与。原生 npm.ps1 被执行策略拒绝后使用 npm.cmd，未修改执行策略。开发中捕获并修复了缺省抽屉 aria-current、IME、portal 焦点及新测试 Array.at 的 ES2020 兼容问题，未削弱断言。最终源码再次跑完整 client 全库，仍为 160 文件/1666 全绿；构建保留既有大 chunk 提示，不影响 exit 0。

## 真浏览器环境阻塞证据

1. CUA `createBrowserTab('chrome', ...)` 返回 `Browser is not available: chrome`；随后 inventory 返回 `apps: [] / browsers: []`。
2. browser-harness 默认连接在读取 Chrome `DevToolsActivePort` 时返回 Permission denied；没有获得标签页、页面或截图。
3. 依该工具文档的隔离连接方案，用全新任务内 profile 启动 Chrome 与 Edge，只绑定 loopback 调试端口；两者 GPU 子进程返回 `exit_code=-1073741790` 后主进程退出，明确末行为 `GPU process isn't usable. Goodbye.`。使用关闭 GPU 加速的受支持启动选项重试仍同样失败。没有修改沙箱或安全策略。
4. 独立探测文档列明的 9222/9223 调试端口亦不可连接。已向用户请求可用的本地 CDP 地址；未收到可用连接前不虚报浏览器通过。
5. 临时 Express fixture 已成功运行：全新 `synthetic.sqlite`、单一合成用户、synthetic 标记、独立 blob/assets 根、短凭据，静态提供真实 client/dist 并复用真实业务 routes/services；未启动加载 dotenv 的生产 index。种子包括两套装、一用户池色、两张有套装/池色引用的纸。首次种子块类型错误已改成既有 paragraph 后重新创建全新测试库，成功初始化不计为 UI 冒烟通过。

完成的浏览器旅程步数为 **0**。侧栏进入、五 tab、改套装名、删套装、池色改名加色、深链直达、现场浮卡/取色器同步与视觉 QA 均待有可用浏览器后执行。共享 hook 集成测试及真实 server 回归已证实相应数据行为，但不冒充上述旅程。

## 镜像、禁区与未做项

编辑前镜像位于 `.codex-tmp/ds3-20260913/before/`：App、AppLayout、工单及生成索引；新增源与本判据文件基线为空。最终逐文件 numstat 在工单三轮 Result，采用镜像与写后文件的逐行 LCS 计数，零 git。

未实施模板/部件/贴纸内容，未动皮词汇或契约、取色器/浮卡内部、Agent 面；未提供设计室应用到纸或更新为当前外观动作。git 命令与 `.git` 访问 0，commit 0，安全类测试 0，用户库接触 0，未读取 `.env` key 值。新造凭据形值均 ≤20；UUID 与套装/颜色/标题属于域数据。`verify:v2-bn8-runtime` 的允许子门已拆开执行，git/secrets 仍由 HQ 收口；未整条执行该 verifier，未跑含安全类用例的 server test:v2。

本目录仅保存判据文档；临时服务、测试库、日志和编译产物不放入审计目录。主观验收与最终放行留 HQ/Henry。
