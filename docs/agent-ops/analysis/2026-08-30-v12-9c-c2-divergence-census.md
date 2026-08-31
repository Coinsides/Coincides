> **状态 (Status)**: active（实验层分歧普查；四分类程序已于实跑前冻结）
> **层 (Layer)**: 分析 / Analysis（V12.9c · c-2 两家只读分歧普查）
> **日期 (Updated)**: 2026-08-30
> **权威 (Authoritative)**: 否（证据归档；裁定来自 Fable，由 Claude 工程调度会话转写）

# V12.9c c-2：MinerU × Docling 分歧普查

## 0. 纪律与计数语法

- 本单只做【实验层】：只读比较 12.9a 已有的 MinerU 与 Docling 全卷产物；**没有重跑任何转写器，没有迁移，没有生产码或测试改动**。
- 本单是【零成本】实验：**未调用任何模型，未使用任何 API key，未产生任何花费**。
- 本单只回答分歧形态、各类条数及逐条字段证据；不作比例、优劣、门槛或持久层设计评价，也不产生任何置信度字段。
- 计数按三个固定谓词 `P-TEXT` / `P-STRUCT` / `P-NULL` 分栏申报；若出现跨谓词合计，同一张表同时列明各谓词各自的计数与射程，不把不同射程的数字藏进一个总数。
- 证据本体 `D:/Coinsides/v12.9-selection/**` 全程只读；普查脚本与输出只落仓外临时目录，完整配方逐字归档于本文。

## 1. 样本与证据边界

### 1.1 两家同四卷产物

| 卷 | MinerU 文件 / 字节 / fragments / SHA-256 | Docling 文件 / 字节 / fragments / SHA-256 |
|---|---|---|
| academic-reading | `ielts-academic-reading-sample-tasks-2023.fragments.json` / 116,092 / 320 / `75593ef6fe92d9102655df27445dbf29c4ea9cba19055960443cf9264964d9ec` | 同名 / 134,532 / 351 / `68e20a28d7e809143f13ad157755c6fa9fb38a73484c00dd1c075380779c1b1e` |
| writing-example-responses | `ielts-academic-writing-example-responses-to-parts-1-and-2-with-band-scores-and-examiner-comments.fragments.json` / 25,830 / 69 / `976be41236c303a3534bb0cbb2588404342e914dda0e3cc6a51340d256ba6e4f` | 同名 / 26,723 / 63 / `793609d4cac220d56c58dfacdd14109b19a8453434e4fa39beda022eb830266e` |
| academic-writing | `ielts-academic-writing-sample-tasks-2023.fragments.json` / 63,446 / 152 / `d935ae28a3d56095ea12845b1e7997207cb3fe262fb1a31e272a5c3610304f71` | 同名 / 64,448 / 154 / `90860546ef7a748cb7197449f5be268dea678e4b2ffba7a6b4b03bd14d74afb8` |
| listening | `ielts-listening-sample-tasks-2023.fragments.json` / 77,053 / 267 / `15624fce57fd29b108748ecc3db4747e0bece03afce2d380520068ef8576f048` | 同名 / 88,844 / 306 / `a5d927a4abc2c2b11f0d676c296d6d1824d970e97d008ebac21c19046f40706a` |

现物边界：8 份文件都是 UTF-8 JSON 顶层数组；每个 fragment 恰有 `anchor / role / seq / text`。MinerU 的 anchor 恰有 `bbox / page / page_size`，Docling 的 anchor 恰有 `bbox / charspan / page`。两家产物中均**没有** `type`、`image_path`、`html` 字段；逐条证据会把这些字段记为“不存在”，不会从别处推算补值。两家 `seq` 均从 0 连续、唯一、无洞。产物环境以钉住的 `uv.lock` 为界：MinerU `3.4.5`，Docling `2.123.0`。

### 1.2 开工整树哈希

确定性配方：递归枚举 `D:/Coinsides/v12.9-selection` 的全部普通文件（含隐藏文件），以正斜杠相对路径作 ordinal 排序；每行写 `relative_path<TAB>byte_length<TAB>lowercase_file_sha256<LF>`（UTF-8 无 BOM），再对整份逻辑清单取 SHA-256。命令不落 manifest 文件。

- 文件数：**94,935**
- 总字节数：**3,149,405,801**
- 逻辑清单字节数：**14,624,025**
- 开工整树 SHA-256：`efebe29dfdfa4c1762ad95abc70c9a9f6085c8573d9029ee9fcfedf8484fad0d`

## 2. 四分类程序（冻结于实跑之前）

**冻结时刻**：见冻结段后的 SHA-256 收据；该时刻早于任何两家内容比较实跑。

<!-- FROZEN_CLASSIFIER_START -->
### 冻结程序原文

#### A. 输入、校验与处理顺序

1. 输入只能是以下两个目录中 basename 一一相同的 4 对 `*.fragments.json`：MinerU=`D:/Coinsides/v12.9-selection/tools/_out/c2-mineru/`，Docling=`D:/Coinsides/v12.9-selection/tools/_out/c1-docling/`。处理顺序固定为：`academic-reading` → `writing-example-responses` → `academic-writing` → `listening`。
2. 每份文件必须是 JSON 数组；每条必须恰有 `anchor / role / seq / text`。`seq` 必须是从 0 开始的连续唯一整数；`role` 必须是字符串；`text` 只能是字符串或 null；`anchor.page` 必须是整数，`anchor.bbox` 必须是 4 个有限数值。MinerU 还必须逐条有 2 数值 `page_size`，Docling 还必须逐条有 2 数值 `charspan`。任一不成立即记停线，不开始分类。
3. `type`、`image_path`、`html` 只按当前 fragments 现物验存在性；字段不存在就输出 `field_present=false`，不查 `middle.json`、图片、原 PDF、其他中间件或生产码来补值。全程禁止凭肉眼看图断言。
4. 先为每一卷机械建立三条互斥配对谓词，再按 `(卷顺序, canonical_page, 两家最小 seq, 谓词顺序)` 排序事件。谓词顺序固定为 `P-STRUCT` → `P-NULL` → `P-TEXT`。分类只按这个事件序列前进；第一条“未归类”出现时立即停止，不分类或计数其后的事件。

#### B. 固定字段投影（跑完不改）

1. **role 对照表**只有以下映射：MinerU `title→heading`、`text→text`、`list→list`、`index→index`、`image|chart→visual`、`table→table`；Docling `section_header→heading`、`text|footnote→text`、`list_item|checkbox_unselected→list`、`document_index→index`、`picture→visual`、`table→table`。表外 role 不猜，记“未归类”并停线。原始 `role` 始终随逐条证据保留；映射后的同义词本身不算分歧。
2. 每条保留四种文本投影：`R`=JSON 中原始 `text`（null 保持 null）；`H`=是否在 `R` 中机械命中 HTML 起止标签；`W`=若 `H=true` 则只用 Python 标准库 `HTMLParser(convert_charrefs=True)` 顺序拼接 data，否则取原字符串，随后只折叠 Unicode 空白；`N`=对 `W` 做 Unicode NFKC + casefold，删除 soft hyphen，并删除所有 Unicode `P*`（标点）、`Z*`（分隔符）及其余 whitespace，保留字母、数字和符号。`N` 是精确字符串，不用编辑距离或相似度阈值。
3. `payload_kind` 固定为 `null | html | asset_token | plain`：null 直接为 `null`；`H=true` 为 `html`；canonical role 为 `visual` 且字符串是单个路径/文件名/32–64 位十六进制 token 时为 `asset_token`；其余字符串为 `plain`。该字段只描述产物外形，不推断图片内容。
4. 页号统一到 PDF 人类页序：MinerU `canonical_page=anchor.page+1`，Docling `canonical_page=anchor.page`。MinerU bbox 固定按 TOPLEFT `[x0,y0,x1,y1]`；Docling bbox 固定按 BOTTOMLEFT `[left,top,right,bottom]`，用同一 canonical page 上 MinerU 唯一 `page_size[1]=H` 转为 TOPLEFT `[left,H-top,right,H-bottom]`。不试第二种方位取更好结果。缺页高、同页页高不唯一、越界、退化框或非有限数值均停线。
5. 两组 anchor 称为“同一落点”，当且仅当 canonical page 集合相同，且两边每个 bbox 都在同页与对方至少一个 bbox 有**正面积交集**。仅边缘相接不算交集。数值框不同但满足该覆盖条件，只记为同一位置的轮廓差，不单独制造第五类。

#### C. 三条配对谓词及各自射程

1. **`P-TEXT`（文本序列）**：射程是 canonical role 不在 `{visual,table}` 且 `N` 非空的 fragments。按原 `seq` 建序列；相等键为 `(canonical_role,N,该键在本卷的出现序号)`，用 Python `difflib.SequenceMatcher(autojunk=False)` 作唯一、保序的一对一种子。每个非 equal opcode 从左向右处理：若两边均非空，枚举从当前游标起的非空连续前缀，找 `concat(N)` 完全相同者，按 `(两边条数之和,条数差绝对值,MinerU 条数,Docling 条数)` 最小者配组并前进；当前游标无候选，或 opcode 仅一边有条目，即“未归类”并停线。不得跨过当前 opcode 借后文凑组。
2. **`P-STRUCT`（表格/视觉块）**：射程是 canonical role 在 `{table,visual}` 的 fragments。按同卷、同 canonical role、同 canonical page 建二分图，正面积 bbox 交集为边，取连通分量。两边都有节点的分量构成一组；只有一边有节点时，仅当存在全卷唯一、`R` 非 null 且逐字相同的对侧结构块，才配成“落点候选”，否则“未归类”并停线。禁止用 null、近似文本或 role 出现次序猜配对。
3. **`P-NULL`（空文本的文本型块）**：射程是 canonical role 不在 `{visual,table}` 且 `R=null` 或 `N` 为空的 fragments。只按同卷、同 canonical role、同 canonical page 的 bbox 正面积交集建二分图并取连通分量；单边分量即“未归类”并停线。它不与 `P-TEXT` 或 `P-STRUCT` 重复计数。

#### D. 四分类定义与逐类可复核字段

1. **文本外形差异**：配对组已证同一落点、无切分边界变化，canonical role 相容，但文字/结构 payload 的呈现外形不同；包括 HTML 标记与纯文本的区别，以及同一 `table/visual` 落点的 `null/html/asset_token/plain` 外形不同。它只宣告 payload 形状不同，不宣告图片语义相同。逐条必须列：两家路径、`seq`、原始 `role` / canonical role、`R` 的类型/长度/SHA-256/转义摘录、`payload_kind`、`H`、`W/N`、`type|image_path|html` 三字段存在性、原始 page/bbox、canonical page/bbox 与交集覆盖过程。
2. **归一化差异**：配对组已证同一落点、无切分边界变化、canonical role 相容，且不触发“文本外形差异”；两边 `R` 不同但按固定程序所得 `N` 逐字相同。它只覆盖标点、点引线、空白、大小写及 NFKC 可消除的外形。逐条必须列：上述身份/字段存在性/anchor 字段，加两边 `R/W/N`、`N` SHA-256，以及从 `R→W→N` 哪一步消除了差异。
3. **切分差异**：配对组已证同一落点；`P-TEXT` 下两边 `concat(N)` 逐字相同但由每条 `N` 长度形成的累计边界签名不同，或 `P-STRUCT/P-NULL` 的同一连通分量两边 fragment 条数不同。逐条必须列：谓词射程、两家全部 `seq`、原始/canonical roles、每条 `R` 类型/长度/SHA-256/摘录、两边条数、累计边界签名（文本谓词）、全部 page/bbox/canonical bbox、交集图覆盖、以及三个缺失字段的存在性。不得仅因 `seq` 数字不同就判切分。
4. **真实指错**：已经由完全相同的非空 `N`（`P-TEXT`）或全卷唯一且逐字相同的非 null 结构 payload（`P-STRUCT`）证明是同一内容候选，但不满足“同一落点”：canonical page 集合不同，或同页 bbox 没有正面积交集覆盖。逐条必须列：内容同一性的字段证明、两家 `seq/role/R/W/N`、原始与 canonical page/bbox、MinerU `page_size`、Docling `charspan`、逐框交集结果、以及 `type|image_path|html` 字段存在性。没有内容同一性证明的单边块不得硬判本类。

#### E. 单标签判定过程与第五形态条款

1. 每一配对组只给一个标签，优先级固定：先查内容同一性与 anchor 覆盖；有同一内容证明而落点不覆盖 ⇒ **真实指错**。否则先查边界签名/分量条数 ⇒ **切分差异**；再查 HTML/结构 payload 外形 ⇒ **文本外形差异**；再查 `R` 不同而 `N` 相同 ⇒ **归一化差异**；全部字段等价且落点覆盖 ⇒ 非分歧，不入账。
2. 以下任一都不入四类，必须逐字段记为“未归类”并立即停线：单边新增/缺失块且没有唯一逐字内容对手；文本内容在固定 `N` 后仍不同；一对一 canonical role 不相容；同一事件同时需要四类之外的语义才能解释；配对不唯一；字段/页基/bbox 假设不成立。**禁止把它硬塞进最近的一类。**
3. 停线记录必须含：卷、谓词、两家相关 `seq`、`role`、`text` 类型/长度/SHA-256/转义摘录、字段存在性、原始/canonical anchor、配对候选与逐步排除过程、停止时已完成的各类分谓词计数、最后完成的事件，以及尚未进入射程的剩余卷/事件。停线后不得换规则重跑。

#### F. 输出与计数

1. 每条分歧输出固定字段：`divergence_id / document / predicate / mineru_evidence / docling_evidence / classification / decision_trace`；`classification` 只能是四个既定名称之一。停线条目单独输出 `unclassified_stop`，它是控制结果，不是新增第五类。
2. 四类条数必须按 `P-TEXT / P-STRUCT / P-NULL` 分栏，并标明每个谓词实际走到的卷、page 与 seq 射程；不输出比例，不输出谁更好，不输出阈值建议，不输出任何置信度字段。
3. 实跑报告自证固定为 `model_calls=0`、`api_keys_used=0`、`cost=0`。脚本、JSON 报告、冻结段都取 SHA-256；跑完后复算冻结段，任何字节变化即本轮无效并停线。
<!-- FROZEN_CLASSIFIER_END -->

冻结完成并取证于 `2026-08-30T23:50:40.8983329-04:00`（America/Toronto）：两枚标记之间原文共 **9,278 UTF-8 字节**，SHA-256 `6176aab080f880b928ca50632ee0f8d5187e357018b3bb90d7f6e49507d67f2f`。该值在实跑前计算；从此不改冻结段，收尾复算同一字节区间。

### 2.1 v0 的开工前审计作废记录

上方 v0 在**没有读取/比较两家正文、没有生成候选事件、没有实跑计数**时接受两路只读审计。审计发现事件页排序、①/②边界、结构块消费/去重、重复文本身份与可选字段实值等自由度会改变分类或首个停线位置，因此 v0 被判为“未执行、不可运行”，原文与收据保留且不回写修改。以下 v1 在实跑前完成修订并再次经两路只读审计；两路均确认没有仍会改变配对、四分类、首个事件停线位置或计数的自由度。**本轮唯一实际执行口径是 v1。**

### 2.2 实际执行的冻结程序 v1

<!-- FROZEN_CLASSIFIER_V1_START -->
### 冻结程序 v1 原文

#### A. 输入、校验、证据字段与唯一事件顺序

1. 输入只能是 MinerU=`D:/Coinsides/v12.9-selection/tools/_out/c2-mineru/` 与 Docling=`D:/Coinsides/v12.9-selection/tools/_out/c1-docling/` 的直接子文件。两目录中名称以大小写敏感的 `.fragments.json` 结尾者，文件名集都必须**恰好**等于下列四项，不得缺少、增加或大小写漂移，且四对文件名必须逐字一一相同：`ielts-academic-reading-sample-tasks-2023.fragments.json`、`ielts-academic-writing-example-responses-to-parts-1-and-2-with-band-scores-and-examiner-comments.fragments.json`、`ielts-academic-writing-sample-tasks-2023.fragments.json`、`ielts-listening-sample-tasks-2023.fragments.json`。卷标签与顺序固定为：`academic-reading` → `writing-example-responses` → `academic-writing` → `listening`，依次对应上述四项。目录中的其他后缀文件不入射程。
2. 运行时固定为 CPython `3.14.2`、Unicode database `16.0.0` 及该运行时的 `json/re/html.parser/difflib` 标准库实现。文件按 UTF-8 strict、无 BOM 解码；JSON 解析固定 `parse_int=int,parse_float=float`，拒绝重复 object key、`NaN/Infinity/-Infinity`、尾随内容和任意字符串中的未配对 surrogate `U+D800..U+DFFF`。每份文件必须是 JSON 数组；每条必须**至少**有 `anchor / role / seq / text`。`seq` 必须是 `0 <= seq < 2147483647`、从 0 开始的连续唯一 Python int（bool 不算 int）；`role` 必须是字符串且大小写逐字判定；`text` 只能是字符串或 null；`anchor.page` 必须是 Python int（bool 不算），MinerU 必须 `page>=0`、Docling 必须 `page>=1`；`anchor.bbox` 必须是 4 个 Python int/float（bool 不算）且转成 binary64 float 后有限。MinerU 还必须逐条有 2 个正的有限数值 `page_size`，Docling 还必须逐条有 2 个有限数值 `charspan`。任一不成立即输入停线，不生成事件、不开始分类。
3. 每条证据逐字保留 `type / image_path / html` 三个可选字段的 `field_present` 与实际 JSON value；不存在则记 `field_present=false,value=null`，不查 `middle.json`、图片、原 PDF、其他中间件或生产码来补值。全程禁止凭肉眼看图断言。其他额外字段只登记键名，不参与判定。
4. 三条互斥谓词为 `P-TEXT / P-STRUCT / P-NULL`；每个 fragment 必须且只能命中一条。先机械建立全部候选事件，但分类严格按唯一 sort key 前进：`(卷序号,event_page,min_any_seq,mineru_absent,min_mineru_seq_or_0,docling_absent,min_docling_seq_or_0,predicate_rank,member_key)`。`event_page` 是事件两家全部 canonical page 的最小值，`min_any_seq` 是两家全部 seq 的最小值；有 MinerU/Docling 成员时对应 absent 位为 0 且取最小 seq，无对应成员时 absent 位为 1 且 seq 位写 0；`predicate_rank` 固定 `P-STRUCT=0,P-NULL=1,P-TEXT=2`；`member_key` 是事件成员按 `(family_rank,seq)` 排序后的完整 tuple，`family_rank: MinerU=0,Docling=1`。上述 tuple 按 Python tuple lexicographic order 排序且对不同事件唯一。第一条“未归类”出现即停，不分类或计数后续事件。

#### B. 固定字段投影

1. role 映射只有：MinerU `title→heading`、`text→text`、`list→list`、`index→index`、`image|chart→visual`、`table→table`；Docling `section_header→heading`、`text|footnote→text`、`list_item|checkbox_unselected→list`、`document_index→index`、`picture→visual`、`table→table`。表外 role 不猜，输入停线。原始 role 始终保留；映射后的同义词本身不算分歧。
2. 文本投影固定为：`R`=原始 `text`。HTML regex 固定为 `(?is)</?(?P<tag>table|thead|tbody|tfoot|tr|th|td|caption|colgroup|col|p|div|span|ul|ol|li|br|img|figure|figcaption|h[1-6])(?:\s[^<>]*?)?/?>`。若 `R=null`，直接规定 `HAS_HTML=false,TAGS=[],MARKUP=[],W=null,N=''`，不调用 regex、HTMLParser 或 `re.sub`。否则令 `matches=list(regex.finditer(R))`，`HAS_HTML=bool(matches)`，`TAGS=[match.group('tag').lower() for match in matches]`，`MARKUP=[match.group(0) for match in matches]`。若 `HAS_HTML=true`，新建 `HTMLParser(convert_charrefs=True)` 子类实例，以 `handle_data` 回调顺序 append data，依次调用 `feed(R)` 与 `close()`，再以单个空格连接 data；否则直接取 R。随后执行 `re.sub(r'\s+', ' ', value, flags=re.UNICODE).strip()` 得 W。HTMLParser 的 `feed/close` 任一异常均为输入停线。`N` 严格依次执行：对非 null W 做 `unicodedata.normalize('NFKC',W)`；对结果 `.casefold()`；删除 U+00AD；最后从左到右删除 Unicode category 以 `P` 或 `Z` 开头或 `str.isspace()==true` 的每个 code point。N 是精确字符串，不用编辑距离或相似度。
3. `payload_kind` 固定为 `null | html | asset_token | plain`：R=null ⇒ null；HAS_HTML=true ⇒ html；canonical role=visual 且 `R.strip()` 完整命中 `(?i)(?:[0-9a-f]{32,64}|(?:[^/\\\s]+[/\\])*[^/\\\s]+\.(?:png|jpe?g|gif|webp|bmp|tiff?))` ⇒ asset_token；其余字符串 ⇒ plain。`shape_signature=(payload_kind,MARKUP)`。
4. 页号统一为 MinerU `canonical_page=anchor.page+1`、Docling `canonical_page=anchor.page`，结果必须是正整数。所有几何数值先转 CPython binary64 float；数值相等、distinct、加减、比较和交集均使用 Python float 的 exact 运算，无取整、epsilon 或容差。每个 canonical page 上 MinerU 全部 `page_size` 的 distinct `(page_width,page_height)` 集必须恰有一个元素。MinerU bbox 固定按 TOPLEFT `[x0,y0,x1,y1]`；Docling bbox 固定按 BOTTOMLEFT `[left,top,right,bottom]`，用该页唯一 page_height 转 TOPLEFT `[left,page_height-top,right,page_height-bottom]`。两家 canonical bbox 都必须无容差满足 `0<=x0<x1<=page_width` 与 `0<=y0<y1<=page_height`；不试其他方位。缺该页 `(page_width,page_height)`、distinct 集不唯一、越界、退化框或非有限值均输入停线。
5. 两组 anchor 是“同一落点”，当且仅当 canonical page 集合相同，且两边每个 bbox 都在同页与对方至少一个 bbox 有正面积交集；仅边缘相接不算。数值不同但满足覆盖只算轮廓差，不另造类别。`overlap_graph` 必须逐边输出。

#### C. 三条配对谓词及消费/去重

1. `P-TEXT` 射程：canonical role 不在 `{visual,table}` 且 N 非空。按 seq 建序列，以 `(canonical_role,N)` 交给 CPython 3.14.2 的 `difflib.SequenceMatcher(autojunk=False)`。按 `get_opcodes()` 返回顺序处理；每个 equal block **逐位置发出一个 1:1 事件**。每个非 equal opcode 从左向右：若两边均非空，只枚举各自**当前 opcode 内**从当前游标起的非空连续前缀，找 `concat(N)` 完全相同者；以 `(两边条数和,条数差绝对值,MinerU 条数,Docling 条数,MinerU 起始 seq,Docling 起始 seq,MinerU 结束 seq,Docling 结束 seq)` 的 Python lexicographic 最小者成组并前进。当前游标无候选，或 opcode 仅一边有条目，即发一个含该 opcode 两边全部剩余条目的“未归类”事件并消费剩余条目。不得跨 opcode 凑组。
2. P-TEXT 的 SequenceMatcher 只给**候选**。同 key 的跨家 bbox 图只在 `canonical_page` 相同且 bbox 正面积交集时连边。若候选所含任一 `(canonical_role,N)` 在任一家庭全卷出现多于一次，则对每个重复 key，以两家本卷 P-TEXT 射程中该 key 的**全部 occurrence**为左右节点；按 `(family_rank,seq)` 排序建图。图中每个 occurrence 都必须 degree=1；当前事件中的每个 occurrence，其唯一邻点还必须属于当前事件对侧成员，否则该事件“未归类”。重复文本绝不因出现序号或保序位置获得内容身份。对于任意 `concat(N)` 分组，另行枚举两家**整卷 P-TEXT 序列（不是当前 opcode）**中所有能产生该 concat 的非空连续区间：若两家各恰有一个区间且就是当前候选，直接通过内容唯一性守门，不要求落点；若任一家庭有多个区间，则枚举全部跨家区间对，仅当满足 B5“同一落点”的跨家区间对**恰好一对且就是当前候选**时通过，否则“未归类”。
3. `P-STRUCT` 射程：canonical role 在 `{table,visual}`。顶点恰为本谓词尚未消费的节点。先按同卷/同 canonical role/同 canonical page，以 bbox 正面积交集建二分图。每组顶点及邻接表按 `(family_rank,seq)` 排序，连通分量按其最小 `(family_rank,seq)` 排序。连通分量两侧都有节点时：若 1:n 或 n:1，整体成组；若 1:1，成组；若 m:n 且 m>1,n>1，则只有当每个节点 degree=1 且 m=n 时按 MinerU seq 升序拆成其唯一边对应的 1:1 组，否则发一个包含完整分量的“未归类”事件。所有进入这些双边分量的节点立即 consumed。
4. P-STRUCT 对尚未 consumed 的单边节点，只在同 canonical role 下，以 R 非 null 且逐字相同建立候选；仅当该 R 在两家全部未消费同 role 节点中各出现恰好一次时，建立一对“落点候选”并同时 consume 两节点。扫描顺序固定为 `(canonical_role,min canonical_page,min seq,family_rank)`，其中 `family_rank: MinerU=0,Docling=1`；consume 后不得复用。其余单边节点各自发“未归类”事件。这样同一错位对只输出一次。
5. `P-NULL` 射程：canonical role 不在 `{visual,table}` 且 R=null 或 N 为空。顶点恰为本谓词尚未消费的节点。仅在同卷、同 canonical role、同 canonical page 且 bbox 有正面积交集时连边；仅边缘相接不连边。顶点、邻接表、连通分量排序与 C3 相同。1:n/n:1 整体成组，1:1 成组，m:n 且 m>1,n>1 时仅 degree=1 且 m=n 才按 MinerU seq 升序拆成唯一边对应的 1:1，否则发一个包含完整分量的“未归类”事件。单边分量各自按 `(family_rank,seq)` 发“未归类”事件。节点消费一次且不与其他谓词重计。

#### D. 四分类的机械布尔式与可复核字段

1. 事件的 `role_signature` 定义为各家按 seq 排列的 canonical role 序列做相邻去重后的 tuple；`role_compatible` 当且仅当两家 `role_signature` 完全相同。所有四类与内部非分歧判定都必须先满足 `role_compatible=true`，否则“未归类”。`same_place` 严格等于 B5。`has_split` 对 P-TEXT 定义为两家逐片 N 的 Python `len()`（Unicode code point 数）所生成的“排除最终总长的累计边界 tuple”不同；对 P-STRUCT/P-NULL 定义为两家成员数不同。`no_split` 当且仅当 `has_split=false`。
2. **文本外形差异**：事件满足 `same_place=true,no_split=true,role_compatible=true`，并满足以下唯一 `appearance_trigger`：P-TEXT 下两家 `shape_signature` 序列不同且至少一侧 HAS_HTML=true；P-STRUCT/table 下 `shape_signature` 序列不同且至少一侧 payload_kind∈{html,null}；P-STRUCT/visual 下 `shape_signature` 序列不同且至少一侧 payload_kind∈{asset_token,null}；P-NULL 下 `shape_signature` 序列不同且（至少一侧 HAS_HTML=true 或至少一侧 payload_kind=null）。触发只说明 payload 外形，不说明图片语义。逐条列路径、seq、原始/canonical role、R 的类型/Unicode code point 长度/UTF-8 字节长度/SHA-256/转义摘录、payload_kind/HAS_HTML/TAGS/MARKUP/W/N、三个可选字段的 presence+value、原始/canonical anchor 与 overlap_graph。
3. **归一化差异**：事件满足同一落点、无切分、role_signature 相容、不触发 appearance_trigger；两家逐片 N 序列完全相同、R 序列不同。逐条列 D2 全部字段，并列 R→W→N 的首个相等阶段；若 W 已相等记“HTML data 投影和/或空白折叠后相等”，否则 N 相等记“NFKC/casefold/标点或分隔符删除后相等”。
4. **切分差异**：事件满足 `same_place=true,role_compatible=true,has_split=true`；P-TEXT 还必须两边 concat(N) 相同，P-STRUCT/P-NULL 必须来自双边连通分量。逐条列谓词、全部 seq/roles、逐条 R 摘要、两边条数、累计边界、全部 anchors/overlap_graph、三个可选字段 presence+value。seq 数值不同本身不触发。
5. **真实指错**：事件满足 `role_compatible=true`，且 `pointer_identity=true,same_place=false`。`pointer_identity` 仅在以下两种情形为真：P-TEXT 事件两边 `concat(N)` 完全相同且非空，并通过 C2 的单片/连续区间唯一性守门；或 P-STRUCT 已由 C4 的全卷双方唯一且逐字相同非 null R 建立落点候选。逐条列内容同一性证明、两家 seq/role/R/W/N、原始/canonical anchors、MinerU page_size、Docling charspan、overlap_graph、三个可选字段 presence+value。无唯一内容证明不得判本类。

#### E. 单标签优先级、非分歧与第五形态

1. 每个候选事件依次执行：配对/唯一性失败 ⇒ “未归类”；`role_compatible=false` ⇒ “未归类”；`pointer_identity=true,same_place=false` ⇒ **真实指错**；`same_place=true,has_split=true` 且满足 D4 的谓词附加条件 ⇒ **切分差异**；`same_place=true,no_split=true,appearance_trigger=true` ⇒ **文本外形差异**；满足 D3 全部布尔式 ⇒ **归一化差异**；`same_place=true,role_compatible=true,no_split=true` 且两家 R 序列和 shape_signature 序列完全相同 ⇒ 内部 disposition `non_divergence`，不输出、不计数；其余 ⇒ “未归类”。
2. 以下是明确的“未归类”触发器：单边新增/缺失且无 C4 唯一逐字对手；固定 N 后内容仍不同；role_signature 不相容；结构多对多不唯一；重复文本未过 C2；同一事件需要四类之外的语义。第一条出现即停，禁止硬塞。A2/B1/B4 的全量预检失败不生成事件，四类计数均未开始，并单独记 `input_stop` 与 `needs: claude`。
3. 未归类停线记录必须含卷/谓词/sort key、两家相关 seq/role、R 类型/长度/SHA/转义摘录、payload/可选字段实际值、原始/canonical anchors、配对候选与排除过程、停止时已完成的四类分谓词计数、最后完成事件及尚未进入的卷/事件。停线后不换规则重跑。

#### F. 输出、计数与零成本

1. 每条分歧固定输出 `divergence_id / document / predicate / mineru_evidence / docling_evidence / classification / decision_trace`；classification 只能是四个既定名称。停线条目另输出 `unclassified_stop`，它是控制结果，不是第五类。内部 `non_divergence` 不输出。
2. 计数单位固定为“完成分类的事件数”，不是 fragment/node 数。四类按 `P-TEXT/P-STRUCT/P-NULL` 分栏，附各谓词实际完成到的卷/page/seq；跨谓词合计必须与三栏同表申报。不输出比例、优劣或门槛建议，不输出任何置信度字段。
3. 报告固定自证 `model_calls=0,api_keys_used=0,cost=0`。结果 JSON 固定用 `json.dumps(result,ensure_ascii=False,sort_keys=True,separators=(',',':'),allow_nan=False)` 生成，UTF-8 strict 编码后追加**恰好一个 LF**；文件 SHA-256 覆盖这全部字节。脚本、JSON、最终冻结段分别取 SHA-256；实跑后冻结段任一字节变化即本轮无效并停线。
<!-- FROZEN_CLASSIFIER_V1_END -->

v1 冻结完成并取证于 `2026-08-31T00:11:51.3116115-04:00`（America/Toronto）：从 `FROZEN_CLASSIFIER_V1_START` 起始 `<` 到 `FROZEN_CLASSIFIER_V1_END` 末尾 `>`（两枚标记均计入）共 **15,333 UTF-8 字节**，SHA-256 `bafeb260088b036eb2be8e6f85a1d22073db8c5c1c3fa24a274d66ec49cb50be`。该时刻早于任何两家正文比较实跑；从此不改 v1 冻结段，收尾复算同一字节区间。

## 3. 实测记录

### 3.1 唯一一次实跑收据

- 执行窗口：`2026-08-31T00:36:48.3716001-04:00` 至 `2026-08-31T00:36:48.6422436-04:00`（以 canonical JSON 的创建/末次写入时间为界）。
- 输入预检：通过；两家各 4 份现有 fragments 全部按冻结 A/B 段校验，**没有重跑 MinerU 或 Docling**。
- 控制结果：`unclassified_stop`；不是 `input_stop`、`integrity_stop` 或 `runtime_stop`。
- 冻结 v1 实跑前/后 SHA-256 均为 `bafeb260088b036eb2be8e6f85a1d22073db8c5c1c3fa24a274d66ec49cb50be`，字节数均为 15,333。
- 脚本实跑前/后 SHA-256 均为 `072e5f7280aa53f18d7be9fc2cf3d8050c8b06e26a85ca9d06e7730857375269`。
- canonical JSON：119,456 bytes，SHA-256 `afdc9479311f5419f3a563073d8fc06bd12c49aab58cfd748e61283800c73045`。
- 零成本自证：`model_calls=0`、`api_keys_used=0`、`cost=0`；实验程序未调用任何模型、未读取或使用任何 API key，也未产生花费。

### 3.2 停止时的谓词射程

| 谓词 | 已完成事件 | 已完成射程 | 首个停线事件 |
|---|---:|---|---|
| `P-TEXT` | 1 | `academic-reading` / canonical page 1 / MinerU seq 0 / Docling seq 1；内部 disposition=`non_divergence`，不入账 | — |
| `P-STRUCT` | 0 | 尚无完成事件 | `academic-reading` / canonical page 1 / Docling seq 0，单边 visual |
| `P-NULL` | 0 | 尚无完成事件 | — |

### 3.3 四类事件计数（只到停线点）

计数单位是“已经完成四分类的事件”，不是 fragment 数。跨谓词合计与三个谓词栏在同表申报：

| 固定类别 | `P-TEXT` | `P-STRUCT` | `P-NULL` | 跨谓词合计 |
|---|---:|---:|---:|---:|
| 文本外形差异 | 0 | 0 | 0 | 0 |
| 归一化差异 | 0 | 0 | 0 | 0 |
| 切分差异 | 0 | 0 | 0 | 0 |
| 真实指错 | 0 | 0 | 0 | 0 |

这四个 0 **只表示首个未归类事件之前没有完成任何分歧分类**；绝不表示四卷中没有这些分歧。`unclassified_stop` 是控制结果，不是第五类，也不计入上述表。

## 4. 分歧普查与逐条字段证据

### 4.1 已分类分歧

无。唯一实跑在第 2 个全局有序事件、首个 `P-STRUCT` 事件处触发第五形态停线；因此没有合法的 `classification` 行可逐条列出。

### 4.2 未归类停线 `U-STOP-000001`

| 字段 | 现物证据 |
|---|---|
| 卷 / 谓词 | `academic-reading` / `P-STRUCT` |
| 全局 sort key | `[0,1,0,1,0,0,0,0,[[1,0]]]` |
| MinerU 成员 | 空；没有可与该事件配组的 MinerU fragment |
| Docling 路径 / seq | `D:/Coinsides/v12.9-selection/tools/_out/c1-docling/ielts-academic-reading-sample-tasks-2023.fragments.json` / `0` |
| role | 原始 `picture`；冻结映射后 `visual` |
| `R` / `W` / `N` | `R=null`（类型 null；长度、SHA、摘录均为 null）；`W=null`；`N=""`，N SHA-256=`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| payload 外形 | `payload_kind=null`；`HAS_HTML=false`；`TAGS=[]`；`MARKUP=[]`；`shape_signature=["null",[]]` |
| 可选字段 | `type`、`image_path`、`html` 均为 `field_present=false,value=null`；未从其他产物补值 |
| 额外字段 | fragment 顶层额外键 `[]`；anchor 额外键 `[]` |
| 原始 anchor | `page=1`；`bbox=[55.96143474527654,806.2902106785717,175.23270302996542,772.2433703091365]`；`charspan=[0,0]` |
| canonical anchor | `page=1`；TOPLEFT bbox=`[55.96143474527654,34.709789321428275,175.23270302996542,68.75662969086352]` |
| overlap graph | MinerU page 集 `[]`，Docling page 集 `[1]`；边 `[]`；两侧 fully-covered 均为 false；`same_place=false` |
| 停线标记 | `needs: claude` |

判定过程逐步如下：

1. 该 fragment 的 canonical role=`visual`，所以只进入 `P-STRUCT`，不进入 `P-TEXT` 或 `P-NULL`。
2. 同卷、同 canonical role、同 canonical page 的正面积交集图中没有 MinerU 节点；它是单边连通分量，不能由 C3 形成双边事件。
3. C4 只允许以“两家全部未消费同 role 节点中，各自恰好一次的**非 null、逐字相同 R**”建立错位候选。本条 `R=null`，两家的候选 seq 集都为空，因此 `pairing_ok=false`。
4. 冻结 E1 的第一道优先级就是“配对/唯一性失败 ⇒ 未归类”。后续事实同时显示 role signature 为 `[]` 对 `[visual]`、0:1 条数、无落点覆盖、无 pointer identity；但这些事实不能越过第一道守门把它硬塞成“切分差异”“文本外形差异”或“真实指错”。
5. 程序立即写下上述证据、停止计数并标 `needs: claude`；没有看图片、没有推断 picture 的语义，也没有修改规则重跑。

停线前最后完成的事件游标是 `academic-reading / P-TEXT / MinerU seq 0 / Docling seq 1 / canonical page 1`，disposition=`non_divergence`。停线后共有 768 个候选事件没有进入分类；为避免把跨谓词合计藏起来，其射程分解如下（这些是**未进入事件数**，不是分歧条数）：

| 尚未进入的卷 | `P-TEXT` | `P-STRUCT` | `P-NULL` | 本卷小计 |
|---|---:|---:|---:|---:|
| academic-reading | 299 | 26 | 1 | 326 |
| writing-example-responses | 51 | 2 | 1 | 54 |
| academic-writing | 131 | 18 | 2 | 151 |
| listening | 204 | 17 | 16 | 237 |
| 分谓词合计 | 685 | 63 | 20 | 768 |

尚未进入的第一条是 `academic-reading / P-TEXT / MinerU seq 1 / Docling seq 2`；最后一条是 `listening / P-STRUCT / Docling seq 305`。它们没有分类标签，不能据此作任何形态判断。

## 5. 我自己的测量错误

1. **v0 冻结得太早。** 我先写下并取 SHA，随后两路只读审计发现事件页排序、①/②触发边界、结构块消费/去重、重复文本身份和 `type` 实值等自由度。幸而当时没有读取/比较正文或生成事件；我保留 v0 原文与 SHA，明确作废，修成 v1 后重新双审再冻结。若直接跑 v0，首停位置和计数都可能漂移。
2. **把人类卷标签误写成 basename。** v1 草案一度把 `academic-reading` 等标签当作物理文件 basename；在冻结前对照现物发现并改为四个完整文件名逐项映射。
3. **脚本首版取错 anchor 层级。** 首次实现从 fragment 顶层取 `page_size/charspan`，而现物字段在 `anchor` 内；静态审计在任何脚本实跑前抓到，否则会产生假的 `input_stop`。修正后才取最终脚本 SHA。
4. **故障回执和合计栏首版不完整。** 静态审计发现分类途中 I/O/内存故障会被误写成“分类尚未开始”，且 JSON 起初只有三谓词格、没有同表跨谓词合计。我在实跑前补成 phase-sensitive `runtime_stop`、last-good checkpoint 与 `cross_predicate_total`，再做最终增量放行。
5. **旧档案的整树 digest 无法按现有明文配方复现。** c-1c 曾记录相同的 94,935 文件、3,149,405,801 字节和 14,624,025 清单字节，但 digest 是另一值。我测试了常见排序、大小写、字段排列与换行变体，未猜出旧实现；本单因此明确写死自己的逻辑清单字节语法，以本单开工值为基线，只用同一命令比较收尾值。该差异不被伪装成证据本体变更，仍应由上游另行核对。
6. **外层命令适配器把非零控制退出显示为 exit 1。** 脚本源码对非 complete 状态返回 2；本次外层执行器显示 exit 1，但 stdout 与已落盘 JSON 都逐字给出 `status=unclassified_stop`、相同 JSON SHA、相同冻结 SHA。为遵守“不换规则重跑”，我没有为了追外层码再执行第二次，判定以 canonical JSON 控制记录为准。

以上错误都在其影响边界内明记；前四项在正文实跑前修正并重新静态取证，第五项以本单自有前后同配方收口，第六项没有改变已落盘控制结果。

## 6. 结语与外推边界

本轮得到的不是“完整四卷分歧分布”，而是一份**可复核的第五形态停线记录**：既有 Docling 产物的首个单边 null `picture/visual`，无法在冻结四类和冻结配对规则下获得合法对手。因此按 Fable 的 K-3 裁定停线，不能新造类别、不能把 0:1 外形硬叫切分、不能把没有内容身份的块硬叫真实指错。

结论只外推到：MinerU 3.4.5 与 Docling 2.123.0 的这 4 卷既有 12.9a fragments，在冻结事件顺序中完成的第 1 个内部事件与第 2 个停线事件。它不外推到尚未进入的 768 个候选事件，不外推到其他文档、其他版本、图片语义、生产系统能力或两家整体优劣；四类全 0 也不表示四卷没有分歧。MinerU 的表格证据仍只有表级 region，不把它冒充逐单元格 bbox，也没有推算 cell bbox。

本单没有形成任何置信度字段、比例、准确率、谁更好或阈值建议；没有迁移、持久化、生产码或测试。持久层与模型点射仍留在后续门，当前停线项明确交给 `needs: claude`。裁定来源按实际记为 **Fable**（由调度方转写），不是 Henry。

## 7. 可复现配方（实跑脚本逐字归档）

### 7.1 实跑前源码收据

以下源码在任何两家正文比较实跑之前归档并静态放行。归档时刻：`2026-08-31T00:35:42.5451608-04:00`（America/Toronto）。

- 仓外实跑路径：`C:/Users/70208/AppData/Local/Temp/codex-c2-divergence-census-0dfc2d319c5f40e9a80bb6505ba05176/run_divergence_census.py`
- 字节数：**72,999**（UTF-8 无 BOM；纯 LF；末尾 LF）
- 行数：**1,801**
- 实跑前 SHA-256：`072e5f7280aa53f18d7be9fc2cf3d8050c8b06e26a85ca9d06e7730857375269`
- 静态核对：AST parse 通过；两路独立审计均确认正常输入主路径与冻结 v1 一致；此时脚本尚未执行、尚未读取/比较样本文本。

<!-- CENSUS_SCRIPT_SOURCE_START -->
```python
#!/usr/bin/env python3
"""Frozen v1 dual-transcription divergence census.

This is an experiment-only, read-only census.  It reads exactly the four frozen
MinerU/Docling fragment pairs, writes only divergence-census.json beside this
script, and stops at the first unclassified event.
"""

from __future__ import annotations

import copy
import difflib
import hashlib
from html.parser import HTMLParser
import json
import math
import os
from pathlib import Path
import re
import sys
import unicodedata


SCRIPT_PATH = Path(__file__).resolve()
OUTPUT_PATH = SCRIPT_PATH.with_name("divergence-census.json")
ARCHIVE_PATH = Path(
    "D:/Coinsides/v2.x/Coincides/docs/agent-ops/analysis/"
    "2026-08-30-v12-9c-c2-divergence-census.md"
)
MINERU_DIR = Path("D:/Coinsides/v12.9-selection/tools/_out/c2-mineru")
DOCLING_DIR = Path("D:/Coinsides/v12.9-selection/tools/_out/c1-docling")

EXPECTED_PYTHON = (3, 14, 2)
EXPECTED_UNICODE = "16.0.0"
EXPECTED_FROZEN_SHA256 = (
    "bafeb260088b036eb2be8e6f85a1d22073db8c5c1c3fa24a274d66ec49cb50be"
)
FROZEN_START = b"<!-- FROZEN_CLASSIFIER_V1_START -->"
FROZEN_END = b"<!-- FROZEN_CLASSIFIER_V1_END -->"

DOCUMENTS = (
    (
        "academic-reading",
        "ielts-academic-reading-sample-tasks-2023.fragments.json",
    ),
    (
        "writing-example-responses",
        "ielts-academic-writing-example-responses-to-parts-1-and-2-with-band-"
        "scores-and-examiner-comments.fragments.json",
    ),
    (
        "academic-writing",
        "ielts-academic-writing-sample-tasks-2023.fragments.json",
    ),
    ("listening", "ielts-listening-sample-tasks-2023.fragments.json"),
)
EXPECTED_FILENAMES = tuple(filename for _, filename in DOCUMENTS)

FAMILIES = ("MinerU", "Docling")
FAMILY_RANK = {"MinerU": 0, "Docling": 1}
PREDICATES = ("P-TEXT", "P-STRUCT", "P-NULL")
PREDICATE_RANK = {"P-STRUCT": 0, "P-NULL": 1, "P-TEXT": 2}
CLASSIFICATIONS = (
    "文本外形差异",
    "归一化差异",
    "切分差异",
    "真实指错",
)
STRUCT_ROLES = {"table", "visual"}

ROLE_MAP = {
    "MinerU": {
        "title": "heading",
        "text": "text",
        "list": "list",
        "index": "index",
        "image": "visual",
        "chart": "visual",
        "table": "table",
    },
    "Docling": {
        "section_header": "heading",
        "text": "text",
        "footnote": "text",
        "list_item": "list",
        "checkbox_unselected": "list",
        "document_index": "index",
        "picture": "visual",
        "table": "table",
    },
}

HTML_RE = re.compile(
    r"(?is)</?(?P<tag>table|thead|tbody|tfoot|tr|th|td|caption|colgroup|col|p|"
    r"div|span|ul|ol|li|br|img|figure|figcaption|h[1-6])(?:\s[^<>]*?)?/?>"
)
ASSET_RE = re.compile(
    r"(?i)(?:[0-9a-f]{32,64}|(?:[^/\\\s]+[/\\])*[^/\\\s]+\."
    r"(?:png|jpe?g|gif|webp|bmp|tiff?))"
)

CORE_KEYS = {"anchor", "role", "seq", "text"}
OPTIONAL_KEYS = ("type", "image_path", "html")


class InputStop(Exception):
    def __init__(self, reason: str, context: dict | None = None):
        super().__init__(reason)
        self.reason = reason
        self.context = context or {}


class DuplicateKeyError(ValueError):
    pass


class DataCollector(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []

    def handle_data(self, data: str) -> None:
        self.parts.append(data)


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def canonical_bytes(value: object) -> bytes:
    rendered = json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
        allow_nan=False,
    )
    return rendered.encode("utf-8", errors="strict") + b"\n"


def atomic_checkpoint(report: dict) -> str:
    payload = canonical_bytes(report)
    temporary = OUTPUT_PATH.with_name(OUTPUT_PATH.name + ".tmp")
    with temporary.open("wb") as handle:
        handle.write(payload)
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(temporary, OUTPUT_PATH)
    return sha256_bytes(payload)


def frozen_segment_hash() -> tuple[str, int]:
    data = ARCHIVE_PATH.read_bytes()
    start = data.find(FROZEN_START)
    if start < 0:
        raise InputStop("FROZEN_CLASSIFIER_V1 start marker missing")
    end_start = data.find(FROZEN_END, start + len(FROZEN_START))
    if end_start < 0:
        raise InputStop("FROZEN_CLASSIFIER_V1 end marker missing")
    end = end_start + len(FROZEN_END)
    segment = data[start:end]
    return sha256_bytes(segment), len(segment)


def reject_constant(token: str) -> None:
    raise ValueError(f"non-finite JSON constant rejected: {token}")


def reject_duplicate_keys(pairs: list[tuple[str, object]]) -> dict:
    result = {}
    for key, value in pairs:
        if key in result:
            raise DuplicateKeyError(f"duplicate object key: {key!r}")
        result[key] = value
    return result


def first_surrogate(value: object, location: str = "$") -> str | None:
    if isinstance(value, str):
        for index, char in enumerate(value):
            if 0xD800 <= ord(char) <= 0xDFFF:
                return f"{location}[codepoint_index={index}]"
        return None
    if isinstance(value, list):
        for index, child in enumerate(value):
            found = first_surrogate(child, f"{location}[{index}]")
            if found:
                return found
        return None
    if isinstance(value, dict):
        for key, child in value.items():
            found = first_surrogate(key, f"{location}.<key>")
            if found:
                return found
            found = first_surrogate(child, f"{location}[{key!r}]")
            if found:
                return found
    return None


def first_nonfinite_float(value: object, location: str = "$") -> str | None:
    if type(value) is float:
        return None if math.isfinite(value) else location
    if isinstance(value, list):
        for index, child in enumerate(value):
            found = first_nonfinite_float(child, f"{location}[{index}]")
            if found:
                return found
        return None
    if isinstance(value, dict):
        for key, child in value.items():
            found = first_nonfinite_float(child, f"{location}[{key!r}]")
            if found:
                return found
    return None


def load_json_array(path: Path) -> tuple[list, dict]:
    raw = path.read_bytes()
    if raw.startswith(b"\xef\xbb\xbf"):
        raise InputStop("UTF-8 BOM is forbidden", {"path": path.as_posix()})
    try:
        text = raw.decode("utf-8", errors="strict")
    except UnicodeDecodeError as exc:
        raise InputStop(
            "UTF-8 strict decode failed",
            {"path": path.as_posix(), "byte_offset": exc.start},
        ) from exc
    try:
        value = json.loads(
            text,
            parse_int=int,
            parse_float=float,
            parse_constant=reject_constant,
            object_pairs_hook=reject_duplicate_keys,
        )
    except (json.JSONDecodeError, DuplicateKeyError, ValueError) as exc:
        raise InputStop(
            "strict JSON parse failed",
            {"path": path.as_posix(), "error": str(exc)},
        ) from exc
    surrogate_at = first_surrogate(value)
    if surrogate_at is not None:
        raise InputStop(
            "unpaired surrogate rejected",
            {"path": path.as_posix(), "location": surrogate_at},
        )
    nonfinite_at = first_nonfinite_float(value)
    if nonfinite_at is not None:
        raise InputStop(
            "non-finite parsed float rejected at every JSON depth",
            {"path": path.as_posix(), "location": nonfinite_at},
        )
    if not isinstance(value, list):
        raise InputStop("top-level JSON must be an array", {"path": path.as_posix()})
    return value, {
        "path": path.as_posix(),
        "byte_length": len(raw),
        "sha256": sha256_bytes(raw),
    }


def is_python_int(value: object) -> bool:
    return type(value) is int


def as_finite_float(value: object, label: str, context: dict) -> float:
    if type(value) not in (int, float):
        raise InputStop(f"{label} must be a Python int/float (bool excluded)", context)
    try:
        converted = float(value)
    except (OverflowError, ValueError) as exc:
        raise InputStop(f"{label} cannot convert to binary64", context) from exc
    if not math.isfinite(converted):
        raise InputStop(f"{label} must be finite after binary64 conversion", context)
    return converted


def escaped_excerpt(value: str | None) -> str | None:
    if value is None:
        return None
    if len(value) <= 240:
        excerpt = value
    else:
        excerpt = value[:180] + "…" + value[-59:]
    encoded = json.dumps(excerpt, ensure_ascii=True)
    return encoded[1:-1]


def text_projection(raw_text: str | None, canonical_role: str, context: dict) -> dict:
    if raw_text is None:
        has_html = False
        tags: list[str] = []
        markup: list[str] = []
        w_value = None
        n_value = ""
    else:
        matches = list(HTML_RE.finditer(raw_text))
        has_html = bool(matches)
        tags = [match.group("tag").lower() for match in matches]
        markup = [match.group(0) for match in matches]
        if has_html:
            parser = DataCollector()
            try:
                parser.feed(raw_text)
                parser.close()
            except Exception as exc:
                raise InputStop(
                    "HTMLParser feed/close failed",
                    {**context, "error_type": type(exc).__name__, "error": str(exc)},
                ) from exc
            value = " ".join(parser.parts)
        else:
            value = raw_text
        w_value = re.sub(r"\s+", " ", value, flags=re.UNICODE).strip()
        normalized = unicodedata.normalize("NFKC", w_value)
        folded = normalized.casefold().replace("\u00ad", "")
        n_value = "".join(
            char
            for char in folded
            if not (
                unicodedata.category(char).startswith(("P", "Z"))
                or char.isspace()
            )
        )

    if raw_text is None:
        payload_kind = "null"
    elif has_html:
        payload_kind = "html"
    elif canonical_role == "visual" and ASSET_RE.fullmatch(raw_text.strip()):
        payload_kind = "asset_token"
    else:
        payload_kind = "plain"

    if raw_text is None:
        codepoint_length = None
        utf8_length = None
        text_sha = None
    else:
        encoded = raw_text.encode("utf-8", errors="strict")
        codepoint_length = len(raw_text)
        utf8_length = len(encoded)
        text_sha = sha256_bytes(encoded)

    return {
        "R": raw_text,
        "R_type": "null" if raw_text is None else "string",
        "R_codepoint_length": codepoint_length,
        "R_utf8_byte_length": utf8_length,
        "R_sha256": text_sha,
        "R_escaped_excerpt": escaped_excerpt(raw_text),
        "HAS_HTML": has_html,
        "TAGS": tags,
        "MARKUP": markup,
        "W": w_value,
        "N": n_value,
        "N_sha256": sha256_bytes(n_value.encode("utf-8", errors="strict")),
        "payload_kind": payload_kind,
        "shape_signature": (payload_kind, tuple(markup)),
    }


def validate_base_fragment(
    item: object,
    family: str,
    document: str,
    path: Path,
    array_index: int,
) -> dict:
    base_context = {
        "family": family,
        "document": document,
        "path": path.as_posix(),
        "array_index": array_index,
    }
    if not isinstance(item, dict):
        raise InputStop("fragment must be a JSON object", base_context)
    missing = sorted(CORE_KEYS - set(item))
    if missing:
        raise InputStop("fragment lacks required core fields", {**base_context, "missing": missing})

    seq = item["seq"]
    if not is_python_int(seq) or not (0 <= seq < 2147483647):
        raise InputStop("seq is outside the frozen Python-int range", base_context)
    context = {**base_context, "seq": seq}
    role = item["role"]
    if not isinstance(role, str):
        raise InputStop("role must be a string", context)
    if role not in ROLE_MAP[family]:
        raise InputStop("role is outside the frozen mapping", {**context, "role": role})
    canonical_role = ROLE_MAP[family][role]

    raw_text = item["text"]
    if raw_text is not None and not isinstance(raw_text, str):
        raise InputStop("text must be string or null", context)
    anchor = item["anchor"]
    if not isinstance(anchor, dict) or "page" not in anchor or "bbox" not in anchor:
        raise InputStop("anchor must contain page and bbox", context)
    raw_page = anchor["page"]
    if not is_python_int(raw_page):
        raise InputStop("anchor.page must be a Python int (bool excluded)", context)
    if family == "MinerU" and raw_page < 0:
        raise InputStop("MinerU anchor.page must be >= 0", context)
    if family == "Docling" and raw_page < 1:
        raise InputStop("Docling anchor.page must be >= 1", context)
    canonical_page = raw_page + 1 if family == "MinerU" else raw_page
    if not is_python_int(canonical_page) or canonical_page <= 0:
        raise InputStop("canonical page must be a positive integer", context)

    raw_bbox = anchor["bbox"]
    if not isinstance(raw_bbox, list) or len(raw_bbox) != 4:
        raise InputStop("anchor.bbox must be a four-element JSON array", context)
    bbox_float = tuple(
        as_finite_float(value, f"anchor.bbox[{index}]", context)
        for index, value in enumerate(raw_bbox)
    )

    required_family_key = "page_size" if family == "MinerU" else "charspan"
    required_value = anchor.get(required_family_key)
    if required_family_key not in anchor or not isinstance(required_value, list) or len(required_value) != 2:
        raise InputStop(f"anchor.{required_family_key} must be a two-element JSON array", context)
    required_float = tuple(
        as_finite_float(value, f"{required_family_key}[{index}]", context)
        for index, value in enumerate(required_value)
    )
    if family == "MinerU" and not all(value > 0 for value in required_float):
        raise InputStop("MinerU page_size values must be positive", context)

    projection = text_projection(raw_text, canonical_role, context)
    optional = {
        key: {
            "field_present": key in item,
            "value": item[key] if key in item else None,
        }
        for key in OPTIONAL_KEYS
    }
    known = CORE_KEYS | set(OPTIONAL_KEYS)
    known_anchor = {"page", "bbox", required_family_key}

    result = {
        "family": family,
        "document": document,
        "path": path.as_posix(),
        "seq": seq,
        "raw_role": role,
        "canonical_role": canonical_role,
        "text": projection,
        "optional_fields": optional,
        "extra_field_keys": sorted(set(item) - known),
        "anchor_extra_field_keys": sorted(set(anchor) - known_anchor),
        "raw_anchor": copy.deepcopy(anchor),
        "raw_bbox_float": bbox_float,
        "canonical_page": canonical_page,
        "canonical_bbox": None,
        "page_size": copy.deepcopy(required_value) if family == "MinerU" else None,
        "page_size_float": required_float if family == "MinerU" else None,
        "charspan": copy.deepcopy(required_value) if family == "Docling" else None,
        "predicate": None,
    }
    return result


def validate_seq_set(fragments: list[dict], family: str, document: str, path: Path) -> None:
    seqs = [fragment["seq"] for fragment in fragments]
    if len(set(seqs)) != len(seqs) or set(seqs) != set(range(len(seqs))):
        raise InputStop(
            "seq must be unique and continuous from zero",
            {
                "family": family,
                "document": document,
                "path": path.as_posix(),
                "observed_count": len(seqs),
                "observed_min": min(seqs) if seqs else None,
                "observed_max": max(seqs) if seqs else None,
            },
        )


def bbox_in_bounds(bbox: tuple[float, float, float, float], width: float, height: float) -> bool:
    x0, y0, x1, y1 = bbox
    return 0.0 <= x0 < x1 <= width and 0.0 <= y0 < y1 <= height


def finalize_geometry_and_predicates(document_data: dict) -> None:
    mineru = document_data["MinerU"]
    docling = document_data["Docling"]
    dimensions: dict[int, set[tuple[float, float]]] = {}
    for fragment in mineru:
        dimensions.setdefault(fragment["canonical_page"], set()).add(
            fragment["page_size_float"]
        )
    unique_dimensions = {}
    for page, distinct in dimensions.items():
        if len(distinct) != 1:
            raise InputStop(
                "MinerU canonical page has non-unique page_size",
                {
                    "document": fragment["document"],
                    "canonical_page": page,
                    "distinct_page_sizes": [list(value) for value in sorted(distinct)],
                },
            )
        unique_dimensions[page] = next(iter(distinct))

    for fragment in mineru:
        width, height = unique_dimensions[fragment["canonical_page"]]
        bbox = fragment["raw_bbox_float"]
        if not bbox_in_bounds(bbox, width, height):
            raise InputStop(
                "MinerU bbox is out of bounds or degenerate",
                {
                    "document": fragment["document"],
                    "family": "MinerU",
                    "seq": fragment["seq"],
                    "canonical_page": fragment["canonical_page"],
                    "bbox": list(bbox),
                    "page_size": [width, height],
                },
            )
        fragment["canonical_bbox"] = bbox

    for fragment in docling:
        page = fragment["canonical_page"]
        if page not in unique_dimensions:
            raise InputStop(
                "Docling page lacks a unique MinerU page_size",
                {"document": fragment["document"], "family": "Docling", "seq": fragment["seq"], "canonical_page": page},
            )
        width, height = unique_dimensions[page]
        left, top, right, bottom = fragment["raw_bbox_float"]
        bbox = (left, height - top, right, height - bottom)
        if not all(math.isfinite(value) for value in bbox) or not bbox_in_bounds(bbox, width, height):
            raise InputStop(
                "Docling canonical bbox is out of bounds or degenerate",
                {
                    "document": fragment["document"],
                    "family": "Docling",
                    "seq": fragment["seq"],
                    "canonical_page": page,
                    "raw_bbox": [left, top, right, bottom],
                    "canonical_bbox": list(bbox),
                    "page_size": [width, height],
                },
            )
        fragment["canonical_bbox"] = bbox

    for fragment in mineru + docling:
        role = fragment["canonical_role"]
        n_value = fragment["text"]["N"]
        raw_text = fragment["text"]["R"]
        matches = []
        if role in STRUCT_ROLES:
            matches.append("P-STRUCT")
        if role not in STRUCT_ROLES and n_value != "":
            matches.append("P-TEXT")
        if role not in STRUCT_ROLES and (raw_text is None or n_value == ""):
            matches.append("P-NULL")
        if len(matches) != 1:
            raise InputStop(
                "fragment did not hit exactly one predicate",
                {"document": fragment["document"], "family": fragment["family"], "seq": fragment["seq"], "matches": matches},
            )
        fragment["predicate"] = matches[0]

    document_data["page_dimensions"] = {
        str(page): [width, height]
        for page, (width, height) in sorted(unique_dimensions.items())
    }


def validate_and_load_inputs(report: dict, checkpoint_state: dict) -> list[dict]:
    for family, directory in (("MinerU", MINERU_DIR), ("Docling", DOCLING_DIR)):
        if not directory.is_dir():
            raise InputStop("input directory missing", {"family": family, "path": directory.as_posix()})
        observed = sorted(
            entry.name
            for entry in directory.iterdir()
            if entry.is_file() and entry.name.endswith(".fragments.json")
        )
        if observed != sorted(EXPECTED_FILENAMES):
            raise InputStop(
                "case-sensitive fragments filename set differs from frozen set",
                {"family": family, "path": directory.as_posix(), "expected": sorted(EXPECTED_FILENAMES), "observed": observed},
            )

    loaded_documents = []
    for document_index, (document, filename) in enumerate(DOCUMENTS):
        data = {"document": document, "document_index": document_index}
        for family, directory in (("MinerU", MINERU_DIR), ("Docling", DOCLING_DIR)):
            path = directory / filename
            array, file_receipt = load_json_array(path)
            fragments = [
                validate_base_fragment(item, family, document, path, array_index)
                for array_index, item in enumerate(array)
            ]
            validate_seq_set(fragments, family, document, path)
            fragments.sort(key=lambda fragment: fragment["seq"])
            data[family] = fragments
            receipt = {"family": family, "document": document, **file_receipt}
            report["inputs"]["files"].append(receipt)
            report["inputs"]["preflight"] = "validating_files"
            report["inputs"]["last_validated_file"] = receipt
            checkpoint_state["sha256"] = atomic_checkpoint(report)
        finalize_geometry_and_predicates(data)
        loaded_documents.append(data)
        report["inputs"]["validated_documents"].append(document)
        report["inputs"]["preflight"] = "validating_geometry"
        checkpoint_state["sha256"] = atomic_checkpoint(report)
    report["inputs"]["preflight"] = "passed"
    report["inputs"]["last_validated_file"] = None
    return loaded_documents


def intersects(left: dict, right: dict) -> bool:
    if left["canonical_page"] != right["canonical_page"]:
        return False
    lx0, ly0, lx1, ly1 = left["canonical_bbox"]
    rx0, ry0, rx1, ry1 = right["canonical_bbox"]
    return min(lx1, rx1) - max(lx0, rx0) > 0.0 and min(ly1, ry1) - max(ly0, ry0) > 0.0


def overlap_graph(mineru: list[dict], docling: list[dict]) -> dict:
    edges = []
    mineru_neighbors = {fragment["seq"]: [] for fragment in mineru}
    docling_neighbors = {fragment["seq"]: [] for fragment in docling}
    for left in sorted(mineru, key=lambda fragment: fragment["seq"]):
        for right in sorted(docling, key=lambda fragment: fragment["seq"]):
            same_page = left["canonical_page"] == right["canonical_page"]
            if same_page:
                lx0, ly0, lx1, ly1 = left["canonical_bbox"]
                rx0, ry0, rx1, ry1 = right["canonical_bbox"]
                overlap_width = min(lx1, rx1) - max(lx0, rx0)
                overlap_height = min(ly1, ry1) - max(ly0, ry0)
                positive = overlap_width > 0.0 and overlap_height > 0.0
            else:
                overlap_width = None
                overlap_height = None
                positive = False
            if positive:
                mineru_neighbors[left["seq"]].append(right["seq"])
                docling_neighbors[right["seq"]].append(left["seq"])
            edges.append(
                {
                    "mineru_seq": left["seq"],
                    "docling_seq": right["seq"],
                    "same_canonical_page": same_page,
                    "overlap_width": overlap_width,
                    "overlap_height": overlap_height,
                    "positive_area_intersection": positive,
                }
            )
    mineru_pages = sorted({fragment["canonical_page"] for fragment in mineru})
    docling_pages = sorted({fragment["canonical_page"] for fragment in docling})
    page_sets_equal = mineru_pages == docling_pages
    mineru_covered = bool(mineru) and all(mineru_neighbors[item["seq"]] for item in mineru)
    docling_covered = bool(docling) and all(docling_neighbors[item["seq"]] for item in docling)
    return {
        "mineru_canonical_pages": mineru_pages,
        "docling_canonical_pages": docling_pages,
        "page_sets_equal": page_sets_equal,
        "edges": edges,
        "mineru_neighbors": [
            {"seq": seq, "positive_neighbors": sorted(neighbors)}
            for seq, neighbors in sorted(mineru_neighbors.items())
        ],
        "docling_neighbors": [
            {"seq": seq, "positive_neighbors": sorted(neighbors)}
            for seq, neighbors in sorted(docling_neighbors.items())
        ],
        "mineru_fully_covered": mineru_covered,
        "docling_fully_covered": docling_covered,
        "same_place": page_sets_equal and mineru_covered and docling_covered,
    }


def make_event(
    document_data: dict,
    predicate: str,
    mineru: list[dict],
    docling: list[dict],
    pairing_ok: bool,
    pairing_trace: list[dict],
    source: str,
    pointer_identity_seed: bool = False,
    bilateral_component: bool = False,
) -> dict:
    mineru = sorted(mineru, key=lambda fragment: fragment["seq"])
    docling = sorted(docling, key=lambda fragment: fragment["seq"])
    all_fragments = mineru + docling
    event_page = min(fragment["canonical_page"] for fragment in all_fragments)
    all_seqs = [fragment["seq"] for fragment in all_fragments]
    min_any_seq = min(all_seqs)
    mineru_absent = 0 if mineru else 1
    docling_absent = 0 if docling else 1
    min_mineru = min((fragment["seq"] for fragment in mineru), default=0)
    min_docling = min((fragment["seq"] for fragment in docling), default=0)
    member_key = tuple(
        sorted(
            [(0, fragment["seq"]) for fragment in mineru]
            + [(1, fragment["seq"]) for fragment in docling]
        )
    )
    sort_key = (
        document_data["document_index"],
        event_page,
        min_any_seq,
        mineru_absent,
        min_mineru,
        docling_absent,
        min_docling,
        PREDICATE_RANK[predicate],
        member_key,
    )
    return {
        "document": document_data["document"],
        "document_index": document_data["document_index"],
        "predicate": predicate,
        "mineru": mineru,
        "docling": docling,
        "sort_key": sort_key,
        "pairing_ok": pairing_ok,
        "pairing_trace": pairing_trace,
        "source": source,
        "pointer_identity_seed": pointer_identity_seed,
        "bilateral_component": bilateral_component,
    }


def seq_list(fragments: list[dict]) -> list[int]:
    return [fragment["seq"] for fragment in fragments]


def contiguous_intervals(sequence: list[dict], target: str) -> list[list[dict]]:
    intervals = []
    target_length = len(target)
    for start in range(len(sequence)):
        pieces = []
        length = 0
        for end in range(start, len(sequence)):
            piece = sequence[end]["text"]["N"]
            pieces.append(piece)
            length += len(piece)
            if length == target_length:
                if "".join(pieces) == target:
                    intervals.append(sequence[start : end + 1])
                break
            if length > target_length:
                break
    return intervals


def interval_is_current(interval: list[dict], current: list[dict]) -> bool:
    return seq_list(interval) == seq_list(current)


def apply_text_identity_gate(event: dict, all_mineru: list[dict], all_docling: list[dict]) -> None:
    if not event["pairing_ok"]:
        event["pointer_identity_seed"] = False
        return
    mineru = event["mineru"]
    docling = event["docling"]
    mineru_concat = "".join(fragment["text"]["N"] for fragment in mineru)
    docling_concat = "".join(fragment["text"]["N"] for fragment in docling)
    gate_trace = {
        "step": "C2_text_identity_gate",
        "mineru_concat_N_sha256": sha256_bytes(mineru_concat.encode("utf-8")),
        "docling_concat_N_sha256": sha256_bytes(docling_concat.encode("utf-8")),
        "concat_equal_nonempty": mineru_concat == docling_concat and mineru_concat != "",
        "duplicate_key_checks": [],
        "whole_document_interval_check": None,
    }
    if mineru_concat != docling_concat or mineru_concat == "":
        event["pairing_ok"] = False
        event["pairing_trace"].append(gate_trace)
        event["pairing_trace"].append({"step": "C2_result", "passed": False, "reason": "concat(N) differs or is empty"})
        event["pointer_identity_seed"] = False
        return

    keys_in_event = {
        (fragment["canonical_role"], fragment["text"]["N"])
        for fragment in mineru + docling
    }
    duplicate_gate_passed = True
    for key in sorted(keys_in_event):
        left_occurrences = [
            fragment
            for fragment in all_mineru
            if (fragment["canonical_role"], fragment["text"]["N"]) == key
        ]
        right_occurrences = [
            fragment
            for fragment in all_docling
            if (fragment["canonical_role"], fragment["text"]["N"]) == key
        ]
        if len(left_occurrences) <= 1 and len(right_occurrences) <= 1:
            continue
        graph = overlap_graph(left_occurrences, right_occurrences)
        left_degrees = {
            row["seq"]: len(row["positive_neighbors"])
            for row in graph["mineru_neighbors"]
        }
        right_degrees = {
            row["seq"]: len(row["positive_neighbors"])
            for row in graph["docling_neighbors"]
        }
        all_degree_one = (
            bool(left_occurrences)
            and bool(right_occurrences)
            and all(value == 1 for value in left_degrees.values())
            and all(value == 1 for value in right_degrees.values())
        )
        current_left = {fragment["seq"] for fragment in mineru if (fragment["canonical_role"], fragment["text"]["N"]) == key}
        current_right = {fragment["seq"] for fragment in docling if (fragment["canonical_role"], fragment["text"]["N"]) == key}
        current_neighbors_inside = all(
            next(iter(row["positive_neighbors"]), None) in current_right
            for row in graph["mineru_neighbors"]
            if row["seq"] in current_left
        ) and all(
            next(iter(row["positive_neighbors"]), None) in current_left
            for row in graph["docling_neighbors"]
            if row["seq"] in current_right
        )
        passed = all_degree_one and current_neighbors_inside
        duplicate_gate_passed = duplicate_gate_passed and passed
        gate_trace["duplicate_key_checks"].append(
            {
                "canonical_role": key[0],
                "N_sha256": sha256_bytes(key[1].encode("utf-8")),
                "mineru_occurrence_seqs": seq_list(left_occurrences),
                "docling_occurrence_seqs": seq_list(right_occurrences),
                "overlap_graph": graph,
                "all_occurrences_degree_one": all_degree_one,
                "current_unique_neighbors_belong_to_current_event": current_neighbors_inside,
                "passed": passed,
            }
        )

    left_intervals = contiguous_intervals(all_mineru, mineru_concat)
    right_intervals = contiguous_intervals(all_docling, mineru_concat)
    left_summaries = [seq_list(interval) for interval in left_intervals]
    right_summaries = [seq_list(interval) for interval in right_intervals]
    interval_pairs = []
    current_pair_is_unique_place = False
    if len(left_intervals) == 1 and len(right_intervals) == 1:
        interval_passed = interval_is_current(left_intervals[0], mineru) and interval_is_current(right_intervals[0], docling)
        rule = "one interval in each family and both equal current candidate"
    else:
        same_place_pairs = []
        for left_index, left_interval in enumerate(left_intervals):
            for right_index, right_interval in enumerate(right_intervals):
                graph = overlap_graph(left_interval, right_interval)
                row = {
                    "mineru_interval_index": left_index,
                    "docling_interval_index": right_index,
                    "mineru_seqs": seq_list(left_interval),
                    "docling_seqs": seq_list(right_interval),
                    "same_place": graph["same_place"],
                }
                interval_pairs.append(row)
                if graph["same_place"]:
                    same_place_pairs.append(row)
        current_pair_is_unique_place = (
            len(same_place_pairs) == 1
            and same_place_pairs[0]["mineru_seqs"] == seq_list(mineru)
            and same_place_pairs[0]["docling_seqs"] == seq_list(docling)
        )
        interval_passed = current_pair_is_unique_place
        rule = "multiple intervals require exactly one same-place cross-family pair, equal to current candidate"
    gate_trace["whole_document_interval_check"] = {
        "target_concat_N_sha256": sha256_bytes(mineru_concat.encode("utf-8")),
        "mineru_intervals": left_summaries,
        "docling_intervals": right_summaries,
        "cross_family_interval_pairs": interval_pairs,
        "rule": rule,
        "current_pair_is_unique_same_place_pair": current_pair_is_unique_place,
        "passed": interval_passed,
    }
    passed = duplicate_gate_passed and interval_passed
    event["pairing_ok"] = passed
    event["pointer_identity_seed"] = passed
    event["pairing_trace"].append(gate_trace)
    event["pairing_trace"].append(
        {
            "step": "C2_result",
            "duplicate_key_gate_passed": duplicate_gate_passed,
            "interval_gate_passed": interval_passed,
            "passed": passed,
        }
    )


def build_text_events(document_data: dict) -> list[dict]:
    mineru = [fragment for fragment in document_data["MinerU"] if fragment["predicate"] == "P-TEXT"]
    docling = [fragment for fragment in document_data["Docling"] if fragment["predicate"] == "P-TEXT"]
    mineru.sort(key=lambda fragment: fragment["seq"])
    docling.sort(key=lambda fragment: fragment["seq"])
    mineru_keys = [(fragment["canonical_role"], fragment["text"]["N"]) for fragment in mineru]
    docling_keys = [(fragment["canonical_role"], fragment["text"]["N"]) for fragment in docling]
    matcher = difflib.SequenceMatcher(None, mineru_keys, docling_keys, autojunk=False)
    events = []
    for opcode_index, (tag, i1, i2, j1, j2) in enumerate(matcher.get_opcodes()):
        opcode_base = {
            "step": "SequenceMatcher_opcode",
            "opcode_index": opcode_index,
            "tag": tag,
            "mineru_slice": [i1, i2],
            "docling_slice": [j1, j2],
            "mineru_seqs": seq_list(mineru[i1:i2]),
            "docling_seqs": seq_list(docling[j1:j2]),
        }
        if tag == "equal":
            for offset in range(i2 - i1):
                events.append(
                    make_event(
                        document_data,
                        "P-TEXT",
                        [mineru[i1 + offset]],
                        [docling[j1 + offset]],
                        True,
                        [opcode_base, {"step": "equal_block_position", "offset": offset}],
                        "SequenceMatcher_equal_position",
                    )
                )
            continue

        left = mineru[i1:i2]
        right = docling[j1:j2]
        left_cursor = 0
        right_cursor = 0
        if not left or not right:
            events.append(
                make_event(
                    document_data,
                    "P-TEXT",
                    left,
                    right,
                    False,
                    [opcode_base, {"step": "prefix_search", "result": "one opcode side empty; all remaining consumed"}],
                    "SequenceMatcher_non_equal_unmatched",
                )
            )
            continue
        while left_cursor < len(left) or right_cursor < len(right):
            if left_cursor >= len(left) or right_cursor >= len(right):
                events.append(
                    make_event(
                        document_data,
                        "P-TEXT",
                        left[left_cursor:],
                        right[right_cursor:],
                        False,
                        [opcode_base, {"step": "prefix_search", "left_cursor": left_cursor, "right_cursor": right_cursor, "result": "one side exhausted; all remaining consumed"}],
                        "SequenceMatcher_non_equal_unmatched",
                    )
                )
                break
            candidates = []
            for left_count in range(1, len(left) - left_cursor + 1):
                left_group = left[left_cursor : left_cursor + left_count]
                left_concat = "".join(fragment["text"]["N"] for fragment in left_group)
                for right_count in range(1, len(right) - right_cursor + 1):
                    right_group = right[right_cursor : right_cursor + right_count]
                    right_concat = "".join(fragment["text"]["N"] for fragment in right_group)
                    if left_concat == right_concat:
                        score = (
                            left_count + right_count,
                            abs(left_count - right_count),
                            left_count,
                            right_count,
                            left_group[0]["seq"],
                            right_group[0]["seq"],
                            left_group[-1]["seq"],
                            right_group[-1]["seq"],
                        )
                        candidates.append((score, left_group, right_group))
            if not candidates:
                events.append(
                    make_event(
                        document_data,
                        "P-TEXT",
                        left[left_cursor:],
                        right[right_cursor:],
                        False,
                        [opcode_base, {"step": "prefix_search", "left_cursor": left_cursor, "right_cursor": right_cursor, "matching_candidates": [], "result": "no equal concat(N) prefix; all remaining consumed"}],
                        "SequenceMatcher_non_equal_unmatched",
                    )
                )
                break
            candidates.sort(key=lambda row: row[0])
            score, chosen_left, chosen_right = candidates[0]
            candidate_trace = [
                {
                    "score": list(candidate_score),
                    "mineru_seqs": seq_list(candidate_left),
                    "docling_seqs": seq_list(candidate_right),
                }
                for candidate_score, candidate_left, candidate_right in candidates
            ]
            events.append(
                make_event(
                    document_data,
                    "P-TEXT",
                    chosen_left,
                    chosen_right,
                    True,
                    [opcode_base, {"step": "prefix_search", "left_cursor": left_cursor, "right_cursor": right_cursor, "matching_candidates": candidate_trace, "chosen_score": list(score)}],
                    "SequenceMatcher_non_equal_prefix_group",
                )
            )
            left_cursor += len(chosen_left)
            right_cursor += len(chosen_right)

    for event in events:
        apply_text_identity_gate(event, mineru, docling)
    return events


def graph_components(fragments_m: list[dict], fragments_d: list[dict]) -> list[dict]:
    by_key: dict[tuple[str, int], dict[str, list[dict]]] = {}
    for fragment in fragments_m:
        by_key.setdefault((fragment["canonical_role"], fragment["canonical_page"]), {"MinerU": [], "Docling": []})["MinerU"].append(fragment)
    for fragment in fragments_d:
        by_key.setdefault((fragment["canonical_role"], fragment["canonical_page"]), {"MinerU": [], "Docling": []})["Docling"].append(fragment)
    components = []
    for (role, page), sides in by_key.items():
        node_map = {}
        adjacency = {}
        for family in FAMILIES:
            for fragment in sides[family]:
                node = (FAMILY_RANK[family], fragment["seq"])
                node_map[node] = fragment
                adjacency[node] = set()
        for left in sides["MinerU"]:
            for right in sides["Docling"]:
                if intersects(left, right):
                    left_node = (0, left["seq"])
                    right_node = (1, right["seq"])
                    adjacency[left_node].add(right_node)
                    adjacency[right_node].add(left_node)
        seen = set()
        for root in sorted(node_map):
            if root in seen:
                continue
            stack = [root]
            members = []
            seen.add(root)
            while stack:
                node = stack.pop()
                members.append(node)
                for neighbor in sorted(adjacency[node], reverse=True):
                    if neighbor not in seen:
                        seen.add(neighbor)
                        stack.append(neighbor)
            members.sort()
            components.append(
                {
                    "role": role,
                    "page": page,
                    "members": members,
                    "mineru": [node_map[node] for node in members if node[0] == 0],
                    "docling": [node_map[node] for node in members if node[0] == 1],
                    "adjacency": {node: sorted(adjacency[node]) for node in members},
                }
            )
    components.sort(key=lambda component: min(component["members"]))
    return components


def component_trace(component: dict) -> dict:
    return {
        "step": "bbox_connected_component",
        "canonical_role": component["role"],
        "canonical_page": component["page"],
        "members": [list(node) for node in component["members"]],
        "adjacency": [
            {"node": list(node), "neighbors": [list(neighbor) for neighbor in neighbors]}
            for node, neighbors in sorted(component["adjacency"].items())
        ],
    }


def events_from_bilateral_component(document_data: dict, predicate: str, component: dict) -> list[dict]:
    mineru = component["mineru"]
    docling = component["docling"]
    base_trace = component_trace(component)
    if len(mineru) > 1 and len(docling) > 1:
        all_degree_one = all(len(component["adjacency"][node]) == 1 for node in component["members"])
        equal_counts = len(mineru) == len(docling)
        if all_degree_one and equal_counts:
            events = []
            for left in sorted(mineru, key=lambda fragment: fragment["seq"]):
                neighbor_node = component["adjacency"][(0, left["seq"])][0]
                right = next(fragment for fragment in docling if fragment["seq"] == neighbor_node[1])
                events.append(
                    make_event(
                        document_data,
                        predicate,
                        [left],
                        [right],
                        True,
                        [base_trace, {"step": "multi_to_multi", "degree_one": True, "equal_counts": True, "result": "split into unique 1:1 edge"}],
                        "bilateral_component_unique_edge",
                        bilateral_component=True,
                    )
                )
            return events
        return [
            make_event(
                document_data,
                predicate,
                mineru,
                docling,
                False,
                [base_trace, {"step": "multi_to_multi", "degree_one": all_degree_one, "equal_counts": equal_counts, "result": "pairing not unique"}],
                "bilateral_component_ambiguous",
                bilateral_component=True,
            )
        ]
    return [
        make_event(
            document_data,
            predicate,
            mineru,
            docling,
            True,
            [base_trace, {"step": "component_grouping", "result": "1:1, 1:n, or n:1 grouped as one event"}],
            "bilateral_component",
            bilateral_component=True,
        )
    ]


def build_struct_events(document_data: dict) -> list[dict]:
    mineru = [fragment for fragment in document_data["MinerU"] if fragment["predicate"] == "P-STRUCT"]
    docling = [fragment for fragment in document_data["Docling"] if fragment["predicate"] == "P-STRUCT"]
    components = graph_components(mineru, docling)
    events = []
    consumed: set[tuple[int, int]] = set()
    unilateral = []
    for component in components:
        if component["mineru"] and component["docling"]:
            events.extend(events_from_bilateral_component(document_data, "P-STRUCT", component))
            consumed.update(component["members"])
        else:
            unilateral.extend(component["mineru"] + component["docling"])

    def node(fragment: dict) -> tuple[int, int]:
        return FAMILY_RANK[fragment["family"]], fragment["seq"]

    unconsumed = {node(fragment): fragment for fragment in unilateral if node(fragment) not in consumed}
    scan_order = sorted(
        unconsumed.values(),
        key=lambda fragment: (
            fragment["canonical_role"],
            fragment["canonical_page"],
            fragment["seq"],
            FAMILY_RANK[fragment["family"]],
        ),
    )
    scan_receipts = {}
    for current in scan_order:
        current_node = node(current)
        if current_node not in unconsumed:
            continue
        raw_text = current["text"]["R"]
        same_role_remaining = [
            fragment
            for fragment in unconsumed.values()
            if fragment["canonical_role"] == current["canonical_role"]
        ]
        left_matches = [fragment for fragment in same_role_remaining if fragment["family"] == "MinerU" and raw_text is not None and fragment["text"]["R"] == raw_text]
        right_matches = [fragment for fragment in same_role_remaining if fragment["family"] == "Docling" and raw_text is not None and fragment["text"]["R"] == raw_text]
        trace = {
            "step": "C4_unconsumed_unique_R_scan",
            "scan_node": list(current_node),
            "canonical_role": current["canonical_role"],
            "R_non_null": raw_text is not None,
            "R_sha256": current["text"]["R_sha256"],
            "mineru_matching_unconsumed_seqs": seq_list(sorted(left_matches, key=lambda fragment: fragment["seq"])),
            "docling_matching_unconsumed_seqs": seq_list(sorted(right_matches, key=lambda fragment: fragment["seq"])),
        }
        if raw_text is not None and len(left_matches) == 1 and len(right_matches) == 1:
            left = left_matches[0]
            right = right_matches[0]
            trace["result"] = "both families unique; paired and consumed"
            events.append(
                make_event(
                    document_data,
                    "P-STRUCT",
                    [left],
                    [right],
                    True,
                    [trace],
                    "C4_unique_R_location_candidate",
                    pointer_identity_seed=True,
                )
            )
            del unconsumed[node(left)]
            del unconsumed[node(right)]
        else:
            trace["result"] = "not uniquely pairable at this scan position"
            scan_receipts[current_node] = trace

    for current_node, fragment in sorted(unconsumed.items()):
        trace = scan_receipts.get(
            current_node,
            {
                "step": "C4_unconsumed_unique_R_scan",
                "scan_node": list(current_node),
                "result": "remained unconsumed",
            },
        )
        events.append(
            make_event(
                document_data,
                "P-STRUCT",
                [fragment] if fragment["family"] == "MinerU" else [],
                [fragment] if fragment["family"] == "Docling" else [],
                False,
                [trace, {"step": "C4_result", "result": "single-sided unclassified event"}],
                "C4_unpaired_single_side",
            )
        )
    return events


def build_null_events(document_data: dict) -> list[dict]:
    mineru = [fragment for fragment in document_data["MinerU"] if fragment["predicate"] == "P-NULL"]
    docling = [fragment for fragment in document_data["Docling"] if fragment["predicate"] == "P-NULL"]
    components = graph_components(mineru, docling)
    events = []
    for component in components:
        if component["mineru"] and component["docling"]:
            events.extend(events_from_bilateral_component(document_data, "P-NULL", component))
        else:
            fragments = component["mineru"] + component["docling"]
            for fragment in sorted(fragments, key=lambda item: (FAMILY_RANK[item["family"]], item["seq"])):
                events.append(
                    make_event(
                        document_data,
                        "P-NULL",
                        [fragment] if fragment["family"] == "MinerU" else [],
                        [fragment] if fragment["family"] == "Docling" else [],
                        False,
                        [component_trace(component), {"step": "single_side_component", "result": "unclassified"}],
                        "P-NULL_single_side_component",
                    )
                )
    return events


def build_all_events(documents: list[dict]) -> list[dict]:
    events = []
    for document_data in documents:
        events.extend(build_text_events(document_data))
        events.extend(build_struct_events(document_data))
        events.extend(build_null_events(document_data))
    events.sort(key=lambda event: event["sort_key"])
    sort_keys = [event["sort_key"] for event in events]
    if len(set(sort_keys)) != len(sort_keys):
        raise InputStop("event sort key is not unique", {"needs": "claude"})
    return events


def adjacent_dedup(values: list[str]) -> tuple[str, ...]:
    result = []
    for value in values:
        if not result or result[-1] != value:
            result.append(value)
    return tuple(result)


def boundary_signature(fragments: list[dict]) -> tuple[int, ...]:
    running = 0
    boundaries = []
    for fragment in fragments[:-1]:
        running += len(fragment["text"]["N"])
        boundaries.append(running)
    return tuple(boundaries)


def event_facts(event: dict) -> dict:
    mineru = event["mineru"]
    docling = event["docling"]
    mineru_role_signature = adjacent_dedup([fragment["canonical_role"] for fragment in mineru])
    docling_role_signature = adjacent_dedup([fragment["canonical_role"] for fragment in docling])
    role_compatible = mineru_role_signature == docling_role_signature
    graph = overlap_graph(mineru, docling)
    if event["predicate"] == "P-TEXT":
        mineru_boundary = boundary_signature(mineru)
        docling_boundary = boundary_signature(docling)
        has_split = mineru_boundary != docling_boundary
        split_additional = (
            "".join(fragment["text"]["N"] for fragment in mineru)
            == "".join(fragment["text"]["N"] for fragment in docling)
        )
    else:
        mineru_boundary = None
        docling_boundary = None
        has_split = len(mineru) != len(docling)
        split_additional = event["bilateral_component"]

    mineru_shapes = tuple(fragment["text"]["shape_signature"] for fragment in mineru)
    docling_shapes = tuple(fragment["text"]["shape_signature"] for fragment in docling)
    shapes_differ = mineru_shapes != docling_shapes
    all_fragments = mineru + docling
    predicate = event["predicate"]
    if predicate == "P-TEXT":
        trigger_domain = any(fragment["text"]["HAS_HTML"] for fragment in all_fragments)
    elif predicate == "P-STRUCT" and mineru_role_signature == ("table",) and docling_role_signature == ("table",):
        trigger_domain = any(fragment["text"]["payload_kind"] in {"html", "null"} for fragment in all_fragments)
    elif predicate == "P-STRUCT" and mineru_role_signature == ("visual",) and docling_role_signature == ("visual",):
        trigger_domain = any(fragment["text"]["payload_kind"] in {"asset_token", "null"} for fragment in all_fragments)
    elif predicate == "P-NULL":
        trigger_domain = any(
            fragment["text"]["HAS_HTML"] or fragment["text"]["payload_kind"] == "null"
            for fragment in all_fragments
        )
    else:
        trigger_domain = False
    appearance_trigger = shapes_differ and trigger_domain

    mineru_r = tuple(fragment["text"]["R"] for fragment in mineru)
    docling_r = tuple(fragment["text"]["R"] for fragment in docling)
    mineru_w = tuple(fragment["text"]["W"] for fragment in mineru)
    docling_w = tuple(fragment["text"]["W"] for fragment in docling)
    mineru_n = tuple(fragment["text"]["N"] for fragment in mineru)
    docling_n = tuple(fragment["text"]["N"] for fragment in docling)
    pointer_identity = bool(event["pointer_identity_seed"])
    if predicate == "P-TEXT":
        pointer_identity = (
            pointer_identity
            and "".join(mineru_n) == "".join(docling_n)
            and "".join(mineru_n) != ""
        )
    elif predicate != "P-STRUCT" or event["source"] != "C4_unique_R_location_candidate":
        pointer_identity = False

    return {
        "mineru_role_signature": mineru_role_signature,
        "docling_role_signature": docling_role_signature,
        "role_compatible": role_compatible,
        "overlap_graph": graph,
        "same_place": graph["same_place"],
        "mineru_boundary_signature": mineru_boundary,
        "docling_boundary_signature": docling_boundary,
        "has_split": has_split,
        "no_split": not has_split,
        "split_predicate_additional_condition": split_additional,
        "mineru_shape_signatures": mineru_shapes,
        "docling_shape_signatures": docling_shapes,
        "appearance_trigger_domain": trigger_domain,
        "appearance_trigger": appearance_trigger,
        "mineru_R_sequence": mineru_r,
        "docling_R_sequence": docling_r,
        "mineru_W_sequence": mineru_w,
        "docling_W_sequence": docling_w,
        "mineru_N_sequence": mineru_n,
        "docling_N_sequence": docling_n,
        "pointer_identity": pointer_identity,
    }


def evidence(fragment: dict) -> dict:
    text = fragment["text"]
    result = {
        "path": fragment["path"],
        "seq": fragment["seq"],
        "raw_role": fragment["raw_role"],
        "canonical_role": fragment["canonical_role"],
        "R": text["R"],
        "R_type": text["R_type"],
        "R_codepoint_length": text["R_codepoint_length"],
        "R_utf8_byte_length": text["R_utf8_byte_length"],
        "R_sha256": text["R_sha256"],
        "R_escaped_excerpt": text["R_escaped_excerpt"],
        "payload_kind": text["payload_kind"],
        "HAS_HTML": text["HAS_HTML"],
        "TAGS": text["TAGS"],
        "MARKUP": text["MARKUP"],
        "W": text["W"],
        "N": text["N"],
        "N_sha256": text["N_sha256"],
        "shape_signature": text["shape_signature"],
        "optional_fields": copy.deepcopy(fragment["optional_fields"]),
        "extra_field_keys": fragment["extra_field_keys"],
        "anchor_extra_field_keys": fragment["anchor_extra_field_keys"],
        "raw_anchor": copy.deepcopy(fragment["raw_anchor"]),
        "canonical_anchor": {
            "page": fragment["canonical_page"],
            "bbox": fragment["canonical_bbox"],
        },
    }
    if fragment["family"] == "MinerU":
        result["page_size"] = fragment["page_size"]
    else:
        result["charspan"] = fragment["charspan"]
    return result


def event_cursor(event: dict, disposition: str | None = None) -> dict:
    result = {
        "document": event["document"],
        "predicate": event["predicate"],
        "sort_key": event["sort_key"],
        "mineru_seqs": seq_list(event["mineru"]),
        "docling_seqs": seq_list(event["docling"]),
    }
    if disposition is not None:
        result["disposition"] = disposition
    return result


def classify_event(event: dict) -> tuple[str, list[dict], dict]:
    facts = event_facts(event)
    trace = copy.deepcopy(event["pairing_trace"])
    trace.extend(
        [
            {"step": "pairing_or_uniqueness", "passed": event["pairing_ok"]},
            {
                "step": "role_compatibility",
                "mineru_role_signature": facts["mineru_role_signature"],
                "docling_role_signature": facts["docling_role_signature"],
                "passed": facts["role_compatible"],
            },
            {"step": "same_place", "value": facts["same_place"], "overlap_graph": facts["overlap_graph"]},
            {
                "step": "split",
                "mineru_boundary_signature": facts["mineru_boundary_signature"],
                "docling_boundary_signature": facts["docling_boundary_signature"],
                "mineru_member_count": len(event["mineru"]),
                "docling_member_count": len(event["docling"]),
                "has_split": facts["has_split"],
                "predicate_additional_condition": facts["split_predicate_additional_condition"],
            },
            {"step": "pointer_identity", "value": facts["pointer_identity"]},
            {
                "step": "appearance_trigger",
                "mineru_shape_signatures": facts["mineru_shape_signatures"],
                "docling_shape_signatures": facts["docling_shape_signatures"],
                "trigger_domain": facts["appearance_trigger_domain"],
                "value": facts["appearance_trigger"],
            },
            {
                "step": "normalization",
                "R_sequences_equal": facts["mineru_R_sequence"] == facts["docling_R_sequence"],
                "W_sequences_equal": facts["mineru_W_sequence"] == facts["docling_W_sequence"],
                "N_sequences_equal": facts["mineru_N_sequence"] == facts["docling_N_sequence"],
            },
        ]
    )

    if not event["pairing_ok"]:
        disposition = "unclassified"
        reason = "pairing or frozen uniqueness gate failed"
    elif not facts["role_compatible"]:
        disposition = "unclassified"
        reason = "role_signature is incompatible"
    elif facts["pointer_identity"] and not facts["same_place"]:
        disposition = "真实指错"
        reason = "unique pointer identity proved but B5 same_place is false"
    elif facts["same_place"] and facts["has_split"] and facts["split_predicate_additional_condition"]:
        disposition = "切分差异"
        reason = "same_place, compatible roles, and frozen split predicate are true"
    elif facts["same_place"] and facts["no_split"] and facts["appearance_trigger"]:
        disposition = "文本外形差异"
        reason = "same_place, no_split, and the predicate-specific appearance trigger are true"
    elif (
        facts["same_place"]
        and facts["no_split"]
        and not facts["appearance_trigger"]
        and facts["mineru_N_sequence"] == facts["docling_N_sequence"]
        and facts["mineru_R_sequence"] != facts["docling_R_sequence"]
    ):
        disposition = "归一化差异"
        if facts["mineru_W_sequence"] == facts["docling_W_sequence"]:
            reason = "HTML data 投影和/或空白折叠后相等"
        else:
            reason = "NFKC/casefold/标点或分隔符删除后相等"
    elif (
        facts["same_place"]
        and facts["no_split"]
        and facts["mineru_R_sequence"] == facts["docling_R_sequence"]
        and facts["mineru_shape_signatures"] == facts["docling_shape_signatures"]
    ):
        disposition = "non_divergence"
        reason = "same_place, compatible roles, no_split, identical R and shape_signature sequences"
    else:
        disposition = "unclassified"
        reason = "event satisfies no frozen class and is not an internal non_divergence"
    trace.append({"step": "ordered_disposition", "result": disposition, "reason": reason})
    return disposition, trace, facts


def empty_counts() -> dict:
    return {
        classification: {
            **{predicate: 0 for predicate in PREDICATES},
            "cross_predicate_total": 0,
        }
        for classification in CLASSIFICATIONS
    }


def empty_progress() -> dict:
    return {
        predicate: {"completed_events": 0, "documents": {}}
        for predicate in PREDICATES
    }


def update_progress(report: dict, event: dict, disposition: str) -> None:
    predicate = event["predicate"]
    progress = report["predicate_progress"][predicate]
    progress["completed_events"] += 1
    document_progress = progress["documents"].setdefault(
        event["document"],
        {
            "completed_events": 0,
            "canonical_pages": [],
            "mineru_seqs": [],
            "docling_seqs": [],
            "last_sort_key": None,
        },
    )
    document_progress["completed_events"] += 1
    document_progress["canonical_pages"] = sorted(
        set(document_progress["canonical_pages"])
        | {fragment["canonical_page"] for fragment in event["mineru"] + event["docling"]}
    )
    document_progress["mineru_seqs"] = sorted(
        set(document_progress["mineru_seqs"]) | set(seq_list(event["mineru"]))
    )
    document_progress["docling_seqs"] = sorted(
        set(document_progress["docling_seqs"]) | set(seq_list(event["docling"]))
    )
    document_progress["last_sort_key"] = event["sort_key"]
    report["last_completed_event"] = event_cursor(event, disposition)


def initial_report() -> dict:
    return {
        "schema": "v12.9c-c2-divergence-census/frozen-v1",
        "status": "starting",
        "frozen_classifier": {
            "archive_path": ARCHIVE_PATH.as_posix(),
            "expected_sha256": EXPECTED_FROZEN_SHA256,
            "sha256_before": None,
            "byte_length_before": None,
            "sha256_after": None,
            "byte_length_after": None,
        },
        "runtime": {
            "required_cpython": ".".join(map(str, EXPECTED_PYTHON)),
            "actual_cpython": ".".join(map(str, sys.version_info[:3])),
            "required_unicode_database": EXPECTED_UNICODE,
            "actual_unicode_database": unicodedata.unidata_version,
            "stdlib_modules": ["json", "re", "html.parser", "difflib"],
        },
        "inputs": {
            "mineru_directory": MINERU_DIR.as_posix(),
            "docling_directory": DOCLING_DIR.as_posix(),
            "documents": [document for document, _ in DOCUMENTS],
            "filenames": list(EXPECTED_FILENAMES),
            "files": [],
            "preflight": "not_started",
            "last_validated_file": None,
            "validated_documents": [],
            "read_only": True,
        },
        "artifact_hashes": {
            "script_sha256": sha256_bytes(SCRIPT_PATH.read_bytes()),
            "json_sha256": "emitted by CLI after each canonical atomic write; not self-embedded",
        },
        "zero_cost_self_attestation": {
            "model_calls": 0,
            "api_keys_used": 0,
            "cost": 0,
        },
        "counts_by_classification_and_predicate": empty_counts(),
        "predicate_progress": empty_progress(),
        "divergences": [],
        "last_completed_event": None,
        "input_stop": None,
        "unclassified_stop": None,
        "runtime_stop": None,
        "integrity_stop": None,
    }


def input_stop_report(report: dict, exc: InputStop) -> str:
    report["status"] = "input_stop"
    if report["inputs"]["preflight"] != "passed":
        report["inputs"]["preflight"] = "failed"
    report["input_stop"] = {
        "reason": exc.reason,
        "context": exc.context,
        "counts_state": "classification_not_started",
        "needs": "claude",
    }
    return atomic_checkpoint(report)


def runtime_stop_report(
    report: dict,
    exc: OSError | MemoryError,
    phase_status: str,
    last_good_json_sha256: str | None,
) -> str | None:
    report["status"] = "runtime_stop"
    report["runtime_stop"] = {
        "phase_status": phase_status,
        "error_type": type(exc).__name__,
        "error": str(exc),
        "counts_preserved_by_classification_and_predicate": copy.deepcopy(
            report["counts_by_classification_and_predicate"]
        ),
        "last_completed_event": copy.deepcopy(report["last_completed_event"]),
        "last_good_json_sha256_before_runtime_stop": last_good_json_sha256,
        "needs": "claude",
    }
    try:
        return atomic_checkpoint(report)
    except (OSError, MemoryError):
        # The atomic writer never replaces OUTPUT_PATH until a complete canonical
        # payload has been flushed.  On a second failure, leave the last good JSON
        # untouched rather than attempting a non-atomic semantic rewrite.
        return last_good_json_sha256


def remaining_event_summaries(events: list[dict], start_index: int) -> list[dict]:
    return [event_cursor(event) for event in events[start_index:]]


def execute() -> int:
    report = initial_report()
    last_json_sha = None
    checkpoint_state = {"sha256": None}
    classification_started = False
    try:
        last_json_sha = atomic_checkpoint(report)
        checkpoint_state["sha256"] = last_json_sha
        frozen_before, frozen_length = frozen_segment_hash()
        report["frozen_classifier"]["sha256_before"] = frozen_before
        report["frozen_classifier"]["byte_length_before"] = frozen_length
        if frozen_before != EXPECTED_FROZEN_SHA256:
            raise InputStop(
                "frozen v1 SHA-256 differs before input read",
                {"expected": EXPECTED_FROZEN_SHA256, "actual": frozen_before, "needs": "claude"},
            )
        if sys.version_info[:3] != EXPECTED_PYTHON:
            raise InputStop(
                "runtime is not frozen CPython 3.14.2",
                {"expected": list(EXPECTED_PYTHON), "actual": list(sys.version_info[:3])},
            )
        if unicodedata.unidata_version != EXPECTED_UNICODE:
            raise InputStop(
                "runtime Unicode database is not frozen 16.0.0",
                {"expected": EXPECTED_UNICODE, "actual": unicodedata.unidata_version},
            )

        report["status"] = "runtime_and_frozen_receipt_passed"
        last_json_sha = atomic_checkpoint(report)
        checkpoint_state["sha256"] = last_json_sha
        documents = validate_and_load_inputs(report, checkpoint_state)
        last_json_sha = checkpoint_state["sha256"]
        report["status"] = "preflight_passed_building_events"
        last_json_sha = atomic_checkpoint(report)
        checkpoint_state["sha256"] = last_json_sha
        events = build_all_events(documents)
        report["status"] = "classifying"
        classification_started = True
        last_json_sha = atomic_checkpoint(report)

        stopped = False
        for event_index, event in enumerate(events):
            disposition, trace, facts = classify_event(event)
            if disposition == "unclassified":
                report["status"] = "unclassified_stop"
                report["unclassified_stop"] = {
                    "document": event["document"],
                    "predicate": event["predicate"],
                    "sort_key": event["sort_key"],
                    "mineru_evidence": [evidence(fragment) for fragment in event["mineru"]],
                    "docling_evidence": [evidence(fragment) for fragment in event["docling"]],
                    "decision_trace": trace,
                    "pairing_candidates_and_elimination": event["pairing_trace"],
                    "counts_at_stop_by_classification_and_predicate": copy.deepcopy(
                        report["counts_by_classification_and_predicate"]
                    ),
                    "last_completed_event": copy.deepcopy(report["last_completed_event"]),
                    "remaining_not_entered_events": remaining_event_summaries(events, event_index + 1),
                    "needs": "claude",
                }
                last_json_sha = atomic_checkpoint(report)
                stopped = True
                break

            if disposition in CLASSIFICATIONS:
                report["counts_by_classification_and_predicate"][disposition][event["predicate"]] += 1
                report["counts_by_classification_and_predicate"][disposition]["cross_predicate_total"] += 1
                divergence_id = f"D-{len(report['divergences']) + 1:06d}"
                report["divergences"].append(
                    {
                        "divergence_id": divergence_id,
                        "document": event["document"],
                        "predicate": event["predicate"],
                        "mineru_evidence": [evidence(fragment) for fragment in event["mineru"]],
                        "docling_evidence": [evidence(fragment) for fragment in event["docling"]],
                        "classification": disposition,
                        "decision_trace": trace,
                    }
                )
            update_progress(report, event, disposition)
            report["status"] = "classifying"
            last_json_sha = atomic_checkpoint(report)

        if not stopped:
            report["status"] = "complete"

        frozen_after, frozen_after_length = frozen_segment_hash()
        report["frozen_classifier"]["sha256_after"] = frozen_after
        report["frozen_classifier"]["byte_length_after"] = frozen_after_length
        if frozen_after != frozen_before or frozen_after != EXPECTED_FROZEN_SHA256:
            report["status"] = "integrity_stop"
            report["integrity_stop"] = {
                "reason": "frozen v1 bytes changed during run; census is invalid",
                "before": frozen_before,
                "after": frozen_after,
                "expected": EXPECTED_FROZEN_SHA256,
                "needs": "claude",
            }
        last_json_sha = atomic_checkpoint(report)
    except InputStop as exc:
        if not classification_started:
            last_json_sha = checkpoint_state["sha256"] or last_json_sha
        if classification_started:
            report["status"] = "integrity_stop"
            report["integrity_stop"] = {
                "reason": "frozen invariant failed after classification started",
                "input_stop_reason": exc.reason,
                "context": exc.context,
                "counts_preserved_by_classification_and_predicate": copy.deepcopy(
                    report["counts_by_classification_and_predicate"]
                ),
                "last_completed_event": copy.deepcopy(report["last_completed_event"]),
                "needs": "claude",
            }
            try:
                last_json_sha = atomic_checkpoint(report)
            except (OSError, MemoryError):
                pass
        else:
            try:
                last_json_sha = input_stop_report(report, exc)
                frozen_after, frozen_after_length = frozen_segment_hash()
                report["frozen_classifier"]["sha256_after"] = frozen_after
                report["frozen_classifier"]["byte_length_after"] = frozen_after_length
                last_json_sha = atomic_checkpoint(report)
            except (InputStop, OSError, MemoryError):
                pass
    except (OSError, MemoryError) as exc:
        if not classification_started:
            last_json_sha = checkpoint_state["sha256"] or last_json_sha
        phase_status = report["status"]
        if classification_started:
            last_json_sha = runtime_stop_report(
                report,
                exc,
                phase_status,
                last_json_sha,
            )
        else:
            wrapped = InputStop(
                "runtime I/O or memory failure before classification started",
                {
                    "phase_status": phase_status,
                    "error_type": type(exc).__name__,
                    "error": str(exc),
                },
            )
            try:
                last_json_sha = input_stop_report(report, wrapped)
            except (OSError, MemoryError):
                # Keep the last successful atomic starting/preflight receipt.
                pass

    cli_receipt = {
        "output_path": OUTPUT_PATH.as_posix(),
        "json_sha256": last_json_sha,
        "script_sha256": report["artifact_hashes"]["script_sha256"],
        "frozen_classifier_sha256_after": report["frozen_classifier"]["sha256_after"],
        "status": report["status"],
    }
    sys.stdout.buffer.write(canonical_bytes(cli_receipt))
    return 0 if report["status"] == "complete" else 2


if __name__ == "__main__":
    raise SystemExit(execute())
```
<!-- CENSUS_SCRIPT_SOURCE_END -->

`CENSUS_SCRIPT_SOURCE_START` 后的 ` ```python<LF>` 与结束前的 `<LF>``` ` 仅是 Markdown 围栏；两围栏之间的源码字节（含源码末尾 LF）与上述仓外文件逐字相同。

### 7.2 唯一实跑命令

```powershell
$scriptPath = 'C:\Users\70208\AppData\Local\Temp\codex-c2-divergence-census-0dfc2d319c5f40e9a80bb6505ba05176\run_divergence_census.py'
python -B $scriptPath
```

脚本固定只读两家 8 份 fragments，固定只向同一 temp 目录原子写 `divergence-census.json`。返回码 `2` 表示冻结规则触发 `input_stop` / `unclassified_stop` / `integrity_stop` / `runtime_stop`，不是重跑许可。

### 7.3 证据整树哈希命令（开工、收尾同一配方）

```powershell
$source = @'
from pathlib import Path
import hashlib, json
root = Path(r"D:\\Coinsides\\v12.9-selection")
files = sorted((p for p in root.rglob("*") if p.is_file()), key=lambda p: p.relative_to(root).as_posix())
tree = hashlib.sha256(); count = total = manifest_bytes = 0
for p in files:
    size = p.stat().st_size; h = hashlib.sha256()
    with p.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""): h.update(chunk)
    rel = p.relative_to(root).as_posix()
    line = f"{rel}\t{size}\t{h.hexdigest()}\n".encode("utf-8")
    tree.update(line); count += 1; total += size; manifest_bytes += len(line)
print(json.dumps({"file_count":count,"total_bytes":total,"manifest_bytes":manifest_bytes,"tree_sha256":tree.hexdigest()}, indent=2))
'@
$source | python -B -
```

### 7.4 实跑后产物收据

- 控制结果：`unclassified_stop`；唯一实跑，没有换规则重跑。
- stdout 收据：`{"frozen_classifier_sha256_after":"bafeb260088b036eb2be8e6f85a1d22073db8c5c1c3fa24a274d66ec49cb50be","json_sha256":"afdc9479311f5419f3a563073d8fc06bd12c49aab58cfd748e61283800c73045","output_path":"C:/Users/70208/AppData/Local/Temp/codex-c2-divergence-census-0dfc2d319c5f40e9a80bb6505ba05176/divergence-census.json","script_sha256":"072e5f7280aa53f18d7be9fc2cf3d8050c8b06e26a85ca9d06e7730857375269","status":"unclassified_stop"}`
- JSON 路径：`C:/Users/70208/AppData/Local/Temp/codex-c2-divergence-census-0dfc2d319c5f40e9a80bb6505ba05176/divergence-census.json`；119,456 bytes；canonical UTF-8 + 单 LF；SHA-256 `afdc9479311f5419f3a563073d8fc06bd12c49aab58cfd748e61283800c73045`。
- 源码收尾 SHA-256：`072e5f7280aa53f18d7be9fc2cf3d8050c8b06e26a85ca9d06e7730857375269`，与实跑前及本文源码块相同。
- 冻结 v1 收尾 SHA-256：`bafeb260088b036eb2be8e6f85a1d22073db8c5c1c3fa24a274d66ec49cb50be`，与实跑前相同。

## 8. 收尾复核

- 证据本体收尾整树：94,935 文件；3,149,405,801 字节；逻辑清单 14,624,025 字节；SHA-256 `efebe29dfdfa4c1762ad95abc70c9a9f6085c8573d9029ee9fcfedf8484fad0d`。
- 上述四项与 §1.2 开工值逐项相同；`D:/Coinsides/v12.9-selection/**` 在本单前后一个字节未变。
- v1 冻结段：15,333 bytes，收尾 SHA-256 `bafeb260088b036eb2be8e6f85a1d22073db8c5c1c3fa24a274d66ec49cb50be`，与冻结收据相同。
- 仓外源码与本文逐字源码块：各 72,999 bytes，SHA-256 均为 `072e5f7280aa53f18d7be9fc2cf3d8050c8b06e26a85ca9d06e7730857375269`。
- 未调用任何模型，未使用任何 API key，未产生任何花费；未重跑两家转写器；未查看图片或原 PDF。
- 禁区、既有脏项与最终 git diff 的逐项核验见工单 `## Result` 回执；本单没有 commit、push 或翻顶部状态。
