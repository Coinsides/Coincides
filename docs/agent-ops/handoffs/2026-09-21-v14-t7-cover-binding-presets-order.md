> **状态 (Status)**: done(2026-09-21 HQ 收官:一轮零停线;builder 环境两红=Python 系,HQ 机 server 主集真全绿;client 2431/2431 逐字对上;双门绿;说明书已由 HQ 守门同步。收尾批可派线至此全部落账)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-21
> **单号**: V14 收尾批 · T7 封面版式预设+装订预设(G1+G7 尾件)
> **上游**: ①缺口清单 G1:样张封面=竖排大题/满幅衬底/元数据行,产品封面机制全在(A3)缺「出厂版式」;裁语「模板=外观+版面+预置结构」的第一批真货,入设计室模板抽屉;②G7 尾件:走查已证样张装订两次配置即得(2026-09-21 走查报告),裁「存为装订预设一款」;③设计室现物:模板库抽屉=占位卡「V14 随批实装」(2026-09-13 壳单明令⛔为留位造数据结构——本单即「随批」之批,可造最小数据结构)。

# T7 · 封面版式预设 + 装订预设(设计室模板抽屉开张)

## 一 · 封面版式预设(G1)

1. **出厂预设 2 款**(manual 摆放组合,零新机制):「手册式」(竖排/居中大题+述名行+满幅衬底位)与「简明式」(横排题+元数据行);实体=封面页(A3 coverPage frame)上的预置块摆放配方(title/description 取笔记现役字段,衬底位=cover 资产槽空则素色 token);
2. 应用=人一键套(在封面页语境,现役封面编辑入口处);套用后全部块照常可编辑(预设是起点⛔锁定);
3. **⛔Agent 写权**(封面属装订域,gap-list 原案);⛔新块型——全用现役块+placement。

## 二 · 装订预设一款(G7 尾件)

1. 「手册式装订」预设=走查验证过的配置(页眉中=笔记题/脚中=「第 N 纸」/脚右可选文案),一键套到 binding_settings(现役 PUT 通道);
2. 预设数据形状:若设计室已有 suite 存法可挂靠则挂靠申报;否则最小新结构(申报形状,⛔超出预设存取所需)。

## 三 · 设计室接线

1. 模板库抽屉从占位卡转最小实装:列出上述 3 款预设(2 封面+1 装订),缩略即预览(09-13 交互规格:设计室管库存⛔应用动作——**套用动作住笔记语境**,抽屉只看);
2. 出生公约照守:预设内容零字面值,全 token/角色引用。

## 四 · 验收与禁区

1. 定向:预设套用断言(封面块落位/装订配置落库)+抽屉列表渲染+套用后可编辑;
2. 回归:client 全库+server 全量(**111 文件零排除,补集含 v13WildernessExecute 与本地真 OCR 路,文件预算 ≥600000ms,⛔按 120s 判红**);
3. 证据落 `docs/audits/2026-09-21-t7-presets-builder/`,原始日志 `.codex-tmp/t7-presets/`;
4. **禁区(带射程)**:⛔一切 git 写操作(add/commit/push/reset/改 .git);只读 git 明文允许(含验证门内部);git 检查+secrets 两组件留 HQ,其余按「非 git/secrets N 组件」申报;⛔Agent 写权⛔新块型⛔TextFlow 真相 schema⛔坐标契约⛔贴纸/部件抽屉(仍留位)⛔新工具⛔prompt⛔Relation/判定域⛔新依赖⛔用户库⛔真实模型调用(射程=远程 LLM/API 与凭据消耗;本地 MinerU OCR 子进程=构建内确定性工具,全库整跑明文含它);⛔新设计安全对抗类用例(既有功能回归全库整跑明文允许零排除);合成凭据形值 ≤20 字符;新 `--sk-` token 后段 ≤18 字符;
5. Result:两预设+抽屉逐件行号+数据形状申报+测试数字+出生公约自查+未做项;冲突停线举证。

## Result

2026-09-21 · Codex builder。两款封面、一款装订与模板抽屉已实装。header 的 done 仅表示 builder 交单，**server 非全绿、非 HQ 放行**；依 T5 补遗一完成其余施工与验证，没有因已知 Python 沙箱病停线。未发现新的真冲突。

证据：[T7 builder 回执](../../audits/2026-09-21-t7-presets-builder/README.md)、[server 全量记录](../../audits/2026-09-21-t7-presets-builder/server-verification.md)、[非 git/secrets 验证门记录](../../audits/2026-09-21-t7-presets-builder/gate-verification.md)。原始日志与私有 runner：`.codex-tmp/t7-presets/`。

### 逐件交付

- **手册式封面**：`shared/types/notePresets.ts:5`、`client/src/pages/Notes/canvasEngine/noteCoverPresets.ts:15`。实际 content box 内居中窄列题名+述名行；原 cover 资产槽提供满幅衬底，空则现役纸色。窄列通过既有 note_ref 换行，不加竖排机制。
- **简明式封面**：`shared/types/notePresets.ts:7`、`client/src/pages/Notes/canvasEngine/noteCoverPresets.ts:18`。横排题名+述名行，使用笔记现役 title/description 绑定。
- **封面应用**：`client/src/pages/Notes/canvasEngine/layers/NoteCoverPageControls.tsx:67`、`hooks/useNoteCanvasRuntimeController.ts:756`（后者同 canvasEngine）。两款按钮只在封面语境；`applyCoverPreset.ts:21` 复用/补足普通 note_ref 与 placement，`:49` 接现役 undo/redo。套后可编辑，保留其他块和图；失败补偿与跨笔记护栏见审计回执。
- **手册式装订**：`shared/types/notePresets.ts:20`、`client/src/pages/Notes/canvasEngine/layers/NoteBindingPanel.tsx:60`、`layers/NoteChromeLayer.tsx:763`（后者同 canvasEngine）。眉中=套用时笔记题、脚中=第 N 纸、脚右可填；现役 save/PUT 直接落库，保留 cover/coverPage，普通设置继续可改。
- **模板抽屉**：`client/src/pages/DesignStudio/TemplateDrawer.tsx:21` 同源实物缩略，`:61` 只读库存与过滤，`:68` 三款列表；`DesignStudio.tsx:45` 接线。无套用/创建/保存动作；贴纸、部件抽屉未动。

### 形状与出生公约

现役 suite 是皮肤组合，不承载块摆放/装订。本轮仅新增 `shared/types/notePresets.ts` 静态出厂目录：封面项 `id/name/kind/title/description/layout/underlay`，装订项 `id/name/kind/header/folio/footer`，以及三款合并列表和装订 materializer。应用产物仍为普通 `note_ref { field }`+manual placement 或现役 NoteBindingSettings；无新持久化表列、schema、API 或块型。

预设外观零新增字面值：字体与字号走 title/label/document 角色，纸/墨走现役 token；`NoteRefBlockProjection.module.css:19` 替换旧字号硬编码；缩略使用同源 skin/material/typography 消费器、现役 SuiteDrawer 样式。placement 尺寸取 frame/inset、现役块宽常量与比例配方，不写死纸幅。无新增 `--sk-` token。页码「第 / 纸」为工单指定格式文案，不是外观值。`NoteRefBlockProjection.tsx:13` 每次 render 测高，覆盖切换配方及只换字体/字号。

### 测试与环境

- **client 全库：236 文件，2431/2431，通过，零排除**。直接 client `vitest run --maxWorkers=2`，不放宽 timeout；原始 `client-full-direct.log/.json`。定向 9 文件在最终全库内 **182/182**，覆盖两配方落位、重复套用、undo/redo、套后编辑、失败补偿、迟到 restore、三款真缩略和无库存应用动作。
- **server：111 文件零排除，600000ms/文件**，含 v13WildernessExecute 与本地真 OCR；**1120 tests / 1118 pass / 2 fail / 0 skipped / 0 cancelled**。两败分别为 `v2SourceMineruWiring` 的 `python.exe ENOENT`（stdout 61969/61992）与 `v2SourceRegionCells` 的 pinned Python 退出 101（62832）；按 T5 补遗一报环境阻断，留 HQ 机复验。
- `server/src/__tests__/v14NoteBinding.test.ts:167` 新增普通功能用例：共享预设→真实 PUT→GET/DB 关闭重开→手改 PUT→重开一致；该文件 **7/7**，新增用例 pass（stdout 27344）。未新增 server 测试文件或安全对抗用例。
- 非 git/secrets **25/25 组件最终通过**，最终退出码与补跑见验证门记录；git 检查与 secrets 两组件留 HQ。最终 client 构建已通过。
- 私有基建分账：最初仓根 npm 包装吞掉 maxWorkers，导致两次全库资源争用失败（原始保留）；改为直接 client Vitest 后全绿，没有改项目配置/断言/超时或排除文件。server runner 沿用 T6 隔离与 npm_execpath 先例，未改现役 runner。

### 未做项与交接

浏览器隔离 fixture 验证了三款缩略与四字衬线手册题名完整显示，截图落审计目录；未操作用户库。浏览器连接后来中断，后续实际编辑/装订动作未冒记完成；落库与可编辑性由功能测试证明。无真实系统打印/PDF 栅格、无主观验收。

未做 git 写操作、用户库/真实远程模型调用、新工具/prompt/Agent 写权/权限配置/TextFlow schema/坐标契约/Relation 判定域/新依赖/新安全对抗用例/合成凭据；无关开工改动未处理。封面多次普通写入失败时补偿，切换笔记即停止后续写入；不是新增原子事务。长题名仍由普通块编辑调整。说明书的新入口与库存事实已列审计回执，交 Fable 守门同步；Python 两项与 git/secrets 两组件留 HQ 收口。
