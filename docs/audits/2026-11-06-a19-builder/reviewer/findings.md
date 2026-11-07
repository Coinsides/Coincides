> **状态 (Status)**: active
> **层 (Layer)**: 审计 / Reviewer 发现（A-19 builder 交付复核）
> **日期 (Updated)**: 2026-11-08

# A-19 · 图片 Source 的笔记是空的 —— Reviewer 复核

**总判**：五条设计裁定都在包里落实了，Main_Designer 点名的八条读码都成立，没有🅰确认项。
- **最要紧的第一条成立**：`text_view` 只对 `native-image` 为 false，其余所有 parser_key 都给 true；客户端只认 `=== false`，并且要求 `supported` 为真。岛上旧的 PDF、docx 部署后不会丢掉文本视图。
- **Tester 点名的渐进式 JPEG（SOF2，0xC2）**：读取器认，但没有测试守着。

另有四条新发现，都是🅱：
- 一条设计问题，候裁：固定原页之后，旧图片投影上已有的解释层在页面模式里够不到；
- 一条测试缺口；
- 一条读取器缺口，与 builder 已申报的同类；
- 一处加载时的闪烁。

**对象与方法**：
- 快照：ops `packages/a19-image-pages/src/`，15 个文件，`sha256sum -c src.sha256` 15 行全部 OK。包外未改动的文件对 `fdeacb5d` 读。
- 只读，没跑测试，也没构建。
- 行号前缀：
  - `P:` → `server/src/services/sourcePageImages.ts`
  - `Z:` → `server/src/services/sourceImageSize.ts`
  - `V:` → `client/src/pages/Notes/canvasEngine/hooks/useSourcePageViewController.ts`
  - `L:` → `client/src/pages/Notes/canvasEngine/sourcePageLayout.ts`
  - `AT:` → `server/src/__tests__/a19SourceImagePages.test.ts`

## 发现

| # | 判 | 建议级 | 位置 | 发现 |
|---|---|---|---|---|
| J1 | 疑似 | 🅱（设计问题，候裁） | `V:79`、`V:183`；`NoteRuntimeDocumentLayer.tsx:102`、`:139`（fdeacb5d）；`sourceProjectionPolicy.ts:14-18`（fdeacb5d） | **固定原页后，图片投影上已有的解释层在页面模式里看不到，Agent 聚焦到块上也没有反应。**<br>• **哪些东西**：投影笔记的正文只读，但允许解释层（`allowInterpretationLayers: true`）。算作「用户工作」的有批注、内容组、purpose、显示覆盖（`courseLifecycle.ts:54` 起，fdeacb5d）。<br>• **怎么够不到的**：`pagesOnly` 时，页面模式下 `active` 恒为真（`V:183`），写作面由原页层接管（`NoteRuntimeDocumentLayer.tsx:102`、`:288`）。A-19 之前图片笔记停在文本视图，用户可能在上面做过批注或内容组。部署后这些在页面模式里看不到、也改不了：数据还在，入口没了。<br>• **Agent 聚焦**：Agent 聚焦某个块时，`:139` 调 `setMode('text')`，但对图片笔记这改不动 `active`，请求悄无声息地落空。<br>• **红线**：涉及「Agent 能编辑的，人类必须 100% 都能编辑」——Agent 若在图片投影上写解释层，人在页面模式里看不到。<br>• **建议**：请 Tester 在冻结的旧库上数一下 parser_key 为 `native-image` 的投影笔记上 active 的 `annotation_truths`、`content_groups`、`purposes` 各有几条，以判断是否成立；都是 0 的话，影响只剩以后的写入。 |
| J2 | 确认 | 🅱 测试缺口 | `Z:54`；`AT:53-69`、`AT:73-76`、`AT:64` | **读取器有四个分支没有测试守着。** 测试只造了 SOF0 的 jpeg（`AT:69`）、VP8X 的 webp（`AT:76`）和大端（MM）的 EXIF（`AT:64`）。下面四个分支读码都对，但没有测试：<br>• SOF2（渐进式，Tester 点名）：0xC2 在 C0–CF 范围内，不在排除之列（`Z:54`）；<br>• webp 的 VP8L（`Z:71-74`）；<br>• webp 的 VP8 有损（`Z:76-78`），这是网上最常见的 webp；<br>• 小端（II）的 EXIF（`Z:22-25`），不少手机用这种。<br>建议各补一条，造法照现有的 `jpegOf` / `webpOf`。 |
| J3 | 疑似 | 🅱 读取器缺口（与 builder 申报的 webp EXIF 同类） | `Z:13-16` | **PNG 的 eXIf 方向也不读。** 带 eXIf 方向（5–8）的 PNG，若浏览器按它转正，登记的宽高就是对调的，比例会错。浏览器对 PNG eXIf 的处理我没有核实，和 webp EXIF 那条同样不确定。建议并进同一条「已知」。 |
| J4 | 疑似 | 🅱 体验（加载时一闪） | `V:79`、`V:183-184`；`NoteCanvasRuntime.tsx:52-54`（fdeacb5d） | **打开图片笔记时先闪一下文本视图。** 登记还没到时 `register` 为 null，`pagesOnly` 为假，记住的视图默认是 `text`。于是开头一瞬会先出现一个近乎空白的文本视图，带切换按钮和转换提示；登记到了才跳到原页，按钮消失。不是死路，只是闪一下，是否处理由 Main_Designer 定。 |

## 点名清单逐条

**① `text_view` 缺省链：确认无误**
- **服务端**：`P:526` 写的是 `text_view: materialization.parser_key !== IMAGE_PARSER`。
  - 基线里全部的 parser_key：`native-pdf`、`native-docx`、`native-text`、`native-image`、`stored-only`（`sourceFileIntake.ts:79-198`），以及 `mineru`（`sourceMineruParser.ts:20`）。
  - MinerU 只接 pdf（`sourceFileIntake.ts:180`），所以图片一律是 `native-image`；其余每一种都给 true，md、txt 走 `native-text`，也是 true。
- **每个出口都带这个字段**：`getSourcePages` 的两个出口都展开了 `identity`（`P:532`、`P:548`）；`requestSourcePageImages` 返回的就是它（`P:579`）。
- **不落库**：没有任何写入路径，每次请求现算。
- **客户端**：`V:79` 是 `Boolean(register?.supported) && register?.text_view === false`。
  - 字段缺失，或 `supported` 为假（text、stored-only、没有转换器的 docx），都不会进 `pagesOnly`。
  - `NOT_A_SOURCE`（`V:18-20`）不带这个字段，按 true 处理。
  - 类型上它是可选字段（`sourceApi.ts:55-56`）。

**② 尺寸读取器：确认无误（测试缺口见 J2）**
- **png**：读 IHDR 的宽高（`Z:15`），前面先查长度 ≥ 24 和签名（`Z:14`）。
- **jpeg**：
  - 跳过 0xFF 填充字节（`Z:47`），跳过独立标记 TEM、RST0–7、SOI（`Z:49`）；
  - 段长先检查，越界返回 null（`Z:51`）；遇到 SOS 就停（`Z:60`）；
  - SOF 取 C0–CF，排除 C4、C8、CC，**包括 SOF2**（`Z:54`）；
  - 高在段首 +5、宽在 +7（`Z:56-57`），合乎规范，所需长度有保证。
- **EXIF**：
  - 要求以 `Exif\0\0` 开头，II、MM 两种字节序都认（`Z:20-25`）；
  - IFD 和条目都做了越界检查（`Z:27`、`Z:31`）；
  - 0x0112 是 SHORT，值在条目 +8，两种字节序都读对了（`Z:33`）；
  - 方向 5–8 时宽高对调（`Z:34`、`Z:58`），与浏览器 `<img>` 默认按 EXIF 转正一致；客户端没有任何地方设 `image-orientation`（基线 grep 为空）；
  - EXIF 缩略图里的 SOF 位于 APP1 段内，会随整段按长度跳过。
- **webp**：
  - VP8X 取画布宽高：从 24、27 开始各 3 字节，再 +1（`Z:70`）；
  - VP8L 先验签名 0x2f，再取 14+14 位（`Z:72-74`）；
  - VP8 先验起始码 9d 01 2a，再取 14 位宽高（`Z:77-78`）；
  - 整体长度至少 30（`Z:67`），所有读取都在范围之内。
- **宽或高为 0 → null**（`Z:86`）。没有会抛异常的读法；就算抛了，也有逐页 catch 兜住（见 ③）。

**③ 读不出尺寸时，不会让整条导入失败：确认无误**
- render 抛错（`P:134`）→ 逐页 catch 记进 `failedPages`（`P:381-384`）→ 结尾登记为 `failed`（`P:392`）。
- 外层 catch 只写进度，不碰 materialization（`P:393-406`）；调度永不 reject（`P:449-458`）。
- 导入路由走后台：`sources.ts:148` → `scheduleSourceMaterialization` → `setImmediate`。而且是先发布投影，再 `await scheduleSourcePageImages`（`sourceMaterialization.ts:480-487`，fdeacb5d）。
- 没有找到会让整条导入失败的别的路径。

**④ 页图是原字节；ON CONFLICT 时旧文件的去向：未找到问题**
- **原字节**：`P:128-139` 返回的就是原 buffer；`P:221-225` 由 `rendered.image` 定扩展名和 mime；`P:231-232` 原样写入。
- **ON CONFLICT**（`P:246-249`）现在会更新 storage_key、filename、mime_type。但 key 实际上不会变，因为：
  - 资产 id 由 materialization 和页号决定；
  - 同一个 materialization 的原件不会变（重投影保留同一个 materialization 和文件，见 `P:485` 的注释），扩展名又是由内容嗅出的；
  - PDF 恒为 `.png`，和改动前一样。

  所以「key 变了、旧文件留着」的情况实际不会出现。理论上若扩展名变了，旧文件不由这里删。

**⑤ 删源与重投影：确认覆盖**
- **删源**：
  - `releaseNoteCanvasAssets(projection_note_id)`（`sourceLifecycle.ts:164`，fdeacb5d）按 origin_note_id 释放投影笔记的全部资产。原页图的 origin 正是投影笔记（`P:261`），在覆盖之内。
  - `sourcePageImageAssetIds`（`:173`）兜底 origin 丢失的情况。
  - 文件在提交后才删。
- **重投影**：
  - 先删旧笔记，origin 置空（`sourceReprojection.ts:127`）。
  - 再由 `adoptSourcePageImages`（`P:487-500`）把这个 materialization 的全部原页资产的 origin 改到新笔记。旧笔记已经删掉，不会残留。
  - 之后补缺（`sourceReprojection.ts:139`）：已有且文件仍在的页跳过（`P:374`）。

**⑥ `setMode` 守卫、强制与依赖数组：确认无副作用**
- **`setMode` 本身**：与 `fdeacb5d` 相同（`V:150-155`）。删掉的那行守卫只存在于共享树的草稿里，不在基线中。
- **外部调用方**：唯一一处是 `NoteRuntimeDocumentLayer.tsx:139` 的 Agent 聚焦。对图片笔记，它只会记下 `text`，`active` 不受影响（由此带来的问题见 J1）。
- **`active` 的强制与 `textAvailable`**：`active` 的强制在 `V:183`，`textAvailable` 在 `V:184`。只有 `NoteCanvasRuntime.tsx:52-54` 和 `NoteRuntimeDocumentLayer.tsx:102` 读它们。
- **依赖数组**：默认判决 effect 的依赖数组加了 `pagesOnly`（`V:148`），只多了一次提前返回。
- **宽度上限**：`L:31` 的上限是 `min(pageWidth, image_width)`。PDF、docx 的页图宽 1240，而 `MAX_PAGE_WIDTH` 是 904（`L:5`），所以 PDF 不受影响。内联 `width` 优先于 CSS 变量，页仍然居中（`NoteSourcePagesLayer.css:9-21`）。

**⑦ 物化器未动：确认**
- `sourceProjectionMaterializer.ts` 不在 15 个文件之内，canvas image 对象的产出没有变。
- 「三份字节」的申报与代码相符（资产命名 `P:224-225`，origin `P:261`）。

**⑧ 15 个文件之外有没有漏改的调用方：未找到**
- 在基线里 grep 了 `text_view`、`SourcePageRegister`、`source-page-image`、`sourcePageImageAssetIds`、`source_pages`。读到它们的地方要么在包内，要么不受影响：
  - `routes/sources.ts:199` 只是原样转发登记；
  - `sourceLifecycle.ts:173` 和 `sourceReprojection.ts` 按 id 释放资产，与 mime 无关。
- 没有地方假设页图一定是 png：服务端只有 `pngSize` 做这个假设，而它只在没有 `rendered.image` 时才走（`P:221`）。
- 也没有业务代码按「每个 Source 一份资产」计数，只有两条测试的预期跟着改了。
- 图片 Source 现在也排进唯一的页影像队列（`P:449`）。导入时那次 `await` 发生在后台任务里，并且在发布之后，所以页影像排在大 PDF 后面也不会拖住导入接口。等待期间这个 Source 的 `scheduled` 键会一直占着，但它已经 materialized，不会需要重试。

## 附注
- 「服务端 PDF 返回 `text_view: true`」由 `vpsF11SourcePageImages.test.ts` 的整对象比较守着；「客户端缺字段当 true」由 `useSourcePageViewController.test.tsx` 的 `register({})` 守着。两者的行号见 builder 回执。
- builder 申报的两个缺口（SOF 高度为 0 时由 DNL 段给出、webp 内的 EXIF）读码成立。J3 与它们同类，建议并进去。
