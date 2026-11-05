> **from**: Main_Designer(Claude/Fable 会话)
> **to**: 临时工程对话1(builder)
> **status**: ready(Henry 2026-11-04 口令「你去设计一下…直接把单派出去」,口令即翻牌)
> **日期**: 2026-11-04
> **性质**: 保真 1a-乙期 · docx 入页与快照阅读 —— grow-by-use 期第二单

## 0. 背景与设计裁定

Henry 实测抽取还原不满意(金融 docx:公式蒸发、排版丢失、**每个块下面挂一条 Source chip 极丑**)。设计裁定(Main_Designer,依 Henry 本轮口述):

- **阅读面 = 原件快照(不可编辑),文本投影降级为引用/锚层。** Henry 原话:「引用源…我甚至都可以接受它不可编辑…快照会更现实一点而且更保真」「有页数的文档,每页的内容和原件保持一致,格式也尽量保持一致,图片或提取不了的东西截图放在相应位置」——快照方案整页即截图,天然满足。
- **路径 = 1a 工单负空间里预铸的那条**:docx 经 LibreOffice 转 PDF 前置,**完全复用 1a 页影像通路**(source_pages/canvas_assets/NoteSourcePagesLayer 全套,零新视图)。
- **1b(云转写/bbox/十角色)继续缓**:本单是「快照保真」不是「转写保真」;mammoth 文本投影语义⛔动;docx 段落→页的映射属转写层,⛔本期做(docx 文本块的 chip 本期仍无页码无跳转,靠 D3 收敛其噪音)。
- 范围:**PDF 与 docx 保真先行,md/txt 检验钉死**;pptx/html/图片不在本单。

红线照旧:⛔一切 git 写操作;⛔读 .env key 值;⛔真实模型调用(LibreOffice 是本地二进制不是模型,照 MinerU 注入模式测);⛔动依赖锁(不新增 npm 依赖);⛔新队列;⛔扩修。新 server 测试必须同批挂载(TD-22)。证据落 `docs/audits/2026-11-04-fidelity-1a2-builder/`,口径=summary+全部红条目原样 TAP 段+红文件单跑原样输出;**走查观察当轮落盘**。超出小中型量级的件,停件上报。

## D1 · docx→PDF 转换前置 + 页影像(server,本单主件)

**现状坐标**:页影像白名单 `PAGE_IMAGE_PARSERS = {native-pdf, mineru}`(sourcePageImages.ts:19);docx 走 native-docx(mammoth),无页概念;1a 管线=发布后渐进逐页渲 1240px PNG 入 canvas_assets+source_pages,全局串行队列、崩溃可续(resumeSourcePageImages)、managed_file_cleanup_jobs 兜底;MinerU 有现成的「外部命令注入」测试模式(COINCIDES_MINERU_COMMAND_JSON,v2SourceMineruWiring.test.ts)。

**要做**:
1. **转换器接入**:可配置外部命令(照 MinerU 模式设计 env,形如 `COINCIDES_DOCX_PDF_COMMAND_JSON` 或 soffice 路径变量,具体形制你定、回执申报),语义=`soffice --headless --convert-to pdf` 到受管临时/派生目录;120s 超时;**转换发生在页影像任务内部**(该队列本就全局串行一次一文档——⛔另起信号量⛔新队列);
2. **派生 PDF 落位**:作为该 materialization 的派生文件受管存储(⛔新 source_record),登记 cleanup 兜底;删源级联必须连它和页影像资产一起清;重投影(rematerialize)后页影像过继逻辑(adoptSourcePageImages)对 docx 同样成立,派生 PDF 失效则重转;
3. **页影像复用**:对转换成功的 docx,跑既有 pdf 渲染管线(pdf-parse getScreenshot),source_pages 写页数+pdf_width/height(取自派生 PDF);白名单/supported 判定/generate 路由(POST /:id/pages/generate)对「native-docx 且可转换」放行;
4. **失败与缺席的诚实降级**:环境无转换器→行为如今天,区分码(如 409 converter_unavailable,措辞候你定);转换失败→page_images status='failed' 带错误,既有 Generate/Retry 按钮可重试;**文本投影永不受影响**(转换挂了笔记照读);
5. **崩溃恢复**:转换中被 kill→重启 resume 续做(派生 PDF 不完整则重转;幂等)。

**验收**:含公式+图片的 docx 导入→投影笔记可切「原页」,逐页影像与原件一致(公式图片可见);旧库 docx 点「生成原页影像」走通(按需转换);无转换器环境回退如今天;转换失败可重试;删源后派生 PDF+页影像资产零残留;kill-resume 幂等。测试照 MinerU 注入模式(假命令产出固定 PDF fixture);**真 LibreOffice 冒烟可选**(本地有 soffice 则跑一次真转换入证据;岛上真跑归 Main_Designer 部署时)。

## D2 · 快照为默认阅读面(client,小件)

现状:1a 的「文本/原页」切换,documentTabsStore 记忆各 tab 停留视图(不持久化)。

**要做**:源投影笔记打开时,**若原页可用(supported 且已有任何页)且本 tab 无视图记忆→默认进「原页」**;用户切换后记忆照旧优先;原页不可用(无转换器/生成中 0 页/非源笔记)→文本,如今天。

**验收**:新导入 docx/PDF 首开即见原页;切到文本再切回,记忆不被默认值覆盖(1a 段2 修过的 stale-jump 一族⛔回归,相关测试照跑)。

## D3 · Source chip 收敛(client,小件,治 Henry 截图里的丑)

现状:BlockSourceReferenceLayer 给每个带回执的块渲一条常显「Source (p.N)」chip——每行一条,Henry 判「非常丑陋」;docx 的 chip 更是光秃「Source」无页码无跳转。

**要做**:chip 默认不渲染占位;**块 hover/focus-within 时浮现**(原功能原样:有页码可跳原页,无页码仍可走 legacy anchor 查看);键盘可达(可聚焦元素,⛔纯 hover 断无障碍);隐藏态不占行高。全部投影笔记生效。

**验收**:正文阅读时无 chip 噪音;悬停任一块出现其 chip 且跳转功能不回归;键盘 Tab 能触达。

## D4 · md/txt 保真检验(小件)

**要做**:给 native-text/markdown 投影补「忠实性」测试钉:正文零丢失、markdown 标题/列表结构正确落块、中文内容无编码损伤。只钉不改;发现超出「钉」的缺陷→申报,⛔顺手扩修。

**验收**:测试绿;若有申报,逐条带复现。

## 交付与复核

一批交付(D1 主件,D2-D4 小件),Result 照常写单尾+短讯;Main_Designer 跑对抗复核,修净收割、第十七轮部署(岛上 LibreOffice 安装归 Main_Designer 运维侧)。

---

## Result(builder 2026-11-04)

**执行状态**:D1-D4 全部完工,未提交。全程零真实模型调用,未碰用户库与岛库,没有新 npm 依赖、新队列、新信号量、新迁移。

**最要紧的一条:本机没有 `soffice`,真转换一次都没跑过。**测试和走查用的都是假命令,产出固定 PDF。所以验收里的「逐页影像与原件一致(公式图片可见)」**没有验到**,只验了转换器前后的整条通路。这一条只能在你装好岛上 LibreOffice 后才算数。

**闸与全量**(`gates.txt`、`server-full-suite.txt`、`client-full-suite.txt`、`red-files-alone.txt`):
- 两侧 tsc 0 / 0;5 项 check 都过;`check:test-wiring` 仍是既有 9 个未挂载,两个新文件已挂进 `test:v2`,不在名单上。
- 服务端全量 1276 过 1274。红 2 条:既有 harness(单跑仍红);`K-4`(单跑 5/5,载荷敏感族)。
- 客户端全量 2580 过 2576。红 4 条,单跑全过:
  - 3 条 5 秒超时:`BoardPage.smoke` 1 条、`PaginationProjection` 2 条。
  - **`useChapterPresentation` 1 条不是超时,见申报 1。**
- 全量之后我只把测试里的标记变量改了名(secrets 扫描误伤),新套件重跑 16/16。

### D1 · docx 入页

- **形制**:`COINCIDES_DOCX_PDF_COMMAND_JSON` 是 JSON argv 模板,占位符 `{input}`、`{outdir}`、`{profile_url}`,不走 shell。未设或格式不对都视为没有转换器(格式不对只警告一次)。不探测 PATH,不设就不启用,行为可预期。`COINCIDES_DOCX_PDF_COMMAND_TIMEOUT_MS` 只给测试用,默认 120 秒。
- **岛上建议值(没跑过,候你验)**:`["soffice","--headless","-env:UserInstallation={profile_url}","--convert-to","pdf","--outdir","{outdir}","{input}"]`。转换器读到的文件名固定是 `source.docx`,输出必须是 `source.pdf`。**岛上还要装中文字体**,否则中文 docx 的页影像很可能走样。
- **转换在哪跑**:在 `renderMissingPages` 内部,也就是既有的全局串行页影像队列,没有另起队列。转换超时会杀进程树,复用 MinerU 的 `terminateProcessTree`。子进程只拿到环境变量白名单,拿不到我们的 key。
- **派生 PDF**:存到 `<user>/derived/<source_file_id>.pdf`,没有新 source_record,也没有迁移,路径由文件 id 算出。先写 `.derived-runs/<uuid>/`,校验后原子改名。
- **删除与兜底**:删源时走 `settleManagedFileTask`,删不掉就留 cleanup job。启动时 `sweepDerivedDocxPdfs` 清掉崩溃遗留的运行目录和孤儿文件。
- **降级**:
  - 无转换器:`supported=false`,状态读作 `none`,无切换;generate 路由返回 409 `source_pages_converter_unavailable`。
  - 转换失败、超时、无输出或输出不是 PDF:`page_images` 落 `failed` 带错误,文本投影不受影响,既有 Retry 可重试。
- **崩溃恢复**:完整的派生 PDF 复用;截断的重转;能过快速校验但打不开的重转一次。
- **重投影**:页影像过继不变;派生 PDF 丢了,只有缺页时才重转。

**阳性对照**(scratch 副本,共享树未换码,`positive-controls.txt`):
| 去掉的东西 | 红 |
|---|---|
| 转换后的 `stillWanted` 复查 | 删源中途那条 |
| 删源清派生文件 | 2 条 |
| 环境变量白名单 | 1 条 |
| 复用完整派生 PDF | 恢复那条 |
| docx 放行 | 13 条 |

### D2 · 默认进原页

没有 tab 记忆、`supported`、已有页时进原页,并写入记忆,这样 `rememberPage` 不会把 mode 写回 text。每篇笔记只判一次。1a 段 2 那组 stale-jump 测试全过。

**我定的**:
- **生成中 0 页**:先显示文本,继续等。第一页到达时,如果读者还没滚动就切到原页;已经滚动的留在文本并记下。这样「首开即见原页」对正在转换的新 docx 也基本成立,又不会把正在读的人拽走。
- **有等待中的 Agent 聚焦请求时不切**,否则目标块会被藏起来。

**代价**:打开时会先闪一下文本视图,等 register 返回才切;没有做遮挡。

**改了 1 条旧测试**:`remembers the view per tab` 里的 note b 原本靠「无记忆=文本」,现在显式给它记忆。

### D3 · chip 收敛

默认 `opacity:0`、绝对定位,不占行;块 hover 或 focus-within 时浮现。外层 `tabIndex=0`,所以没有动作的 chip 也能键盘到达。原有跳转未动,走查里点「Original page」正常落到第 3 页。

**量级比单面写的大,请重点看**:
- 占行高的不只是组件,分页和测量也在预留。所以我去掉了 `pageFlowSourceReferenceHeight` 和 `typographyMeasurementService` 里的 +34,`firstFragmentExtraHeight` 现在恒为 0。**这会改变所有带 source 引用的笔记的分页和块高,不只是投影笔记,页数可能变少。**
- **改了 2 条钉旧合约的测试**:`notePageFlowService` 和 `typographyMeasurementService`,另外改写了 `BlockSourceReferenceLayer` 的预算断言。
- **打印和导出不再带 chip**,这是我加的 `display:none`,请确认。
- 高块用粘性定位。纸面在缩放(`transform`)内时粘性位置不准,1024 宽下 chip 停在窗口中部而不是工具栏上方;最坏情况是停在块自己的右下角,很高的块上可能在屏幕外。键盘仍可达。
- chip 离块右边 44px,避开浮动的 Groups 按钮(这个宽度下原本被它挡住)。
- 悬停时 chip 会盖住块右下角的一小段文字;用户笔记编辑时 focus-within 也会显示,可能盖住正在打的最后一行。

### D4 · md/txt 钉子

5 条全过(`fidelity1a2TextFaithfulness.test.ts`)。只钉不改,**发现以下缺陷,未修**:
1. **标题层级丢失**:`# ` 和 `###### ` 落库后都只是 `block_type='heading'`。`markdownBlocks` 算了 `heading_level`,但发布时没存,`textFlowContent` 和 block metadata 都不带。复现:上传含 `# A` 和 `###### B` 的 md,查 `note_blocks`,两行无差别。
2. **列表不分块**:`- 一\n- 二` 是一个 paragraph 块,保留字面标记。单面写「列表结构正确落块」,这条**不满足**;测试钉的是现状(文字和顺序零丢失)。
3. **代码围栏和引用不解析**:` ``` ` 和 `> ` 作为字面文本留在段落里。

正文零丢失、中文和 emoji 无损、CRLF 不丢字都钉住了。这三条是否进 1b 请你定。

### 申报项

1. **`useChapterPresentation` 这条红没查明**:全量里 `expected 'page-a' to be 'page-b'`,不是超时;同一全量的上一轮没有红,单跑连续 4 次全过。它的路径和 D3 的测量改动相邻,所以我不能排除是我引入的时序敏感。判断成负载只是推断,请复核时看这条。
2. **全量抓到一个我引入的真问题,已修**:第一版删源时无条件清派生文件,让 `v2SourceLifecycleClosure` 红 2 条(卸载钩子多调一次)。改成文件存在才清,重跑通过。
3. **没有真实 kill**:崩溃恢复是用「改状态 + 截断文件」模拟的,没有真杀服务进程。**服务进程被杀时,正在跑的 soffice 不会被连带杀死**,可能遗留进程;启动清扫只清目录。
4. **队列占用**:一个 docx 转换最多占队列 120 秒,期间其他文档的页影像都要等。zip 里多个 docx 会串行转换。这是单面要求的形态,4C8G 上的实际耗时没测。
5. **岛上存量 docx**:不会自动转换,要在笔记里点「生成原页影像」。部署时**不设环境变量就等于这个功能没开**。
6. **没验到**:真 LibreOffice;分页形态的 chip 条在浏览器里的表现(走查的投影都不走这条路径,只有组件测试);真实键盘按 Tab(走查是脚本移焦点,另有组件测试);D2 从「转换中」切到原页只有组件测试。
7. **环境已复原**:`.claude/launch.json` 与备份一致,scratch 副本已删。

**沿途所见(未动)**:`check:test-wiring` 既有 9 个未挂载;`cjk-mixed.pdf` 在 scratch 库里页影像状态是 `failed`,是旧数据,没有追。

**证据**(`docs/audits/2026-11-04-fidelity-1a2-builder/`):`browser-walkthrough.md`(走查当轮落盘)、`gates.txt`、`server-full-suite.txt`、`client-full-suite.txt`、`red-files-alone.txt`(只删了迁移进度行)、`server-targeted.txt`、`positive-controls.txt`。

---

## 复核判语(Main_Designer 2026-11-05,依 Tester 中间稿 review-tester.md)

**总判**:无 major。D1 主路径与 D2 放行,D4 钉子放行。builder 的数字全部属实。**D3 整件撤回。**

### 裁定一 · 撤回 D3

D3 是本单的小件,Henry 下单后已明说「那 source 这个东西其实不用治呀」,理由是快照路线本身就避开了这个问题。复核查明它的实际代价:改动所有带引用笔记的分页(每块 56px,不是申报的 34),3 条 minor,11 条 note,其中包括 Agent 生成笔记打字时 chip 盖字、拖选丢批注入口、打印丢页码、旧笔记首开静默写 frame_id。而 D2 落地后,PDF 与 docx 默认进原页,文本视图和 chip 不再是默认所见。收益已被 D2 拿走,代价还全在,所以撤回。

**由此作废**:T-D3-1/2/3、T-D3-N1 至 N11、T-E-1、T-E-2,以及 Tester 列为待裁的「打印不带 Source p.N」「D3 把浮层扩到可编辑笔记」。
**代价如实记**:md/txt 投影,以及 docx/PDF 手动切到文本视图时,每块下面的 chip 仍在(与现状一致,不是回退)。若 Henry 使用中再报,另开窄单,只作用于只读投影,不碰分页。

### 裁定二 · 其余待裁项

| 项 | 裁定 |
|---|---|
| T-D2-1(记忆写反)并 T-D2-N1 | **修**,见补丁 P2 |
| T-D2-D2(「未能完整转换」横幅压在原页上方) | **修**,只在文本视图显示,见 P3。原页就是原件,在它上面说转换不全是误导 |
| T-D1-N9(转换器 exit 0 无 PDF 时查不到原因) | **修**,见 P4。第一次真上岛最需要这行 |
| 部署清单第 3 条(closePromise 无上限,可能挂住全局页影像队列) | **修**,见 P5。发生概率低,但一旦发生所有页影像停到重启 |
| T-D2-N6(规则③测试缺口) | **补**一条单行用例,并入 P2 |
| T-D2-2(原页下 Agent 拿不到所在页) | **不进本轮**。Henry 现阶段不用 Agent,面板本身候退役庭 |
| T-D2-D1(Ctrl+P 打的是丢公式的文本投影) | **不进本轮**,作为已知墙告诉 Henry:要原样打印,下载原件打 |
| T-D2-D3、D4(默认原页下看不到批注;F5 回原页) | **不进本轮**,告诉 Henry:批注和铸 item 要切文本视图。由使用决定要不要改默认规则 |
| h1-h3 映射 | **不进本轮**。我此前预判「大概率补丁就修」,收回:它对 docx、PDF 零效果,只让 md 受益,不该拖住 docx 公式上线。第十七轮后另开 md 解析小单 |
| useChapterPresentation 红 | **放行**,判环境负载,D3 对它不可达(且 D3 已撤)。修测试单入 tech-debt |
| Agent 聚焦远处块落空的矛盾 | **候 Tester 独立裁定**,结果出来再定是否进补丁 |

### 补丁单(builder,一轮交付)

- **P1 撤回 D3**:`NoteDetail.module.css`、`ParagraphFurnitureDecoration.tsx`、`BlockEditorLayer.tsx`、`BlockSourceReferenceLayer.tsx` 及其测试、`measurementService.ts`、`notePageFlowService.ts` 及其测试、`pageFlowSourceReferenceService.ts`、`typographyMeasurementService.ts` 及其测试,恢复到 HEAD 内容(可用 `git show HEAD:<path>` 取内容写回,⛔其他 git 写操作)。回执附这些路径 `git diff --stat` 为空的输出。
- **P2**:`useSourcePageViewController` 的 `enabled` 加 `note?.id === noteId`(`NoteCanvasRuntime.tsx:25-26`)。补回归测试覆盖「投影直达另一篇未开 tab 的投影」;申报它对 T-D2-N1 是否生效(Tester 未验);补 T-D2-N6 单行用例。
- **P3**:`SourceConversionNotice` 只在文本视图渲染。Source 行徽标和详情提示不动。补测试。
- **P4**:转换器校验失败时也打印 `outputTail`(`sourceDocxPdf.ts:118-121,149`)。
- **P5**:等 `closePromise` 加上限(进程已退出或已被杀之后最多等 5 秒,超时按失败落盘,队列继续),`sourceMineruParser.ts:433`、`sourceDocxPdf.ts:116`。用假命令(后代进程持有 stdout)做阳性对照。若发现超出小活量级,停这一件上报。
- **收尾**:全量复跑,证据按「summary + 红条目原样 TAP + 红文件单跑原样输出」。在 **v2 新库**上补真鼠标走查(上一轮走查跑在 v1 形态库),当轮落盘。Result 补一句 Arm E 现为 14 红。

红线照旧:⛔git 写操作(P1 的取内容除外)、⛔真实模型、⛔新依赖、⛔扩修。

### 收割时 Main_Designer 自办

三个未跟踪新文件一并入库(漏 `sourceDocxPdf.ts` 岛上启动失败);补操作手册(T-E-5);tech-debt 补载荷敏感族条目(K-4、wilderness#16、useChapterPresentation,此前只记在账本和单据,current-state 里没有,我曾说「已挂名录」说重了)。部署严格照 review-tester.md「部署清单」八条:先手工跑命令,先装字体再设 env,设完抽查 supported=true。

## 补丁 Result(builder 2026-11-05)

**执行状态**:P1-P5 全部完工,未提交。全程零真实模型调用,无新依赖,未碰用户库与岛库。git 只用了 `git show HEAD:<path>` 取内容和只读命令。**真 LibreOffice 仍未跑过**,走查用的还是假命令。

**P1 撤回 D3**:11 个文件(单面 9 类)恢复到 HEAD。`git diff --stat` 对这些路径输出为空,原样在 `patch-gates.txt` 开头。

**P2**:`NoteCanvasRuntime` 的 `enabled` 加上 `note?.id === noteId`。
- **T-D2-1 已修**:新增 `NoteCanvasRuntime.sourceView.test.tsx`,覆盖「投影直达未开 tab 的投影」。走查:直达后滚到第 2 页,切走再回来,仍在原页第 2 页。
- **T-D2-N1:在我走的这条路径上生效。**转换中的 docx 文本视图滚到 800,切到 md 投影,等转换完成再回来:150 到 2500 毫秒采样,`scrollTop` 全程 800,350 毫秒起按钮亮在 Text,没有跳原页。限制:滚动是脚本设的,返回走 hash 不是标签页点击,没有在未修代码上跑同样的浏览器对照,所以「修好了」来自 Tester 的原报告加这一次观察。
- **T-D2-N6**:补了 `pending` 单行用例。

**P3**:`SourceConversionNotice` 只在 `!sourcePageView.active` 时渲染,Source 行徽标和详情提示未动。测试和真鼠标走查都确认:原页无提示,切文本出现,切回消失。没有原页的 Source 仍显示。

**P4**:转换器 exit 0 但校验失败时也打印 `outputTail`。`runConverter` 改为返回输出。

**P5**:`terminateProcessTree` 等 `closePromise` 最多 5 秒,超时销毁输出流并抛错。docx 路径落 `failed`,队列继续,重试成功,都有测试。量级没有超,没有停件。
- **对照的坑**:Windows 上直接后代会被进程树清理杀掉,不会挂起。要脱离进程树的孙进程才能复现,测试因此用孙进程持有输出。
- **改的是共享函数,MinerU 路径也受益**:那边的调用方已有 catch,会落 `internal_interrupted`。这是读代码得出的,MinerU 路径没有专门的持有输出用例;`v2SourceMineruWiring` 全过。
- **按单面语义的代价**:即使 PDF 已经产出,只要有进程占着输出 5 秒,这次就算失败。

**阳性对照**(scratch 副本,共享树未换码,`patch-positive-controls.txt`):
| 去掉的东西 | 结果 |
|---|---|
| P5 的上限 | 红 1 条:该失败的变成 `complete` |
| P4 的打印 | 红 1 条 |
| P2 的 id 校验 | 红 1 条 |
| P3 的条件 | 红 1 条 |
| 规则③的 `pending` | 红 1 条 |

三组客户端对照第一次跑是环境没搭好(「no tests」,副本缺 `client/test`),不算数。文件里留了这条记录,下面是补全副本、基线 3/3 通过后的重跑结果。

**补记**:上一轮 Arm E 现为 14 红,不是回执写的 13 红(`positive-controls.txt` 早于删源修复)。

**全量**(`patch-server-full-suite.txt`、`patch-client-full-suite.txt`、`patch-red-files-alone.txt`):
| 套件 | 结果 | 红条目 | 单跑 |
|---|---|---|---|
| 服务端 1278 条 | 过 1277 | 既有 harness | 仍红 1 条 |
| 客户端 2584 条 | 过 2581 | `BoardPage.smoke`、`PaginationProjection` 各 1 条 5 秒超时 | 全过 |
| | | `BoardPage.selection` 1 条 | 7/7,连跑 3 次都过 |

K-4 这轮全量是绿的。

**闸**(`patch-gates.txt`):两侧 tsc 0 / 0;5 项 check 都过;`check:test-wiring` 仍是既有 9 个未挂载,新服务端测试都已挂载。

**申报项**:
1. **`BoardPage.selection` 是这轮新红,不是超时**:`Unable to find ... "Selected projection controls"`。单跑 3 次都过。撤回 D3 后客户端差异只剩 `useSourcePageViewController`、`NoteCanvasRuntime`、`SourceConversionNotice` 和测试,我判断是负载,但只是推断,没查明。上轮的 `useChapterPresentation` 这轮没红。
2. **v2 走查结果**(`patch-browser-walkthrough.md`,当轮落盘):文字块确实走分页分支(60/60、3/3);chip 回到常显;点 PDF 第 3 页 chip 的「Original page」落到第 3 页。**上一轮 `browser-walkthrough.md` 里 D3 的行随撤回作废。**有两次 N1 尝试因页面没滚动作废,已记录未计入。
3. **没验到**:真转换及公式保真;Linux 分支的 `terminateProcessTree`;P5 的真 soffice 场景。
4. **环境已复原**:`.claude/launch.json` 与备份一致,scratch 副本已删。走查用的库和脚本只在 scratchpad。

**证据**(`docs/audits/2026-11-04-fidelity-1a2-builder/`):`patch-gates.txt`、`patch-server-full-suite.txt`、`patch-client-full-suite.txt`、`patch-red-files-alone.txt`(只删了迁移进度行)、`patch-positive-controls.txt`、`patch-browser-walkthrough.md`。

## 补丁轮裁定(Main_Designer 2026-11-05)

- **Agent 聚焦远处块落空**(恢复滚动排在聚焦滚动之后,HEAD 既有,D2 推上默认路径,minor):**不进本轮**。Henry 现阶段不用 Agent,无数据损伤,重发一次就中,也不挡 docx 公式上线;Agent 面板本身候退役庭,不值得再开一轮施工和核验。修法(`NoteRuntimeDocumentLayer.tsx:139` 在 `setMode('text')` 前调 `takeTextScroll()`,回归测试用按帧先进先出的 rAF 桩)收割时入 tech-debt。
- **T-P-1**(撞上持有输出时转换器输出不打印):**不进本轮**。部署清单第 7 条已要求上岛先手工跑转换命令,首次排错不靠这行日志。入 tech-debt。

## 终局判语(Main_Designer 2026-11-05)

Tester 补丁轮核验通过(review-tester.md「收口结论」),放行收割。**T-P-6 接受**:窄路丢一次阅读位置,无数据损伤,且比修前干净(修前会串到别的笔记),入 TD-47,不再开补丁轮。T-P-7、T-P-8 同入 TD-47。未验项如实带上岛:可见窗口、生产构建、真 LibreOffice、Linux 杀进程分支,部署时按「部署清单」逐条过。
