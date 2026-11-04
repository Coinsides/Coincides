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

## Result(builder 回执区,候填)
