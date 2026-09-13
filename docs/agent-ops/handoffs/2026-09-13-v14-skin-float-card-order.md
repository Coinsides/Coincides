> **状态 (Status)**: done（补遗一 materialPreset 修约完成；HQ 收口项见末尾 Result）
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-13
> **单号**: V14 之交批 · 单2 · 「笔记外观」浮卡 v1+存为套装
> **上游**: `analysis/2026-09-13-appearance-benchmark-survey.md`(**交互规格权威**:§二浮卡十条+不变量 1/2/3/4/5/6/10/11)+会议记录 09-12 §一/§二(浮卡纸即预览/存为套装,Henry 拍)

# 单2 · 「笔记外观」浮卡 v1 + 存为套装

**性质**:B1e 的外观下拉面板升级为非模态可拖浮卡;新增用户套装(调完命名保存)。浮卡=钉住态第一个活原型(纯 UI 浮窗⛔入 placement,09-11 裁定)。

## 一 · 浮卡壳(报告 §二十条逐条执行)

1. 生命周期:单实例常开跨选区存活,只被 X/Esc 关(**⛔换选区/点纸自动关**——反 Figma 头号痛点);
2. 实时应用零确认,纸即预览(卡内⛔预览区);
3. 单列窄卡 ~280px,高上限 ~60vh 内部滚动;⛔为塞内容加宽(泄压阀=将来设计室);
4. 顶部通栏 header=唯一拖动区(标题+折叠 chevron+关闭 X);
5. 吸附仅两件:松手 clamp 视口内(边距 8px)+近边 16px 磁吸;
6. 折叠=卷帘收标题条(双击 header/点 chevron);
7. 100% 不透明⛔淡出;点卡上控件⛔夺纸焦点,点卡内文本框才夺;
8. ⛔穿透⛔自动躲避;
9. 位置+折叠态 localStorage 跨会话;首开锚「外观」钮旁,此后用记住位置;恢复必 clamp;
10. 纯 UI 浮窗:⛔placement⛔持久化到笔记数据。

## 二 · 浮卡内容(自上而下)

1. **头部**:当前绑定名(「暖纸」或用户套装名)+**偏差标记**(不变量 11):被改离绑定值的 token 列偏差小签,逐项「还原」+「全部还原」;换绑不清洗偏差(Word 原则);
2. **快选条**:出厂四预设+用户套装卡(Custom 区,置出厂后但视觉分区,报告不变量 6 的本地化:出厂在前更合我们四预设既有心智——**卡=自渲染微缩纸样**(用各卡真实 token 现渲小纸:标题线+正文行,⛔静态图);当前态选中框;**hover=整纸真预览,移开还原;点击=应用**(不变量 4/5);hover 预览=临时注入 style ⛔落库,300ms 防抖;
3. **token 编辑区**:九 token 各一行(名+当前色块),点色块=**统一取色器**(单1 交付件)弹出;改动即落纸(经现役 save 通道);
4. **部件开关区**:五开关(含 headerRule)照现役枚举,改动即生效;
5. **「存为套装…」**(不变量 1,example-first):极小对话框=名字(唯一必填)+微缩纸样预览+存/取消;存后新卡**立即出现在快选条 Custom 区且处于选中态**,闭环零跳转。

## 三 · 用户套装(新真相)

1. **迁移 071**:`skin_suites(id, user_id, name, tokens_json, components_json, created_at)`(origin 不需要——出厂四预设仍是代码常量⛔入库);
2. **契约扩展**:SkinSelection.preset 值扩 `suite:<uuid>`(shared+server validator 同步,B1e 台账先例);resolveSkin 解析套装(套装缺失=**静默按最后解析值降级**——detach 合同,不变量 2:实现口径=删套装事务把全库绑定改写为该套装的 tokens/components 快照 overrides);
3. 人面路由:GET/POST/PATCH/DELETE `/api/skin-suites`(名 1-64;删=detach 事务);⛔Agent 面(V14 皮提案批);
4. 右键菜单(低频收纳,不变量 6):重命名/删除/**「更新套装为当前样子」**(Update to Match Selection 语义:把当前纸的解析值写回套装,绑定者全跟);
5. **单开关裁定**(不变量 10):套装=tokens+components 单一整包;⛔"只存颜色不存部件"的半套开关。

## 四 · 入口切换

「外观」pill 点击=开/关浮卡(B1e 下拉面板退役,其快选与 SkinEditor 逻辑迁入浮卡;More 菜单零动);Settings 一行默认外观维持现状零动。

## 五 · 台账义务

挂载期新请求 `GET /api/skin-suites`:全夹具台账普查+client 全库必跑(常备条款);NoteChromeLayer 工具条测试同步(B1e 先例)。

## 六 · 禁区

⛔动九 token 词汇表;⛔placement/钉住机制(浮窗纯 UI);⛔Agent 面;⛔碰统一取色器内部(只消费);⛔安全类测试;⛔碰 .git;⛔commit;⛔读 .env key 值;⛔用户库接触。

## 七 · 验收

1. typecheck+build 三端绿;test-wiring/tech-debt-table/受影响静态门绿;
2. 定向新增:①浮卡壳十条(常开跨选区/clamp/磁吸/折叠/位置记忆)②hover 真预览(hover 注入⛔落库,移开还原,点击落库)③存为套装闭环(存→Custom 现卡→选中态)④套装 detach 事务(删套装→绑定纸解析值逐字不变)⑤更新套装为当前样子⑥偏差标记与还原;skin 族回归绿;server 全量+client 全库绿;
3. 冒烟(隔离库+真浏览器):开浮卡→拖动 clamp→折叠→hover 四预设纸面实时换装→改 token(经取色器绑池色)→存为套装→切走再切回→删套装纸面零变→重开会话位置记忆;
4. 证据落 `docs/audits/2026-09-13-floatcard-builder/`;git/secrets HQ 收口补跑。

## 八 · 申报义务

Result 必含:交付清单+numstat、十条壳规格逐条完成态、detach 实现口径、hover 预览实现口径(⛔落库证明)、台账普查、测试数字、未做项。冲突停线举证⛔自作主张。

## Result

> **From**: codex(builder) · **日期**: 2026-09-13
> **结果**: partial / pending-decision。保持 ready，**未翻 done**。

浮卡、071迁移、suite契约与人面CRUD、detach事务、更新套装、现役入口和夹具适配已落树；完整回执见 [builder-result](../../audits/2026-09-13-floatcard-builder/builder-result.md)。真实浏览器发现规格冲突：暖纸存成suite后颜色保留，但纸纹/阴影/墙材质丢失；现役材质依赖preset身份，tokens/components六字段套装合同无法记录它。已向Henry提出可选materialPreset修约，未获答前不自扩契约，见 [材质举证](../../audits/2026-09-13-floatcard-builder/material-contract-blocker.md)。

**交付及numstat**：新SkinFloatCard/CSS/geometry/测试、useSkinSuites/store测试、runtime持续宿主测试；shared/validator/resolver及Note/Board/Project保存集成；071表、suite validator/service/routes/server测试；27处既有夹具/脚本登记；隔离服务与审计证据、对象清单生成件。62个source/test/script/生成件逐文件见 [delivery-files.json](../../audits/2026-09-13-floatcard-builder/delivery-files.json)。41文件有空基线或保存字节，机械核对已知子集 **+1817/-55**；其余21个既存文件未留本单开工字节，numstat明确null，完整Git numstat由HQ补，未伪造数字。审计产物与本Result另列。

**十条壳完成态**：①单实例跨选区/当前纸loading存活，X/Esc/入口控制；②实时save、纸即预览；③280px/60vh内滚，真浏览器尺寸通过；④只有header拖动；⑤释放clamp8px、近边16px磁吸；⑥双击/chevron卷帘；⑦opacity1，按钮保焦、文本输入正常，原生系统控件暂借焦点后归还的兼容另有定向记录；⑧无穿透/自动躲避；⑨位置与折叠localStorage记忆、恢复clamp；⑩纯UI、不入placement/笔记。逐条证据与边界见完整回执。

**detach**：SQLite immediate事务普查users.settings.skin/courses.skin/notes.metadata.skin（含垃圾箱）/boards.skin，合并当前套装与每消费者覆盖，按各owner池色冻结为完整字面overrides/components，保留其他字段后删除；任一点失败全回滚。DELETE带同事务palette快照，客户端tombstone保留最后值，前后外观写与删除双向排序，防旧引用写回。材质身份缺口另列，未以tokens相等替代完整外观不变。

**hover**：300ms只进useNoteSkin临时renderedResolved/style，不调用save；离开/关闭/折叠/换纸清除。真实浏览器四预设hover时纸换色，数据库仍warm-paper，前后API账本无外观写请求，见 [冒烟证据](../../audits/2026-09-13-floatcard-builder/browser-smoke.md)。

**台账/测试**：154个原有client测试文件普查，53处API mock、24处严格guard、27个消费者/预注册点、7个合成API适配器；未知请求仍报错。客户端全库157文件/1632测试绿，晚到浮卡交互变更补验14/14通过。服务端非安全全量56文件460项原457通过/3失败，manifest环境修正补跑2/2通过，仍余Python ENOENT与MinerU启动101两处环境失败；最终套装7/7。shared/server/client正式构建、test-wiring77/77、tech-debt-table及其余18个允许runtime段均绿，最后UI修正后的client构建与docs:check也exit0。细表与原日志见 [最终验证收据](../../audits/2026-09-13-floatcard-builder/final-validation.md)。

**未做项**：materialPreset修约待答；两处Python/MinerU环境阻断；修约后最终树重启的完整浏览器冒烟；真实触屏复验；完整numstat、git/secrets与3个安全测试交HQ。未commit/push/PR，未改统一取色器内部/九token词汇/placement/Agent面/权限文件/More内容/Settings默认外观界面，未读真实key或碰用户库。开工完整读工单前误执行一次只读git status，之后无git调用或写入，已在审计回执记录。

---

## 补遗一(HQ 裁定,2026-09-13 三轮:materialPreset 修约,准)

材质举证成立:存套装丢纸纹/阴影/墙材质=违背"把纸的当前样子存下来"的用户期待。裁定:

1. **准 `materialPreset` 修约**:SkinSelection 与 skin_suites 各加可选字段 `materialPreset`(枚举=四出厂 preset id)——语义=**材质谱系指针**(记录派生自哪个材质世界),⛔自由材质参数⛔新 token——B1d"材质=预设内部参数"立法零动,只是让套装记得自己的出身;
2. 渲染:材质取 `materialPreset ?? preset`;存为套装时自动记当前生效材质谱系;detach 快照携带(删套装→消费者 SkinSelection 写入该 materialPreset,外观完整不变——"逐字不变"标准从 tokens 升格为**完整外观**);
3. shared+server validator 同步(台账先例);修约后补:真浏览器复验"暖纸存套装→切走→切回→删套装"全链纸纹阴影墙材质零变;
4. 两处 Python/MinerU 环境红=既档,申报即可;3 个安全语义测试+git/secrets=HQ 收口;完成后 Result 更新翻 done。

## Result（补遗一完成）

> **From**: codex(builder) · **日期**: 2026-09-13
> **结果**: done。补遗四条已施工并复验；上方 partial Result 留作裁定前历史，不再表示当前阻断。HQ 保留抽检与放行权。

**交付及 numstat**：shared SkinSelection / SkinSuite / 创建、更新、删除回执及 server validator 同步增加可选 `materialPreset`，只接受 `default` / `quiet-ink` / `warm-paper` / `workbench`。新增迁移 072 为既有 071 表加可空 `material_preset`，不重写旧迁移；旧行缺谱系保持默认材质。Note root/portal/print、阴影裁切及 Board 均按解析后的 `materialPreset ?? preset` 取材质。存套装和「更新套装为当前样子」自动记当前生效谱系，小样使用真实材质；修复小样内联 background 简写覆盖纸纹的问题。补遗 source/test/script 共 **25 文件 +293/-84**，全部基于本轮编辑前保存字节，逐文件计数和 SHA-256 见 [material-delivery-files.json](../../audits/2026-09-13-floatcard-builder/material-delivery-files.json)。这是补遗增量，不能与上轮 62 文件子集数字直接相加；全单 Git numstat 仍交 HQ。详见 [客户端回执](../../audits/2026-09-13-floatcard-builder/material-client-result.md) / [服务端回执](../../audits/2026-09-13-floatcard-builder/material-server-result.md)。

**谱系与 detach**：解析优先级为 selection 显式谱系 → 所绑套装谱系 → 工厂 preset → default；旧套装不按颜色猜来源。普通套装绑定只记 suite 身份，持续跟随套装更新；显式换绑清除旧快照谱系，颜色/部件偏差保持。删除事务继续覆盖 users.settings、courses、notes（含垃圾箱）、boards，按 `skin.materialPreset ?? suite.materialPreset ?? 'default'` 写回消费者，并冻结完整颜色及部件；DELETE 回执和客户端 tombstone 同步携带材质，回滚和写队列排序保持。验收标准已从 tokens 相等升级为**完整外观不变**。

**十条壳完成态**（上轮定向覆盖本轮全库再次执行）：①单实例常开跨选区/当前纸 loading；②实时应用、纸即预览；③280px / 60vh 内滚；④header 唯一拖动区；⑤8px clamp / 16px 磁吸；⑥双击或 chevron 卷帘；⑦opacity 1、按钮保纸焦点、文本框可输入；⑧无穿透/自动躲避；⑨位置与折叠态 localStorage 记忆且恢复 clamp；⑩纯 UI，不入 placement 或笔记数据。真浏览器本轮重验了打开、拖至 (8,8)、折叠至 42px、刷新后位置/折叠恢复，原完整壳证据见 [builder-result](../../audits/2026-09-13-floatcard-builder/builder-result.md)。

**真浏览器完整外观**：最终产品代码在新隔离库重启，Chrome 实做「暖纸 → 统一取色器绑定阅读/蓝 → 存为暖纸蓝墨 → 切工作台 → 切回套装 → 删除 → 刷新」。保存后、切回后、删除后、刷新后，对纸面与墙相关 22 个真实 DOM 节点（含全部子节点及 ::before/::after）每阶段 **13,200 个计算样式值**和全部键集与保存前深比较均完全相等；截图检查纸纹、阴影、墙材质零变。删除后的持久记录含 `materialPreset: warm-paper`，刷新排除仅靠内存保持的假通过。另实做 Update to Match，套装谱系及小样随当前暖纸更新。见 [浏览器复验](../../audits/2026-09-13-floatcard-builder/material-browser-smoke.md) 与 [完整相等收据](../../audits/2026-09-13-floatcard-builder/material-full-style-equality.json)。

**hover 零写与台账**：300ms 临时 renderedResolved 同时预览颜色/部件/材质，离开恢复，不走 save。真浏览器四出厂卡分别显现对应材质，当前选中态和前后数据库均保持 quiet-ink，区间非 GET 请求为 0，见 [零写收据](../../audits/2026-09-13-floatcard-builder/material-hover-no-writes.json)。本补遗没有新增挂载期 API；沿用上轮 154 个原 client 文件、53 处 API mock、24 处严格 guard、27 个消费者/预注册点、7 个合成 API 适配器普查。本轮全库覆盖全部 157 文件，未知请求仍报错；服务端直接 suite 表使用点已普查，072 升级兼容有测试。

**测试数字**：shared/server/client typecheck 与正式 build 最终均 exit 0。client 定向 6 文件 83/83；全库 157 文件、1644 项首跑 1643 通过、1 个旧 detach 精确断言未预期新增谱系，补齐该测试夹具/断言后该文件 12/12 通过（仅改测试，不声称全库重新跑过）。server skin/palette/suite 22/22，其中 suite 9/9；非安全全量同 56 文件补验 **462 项、460 通过、2 失败、0 跳过**，剩余仅补遗许可申报的 Python ENOENT / MinerU 101。首轮额外 14 项失败由隔离目录误置仓库内触发现役存储保护造成，换新系统临时目录后全绿，未改生产代码或断言。`verify:v2-bn8-runtime` 的 21 个允许段已逐段执行，构建及唯一 client 失败以补验收口，其余段通过；未运行含禁区的总聚合命令。原始失败日志保留，综合见 [补遗最终验证](../../audits/2026-09-13-floatcard-builder/material-final-validation.md)。

**未做项与禁区**：两处 Python/MinerU 环境红按补遗申报；真实触屏、全单 Git numstat、3 个安全语义测试及 git/secrets 交 HQ。本轮无 git/commit/push/PR，无真实 key、用户库或权限文件操作；未改九 token 词汇、自由材质参数、统一取色器内部、placement、Agent 面、More 或 Settings 默认外观界面。合成名称/邮箱/口令值不超过 20 字符；UUID 契约标识按既有格式保留。现有 64/65 字符套装名合成测试已移除，本轮不声称重验长名边界，生产上限仍为 64。隔离浏览器标签和服务已关闭。

---

## HQ 收口(fable,2026-09-13)

builder 留给 HQ 的三项全部落地,单2 正式关门:

1. **三个门控语义测试(v2DevQuickLogin T-1/2/3)红——已破案,非产品缺陷**:根因=测试夹具以 `jiti/register` 拉起 server,而 jiti 对当前规模的模块图冷启动需 35-45s(重载下更久),超夹具 30s 就绪线;逐组件探针全绿、全量静态 import 探针全绿、真 index.ts 双 loader 均可就绪(tsx 3.2s / jiti 41.9s)排除了死锁与产品逻辑问题。此前"managedFileCleanup 二分嫌疑"判为探针超时抖动噪声(该文件零顶层 await)。修复:夹具 spawn 换 `tsx`(与全套件同 loader,测试断言的是 quick-login 门控语义而非 loader 选型)+就绪线 30s→60s 留载荷余量;三测 3/3 绿(整套件 24s)。
2. **连带修复 dev 启动(P0)**:`npm run dev` 同因(672add3 当年因 tsx Windows ESM 路径 bug 换 jiti;tsx 4.19 该 bug 已不复现,本机双验证)——dev 换 `node --import tsx`,就绪 4.5s(原 40s+);保留 `dev:jiti` 回退位。
3. **git/secrets 与全量**:server 全量 76 文件 **493 测 492 过 1 红**;唯一红=`v2SourceMineruWiring` K-5 超时收容路径在高载下分类漂移(`internal_interrupted`≠`parser_failure`),同文件隔离复验 **5/5 绿**——挂 flaky 名录观察位(载荷敏感族,与单2零交集:该文件本单未动,原四红名单中即在);证据目录按单1 精度裁至 2.2M(裁去原始日志目录/基线快照/超限样式转储,判据文件全留);git diff --check+secrets 扫描入收口单链。

单2 交付(浮卡 v1 十条壳+套装+materialPreset 谱系)以 builder Result 数字为准收讫。
