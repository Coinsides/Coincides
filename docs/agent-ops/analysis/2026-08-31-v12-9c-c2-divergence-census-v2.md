> **状态 (Status)**: active（实验层分歧普查 v2；口径冻结先于脚本实现）
> **层 (Layer)**: 分析 / Analysis（V12.9c · c-2 两家只读分歧普查 v2）
> **日期 (Updated)**: 2026-08-31
> **权威 (Authoritative)**: 否（证据归档；裁定来自 Fable，由 Claude 工程调度会话转写）

# V12.9c c-2：MinerU × Docling 分歧普查 v2

## 0. 纪律、定义域与计数语法

- 本单只读比较 12.9a 已有的 MinerU 与 Docling 全卷产物；不重跑任何转写器，不做迁移，不改生产码或测试。
- **四分类的定义域 = 已配对事件。** 机械配对门位于四分类上游；一侧成员为空的事件只由配对门记为「存在性差异」，不进入四分类并继续普查。
- 「存在性差异」是配对门的产出，不是分类器标签。普查只记方向「仅 MinerU 有」或「仅 Docling 有」，不判断哪家应当产生该对象。
- 输出域并列为：尺子域（①文本外形差异、②归一化差异、③切分差异）、置信域（④真实指错）、存在域（中立占位）。存在域不预判归入前两域中的哪一域，挂 c-3 触发器；没有消费者时不猜它的形状。
- 计数单位分别写死：四分类按“已配对且完成分类的事件”计；存在域按“配对门逐 fragment 产生的单边收据”计；内部 `non_divergence` 按已处理事件计但不列入分歧数。
- 不输出比例、优劣判断、置信度字段或阈值建议。任何跨谓词合计都与 `P-TEXT / P-STRUCT / P-NULL` 三栏及各自 page/seq 边界同处申报。
- 程序只使用 CPython 标准库，不读取环境变量中的 key，不调用模型或外部 API。零成本自证的射程只覆盖普查程序，不覆盖 builder 会话自身的推理开销。

## 1. 样本、版本与证据链

### 1.1 两家同四卷既有产物

| 卷 | MinerU 文件 / 字节 / fragments / SHA-256 | Docling 文件 / 字节 / fragments / SHA-256 |
|---|---|---|
| academic-reading | `ielts-academic-reading-sample-tasks-2023.fragments.json` / 116,092 / 320 / `75593ef6fe92d9102655df27445dbf29c4ea9cba19055960443cf9264964d9ec` | 同名 / 134,532 / 351 / `68e20a28d7e809143f13ad157755c6fa9fb38a73484c00dd1c075380779c1b1e` |
| writing-example-responses | `ielts-academic-writing-example-responses-to-parts-1-and-2-with-band-scores-and-examiner-comments.fragments.json` / 25,830 / 69 / `976be41236c303a3534bb0cbb2588404342e914dda0e3cc6a51340d256ba6e4f` | 同名 / 26,723 / 63 / `793609d4cac220d56c58dfacdd14109b19a8453434e4fa39beda022eb830266e` |
| academic-writing | `ielts-academic-writing-sample-tasks-2023.fragments.json` / 63,446 / 152 / `d935ae28a3d56095ea12845b1e7997207cb3fe262fb1a31e272a5c3610304f71` | 同名 / 64,448 / 154 / `90860546ef7a748cb7197449f5be268dea678e4b2ffba7a6b4b03bd14d74afb8` |
| listening | `ielts-listening-sample-tasks-2023.fragments.json` / 77,053 / 267 / `15624fce57fd29b108748ecc3db4747e0bece03afce2d380520068ef8576f048` | 同名 / 88,844 / 306 / `a5d927a4abc2c2b11f0d676c296d6d1824d970e97d008ebac21c19046f40706a` |

两家版本边界为 MinerU `3.4.5` 与 Docling `2.123.0`。本轮只读上述 8 份直接子文件；目录里其他后缀文件、原 PDF、图片、`middle.json`、数据库与生产码都不进入判定射程。

### 1.2 开工整树哈希与 digest 接续

沿用 v1 已公开的可执行字节语法：递归枚举 `D:/Coinsides/v12.9-selection` 的全部普通文件（含隐藏文件），按正斜杠相对路径作 ordinal 排序；每行写 `relative_path<TAB>byte_length<TAB>lowercase_file_sha256<LF>`（UTF-8 无 BOM），再对整份逻辑清单取 SHA-256。当前开工复算为：

- 文件数：**94,935**
- 总字节数：**3,149,405,801**
- 逻辑清单字节数：**14,624,025**
- 开工整树 SHA-256：`efebe29dfdfa4c1762ad95abc70c9a9f6085c8573d9029ee9fcfedf8484fad0d`

接续说明：c-1c 档案记录的 digest 为 `3ce243035350e653d824bea118cb0715acf4804bf9653ee63a56b6890985a6d7`；封存 v1 已如实记录它无法用 v1 明文配方复现，因此 **c-1c → c-2 v1 仍是断链**，本轮不伪装修复。c-2 v1 收尾采用上面的明确字节语法，digest 为 `efebe...fad0d`；本轮以同一配方复算得到同值，所以 **c-2 v1 → c-2 v2 已接续**。收尾仍须用同一配方逐项复算。

## 2. 冻结程序（先于脚本第一个字节）

<!-- FROZEN_CLASSIFIER_V2_START -->
### 冻结程序 v2 原文

#### A. 输入、校验、证据字段与唯一事件顺序

1. 输入只能是 MinerU=`D:/Coinsides/v12.9-selection/tools/_out/c2-mineru/` 与 Docling=`D:/Coinsides/v12.9-selection/tools/_out/c1-docling/` 的直接子文件。两目录中名称以大小写敏感的 `.fragments.json` 结尾者，文件名集都必须**恰好**等于下列四项，不得减少、增加或大小写漂移，且四对文件名必须逐字一一相同：`ielts-academic-reading-sample-tasks-2023.fragments.json`、`ielts-academic-writing-example-responses-to-parts-1-and-2-with-band-scores-and-examiner-comments.fragments.json`、`ielts-academic-writing-sample-tasks-2023.fragments.json`、`ielts-listening-sample-tasks-2023.fragments.json`。卷标签与顺序固定为：`academic-reading` → `writing-example-responses` → `academic-writing` → `listening`，依次对应上述四项。目录中的其他后缀文件不入射程。
2. 运行时固定为 CPython `3.14.2`、Unicode database `16.0.0` 及该运行时的 `json/re/html.parser/difflib` 标准库实现。文件按 UTF-8 strict、无 BOM 解码；JSON 解析固定 `parse_int=int,parse_float=float`，拒绝重复 object key、`NaN/Infinity/-Infinity`、尾随内容和任意字符串中的未配对 surrogate `U+D800..U+DFFF`。每份文件必须是 JSON 数组；每条必须**至少**有 `anchor / role / seq / text`。`seq` 必须是 `0 <= seq < 2147483647`、从 0 开始的连续唯一 Python int（bool 不算 int）；`role` 必须是字符串且大小写逐字判定；`text` 只能是字符串或 null；`anchor.page` 必须是 Python int（bool 不算），MinerU 必须 `page>=0`、Docling 必须 `page>=1`；`anchor.bbox` 必须是 4 个 Python int/float（bool 不算）且转成 binary64 float 后有限。MinerU 还必须逐条有 2 个正的有限数值 `page_size`，Docling 还必须逐条有 2 个有限数值 `charspan`。任一不成立即输入停线，不生成事件、不开始配对门或分类。
3. 每条证据逐字保留 `type / image_path / html` 三个可选字段的 `field_present` 与实际 JSON value；不存在则记 `field_present=false,value=null`，不查 `middle.json`、图片、原 PDF、其他中间件或生产码来补值。全程禁止凭肉眼看图断言。其他额外字段只登记键名，不参与判定。
4. 三条互斥谓词为 `P-TEXT / P-STRUCT / P-NULL`；每个 fragment 必须且只能命中一条。先机械建立全部候选事件，再严格按唯一 sort key 前进：`(卷序号,event_page,min_any_seq,mineru_empty_rank,min_mineru_seq_or_0,docling_empty_rank,min_docling_seq_or_0,predicate_rank,member_key)`。`event_page` 是事件两家全部 canonical page 的最小值，`min_any_seq` 是两家全部 seq 的最小值；有 MinerU/Docling 成员时对应 empty rank 为 0 且取最小 seq，对应侧成员为空时 empty rank 为 1 且 seq 位写 0；`predicate_rank` 固定 `P-STRUCT=0,P-NULL=1,P-TEXT=2`；`member_key` 是事件成员按 `(family_rank,seq)` 排序后的完整 tuple，`family_rank: MinerU=0,Docling=1`。上述 tuple 按 Python tuple lexicographic order 排序且对不同事件唯一。第一条 `pairing_stop / unclassified_stop / input_stop / integrity_stop / runtime_stop` 出现即停，不处理其后事件；存在域事件不触发停止。

#### B. 固定字段投影

1. role 映射只有：MinerU `title→heading`、`text→text`、`list→list`、`index→index`、`image|chart→visual`、`table→table`；Docling `section_header→heading`、`text|footnote→text`、`list_item|checkbox_unselected→list`、`document_index→index`、`picture→visual`、`table→table`。表外 role 不猜，输入停线。原始 role 始终保留；映射后的同义词本身不算分歧。
2. 文本投影固定为：`R`=原始 `text`。HTML regex 固定为 `(?is)</?(?P<tag>table|thead|tbody|tfoot|tr|th|td|caption|colgroup|col|p|div|span|ul|ol|li|br|img|figure|figcaption|h[1-6])(?:\s[^<>]*?)?/?>`。若 `R=null`，直接规定 `HAS_HTML=false,TAGS=[],MARKUP=[],W=null,N=''`，不调用 regex、HTMLParser 或 `re.sub`。否则令 `matches=list(regex.finditer(R))`，`HAS_HTML=bool(matches)`，`TAGS=[match.group('tag').lower() for match in matches]`，`MARKUP=[match.group(0) for match in matches]`。若 `HAS_HTML=true`，新建 `HTMLParser(convert_charrefs=True)` 子类实例，以 `handle_data` 回调顺序 append data，依次调用 `feed(R)` 与 `close()`，再以单个空格连接 data；否则直接取 R。随后执行 `re.sub(r'\s+', ' ', value, flags=re.UNICODE).strip()` 得 W。HTMLParser 的 `feed/close` 任一异常均为输入停线。`N` 严格依次执行：对非 null W 做 `unicodedata.normalize('NFKC',W)`；对结果 `.casefold()`；删除 U+00AD；最后从左到右删除 Unicode category 以 `P` 或 `Z` 开头或 `str.isspace()==true` 的每个 code point。N 是精确字符串，不用编辑距离或相似度。
3. `payload_kind` 固定为 `null | html | asset_token | plain`：R=null ⇒ null；HAS_HTML=true ⇒ html；canonical role=visual 且 `R.strip()` 完整命中 `(?i)(?:[0-9a-f]{32,64}|(?:[^/\\\s]+[/\\])*[^/\\\s]+\.(?:png|jpe?g|gif|webp|bmp|tiff?))` ⇒ asset_token；其余字符串 ⇒ plain。`shape_signature=(payload_kind,MARKUP)`。
4. 页号统一为 MinerU `canonical_page=anchor.page+1`、Docling `canonical_page=anchor.page`，结果必须是正整数。所有几何数值先转 CPython binary64 float；数值相等、distinct、加减、比较和交集均使用 Python float 的 exact 运算，无取整、epsilon 或容差。每个 canonical page 上 MinerU 全部 `page_size` 的 distinct `(page_width,page_height)` 集必须恰有一个元素。MinerU bbox 固定按 TOPLEFT `[x0,y0,x1,y1]`；Docling bbox 固定按 BOTTOMLEFT `[left,top,right,bottom]`，用该页唯一 page_height 转 TOPLEFT `[left,page_height-top,right,page_height-bottom]`。两家 canonical bbox 都必须无容差满足 `0<=x0<x1<=page_width` 与 `0<=y0<y1<=page_height`；不试其他方位。缺该页 `(page_width,page_height)`、distinct 集不唯一、越界、退化框或非有限值均输入停线。
5. 两组 anchor 是“同一落点”，当且仅当 canonical page 集合相同，且两边每个 bbox 都在同页与对方至少一个 bbox 有正面积交集；仅边缘相接不算。数值不同但满足覆盖只算轮廓差，不另造分类。`overlap_graph` 必须逐边输出。

#### C. 三条配对谓词、消费与单边事件成形

1. `P-TEXT` 射程：canonical role 不在 `{visual,table}` 且 N 非空。按 seq 建序列，以 `(canonical_role,N)` 交给 CPython 3.14.2 的 `difflib.SequenceMatcher(autojunk=False)`。按 `get_opcodes()` 返回顺序处理；每个 equal block **逐位置发出一个 1:1 事件**。每个非 equal opcode 从左向右：若两边均非空，只枚举各自**当前 opcode 内**从当前游标起的非空连续前缀，找 `concat(N)` 完全相同者；以 `(两边条数和,条数差绝对值,MinerU 条数,Docling 条数,MinerU 起始 seq,Docling 起始 seq,MinerU 结束 seq,Docling 结束 seq)` 的 Python lexicographic 最小 tuple 成组并前进，该 tuple 在程序与输出中只命名为 `candidate_sort_key / selected_sort_key`。当前游标无候选且两侧仍均非空时，发一个含当前 opcode 两边全部剩余条目的**双边配对未决事件**并消费剩余条目。opcode 起始即只有一侧有条目，或前缀消费后只剩一侧时，把该侧每个剩余 fragment **逐 fragment 发成单边事件**；不得把多个 fragment 合成一张存在域收据。不得跨 opcode 凑组。
2. P-TEXT 的 SequenceMatcher 只给**候选**。同 key 的跨家 bbox 图只在 `canonical_page` 相同且 bbox 正面积交集时连边。若候选所含任一 `(canonical_role,N)` 在任一家庭全卷出现多于一次，则对每个重复 key，以两家本卷 P-TEXT 射程中该 key 的**全部 occurrence**为左右节点；按 `(family_rank,seq)` 排序建图。图中每个 occurrence 都必须 degree=1；当前事件中的每个 occurrence，其唯一邻点还必须属于当前事件对侧成员，否则该双边事件配对未决。重复文本绝不因出现序号或保序位置获得内容身份。对于任意 `concat(N)` 分组，另行枚举两家**整卷 P-TEXT 序列（不是当前 opcode）**中所有能产生该 concat 的非空连续区间：若两家各恰有一个区间且就是当前候选，直接通过内容唯一性守门，不要求落点；若任一家庭有多个区间，则枚举全部跨家区间对，仅当满足 B5“同一落点”的跨家区间对**恰好一对且就是当前候选**时通过，否则该双边事件配对未决。
3. `P-STRUCT` 射程：canonical role 在 `{table,visual}`。顶点恰为本谓词尚未消费的节点。先按同卷/同 canonical role/同 canonical page，以 bbox 正面积交集建二分图。每组顶点及邻接表按 `(family_rank,seq)` 排序，连通分量按其最小 `(family_rank,seq)` 排序。连通分量两侧都有节点时：若 1:n 或 n:1，整体成组；若 1:1，成组；若 m:n 且 m>1,n>1，则只有当每个节点 degree=1 且 m=n 时按 MinerU seq 升序拆成其唯一边对应的 1:1 组，否则发一个包含完整分量的双边配对未决事件。所有进入这些双边分量的节点立即 consumed。
4. P-STRUCT 对尚未 consumed 的单边节点，只在同 canonical role 下，以 R 非 null 且逐字相同建立候选；仅当该 R 在两家全部未消费同 role 节点中各出现恰好一次时，建立一对“落点候选”并同时 consume 两节点。扫描顺序固定为 `(canonical_role,min canonical page,min seq,family_rank)`，其中 `family_rank: MinerU=0,Docling=1`；consume 后不得复用。其余单边节点各自逐 fragment 发单边事件。这样既保留合法的跨落点配对供“真实指错”判断，也让 C4 后仍未消费的单边节点进入同一机械门。
5. `P-NULL` 射程：canonical role 不在 `{visual,table}` 且 R=null 或 N 为空。顶点恰为本谓词尚未消费的节点。仅在同卷、同 canonical role、同 canonical page 且 bbox 有正面积交集时连边；仅边缘相接不连边。顶点、邻接表、连通分量排序与 C3 相同。1:n/n:1 整体成组，1:1 成组，m:n 且 m>1,n>1 时仅 degree=1 且 m=n 才按 MinerU seq 升序拆成唯一边对应的 1:1，否则发一个包含完整分量的双边配对未决事件。单边分量中的节点各自按 `(family_rank,seq)` 逐 fragment 发单边事件。节点消费一次且不与其他谓词重计。

#### D. 四分类的机械布尔式与可复核字段

1. 事件的 `role_signature` 定义为各家按 seq 排列的 canonical role 序列做相邻去重后的 tuple；`role_compatible` 当且仅当两家 `role_signature` 完全相同。所有四类与内部非分歧判定都必须先满足 `role_compatible=true`，否则“未归类”。`same_place` 严格等于 B5。`has_split` 对 P-TEXT 定义为两家逐片 N 的 Python `len()`（Unicode code point 数）所生成的“排除最终总长的累计边界 tuple”不同；对 P-STRUCT/P-NULL 定义为两家成员数不同。`no_split` 当且仅当 `has_split=false`。
2. **文本外形差异**：事件满足 `same_place=true,no_split=true,role_compatible=true`，并满足以下唯一 `appearance_trigger`：P-TEXT 下两家 `shape_signature` 序列不同且至少一侧 HAS_HTML=true；P-STRUCT/table 下 `shape_signature` 序列不同且至少一侧 payload_kind∈{html,null}；P-STRUCT/visual 下 `shape_signature` 序列不同且至少一侧 payload_kind∈{asset_token,null}；P-NULL 下 `shape_signature` 序列不同且（至少一侧 HAS_HTML=true 或至少一侧 payload_kind=null）。触发只说明 payload 外形，不说明图片语义。逐条列路径、seq、原始/canonical role、R 的类型/Unicode code point 长度/UTF-8 字节长度/SHA-256/转义摘录、payload_kind/HAS_HTML/TAGS/MARKUP/W/N、三个可选字段的 presence+value、原始/canonical anchor 与 overlap_graph。
3. **归一化差异**：事件满足同一落点、无切分、role_signature 相容、不触发 appearance_trigger；两家逐片 N 序列完全相同、R 序列不同。逐条列 D2 全部字段，并列 R→W→N 的首个相等阶段；若 W 已相等记“HTML data 投影和/或空白折叠后相等”，否则 N 相等记“NFKC/casefold/标点或分隔符删除后相等”。
4. **切分差异**：事件满足 `same_place=true,role_compatible=true,has_split=true`；P-TEXT 还必须两边 concat(N) 相同，P-STRUCT/P-NULL 必须来自双边连通分量。逐条列谓词、全部 seq/roles、逐条 R 摘要、两边条数、累计边界、全部 anchors/overlap_graph、三个可选字段 presence+value。seq 数值不同本身不触发。
5. **真实指错**：事件满足 `role_compatible=true`，且 `pointer_identity=true,same_place=false`。`pointer_identity` 仅在以下两种情形为真：P-TEXT 事件两边 `concat(N)` 完全相同且非空，并通过 C2 的单片/连续区间唯一性守门；或 P-STRUCT 已由 C4 的全卷双方唯一且逐字相同非 null R 建立落点候选。逐条列内容同一性证明、两家 seq/role/R/W/N、原始/canonical anchors、MinerU page_size、Docling charspan、overlap_graph、三个可选字段 presence+value。无唯一内容证明不得判本类。

#### E. 上游机械配对门、分类顺序与停线

1. 每个有序事件先进入配对门。若 `bool(mineru) XOR bool(docling)` 为真，程序必须再断言该事件总成员数恰为 1；随后逐 fragment 输出一条存在域收据，方向只能是 `仅 MinerU 有` 或 `仅 Docling 有`，更新配对门进度并继续下一事件。收据必须列 `existence_id / domain / pairing_gate_disposition / direction / document / predicate / source / sort_key / member_evidence / opposite_side_member_count / decision_trace`；其中 `domain="存在域"`、`pairing_gate_disposition="存在性差异"`，不得写 `classification` 字段。
2. 若两侧成员都为空，记 `integrity_stop`。若两侧都有成员但 `pairing_ok=false`，记 `pairing_stop` 并标 `needs: claude`；它既不进入存在域，也不进入四分类。只有两侧都有成员且 `pairing_ok=true` 的事件才是已配对事件并进入 D。
3. 已配对事件依次执行：`role_compatible=false` ⇒ “未归类”；`pointer_identity=true,same_place=false` ⇒ **真实指错**；`same_place=true,has_split=true` 且满足 D4 的谓词附加条件 ⇒ **切分差异**；`same_place=true,no_split=true,appearance_trigger=true` ⇒ **文本外形差异**；满足 D3 全部布尔式 ⇒ **归一化差异**；`same_place=true,role_compatible=true,no_split=true` 且两家 R 序列和 shape_signature 序列完全相同 ⇒ 内部 disposition `non_divergence`，不输出、不计入分歧数；其余 ⇒ “未归类”。
4. 已配对事件若仍为“未归类”，立即写 `unclassified_stop` 并标 `needs: claude`；禁止硬塞、改尺或另造分类。输入预检失败记 `input_stop`；冻结段/脚本完整性失败记 `integrity_stop`；I/O 或内存失败按阶段记 `runtime_stop`。停线后不换规则重跑。
5. `pairing_stop` 与 `unclassified_stop` 都必须含卷/谓词/sort key、两家相关 seq/role、R 类型/长度/SHA/转义摘录、payload/可选字段实际值、原始/canonical anchors、候选与排除过程、停止时四类分谓词计数、存在域分谓词计数、最后处理/最后配对/最后分类事件及尚未进入的各谓词边界。

#### F. 证据投影、输出与计数

1. 每个 fragment 的证据固定列：`path / seq / raw_role / canonical_role / R / R_type / R_codepoint_length / R_utf8_byte_length / R_sha256 / R_escaped_excerpt / payload_kind / HAS_HTML / TAGS / MARKUP / W / N / N_sha256 / shape_signature / optional_fields / extra_field_keys / anchor_extra_field_keys / raw_anchor / canonical_anchor`，并按家庭附 `page_size` 或 `charspan`。存在域收据同时列原始单边 component/opcode 来源、对侧成员数 0 与配对门 decision trace；只陈述结构，不判断对象语义。
2. 每条四分类分歧固定输出 `divergence_id / document / predicate / mineru_evidence / docling_evidence / classification / decision_trace`；`classification` 只能是四个既定名称。存在域单列 `existence_differences`，不占分类数组、不占四分类计数。
3. 四类计数固定为 `counts_by_classification_and_predicate`，每类均列 `P-TEXT / P-STRUCT / P-NULL / cross_predicate_total`。存在域固定为 `existence_counts_by_predicate`，列三谓词与同表总计；其计数单位是单边 fragment 收据，不与四分类事件相加成一个总数。内部 `non_divergence` 只列处理进度。
4. JSON 固定保留三个互不冒充的游标：`last_processed_event`（含存在门处理）、`last_paired_event`（进入分类器的最后已配对事件）、`last_classified_event`（最后一个四类分歧；没有则 null）。另保留 `last_completed_classifier_event`，允许值为四类或 `non_divergence`。

#### G. 分谓词射程、零成本与完整性

1. 对 `full_candidate_scope / processed_scope / paired_classifier_scope / remaining_after_stop_scope` 四个阶段，均按 `document × predicate × family` 输出：fragment 数、canonical page 的完整 distinct 集及 min/max、seq 的完整 distinct 集及 min/max；再按 `document × predicate` 输出事件数。空集合明确写 count=0、distinct=[]、min=null、max=null。seq 每卷独立，不跨卷伪造一个连续区间。
2. `full_candidate_scope` 覆盖全部已建事件；`processed_scope` 覆盖配对门或分类器已经给出控制结果的事件成员；当前停线事件单列且不混入 processed；`remaining_after_stop_scope` 只覆盖停线事件之后尚未进入的事件；完整结束时它为空。`paired_classifier_scope` 只覆盖两侧非空且 `pairing_ok=true` 的事件成员。每张含 `cross_predicate_total` 的计数表旁必须引用这四组按谓词边界，禁止只给逐卷数量。
3. 结果固定自证 `model_calls=0,api_keys_used=0,cost=0`，并写 `scope="census_program_only; excludes builder-session reasoning"`。程序不得读取任何 key 或调用模型/API。
4. 结果 JSON 固定用 `json.dumps(result,ensure_ascii=False,sort_keys=True,separators=(',',':'),allow_nan=False)` 生成，UTF-8 strict 编码后追加**恰好一个 LF**；文件 SHA-256 覆盖全部字节。脚本、JSON、冻结段分别取 SHA-256；实跑前后脚本与冻结段任一字节变化即本轮无效并停线。
<!-- FROZEN_CLASSIFIER_V2_END -->

### 2.1 冻结收据

- SHA 计算窗口：`2026-08-31T01:26:05.5388801-04:00` 至 `2026-08-31T01:26:05.6468630-04:00`（America/Toronto）；以后者记为冻结时刻。
- 字节边界：从 `FROZEN_CLASSIFIER_V2_START` 标记起始 `<` 到 `FROZEN_CLASSIFIER_V2_END` 标记末尾 `>`；**两枚 HTML 标记均计入**。
- 冻结段字节数：**18,690 UTF-8 bytes**。
- 冻结段 SHA-256：`3d49b12ab0ac5a356da10223ecb924612346423edbf51198f916d816ffdbc1d3`。
- 冻结时计划使用的仓外脚本路径 `C:/Users/70208/AppData/Local/Temp/codex-c2-divergence-census-v2-20260831/run_divergence_census_v2.py` 尚不存在（`exists_at_freeze=false`）；因此冻结时刻严格早于该脚本的第一个字节。

## 3. 实测记录

### 3.1 唯一实跑收据

- 冻结完成时刻为 `2026-08-31T01:26:05.6468630-04:00`；脚本文件的 CreationTime（本轮用作首字节时刻）为 `2026-08-31T01:27:37.1516898-04:00`。严格不等式为 `2026-08-31T01:26:05.6468630-04:00 < 2026-08-31T01:27:37.1516898-04:00`。脚本由封存 v1 源码复制后再实现 v2；复制保留了 LastWriteTime，故不拿 LastWriteTime 冒充首字节时刻。
- 最终脚本：86,093 bytes、2,135 个 LF、SHA-256 `1d7eecd6d25c2757b51c6cad4d54483ca7af72f93a6547d9b600355bcfa0122d`。AST-only 解析通过后才放行；实跑前再次精确复核同一 SHA。
- 唯一执行命令：`python -B C:/Users/70208/AppData/Local/Temp/codex-c2-divergence-census-v2-20260831/run_divergence_census_v2.py`。执行窗口为 `2026-08-31T01:38:01.9281883-04:00` 至 `2026-08-31T01:38:02.4380103-04:00`。没有执行第二次，也没有重跑任何转写器。
- 程序控制返回值为 `2`，stdout 与 canonical JSON 都记 `status="unclassified_stop"`。外层 PowerShell 为继续读取现有收据而正常结束为 `0`；两者射程不同，本档案不把外层值冒充程序值，也不为追码重跑。
- 运行时实测 CPython=`3.14.2`、Unicode database=`16.0.0`；8 个输入文件全部通过 strict preflight，其 byte length 与 SHA-256 均同 §1.1。
- 文件写入域精确限于仓外 `divergence-census.json.tmp` 与同目录最终 `divergence-census.json`（原子 `os.replace`）；证据树、仓内文件和脚本自身均只读。`-B` 封死 `.pyc` 写入。

### 3.2 产物与完整性

- canonical JSON 创建于 `2026-08-31T01:38:02.0886967-04:00`，末次写入于 `2026-08-31T01:38:02.4237306-04:00`；106,504 bytes；SHA-256 `f1a31c48db5e7c40418e3961a936d90f90f8e80fded94a8427122e6e0285a555`。
- 结构化复核范围是上述整份 JSON：UTF-8 strict、无重复 object key、与 `ensure_ascii=False,sort_keys=True,separators=(',',':'),allow_nan=False` 重编码逐字节相同，末尾恰一个 LF。
- 冻结段跑前/跑后均为 18,690 bytes 与 SHA-256 `3d49b12ab0ac5a356da10223ecb924612346423edbf51198f916d816ffdbc1d3`；脚本跑前/跑后均为 SHA-256 `1d7eecd6d25c2757b51c6cad4d54483ca7af72f93a6547d9b600355bcfa0122d`。
- 程序级零成本自证：`model_calls=0,api_keys_used=0,cost=0,scope="census_program_only; excludes builder-session reasoning"`。这只覆盖 census 程序，不覆盖 builder 会话自身推理开销。

## 4. 配对门产出与逐条字段证据

### 4.1 计数与共同字段

配对门在停线前逐 fragment 形成 9 张存在域收据：`P-TEXT=2 / P-STRUCT=6 / P-NULL=1 / cross_predicate_total=9`。方向按结构化解析为「仅 Docling 有」8 张、「仅 MinerU 有」1 张；这里只记方向，不判断对象应否出现。9 张收据的 `opposite_side_member_count` 均为 0，且对象键集合中均无 `classification`。

该合计的专属已处理边界为：P-TEXT MinerU=`f1/page 2/seq 4`、Docling=`f1/page 1/seq 6`；P-STRUCT MinerU=`∅`、Docling=`f6/pages {1,3} (min 1,max 3)/seqs {0,4,5,7,8,15} (min 0,max 15)`；P-NULL MinerU=`∅`、Docling=`f1/page 2/seq 10`。四阶段总射程与 remaining 边界另见 §5.3–§5.4。

以下共同字段对 E-000001～E-000009 每一条都成立：`HAS_HTML=false,TAGS=[],MARKUP=[]`；`type / image_path / html` 均为 `field_present=false,value=null`；`extra_field_keys=[]`、`anchor_extra_field_keys=[]`。Docling 路径均为 `D:/Coinsides/v12.9-selection/tools/_out/c1-docling/ielts-academic-reading-sample-tasks-2023.fragments.json`；唯一 MinerU 条目 E-000007 的路径为 `D:/Coinsides/v12.9-selection/tools/_out/c2-mineru/ielts-academic-reading-sample-tasks-2023.fragments.json`。

### 4.2 每条身份、文本投影与门轨迹

| ID | 方向 / 谓词 / source | seq；raw→canonical role；page | R / W / N 精确状态 | payload / 门轨迹 |
|---|---|---|---|---|
| E-000001 | 仅 Docling 有 / P-STRUCT / `C4_unpaired_single_side` | 0；`picture→visual`；1 | `R=null`（类型/长度/hash/摘录均 null）；`W=null`；`N=""`，0 code points / 0 bytes，SHA `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `payload_kind=null,shape_signature=["null",[]]`；C4 `R_non_null=false`、两家匹配 seq 均 `[]` → 单边 fragment → XOR `(0,1)` 后继续 |
| E-000002 | 仅 Docling 有 / P-STRUCT / `C4_unpaired_single_side` | 4；`picture→visual`；1 | 同 E-000001 的 null/empty 投影与 N SHA | 同 E-000001；C4 scan node `[1,4]` → XOR `(0,1)` 后继续 |
| E-000003 | 仅 Docling 有 / P-STRUCT / `C4_unpaired_single_side` | 5；`picture→visual`；1 | 同 E-000001 的 null/empty 投影与 N SHA | 同 E-000001；C4 scan node `[1,5]` → XOR `(0,1)` 后继续 |
| E-000004 | 仅 Docling 有 / P-TEXT / `SequenceMatcher_unilateral_fragment` | 6；`text→text`；1 | `R_type=string,R=W=N="idp"`；各 3 code points / 3 bytes；各 SHA `0c1eeccce6f114bf627c03a403d7c6e52e5b201ff1be893410a507066c9cc16b`；R 摘录 `idp` | `payload_kind=plain,shape_signature=["plain",[]]`；opcode 1=`insert`、MinerU slice `[3,3]`、Docling slice `[3,4]` → 单 fragment → XOR `(0,1)` 后继续 |
| E-000005 | 仅 Docling 有 / P-STRUCT / `C4_unpaired_single_side` | 7；`picture→visual`；1 | 同 E-000001 的 null/empty 投影与 N SHA | 同 E-000001；C4 scan node `[1,7]` → XOR `(0,1)` 后继续 |
| E-000006 | 仅 Docling 有 / P-STRUCT / `C4_unpaired_single_side` | 8；`picture→visual`；1 | 同 E-000001 的 null/empty 投影与 N SHA | 同 E-000001；C4 scan node `[1,8]` → XOR `(0,1)` 后继续 |
| E-000007 | 仅 MinerU 有 / P-TEXT / `SequenceMatcher_unilateral_fragment` | 4；`index→index`；2 | `R_type=string`；R 与 W：1,923 code points / 1,975 bytes，SHA `b251aa1d29a4fcbce0a9aabe8aebb2f0f0be60def78937d6db14b399e53d3ae3`，`R_escaped_excerpt=Academic Reading Sample Task \u2013 Matching Features. . 3 Academic Reading Sample Task \u2013 Matching Features (Answers) . 5 Academic Reading Sample Task \u2013 Table Completion . 6 Academic Re\u2026ample Task \u2013 Diagram Label Completion (Answers).... .... 46`；N：1,496 code points / 1,496 bytes，SHA `d976b84f2e0acd1ce361aa9421f90114cf9a3548808b4e65c7fe76058c60fbee` | `payload_kind=plain,shape_signature=["plain",[]]`；opcode 3=`delete`、MinerU slice `[4,5]`、Docling slice `[5,5]` → 单 fragment → XOR `(1,0)` 后继续 |
| E-000008 | 仅 Docling 有 / P-NULL / `P-NULL_single_side_component` | 10；`document_index→index`；2 | 同 E-000001 的 null/empty 投影与 N SHA | `payload_kind=null,shape_signature=["null",[]]`；bbox component members=`[[1,10]]`、neighbors=`[]` → 单 fragment → XOR `(0,1)` 后继续 |
| E-000009 | 仅 Docling 有 / P-STRUCT / `C4_unpaired_single_side` | 15；`picture→visual`；3 | 同 E-000001 的 null/empty 投影与 N SHA | 同 E-000001；C4 scan node `[1,15]` → XOR `(0,1)` 后继续 |

### 4.3 每条 anchor 与 sort key

| ID | sort key | raw anchor | canonical anchor |
|---|---|---|---|
| E-000001 | `[0,1,0,1,0,0,0,0,[[1,0]]]` | `page=1,bbox=[55.96143474527654,806.2902106785717,175.23270302996542,772.2433703091365],charspan=[0,0]` | `page=1,bbox=[55.96143474527654,34.709789321428275,175.23270302996542,68.75662969086352]` |
| E-000002 | `[0,1,4,1,0,0,4,0,[[1,4]]]` | `page=1,bbox=[54.057329178624514,67.0734606034739,108.12360504713635,50.86760303778203],charspan=[0,0]` | `page=1,bbox=[54.057329178624514,773.9265393965261,108.12360504713635,790.132396962218]` |
| E-000003 | `[0,1,5,1,0,0,5,0,[[1,5]]]` | `page=1,bbox=[117.50334825605356,66.69880137971347,153.36607846253673,50.83855306376188],charspan=[0,0]` | `page=1,bbox=[117.50334825605356,774.3011986202865,153.36607846253673,790.1614469362381]` |
| E-000004 | `[0,1,6,1,0,0,6,2,[[1,6]]]` | `page=1,bbox=[129.0,68.58666666666659,155.33333333333331,48.58666666666659],charspan=[0,3]` | `page=1,bbox=[129.0,772.4133333333334,155.33333333333331,792.4133333333334]` |
| E-000005 | `[0,1,7,1,0,0,7,0,[[1,7]]]` | `page=1,bbox=[162.20876117475882,66.81530642258019,246.57818060548516,43.888163691359864],charspan=[0,0]` | `page=1,bbox=[162.20876117475882,774.1846935774198,246.57818060548516,797.1118363086401]` |
| E-000006 | `[0,1,8,1,0,0,8,0,[[1,8]]]` | `page=1,bbox=[482.2482276865301,61.99667249665981,536.5120508877544,49.169339115387515],charspan=[0,0]` | `page=1,bbox=[482.2482276865301,779.0033275033402,536.5120508877544,791.8306608846125]` |
| E-000007 | `[0,2,4,0,4,1,0,2,[[0,4]]]` | `page=1,bbox=[66,78,541,764],page_size=[595,841]` | `page=2,bbox=[66.0,78.0,541.0,764.0]` |
| E-000008 | `[0,2,10,1,0,0,10,1,[[1,10]]]` | `page=2,bbox=[69.22720776193094,759.0955717732844,538.3685728669648,81.92098776629302],charspan=[0,0]` | `page=2,bbox=[69.22720776193094,81.9044282267156,538.3685728669648,759.079012233707]` |
| E-000009 | `[0,3,15,1,0,0,15,0,[[1,15]]]` | `page=3,bbox=[479.8895632115307,33.31037241593674,534.3894753843987,20.658193289786254],charspan=[0,0]` | `page=3,bbox=[479.8895632115307,807.6896275840633,534.3894753843987,820.3418067102137]` |

## 5. 四分类、分谓词射程与停线

### 5.1 分类计数与已分类分歧

四分类定义域仍严格是已配对事件；存在域 9 张收据不进入下表。

| classification | P-TEXT | P-STRUCT | P-NULL | cross_predicate_total |
|---|---:|---:|---:|---:|
| 文本外形差异 | 0 | 0 | 0 | 0 |
| 归一化差异 | 3 | 0 | 0 | 3 |
| 切分差异 | 0 | 0 | 0 | 0 |
| 真实指错 | 0 | 0 | 0 | 0 |

该四类计数的专属已分类边界为：P-TEXT 3 events，MinerU=`f3/pages {1,3}/seqs {1,5,8}`、Docling=`f3/pages {1,3}/seqs {2,11,14}`；P-STRUCT 与 P-NULL 均为空。其 classifier 已进入/已完成/当前停线/remaining 的边界另见 §5.2–§5.4。

3 条均为 `academic-reading / P-TEXT / 归一化差异`：D-000001=`MinerU seq 1 ↔ Docling seq 2 / page 1 / text→text`，两边 N 完全相同，R 的引号 code point 不同；D-000002=`MinerU seq 5 ↔ Docling seq 11 / page 3 / heading→heading`，两边 N 完全相同，R 的破折号 code point 不同；D-000003=`MinerU seq 8 ↔ Docling seq 14 / page 3 / text→text`，两边 N 完全相同，R 的引号 code point 不同。三条 ordered reason 均为 `NFKC/casefold/标点或分隔符删除后相等`。另外 5 个已配对事件完成为内部 `non_divergence`；不进入分歧计数。

### 5.2 K-3 停线：已配对仍未归类

当前停线事件是 `academic-reading / P-TEXT / source=SequenceMatcher_non_equal_prefix_group`，sort key=`[0,4,9,0,9,0,16,2,[[0,9],[1,16]]]`，控制为 `unclassified_stop,needs: claude`。

| 侧 | 路径 / seq / role | R / W / N | payload / 可选字段 | anchors |
|---|---|---|---|---|
| MinerU | `.../c2-mineru/ielts-academic-reading-sample-tasks-2023.fragments.json` / 9 / `title→heading` | `R_type=string`；R=`Questions 7 – 10`，16 code points / 18 bytes，SHA `01c2162f49dcc1fe85002ef1bf349f9607df1c7da0e2f19d86a71c85b7e9d9ce`，escaped excerpt=`Questions 7 \u2013 10`；W=`Questions 7 – 10`；N=`questions710`，SHA `f016379cb1ec297ac8d02581145ee697f44cbde5847971b8e3dd6bc9fabd4108` | `plain,false,[],[]`；三可选字段均 false/null | raw `page=3,bbox=[55,42,142,56],page_size=[595,841]`；canonical `page=4,bbox=[55.0,42.0,142.0,56.0]` |
| Docling | `.../c1-docling/ielts-academic-reading-sample-tasks-2023.fragments.json` / 16 / `text→text` | `R_type=string`；R/W=`Questions 7 - 10`，16 code points / 16 bytes，R SHA `d402f81bc8d1b90db4fdb1151ce6f9b849e35904cc910978f58ba9ff89de0174`，escaped excerpt=`Questions 7 - 10`；N 与 MinerU 相同 | `plain,false,[],[]`；三可选字段均 false/null | raw `page=4,bbox=[56.64,796.42464,142.87344,785.9458436873747],charspan=[0,16]`；canonical `page=4,bbox=[56.64,44.575360000000046,142.87344,55.05415631262531]` |

配对证明：两边 concat(N) 非空且 SHA 相同；两家整卷各只有当前连续区间，C2 内容唯一性门通过；bbox 正面积交集为 width `85.36`、height `10.478796312625263`，所以 `pairing_ok=true,same_place=true`。分类器随后得到 MinerU role signature=`["heading"]`、Docling=`["text"]`，`role_compatible=false`；按冻结首守门如实记“未归类”并立即停线，没有硬塞、改尺或重跑。`pairing_stop/input_stop/integrity_stop/runtime_stop` 均为 null；本轮唯一控制停线就是上述 K-3 事件。

最后游标：`last_processed_event=E-000009 (academic-reading/P-STRUCT/Docling seq 15)`；`last_paired_event=当前停线事件 (MinerU 9/Docling 16)`；`last_classified_event=last_completed_classifier_event=D-000003 (MinerU 8/Docling 14/归一化差异)`。

### 5.3 四阶段射程总表

| scope | P-TEXT events | P-STRUCT events | P-NULL events | cross-predicate events | MinerU fragments | Docling fragments |
|---|---:|---:|---:|---:|---:|---:|
| full_candidate_scope | 724 | 64 | 20 | 808 | 808 | 874 |
| processed_scope | 10 | 6 | 1 | 17 | 9 | 16 |
| paired_classifier_scope（含当前 K-3 事件） | 9 | 0 | 0 | 9 | 9 | 9 |
| stopping_event_scope | 1 | 0 | 0 | 1 | 1 | 1 |
| remaining_after_stop_scope | 713 | 58 | 19 | 790 | 798 | 857 |

结构化集合自证按每个 `document × predicate × family` 检查：`full = processed + stopping_event + remaining`；event_count 相加相等，三部分的 seq 集两两不交且并集逐项等于 full。全样本 fragments 亦闭合为 MinerU `808=9+1+798`、Docling `874=16+1+857`。`paired_classifier_scope` 表示实际进入分类器的已配对事件，其中 8 条完成，当前第 9 条触发 K-3。

### 5.4 各卷、谓词与家庭的 page/seq 边界

单元格语法为 `fragments; canonical page min..max (distinct count); seq min..max (distinct count)`；`∅` 表示程序 JSON 中的 `count=0,distinct=[],min=null,max=null`。完整 distinct 集保存在 canonical JSON；以下逐卷列 min/max，避免跨卷拼接 seq。

#### full_candidate_scope

| 卷 | 谓词 | events | MinerU | Docling |
|---|---|---:|---|---|
| academic-reading | P-TEXT | 310 | `315; 1..46 (45); 0..319 (315)` | `325; 1..46 (45); 1..349 (325)` |
| academic-reading | P-STRUCT | 27 | `5; 7..45 (5); 38..313 (5)` | `25; 1..46 (17); 0..350 (25)` |
| academic-reading | P-NULL | 1 | `∅` | `1; 2..2 (1); 10..10 (1)` |
| writing-example-responses | P-TEXT | 51 | `68; 1..5 (5); 0..68 (68)` | `61; 1..5 (5); 1..62 (61)` |
| writing-example-responses | P-STRUCT | 2 | `∅` | `2; 1..4 (2); 0..53 (2)` |
| writing-example-responses | P-NULL | 1 | `1; 1..1 (1); 21..21 (1)` | `∅` |
| academic-writing | P-TEXT | 132 | `148; 1..26 (26); 0..151 (148)` | `135; 1..26 (26); 1..153 (135)` |
| academic-writing | P-STRUCT | 18 | `3; 3..5 (3); 13..27 (3)` | `18; 1..26 (15); 0..150 (18)` |
| academic-writing | P-NULL | 2 | `1; 20..20 (1); 123..123 (1)` | `1; 2..2 (1); 11..11 (1)` |
| listening | P-TEXT | 231 | `259; 1..33 (33); 0..266 (259)` | `278; 1..33 (32); 1..304 (278)` |
| listening | P-STRUCT | 17 | `4; 3..30 (4); 21..248 (4)` | `16; 1..33 (10); 0..305 (16)` |
| listening | P-NULL | 16 | `4; 11..32 (3); 104..260 (4)` | `12; 2..29 (4); 11..273 (12)` |

#### processed_scope

| 卷 | 谓词 | events | MinerU | Docling |
|---|---|---:|---|---|
| academic-reading | P-TEXT | 10 | `9; 1..3 (3); 0..8 (9)` | `9; 1..3 (3); 1..14 (9)` |
| academic-reading | P-STRUCT | 6 | `∅` | `6; 1..3 (2); 0..15 (6)` |
| academic-reading | P-NULL | 1 | `∅` | `1; 2..2 (1); 10..10 (1)` |
| writing-example-responses | P-TEXT / P-STRUCT / P-NULL | 0 / 0 / 0 | `∅ / ∅ / ∅` | `∅ / ∅ / ∅` |
| academic-writing | P-TEXT / P-STRUCT / P-NULL | 0 / 0 / 0 | `∅ / ∅ / ∅` | `∅ / ∅ / ∅` |
| listening | P-TEXT / P-STRUCT / P-NULL | 0 / 0 / 0 | `∅ / ∅ / ∅` | `∅ / ∅ / ∅` |

#### paired_classifier_scope

| 卷 | 谓词 | events | MinerU | Docling |
|---|---|---:|---|---|
| academic-reading | P-TEXT | 9 | `9; 1..4 (4); 0..9 (9)` | `9; 1..4 (4); 1..16 (9)` |
| academic-reading | P-STRUCT / P-NULL | 0 / 0 | `∅ / ∅` | `∅ / ∅` |
| 其余三卷 | P-TEXT / P-STRUCT / P-NULL | 每格 0 | 每格 `∅` | 每格 `∅` |

#### stopping_event_scope

| 卷 | 谓词 | events | MinerU | Docling |
|---|---|---:|---|---|
| academic-reading | P-TEXT | 1 | `1; 4..4 (1); 9..9 (1)` | `1; 4..4 (1); 16..16 (1)` |
| academic-reading | P-STRUCT / P-NULL | 0 / 0 | `∅ / ∅` | `∅ / ∅` |
| 其余三卷 | P-TEXT / P-STRUCT / P-NULL | 每格 0 | 每格 `∅` | 每格 `∅` |

#### remaining_after_stop_scope

| 卷 | 谓词 | events | MinerU | Docling |
|---|---|---:|---|---|
| academic-reading | P-TEXT | 299 | `305; 4..46 (42); 10..319 (305)` | `315; 4..46 (42); 17..349 (315)` |
| academic-reading | P-STRUCT | 21 | `5; 7..45 (5); 38..313 (5)` | `19; 4..46 (15); 25..350 (19)` |
| academic-reading | P-NULL | 0 | `∅` | `∅` |
| writing-example-responses | P-TEXT | 51 | `68; 1..5 (5); 0..68 (68)` | `61; 1..5 (5); 1..62 (61)` |
| writing-example-responses | P-STRUCT | 2 | `∅` | `2; 1..4 (2); 0..53 (2)` |
| writing-example-responses | P-NULL | 1 | `1; 1..1 (1); 21..21 (1)` | `∅` |
| academic-writing | P-TEXT | 132 | `148; 1..26 (26); 0..151 (148)` | `135; 1..26 (26); 1..153 (135)` |
| academic-writing | P-STRUCT | 18 | `3; 3..5 (3); 13..27 (3)` | `18; 1..26 (15); 0..150 (18)` |
| academic-writing | P-NULL | 2 | `1; 20..20 (1); 123..123 (1)` | `1; 2..2 (1); 11..11 (1)` |
| listening | P-TEXT | 231 | `259; 1..33 (33); 0..266 (259)` | `278; 1..33 (32); 1..304 (278)` |
| listening | P-STRUCT | 17 | `4; 3..30 (4); 21..248 (4)` | `16; 1..33 (10); 0..305 (16)` |
| listening | P-NULL | 16 | `4; 11..32 (3); 104..260 (4)` | `12; 2..29 (4); 11..273 (12)` |

## 6. 我自己的测量错误

**我冻的规则本身，是不是就是零产出的原因？**

**回答：否。** 这里把“产出”分别钉为本轮全部普查产出与四分类分歧产出：前者已有 9 张存在域收据，后者已有 3 条归一化差异，所以两种口径都不是零。冻结规则确实直接造成当前事件因 `role_compatible=false` 触发 K-3 停线，但这是“为什么在此停止”，不是“为什么零产出”。另外三类在已完成前缀内为 0，只能报告该前缀事实；停线后的 790 个事件没有进入控制处理，不能外推其计数。

本轮仍记录这些测量风险与处置：

1. **不能把所有 `pairing_ok=false` 都送进存在域。** 门只接 XOR 真正单边；双边未决必须 `pairing_stop`。实现把这三路在 classifier 前分开。
2. **P-STRUCT 不能见原始单边 component 就立即截走。** C4 的双方唯一、逐字相同非 null R 配对先执行，剩余节点才逐 fragment 进入门；否则会掏空真实指错的合法路径。
3. **逐 opcode 的单边组必须拆成逐 fragment 收据。** v1 的 grouped unmatched 计数单位不适合存在域；v2 在 P-TEXT、P-STRUCT、P-NULL 都逐 fragment 成形。
4. **当前 scope 正常停线路径闭合，但异常兜底不是同等形状。** 本次没有触发 runtime/input/integrity 异常；若触发，不能把 normal-stop 的 current-scope 完整性外推给异常路径，应直接 `needs: claude`。
5. **写入措辞要包含原子 sibling。** 程序不是只触碰一个 pathname，而是只在仓外同目录写 `.tmp` 后原子替换最终 JSON；证据树仍纯读。
6. **规则按形态而非单条特判。** 实现没有 Docling、seq 0、visual 或 null 的专属放行分支；三谓词 builder 统一把逐 fragment 单边事件送入同一个 XOR 门，P-NULL 同门。已知的 46 条同形、四卷 Docling seq 0 及跨 visual/text 的成员在规则层都由这一个结构谓词路由，不按卷、seq 或 role 特判。K-3 已在第 18 个有序事件停线，所以这只是规则覆盖声明，本文不声称后续候选已经过门。

## 7. 可复现配方与收尾复核

### 7.1 证据整树收尾与 digest 链

收尾使用 §1.2 完全相同的字节配方复算：94,935 files / 3,149,405,801 bytes / 14,624,025 manifest bytes / tree SHA-256 `efebe29dfdfa4c1762ad95abc70c9a9f6085c8573d9029ee9fcfedf8484fad0d`，与开工四项逐项相同。c-1c → c-2 v1 的历史配方链仍如实记为断链；c-2 v1 → c-2 v2 以 v1 明文配方、同一 digest 接续，本轮开工→收尾闭合。

本档案不使用“经过 N 路审计”作为证明。预跑静态核对痕迹位于仓外当前 Codex builder thread 及其子任务 `/root/criteria_audit`、`/root/v1_method_audit`，不在仓内；可复核本体仍是本节源码、哈希、canonical JSON 与逐字段收据。

### 7.2 允许面与外推边界

- 本轮仓内只新建本文，并只在工单既有 `## Result(v2)` 段追加/补齐回执；顶部状态、§1–§10、v1 Result 与封存 v1 档案均不改。
- 最终 `git status --short` 只列本文 `??`、本工单 `M`，以及开工前已有的 `server/src/routes/projections.ts M`。该 server 文件 SHA-256 仍为开工值 `c9072a7a3bfcbcfc20e48efa3050c0baea806b5ac89594b29e5249fe1ce08ed7`，其 tracked textual diff 为空；封存 v1 档案 SHA-256 仍为 `df8278f46c8e4c621647e5246a7df7dcfb594ba8ffa7c9fd87c0ab76ed5898de`。
- 证据本体全程只读；不 commit、不 push，不修改生产码、测试、迁移、INDEX 或转写产物。
- 结论只到当前 K-3 停线游标；不判断图片语义，不产出比例、优劣、置信度或阈值，不外推 remaining scope 的分类结果。
- 裁定来源按实际记录为 **Fable**，由 Claude 工程调度会话转写，不写成 Henry。

### 7.3 实跑源码收据

下列围栏之间的源码字节（不计 Markdown 围栏，计源码末尾 LF）必须与仓外脚本逐字相同：86,093 bytes，SHA-256 `1d7eecd6d25c2757b51c6cad4d54483ca7af72f93a6547d9b600355bcfa0122d`。

<!-- CENSUS_SCRIPT_SOURCE_V2_START -->
```python
#!/usr/bin/env python3
"""Frozen v2 dual-transcription divergence census.

This is an experiment-only, read-only census.  It reads exactly the four frozen
MinerU/Docling fragment pairs, writes only divergence-census.json beside this
script, records unilateral existence differences, and stops at the first
pairing or classification control stop.
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
    "2026-08-31-v12-9c-c2-divergence-census-v2.md"
)
MINERU_DIR = Path("D:/Coinsides/v12.9-selection/tools/_out/c2-mineru")
DOCLING_DIR = Path("D:/Coinsides/v12.9-selection/tools/_out/c1-docling")

EXPECTED_PYTHON = (3, 14, 2)
EXPECTED_UNICODE = "16.0.0"
EXPECTED_FROZEN_SHA256 = (
    "3d49b12ab0ac5a356da10223ecb924612346423edbf51198f916d816ffdbc1d3"
)
FROZEN_START = b"<!-- FROZEN_CLASSIFIER_V2_START -->"
FROZEN_END = b"<!-- FROZEN_CLASSIFIER_V2_END -->"

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
        raise InputStop("FROZEN_CLASSIFIER_V2 start marker missing")
    end_start = data.find(FROZEN_END, start + len(FROZEN_START))
    if end_start < 0:
        raise InputStop("FROZEN_CLASSIFIER_V2 end marker missing")
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
    mineru_empty_rank = 0 if mineru else 1
    docling_empty_rank = 0 if docling else 1
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
        mineru_empty_rank,
        min_mineru,
        docling_empty_rank,
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

    def append_unilateral_events(
        left_fragments: list[dict],
        right_fragments: list[dict],
        trace: list[dict],
    ) -> None:
        if bool(left_fragments) == bool(right_fragments):
            raise InputStop(
                "P-TEXT unilateral event builder received zero or two populated sides",
                {"document": document_data["document"], "needs": "claude"},
            )
        family = "MinerU" if left_fragments else "Docling"
        fragments = left_fragments if left_fragments else right_fragments
        for fragment in fragments:
            events.append(
                make_event(
                    document_data,
                    "P-TEXT",
                    [fragment] if family == "MinerU" else [],
                    [fragment] if family == "Docling" else [],
                    False,
                    trace
                    + [
                        {
                            "step": "unilateral_fragment_formation",
                            "family": family,
                            "seq": fragment["seq"],
                            "result": "one fragment emitted for the upstream existence gate",
                        }
                    ],
                    "SequenceMatcher_unilateral_fragment",
                )
            )

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
            append_unilateral_events(
                left,
                right,
                [
                    opcode_base,
                    {
                        "step": "prefix_search",
                        "result": "one opcode side empty; each remaining fragment emitted separately",
                    },
                ],
            )
            continue
        while left_cursor < len(left) or right_cursor < len(right):
            if left_cursor >= len(left) or right_cursor >= len(right):
                append_unilateral_events(
                    left[left_cursor:],
                    right[right_cursor:],
                    [
                        opcode_base,
                        {
                            "step": "prefix_search",
                            "left_cursor": left_cursor,
                            "right_cursor": right_cursor,
                            "result": "one side exhausted; each remaining fragment emitted separately",
                        },
                    ],
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
                        candidate_sort_key = (
                            left_count + right_count,
                            abs(left_count - right_count),
                            left_count,
                            right_count,
                            left_group[0]["seq"],
                            right_group[0]["seq"],
                            left_group[-1]["seq"],
                            right_group[-1]["seq"],
                        )
                        candidates.append((candidate_sort_key, left_group, right_group))
            if not candidates:
                events.append(
                    make_event(
                        document_data,
                        "P-TEXT",
                        left[left_cursor:],
                        right[right_cursor:],
                        False,
                        [opcode_base, {"step": "prefix_search", "left_cursor": left_cursor, "right_cursor": right_cursor, "matching_candidates": [], "result": "both sides remain but no equal concat(N) prefix; bilateral pairing unresolved"}],
                        "SequenceMatcher_bilateral_pairing_unresolved",
                    )
                )
                break
            candidates.sort(key=lambda row: row[0])
            selected_sort_key, chosen_left, chosen_right = candidates[0]
            candidate_trace = [
                {
                    "candidate_sort_key": list(candidate_sort_key),
                    "mineru_seqs": seq_list(candidate_left),
                    "docling_seqs": seq_list(candidate_right),
                }
                for candidate_sort_key, candidate_left, candidate_right in candidates
            ]
            events.append(
                make_event(
                    document_data,
                    "P-TEXT",
                    chosen_left,
                    chosen_right,
                    True,
                    [opcode_base, {"step": "prefix_search", "left_cursor": left_cursor, "right_cursor": right_cursor, "matching_candidates": candidate_trace, "selected_sort_key": list(selected_sort_key)}],
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
                [trace, {"step": "C4_result", "result": "single-sided fragment event for the upstream existence gate"}],
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
                        [component_trace(component), {"step": "single_side_component", "result": "one-fragment event for the upstream existence gate"}],
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
        "source": event["source"],
        "sort_key": event["sort_key"],
        "mineru_seqs": seq_list(event["mineru"]),
        "docling_seqs": seq_list(event["docling"]),
        "mineru_canonical_pages": sorted(
            {fragment["canonical_page"] for fragment in event["mineru"]}
        ),
        "docling_canonical_pages": sorted(
            {fragment["canonical_page"] for fragment in event["docling"]}
        ),
        "pairing_ok": event["pairing_ok"],
    }
    if disposition is not None:
        result["disposition"] = disposition
    return result


def classify_event(event: dict) -> tuple[str, list[dict], dict]:
    if not event["mineru"] or not event["docling"] or not event["pairing_ok"]:
        raise InputStop(
            "four-class classifier received an event outside its paired-event domain",
            {**event_cursor(event), "needs": "claude"},
        )
    facts = event_facts(event)
    trace = copy.deepcopy(event["pairing_trace"])
    trace.extend(
        [
            {
                "step": "upstream_mechanical_pairing_gate",
                "mineru_member_count": len(event["mineru"]),
                "docling_member_count": len(event["docling"]),
                "pairing_ok": event["pairing_ok"],
                "result": "paired event admitted to the four-class classifier",
            },
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

    if not facts["role_compatible"]:
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


def empty_existence_counts() -> dict:
    return {
        **{predicate: 0 for predicate in PREDICATES},
        "cross_predicate_total": 0,
    }


def empty_classifier_progress() -> dict:
    return {
        predicate: {"completed_events": 0, "documents": {}}
        for predicate in PREDICATES
    }


def empty_pairing_gate_progress() -> dict:
    return {
        predicate: {
            "entered_events": 0,
            "existence_receipts": 0,
            "paired_events_forwarded": 0,
            "pairing_stop_events": 0,
            "integrity_stop_events": 0,
        }
        for predicate in PREDICATES
    }


def empty_range_receipt() -> dict:
    return {
        "count": 0,
        "distinct": [],
        "min": None,
        "max": None,
    }


def empty_family_scope() -> dict:
    return {
        "fragment_count": 0,
        "canonical_pages": empty_range_receipt(),
        "seqs": empty_range_receipt(),
    }


def empty_scope() -> dict:
    return {
        "by_document_and_predicate": {
            document: {
                predicate: {
                    "event_count": 0,
                    "families": {
                        family: empty_family_scope()
                        for family in FAMILIES
                    },
                }
                for predicate in PREDICATES
            }
            for document, _ in DOCUMENTS
        }
    }


def update_range_receipt(receipt: dict, values: list[int]) -> None:
    distinct = sorted(set(receipt["distinct"]) | set(values))
    receipt["count"] = len(distinct)
    receipt["distinct"] = distinct
    receipt["min"] = distinct[0] if distinct else None
    receipt["max"] = distinct[-1] if distinct else None


def add_event_to_scope(scope: dict, event: dict) -> None:
    row = scope["by_document_and_predicate"][event["document"]][event["predicate"]]
    row["event_count"] += 1
    for family, member_key in (("MinerU", "mineru"), ("Docling", "docling")):
        fragments = event[member_key]
        family_scope = row["families"][family]
        update_range_receipt(
            family_scope["canonical_pages"],
            [fragment["canonical_page"] for fragment in fragments],
        )
        update_range_receipt(
            family_scope["seqs"],
            [fragment["seq"] for fragment in fragments],
        )
        family_scope["fragment_count"] = family_scope["seqs"]["count"]


def scope_from_events(events: list[dict]) -> dict:
    scope = empty_scope()
    for event in events:
        add_event_to_scope(scope, event)
    return scope


def update_classifier_progress(report: dict, event: dict, disposition: str) -> None:
    predicate = event["predicate"]
    progress = report["classifier_progress"][predicate]
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
    cursor = event_cursor(event, disposition)
    report["last_completed_classifier_event"] = cursor
    report["last_processed_event"] = cursor
    if disposition in CLASSIFICATIONS:
        report["last_classified_event"] = cursor


def record_existence_difference(report: dict, event: dict) -> None:
    if bool(event["mineru"]) == bool(event["docling"]):
        raise InputStop(
            "existence gate received an event that is not exactly one-sided",
            {**event_cursor(event), "needs": "claude"},
        )
    members = event["mineru"] + event["docling"]
    if len(members) != 1:
        raise InputStop(
            "one-sided event did not contain exactly one fragment",
            {**event_cursor(event), "member_count": len(members), "needs": "claude"},
        )
    fragment = members[0]
    direction = "仅 MinerU 有" if event["mineru"] else "仅 Docling 有"
    decision_trace = copy.deepcopy(event["pairing_trace"])
    decision_trace.append(
        {
            "step": "upstream_mechanical_pairing_gate",
            "mineru_member_count": len(event["mineru"]),
            "docling_member_count": len(event["docling"]),
            "xor_one_side_present": True,
            "single_fragment_assertion": True,
            "result": "存在性差异; continue census",
        }
    )
    receipt = {
        "existence_id": f"E-{len(report['existence_differences']) + 1:06d}",
        "domain": "存在域",
        "pairing_gate_disposition": "存在性差异",
        "direction": direction,
        "document": event["document"],
        "predicate": event["predicate"],
        "source": event["source"],
        "sort_key": event["sort_key"],
        "member_evidence": evidence(fragment),
        "opposite_side_member_count": 0,
        "decision_trace": decision_trace,
    }
    report["existence_differences"].append(receipt)
    predicate = event["predicate"]
    report["existence_counts_by_predicate"][predicate] += 1
    report["existence_counts_by_predicate"]["cross_predicate_total"] += 1
    report["pairing_gate_progress"][predicate]["existence_receipts"] += 1
    add_event_to_scope(report["scope_receipts"]["processed_scope"], event)
    report["last_processed_event"] = event_cursor(event, "存在性差异")


def cursor_receipts(report: dict) -> dict:
    return {
        "last_processed_event": copy.deepcopy(report["last_processed_event"]),
        "last_paired_event": copy.deepcopy(report["last_paired_event"]),
        "last_classified_event": copy.deepcopy(report["last_classified_event"]),
        "last_completed_classifier_event": copy.deepcopy(
            report["last_completed_classifier_event"]
        ),
    }


def stop_receipt(
    report: dict,
    event: dict,
    decision_trace: list[dict],
    events: list[dict],
    event_index: int,
) -> dict:
    remaining_scope = scope_from_events(events[event_index + 1 :])
    report["scope_receipts"]["remaining_after_stop_scope"] = remaining_scope
    return {
        "document": event["document"],
        "predicate": event["predicate"],
        "source": event["source"],
        "sort_key": event["sort_key"],
        "mineru_evidence": [evidence(fragment) for fragment in event["mineru"]],
        "docling_evidence": [evidence(fragment) for fragment in event["docling"]],
        "decision_trace": decision_trace,
        "pairing_candidates_and_elimination": copy.deepcopy(event["pairing_trace"]),
        "counts_at_stop_by_classification_and_predicate": copy.deepcopy(
            report["counts_by_classification_and_predicate"]
        ),
        "existence_counts_at_stop_by_predicate": copy.deepcopy(
            report["existence_counts_by_predicate"]
        ),
        "cursor_receipts": cursor_receipts(report),
        "stopping_event_scope": scope_from_events([event]),
        "remaining_after_stop_scope": copy.deepcopy(remaining_scope),
        "needs": "claude",
    }


def initial_report() -> dict:
    script_sha256 = sha256_bytes(SCRIPT_PATH.read_bytes())
    return {
        "schema": "v12.9c-c2-divergence-census/frozen-v2",
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
            "script_sha256_before": script_sha256,
            "script_sha256_after": None,
            "json_sha256": "emitted by CLI after each canonical atomic write; not self-embedded",
        },
        "zero_cost_self_attestation": {
            "model_calls": 0,
            "api_keys_used": 0,
            "cost": 0,
            "scope": "census_program_only; excludes builder-session reasoning",
        },
        "counts_by_classification_and_predicate": empty_counts(),
        "existence_counts_by_predicate": empty_existence_counts(),
        "pairing_gate_progress": empty_pairing_gate_progress(),
        "classifier_progress": empty_classifier_progress(),
        "scope_receipts": {
            "full_candidate_scope": empty_scope(),
            "processed_scope": empty_scope(),
            "paired_classifier_scope": empty_scope(),
            "remaining_after_stop_scope": empty_scope(),
        },
        "divergences": [],
        "existence_differences": [],
        "last_processed_event": None,
        "last_paired_event": None,
        "last_classified_event": None,
        "last_completed_classifier_event": None,
        "input_stop": None,
        "pairing_stop": None,
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
        "counts_state": "pairing_gate_and_classification_not_started",
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
        "existence_counts_preserved_by_predicate": copy.deepcopy(
            report["existence_counts_by_predicate"]
        ),
        "cursor_receipts": cursor_receipts(report),
        "scope_receipts": copy.deepcopy(report["scope_receipts"]),
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


def execute() -> int:
    report = initial_report()
    last_json_sha = None
    checkpoint_state = {"sha256": None}
    processing_started = False
    events: list[dict] = []
    active_event_index: int | None = None
    frozen_before: str | None = None
    try:
        last_json_sha = atomic_checkpoint(report)
        checkpoint_state["sha256"] = last_json_sha
        frozen_before, frozen_length = frozen_segment_hash()
        report["frozen_classifier"]["sha256_before"] = frozen_before
        report["frozen_classifier"]["byte_length_before"] = frozen_length
        if frozen_before != EXPECTED_FROZEN_SHA256:
            raise InputStop(
                "frozen v2 SHA-256 differs before input read",
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
        report["scope_receipts"]["full_candidate_scope"] = scope_from_events(events)
        report["status"] = "processing_pairing_gate_and_classifier"
        processing_started = True
        last_json_sha = atomic_checkpoint(report)

        stopped = False
        for event_index, event in enumerate(events):
            active_event_index = event_index
            predicate = event["predicate"]
            gate_progress = report["pairing_gate_progress"][predicate]
            gate_progress["entered_events"] += 1
            mineru_present = bool(event["mineru"])
            docling_present = bool(event["docling"])

            if mineru_present ^ docling_present:
                record_existence_difference(report, event)
                report["status"] = "processing_pairing_gate_and_classifier"
                last_json_sha = atomic_checkpoint(report)
                continue

            if not mineru_present and not docling_present:
                gate_progress["integrity_stop_events"] += 1
                trace = copy.deepcopy(event["pairing_trace"])
                trace.append(
                    {
                        "step": "upstream_mechanical_pairing_gate",
                        "mineru_member_count": 0,
                        "docling_member_count": 0,
                        "result": "integrity_stop; both event sides empty",
                    }
                )
                report["status"] = "integrity_stop"
                report["integrity_stop"] = {
                    "reason": "ordered event had no members on either side",
                    **stop_receipt(report, event, trace, events, event_index),
                }
                last_json_sha = atomic_checkpoint(report)
                stopped = True
                break

            if not event["pairing_ok"]:
                gate_progress["pairing_stop_events"] += 1
                trace = copy.deepcopy(event["pairing_trace"])
                trace.append(
                    {
                        "step": "upstream_mechanical_pairing_gate",
                        "mineru_member_count": len(event["mineru"]),
                        "docling_member_count": len(event["docling"]),
                        "pairing_ok": False,
                        "result": "pairing_stop; bilateral pairing unresolved",
                    }
                )
                report["status"] = "pairing_stop"
                report["pairing_stop"] = stop_receipt(
                    report, event, trace, events, event_index
                )
                last_json_sha = atomic_checkpoint(report)
                stopped = True
                break

            gate_progress["paired_events_forwarded"] += 1
            report["last_paired_event"] = event_cursor(
                event, "entered_four_class_classifier"
            )
            add_event_to_scope(
                report["scope_receipts"]["paired_classifier_scope"], event
            )
            disposition, trace, _facts = classify_event(event)
            if disposition == "unclassified":
                report["status"] = "unclassified_stop"
                report["unclassified_stop"] = stop_receipt(
                    report, event, trace, events, event_index
                )
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
            update_classifier_progress(report, event, disposition)
            add_event_to_scope(report["scope_receipts"]["processed_scope"], event)
            report["status"] = "processing_pairing_gate_and_classifier"
            last_json_sha = atomic_checkpoint(report)

        if not stopped:
            report["status"] = "complete"

        frozen_after, frozen_after_length = frozen_segment_hash()
        report["frozen_classifier"]["sha256_after"] = frozen_after
        report["frozen_classifier"]["byte_length_after"] = frozen_after_length
        script_after = sha256_bytes(SCRIPT_PATH.read_bytes())
        report["artifact_hashes"]["script_sha256_after"] = script_after
        frozen_changed = (
            frozen_after != frozen_before
            or frozen_after != EXPECTED_FROZEN_SHA256
        )
        script_changed = (
            script_after != report["artifact_hashes"]["script_sha256_before"]
        )
        if frozen_changed or script_changed:
            prior_status = report["status"]
            report["status"] = "integrity_stop"
            report["integrity_stop"] = {
                "reason": "frozen v2 or script bytes changed during run; census is invalid",
                "prior_status": prior_status,
                "frozen_classifier_before": frozen_before,
                "frozen_classifier_after": frozen_after,
                "frozen_classifier_expected": EXPECTED_FROZEN_SHA256,
                "script_before": report["artifact_hashes"]["script_sha256_before"],
                "script_after": script_after,
                "cursor_receipts": cursor_receipts(report),
                "scope_receipts": copy.deepcopy(report["scope_receipts"]),
                "needs": "claude",
            }
        last_json_sha = atomic_checkpoint(report)
    except InputStop as exc:
        if not processing_started:
            last_json_sha = checkpoint_state["sha256"] or last_json_sha
        if processing_started:
            report["status"] = "integrity_stop"
            report["integrity_stop"] = {
                "reason": "frozen invariant failed after pairing-gate processing started",
                "input_stop_reason": exc.reason,
                "context": exc.context,
                "counts_preserved_by_classification_and_predicate": copy.deepcopy(
                    report["counts_by_classification_and_predicate"]
                ),
                "existence_counts_preserved_by_predicate": copy.deepcopy(
                    report["existence_counts_by_predicate"]
                ),
                "cursor_receipts": cursor_receipts(report),
                "scope_receipts": copy.deepcopy(report["scope_receipts"]),
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
                report["artifact_hashes"]["script_sha256_after"] = sha256_bytes(
                    SCRIPT_PATH.read_bytes()
                )
                last_json_sha = atomic_checkpoint(report)
            except (InputStop, OSError, MemoryError):
                pass
    except (OSError, MemoryError) as exc:
        if not processing_started:
            last_json_sha = checkpoint_state["sha256"] or last_json_sha
        phase_status = report["status"]
        if processing_started:
            if events:
                remaining_start = (
                    active_event_index + 1
                    if active_event_index is not None
                    else 0
                )
                report["scope_receipts"]["remaining_after_stop_scope"] = (
                    scope_from_events(events[remaining_start:])
                )
            last_json_sha = runtime_stop_report(
                report,
                exc,
                phase_status,
                last_json_sha,
            )
        else:
            wrapped = InputStop(
                "runtime I/O or memory failure before pairing-gate processing started",
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
        "script_sha256_before": report["artifact_hashes"]["script_sha256_before"],
        "script_sha256_after": report["artifact_hashes"]["script_sha256_after"],
        "frozen_classifier_sha256_after": report["frozen_classifier"]["sha256_after"],
        "status": report["status"],
    }
    sys.stdout.buffer.write(canonical_bytes(cli_receipt))
    return 0 if report["status"] == "complete" else 2


if __name__ == "__main__":
    raise SystemExit(execute())
```
<!-- CENSUS_SCRIPT_SOURCE_V2_END -->
