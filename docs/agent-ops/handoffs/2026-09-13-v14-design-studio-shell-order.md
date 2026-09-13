> **状态 (Status)**: done(三轮施工+HQ 真浏览器冒烟补齐;收口见末尾)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-13
> **单号**: V14 之交批 · 单3 · 设计室壳(五抽屉,套装/调色板实装)
> **上游**: `analysis/2026-09-13-appearance-benchmark-survey.md`(**交互规格权威**,本单吃 §四通用语法+五抽屉骨架+§六拆单指向)+会议记录 09-12 §二(navigator 侧栏统一设计入口,Henry 拍)+`design/note-page-design.md`(装饰件库=贴纸抽屉)

# 单3 · 设计室壳

**性质**:库存之家。**设计室管库存,浮卡管现场**(Henry 原话)——设计室=资产的浏览与管理入口,⛔在设计室里"应用到当前纸"(应用动作住浮卡/取色器,那里才有现场)。五抽屉骨架立起,**套装+调色板两抽屉实装**(读写既有数据,零新契约),模板库/部件/贴纸**留位**。交互逐条以对标报告 §四为准。

## 一 · 壳与入口

1. **navigator 侧栏新入口「设计室」**:`client/src/components/Layout/AppLayout.tsx` 的 `navItems` 增一项(建议置于 Group Gallery 与 Settings 之间;icon 选 lucide 现成如 `SwatchBook`/`Palette`);
2. **路由** `/design-studio` + 新页 `client/src/pages/DesignStudio/`;
3. **页内骨架**:左列五抽屉 tab(外观套装/调色板/模板库/部件/贴纸,顺序照此)+右侧画廊区;当前 tab 入 URL(`/design-studio/:drawer?`,缺省=套装)可深链——后续壳单/浮卡"去设计室"跳转要用;
4. **一套画廊语法**(报告 §四,⛔发明第二套):搜索框+分组折叠+缩略网格三件套;hover 显影(管理钮平时隐形);Custom 区置前;右键/「…」菜单收低频管理动作。

## 二 · 套装抽屉(实装)

形态=Word Document Formatting 画廊(报告 §四):

1. **自渲染缩略**:每套装卡用其真实 token+材质渲染微缩样张(⛔静态截图)——**复用浮卡四预设卡的渲染机制**(同一份缩略渲染代码,⛔复制粘贴第二份);
2. **分区**:「我的套装」置前(Custom 区置前),出厂四预设(default/quiet-ink/warm-paper/workbench)随后;出厂卡⛔改删;
3. **管理动作**(右键/「…」菜单):重命名/删除(走既有 DELETE,detach 合同 server 已保证消费者完整外观不变——删除⛔弹确认,可逆感交给 detach 静默降级语义,但删除项列菜单末尾);**⛔「更新套装为当前样子」**(该动作需要现场,住浮卡,本单不做);
4. **⛔应用动作**:点击套装卡=选中态/详情视图(显示 token 摘要+材质谱系),⛔改任何纸;卡上不出现「应用」钮;
5. 搜索框按名过滤。

## 三 · 调色板抽屉(实装)

形态=Canva Brand 页=「取色器第一屏的家」(报告不变量 8:家与随身编辑口读写同一份):

1. **数据零新增**:读写 `/api/palette-colors` 同一份数据,复用取色器已有的池色 hooks/组件逻辑(⛔第二套 CRUD 实现);
2. 斜杠前缀派生分组呈现(暖调/冷调/中性/点缀+用户组),组=区块,块尾**常驻加号**(hex 输入一等公民);
3. 就地编辑:改名/改值/删除(factory 409 已有,前端出厂色管理钮直接禁用⛔删后报错——报告"至少留一件"规则)+拖排序(用户色);
4. 色块 hover 显名+hex;搜索框按名过滤。

## 四 · 留位三抽屉

模板库/部件/贴纸三个 tab 存在、可切换,内容=占位卡(一句话说明该抽屉将装什么+「V14 随批实装」);⛔实装任何内容;⛔为留位造数据结构。

## 五 · 台账义务(常备条款)

本单预期**零新增挂载期 API**(套装/调色板均为既有路由)。若实现中确需新请求:全夹具台账普查照 B 族先例显式登记。client **全库必跑**。

## 六 · 禁区

⛔动皮 token 词汇(9+4 封闭)与皮契约;⛔碰统一取色器内部与浮卡内部(只复用其导出的渲染/hooks);⛔Agent 面;⛔「应用到纸」类动作;⛔安全类测试;⛔碰 .git;⛔commit;⛔读 .env key 值;⛔用户库接触;合成测试值(名/邮箱/口令/key)一律 **≤20 字符**。

## 七 · 验收

1. typecheck+build 三端绿;`check:test-wiring`/`check:tech-debt-table` 绿;受影响静态门绿;
2. 定向新增:①壳导航(nav 项+路由+五 tab 切换+深链缺省)②套装抽屉(自渲染缩略与浮卡同源/我的套装置前/重命名/删除后列表与消费者行为)③调色板抽屉(与取色器同数据:此处改名改值→取色器侧同步可见/factory 管理禁用/加色)④留位呈现;skin/palette/suite 族回归绿;client 全库绿;server 受影响面绿;
3. 冒烟(隔离库+真浏览器):侧栏入设计室→五 tab 走一遍→套装重命名→删一个用户套装→池色改名+加色→深链 `/design-studio/palette` 直达→浮卡与取色器侧核对同步;
4. 证据落 `docs/audits/2026-09-13-design-studio-builder/`(⛔构建产物⛔原始日志目录,只留判据文件——单2 收口裁过一次);git/secrets HQ 收口。

## 八 · 申报义务

Result 必含:交付清单+numstat(基于编辑前镜像)、复用点申报(缩略渲染/池色 hooks 各复用自哪个文件)、测试数字、未做项。冲突停线举证⛔自作主张。

## Result

**2026-09-13 · codex(builder) · BLOCKED / 冲突停线，未完工。** 工单状态保持 `ready`；未满足完工条件，不翻 `done`。

### 冲突举证与待裁定项

用户指定的交互权威 `analysis/2026-09-13-appearance-benchmark-survey.md` §四第 51 行要求「悬停真预览+点击应用」，第 67 行明确壳单吃此通用语法；本单第 9、25、47 行却禁止设计室应用到纸，并指定点击套装卡仅选中／查看详情。两边没有给出一致的适用范围。

须明确：设计室库存管理入口是否作为报告 §四预览／应用规则的例外，以及悬停预览的作用范围。依本单 §八及用户「冲突或歧义=停线」指示，本轮不自行判定哪条优先、不改上游规格。完整行号判据见 [preflight.md](../../audits/2026-09-13-design-studio-builder/preflight.md)。

### 交付清单与 numstat

- 新增上述停线判据文件；本工单末尾追加本 Result。原工单正文及 `ready` 状态保留。
- 业务代码交付 0；新增挂载期 API 0。
- 编辑前工单镜像为 `C:/Users/70208/AppData/Local/Temp/ds-before-VTKHEv/order.md`，5077 bytes / 58 行，SHA-256 为 `cce3ef033c92a6cb8dadac7079220215dc2ba98a74f58e3806d571d8a4d6d066`。
- 以下计数基于编辑前字节镜像与写后回读，仅为本轮文档变更；未使用 git。

| 文件 | 新增 | 删除 |
| --- | ---: | ---: |
| 本工单 | 35 | 0 |
| `docs/audits/2026-09-13-design-studio-builder/preflight.md` | 49 | 0 |

### 复用点申报

- 缩略：`client/src/components/Skin/SkinFloatCard.tsx:198` 已导出 `SkinSample`，浮卡在第 368 行复用它；第 200–205 行按 token 与材质自渲染。出口可用，本轮实际接入 0。
- 池色：`client/src/hooks/usePaletteColors.ts:112` 已导出 hook，返回既有 CRUD；取色器在 `client/src/components/ColorPicker/UnifiedColorPicker.tsx:26` 使用它。出口可用，本轮实际接入 0。
- 分组／排序：`client/src/components/ColorPicker/paletteUtils.ts` 已导出校验、名称拆组、分组、组内名称与拖排计划函数。没有新增第二套 CRUD 或缩略实现，没有修改取色器／浮卡内部。

### 测试数字与未做项

- 新增测试 0，执行测试 0，浏览器冒烟 0；不申报通过数。
- 三端 typecheck/build、`check:test-wiring`、`check:tech-debt-table`、静态门、client 全库、skin/palette/suite 回归及 server 受影响面均未运行，原因是前置规格冲突停线。
- 侧栏入口、路由与深链、五抽屉、套装管理、池色管理与同步、三抽屉留位均未施工；未建立隔离库或启动测试服务。
- git 命令 0，未访问 `.git`，commit 0，安全类测试 0；未读取 `.env` 或 key 值，未接触用户库，未生成合成测试值。

---

## 补遗一(HQ 裁定,2026-09-13 二轮)

裁:**工单第 9/25/47 行维持,冲突系适用域误读,非规格矛盾**。依据:

1. 报告 §四"悬停真预览+点击应用"蒸馏自**画廊与现场同屏**的先例(Word 样式画廊悬在打开的文档上方/Canva 面板贴着画布)——预览与应用都预设屏上有目标纸。设计室是独立路由,屏上无纸,"应用"无宾语;
2. §四自身第四件套即"**浏览与管理分离**:选择器只管选,建组/导入/删除进管理入口"——设计室就是那个管理入口;点击应用的语法住选择器(浮卡快选条/统一取色器),两者分工是 §四 内生的,不是本单发明;
3. 上位裁定:09-12 会议 §二 Henry 亲拍"设计室管库存,浮卡管现场",系比调研报告更晚、更特定的直接裁定。

执行口径:设计室内**缩略即预览**(自渲染卡本身承担预览职能,GoodNotes 纸库同款);悬停只做显影与显名;应用动作零出现。工单其余零变,续工。

---

## Result（二轮）

**2026-09-13 · codex(builder) · BLOCKED / 新验收冲突停线，未完工。** 补遗一已接受，原预览／应用适用域问题不再是阻塞。因下述独立冲突未满足完工条件，状态保持 `ready`，不翻 `done`。

### 冲突举证与待裁定项

本单第 43／52 行要求 client 全库必跑且绿，第 47 行及本轮用户直令要求合成测试名一律 ≤20 字符。现有 `client/src/pages/Boards/BoardViewportBookmarks.test.tsx:193–204` 专门验证 32 字符书签名：第 201 行 `enterName('章'.repeat(32))`，随后保存并断言成功。根 agent 已亲读，未执行。

照跑违反短值铁律；缩短该名改变原边界判据；跳过该用例改变强制全库验收范围。依本单 §八「冲突停线举证」，不自行豁免或削弱测试。待 HQ 裁定既有超长合成值用例在本单的验收处理方式。完整判据见 [preflight-round2.md](../../audits/2026-09-13-design-studio-builder/preflight-round2.md)。

### 交付清单与 numstat

- 新增二轮停线判据；本工单仅追加二轮 Result，正文、上轮 Result 与补遗一保留。
- 业务交付净变更 0。停线前写入的导航／路由已恢复二轮镜像并逐字节验证；两份未完成壳文件撤回业务目录，留在临时目录供后续续工，不申报为交付。
- 二轮编辑前镜像：`C:/Users/70208/AppData/Local/Temp/ds2-before-a994aff3/`，其中 `order.md` 是本轮追加前的完整工单字节镜像。新增判据文件基线为空。numstat 只按这些镜像与写后回读计算，零 git。

| 文件 | 新增 | 删除 |
| --- | ---: | ---: |
| 本工单（二轮追加） | 40 | 0 |
| `docs/audits/2026-09-13-design-studio-builder/preflight-round2.md` | 37 | 0 |
| `client/src/App.tsx` | 0 | 0 |
| `client/src/components/Layout/AppLayout.tsx` | 0 | 0 |

### 复用点申报

- 缩略出口仍为 `client/src/components/Skin/SkinFloatCard.tsx` 的 `SkinSample`，按真实 token 与材质渲染；本轮最终接入 0，未改浮卡内部。
- 套装 CRUD 复用点为 `client/src/hooks/useSkinSuites.ts`，含删除后的消费者 detach 快照；本轮最终接入 0。
- 池色 CRUD 复用点为 `client/src/hooks/usePaletteColors.ts`；分组、校验及拖排计划复用点为 `client/src/components/ColorPicker/paletteUtils.ts`。本轮最终接入 0，未改统一取色器内部。
- 新增 API 路由 0；最终新增挂载期请求 0；没有第二套 CRUD、缩略实现或新皮契约。

### 测试数字与未做项

- 新增测试 0、执行测试 0、浏览器冒烟 0、隔离数据库创建 0；不申报通过数。
- 三端 typecheck/build、`check:test-wiring`、`check:tech-debt-table`、受影响静态门、client 全库、skin/palette/suite 回归、server 受影响面均未运行。停线前只做了静态核查。
- `verify:v2-bn8-runtime` 本身包含 `git diff --check` 与 `check:changed-file-secrets`，未整条执行；这两项依 §七.4 由 HQ 收口，不把它们当作新的规格冲突。
- 五抽屉完整施工、套装管理、池色管理与同步、留位呈现、定向测试与真浏览器冒烟仍未完成。
- git 命令 0、`.git` 访问 0、commit 0、安全类测试 0；未读取 `.env` 或 key 值，未接触用户库；未生成合成测试数据。

---

## 补遗二(HQ 裁定,2026-09-13 三轮)

裁:**≤20 字符规则射程=凭据形合成值,既有测试零动照跑**。工单 §六 原句"合成测试值(名/邮箱/口令/key)"里的「名」措辞过宽,本补遗修约为:

1. **射程**:builder 本单**新造**的**凭据形**合成值——口令/key/token/secret 及作为账号凭据使用的用户名/邮箱。立法目的=避开 24 字符凭据扫描阈的假阳性(§131 家法),不是给一切字符串定长;
2. **不在射程**:域数据字符串(书签名/套装名/标题/池色名等产品字段)——长度边界用例(如 32 字符书签名测 64 上限)是正当测试判据,⛔削弱⛔跳过⛔排除;
3. **决定性证据**:`BoardViewportBookmarks.test.tsx` 的 32 字符名已在库内,单2 收口时 `check:changed-file-secrets` 两次全量过闸零命中——该扫描只认**凭据形赋值**(assigned secret-like value),域字符串不触发;
4. client 全库必跑维持原样,含该边界用例。

工单其余零变,续工。

---

## Result（三轮）

**2026-09-13 · codex(builder) · 施工与自动化验收完成，真浏览器环境阻塞，尚未完工。** 补遗一、二均已执行，无新的规格冲突。业务交付保留在工作树；由于 §七.3 真浏览器旅程未完成，状态保持 `ready`，不虚报 `done`。完整判据：[round3-verification.md](../../audits/2026-09-13-design-studio-builder/round3-verification.md)。

### 交付清单与 numstat

- navigator「设计室」入口、`/design-studio/:drawer?`、五抽屉顺序/URL 当前态/缺省与未知值回落、搜索及三留位已交付。既有 HashRouter 的实际深链形如 `/#/design-studio/palette`。
- 套装抽屉：我的套装置前、四出厂卡只读、真实缩略、分组折叠、只读 token/材质详情、右键/菜单改名及无确认删除；应用到纸和更新为当前外观动作均为 0。
- 池色抽屉：同一共享数据、斜杠分组、用户区置前、加色、就地改名改值、删除、用户拖排序/键盘替代、factory 管理禁用、搜索/折叠/显名与 hex。补齐 IME 防误提交及菜单焦点返回。
- 新增 3 份定向测试、三轮判据；使用既有生成器同步 `docs/agent-ops/INDEX.md`（原索引未收录本工单）。既有测试零修改。
- 编辑前镜像：`.codex-tmp/ds3-20260913/before/` 中 `App.tsx`、`AppLayout.tsx`、`order.md`、`agent-ops-INDEX.md`；新文件基线为空。二轮两壳镜像续用后按本轮空基线计新增。计数以编辑前镜像与最终文件的逐行 LCS 得到，未使用 git；仅列可审查交付，不把临时脚本/隔离库/日志/构建产物计作业务交付。

| 文件 | 新增 | 删除 |
| --- | ---: | ---: |
| `client/src/App.tsx` | 2 | 0 |
| `client/src/components/Layout/AppLayout.tsx` | 4 | 0 |
| `client/src/pages/DesignStudio/DesignStudio.tsx` | 47 | 0 |
| `client/src/pages/DesignStudio/DesignStudio.module.css` | 26 | 0 |
| `client/src/pages/DesignStudio/DesignStudio.test.tsx` | 101 | 0 |
| `client/src/pages/DesignStudio/SuiteDrawer.tsx` | 165 | 0 |
| `client/src/pages/DesignStudio/SuiteDrawer.module.css` | 47 | 0 |
| `client/src/pages/DesignStudio/SuiteDrawer.test.tsx` | 185 | 0 |
| `client/src/pages/DesignStudio/PaletteDrawer.tsx` | 189 | 0 |
| `client/src/pages/DesignStudio/PaletteDrawer.module.css` | 51 | 0 |
| `client/src/pages/DesignStudio/PaletteDrawer.test.tsx` | 193 | 0 |
| `docs/agent-ops/INDEX.md` | 2 | 1 |
| `docs/audits/2026-09-13-design-studio-builder/round3-verification.md` | 64 | 0 |
| 本工单（三轮追加） | 51 | 0 |

### 复用点与台账申报

- 缩略直接复用 `client/src/components/Skin/SkinFloatCard.tsx` 导出的 `SkinSample`，解析复用 `client/src/styles/skinPresets.ts/resolveSkin`；同一真实 token、部件与 materialPreset 渲染，零复制缩略实现、零改浮卡内部。
- 套装 CRUD/detach 复用 `client/src/hooks/useSkinSuites.ts`；池色共享缓存及 CRUD/detach 复用 `client/src/hooks/usePaletteColors.ts`；命名分组、hex 校验和排序复用 `client/src/components/ColorPicker/paletteUtils.ts`。统一取色器、上述 hooks、皮契约均零修改。
- 新 API 路由/请求类型/数据结构 0；新增全局挂载请求 0。设计室新路由只增加既有 GET 的消费者：套装 `/skin-suites` + `/palette-colors`，池色 `/palette-colors`，留位 0。新夹具登记与 GET 集合断言见判据；既有夹具零动，全库照跑。

### 测试数字

- 新增测试 **22/22**（壳 6 + 套装 7 + 池色 9）；真实 App 路由、同源缩略、共享 hook 与同挂取色器同步、删除消费者完整外观保真均有断言。
- client 全库 **160 文件、1666/1666、零 skip**；最终兼容修正后再次全跑仍相同。既有书签长度边界原样执行；既有 skin/palette/suite 族 14 文件/120 条已含在该数字内，不重复加总。
- server 受影响面 **22/22**：既有隔离 runner 执行 `v13PaperSkin.test.ts` + `v14PaletteColors.test.ts` + `v14SkinSuites.test.ts`；registry/manifest/parity 普通测试 **5 + 10 + 10 全绿**。独立普通单元去重合计 **1713**。
- 三端 typecheck/build 全绿；`check:test-wiring` **77/77 wired、0 豁免、0 漏挂**，`check:tech-debt-table` 绿；10 项静态门绿；Canvas 模型 **60 组**、性能 **5 场景**绿；`docs:check` 索引生成后完整重验绿。完整门名与环境隔离方法见判据。

### 环境阻塞与未做项

- 真浏览器完成 **0 步**：CUA inventory 无可用浏览器；browser-harness 默认读取 Chrome 调试端口文件被拒绝；全新隔离 Chrome/Edge 均因 GPU 子进程 `exit_code=-1073741790` 后报 `GPU process isn't usable. Goodbye.`；禁用 GPU 加速的重试同样失败，9222/9223 亦不可连接。没有修改沙箱/执行策略，也没有把 DOM 单元测试冒充真浏览器。
- 隔离 fixture 已用全新 synthetic 数据库成功初始化，复用真实业务路由和真实构建前端；用户库接触 0。侧栏入设计室、五 tab、套装改名/删除、池色改名/加色、深链及现场浮卡/取色器核对仍待有可用浏览器后执行。已向用户请求测试用本地 CDP 地址，不能靠自行豁免该项翻 done。
- 模板库/部件/贴纸按单只留位；皮词汇/契约、浮卡/取色器内部、Agent 面均未修改。主观验收与放行留 HQ/Henry。
- git 命令 0、`.git` 访问 0、commit 0、安全类测试 0；未读取 `.env` key 值。新造凭据形合成值均 ≤20，域字符串不削弱不跳过。`verify:v2-bn8-runtime` 未整条运行，其允许子门已拆开执行，git/secrets 按 §七.4 留 HQ 收口；未运行含安全类用例的 server test:v2。

---

## HQ 收口(fable,2026-09-13)

builder 三轮交付实质核验通过;其唯一缺口(沙箱内浏览器 GPU 故障,真浏览器旅程 0 步)由 HQ 亲自补齐——隔离栈(全新合成库+真实 server+builder 终版 client/dist 构建)真浏览器走查,§七.3 旅程全绿:

1. **壳**:注册新合成用户→侧栏「设计室」入口在位(Group Gallery 与 Settings 之间)→五抽屉顺序照单→深链 `#/design-studio/templates` 直达;
2. **套装抽屉**:我的套装置前(空态文案指路浮卡)+出厂四卡自渲染(暖纸奶油纸面肉眼可辨);在纸上浮卡换暖纸(纸面实时整体换装)→存为套装(显式保存弹窗带自渲染小样)→设计室即见「我的套装 1」含材质谱系→右键重命名(关闭即提交)→右键删除:**零确认+收据文案"已删除「暖纸蓝墨」,使用它的纸保留原有外观"**→回纸验证纸面依旧暖纸(detach 消费者侧兑现);
3. **调色板抽屉**:加色「试组/靖蓝二 #336699」斜杠自动立组→改名(关闭即提交)→hover 显名+hex→出厂色管理菜单在而删除受护;**回浮卡开统一取色器,池区原样显示该色**——家与随身编辑口读写同一份,双向核准;
4. **留位**:模板库/部件/贴纸三占位卡文案照单;
5. **server 全量(HQ 补跑)**:493 测 492 过,唯一红=已挂观察位的 MinerU K-5 载荷敏感项(与本单零交集,本单 server 代码零动);git/secrets 入收口单链。

单3 关门。补遗一(设计室=管理入口,应用语法归选择器)与补遗二(≤20 规则射程=凭据形合成值)两项裁定随单沉淀,调研报告 §四 适用域注同步落档。
