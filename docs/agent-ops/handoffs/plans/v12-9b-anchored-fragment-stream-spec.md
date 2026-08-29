> **状态 (Status)**: **active**(2026-08-28 晚翻牌:转写器两候选全卷实证已回、v0.1 两次修宪均据实测——规格可施工;后续修宪照三分表门槛)
> **层 (Layer)**: 设计规格 / V12.9b
> **权威 (Authoritative)**: 翻 active 后是;draft 期仅供讨论
> **上游**: `v12-9-intake-and-selection-program.md` §1 · 会议记录附录 A/B · 词典(拓印/锚/碎片)

# 带锚碎片流(Anchored Fragment Stream)规格 v0

## §1 它是什么

拓印工序的**唯一合法产物**;一切转写器(无论哪家、哪族)的输出都必须对齐到本格式。存储真相;markdown/HTML 渲染一律是它的读时投影。⛔ 本格式不承载语义判断(「这是定义」之类归理解轨的候选,不进碎片流)。

## §2 碎片记录(JSONL,一行一碎片)

```
{
  "seq": 42,                      // 拓印内全序,顺序保真
  "text": "…",                    // 忠实文本,零消毒零改写
  "role": "para",                 // 结构角色(封闭枚举):heading|para|list_item|table_row|cell|slide_shape|caption|code_line|footnote|blank
  "anchor": { … },                // §3,必填
  "style": { … }?,                // 可选样式提示(加粗/级别),渲染用,不承重
  "lang": "en"?                   // 可选,检测值,候选性质
}
```

**不变式**:①`anchor` 必填(允许粒度降级但须在拓印件出生证申报 fidelity);②`seq` 连续且与原件阅读序一致;③`text` 与原件逐字,**或与原件逐字模一类已申报的归一化**(出生证 `text_normalization`;v0.1 修定,据 12.9a 第 1 场实证:Docling 归一标点)——⛔ 未申报的偏离一律违法(转写器的忠实性由回程票考卷验);④role 是**结构**描述,永不是语义描述。

## §3 锚(五族,封闭)

```
页面族   {"family":"page","page":7,"bbox":[x0,y0,x1,y1]?}          // bbox 单位:页宽高归一化 0-1
流式族   {"family":"flow","path":"h1[2]/h2[1]/p[4]","char":[120,180]?}  // path=结构路径;代码用 {"path":"file.py","line":[10,14]}
表格族   {"family":"table","sheet":"Sheet1","cell":"B7"}            // csv 用 {"row":7,"col":2}
幻灯族   {"family":"slide","slide":12,"shape":"shape_3"}
时间轴族 {"family":"time","ms":[61200,64800]}                       // 🅿 本期无生产者,形状预钉但不实现写入端
```

**fidelity 阶梯**(出生证申报):`region > block > page`(页面族)/ `char > element > section`(流式)/ cell(表格天然满格)。**低保真合法,伪造高保真违法**——没有 bbox 就不写 bbox,⛔ 不许编。

## §4 拓印件出生证

```
{ "source_id": …, "transcriber": {"name":"docling","version":"x.y.z","lockfile":"tools/…"},
  "anchor_fidelity": "block", "text_normalization": "none|punctuation|whitespace", "fragment_count": 812, "created_at": …, "warnings": [{"code":…,"anchor":{族锚,机械可扣},"detail"?:…}], "status":"accepted|rejected", "rejection_reasons"?: […] }
```

用途:换工具重拓可比对择优;锚粒度消费方可见;`warnings` 如实记(乱码页/空页/解析失败段——**残缺如实申报,⛔ 不静默跳过**)。

## §5 与既有体系的接线

- 存储:拓印件 = 层0 原件的派生物,挂 source_id;碎片流落库形态(单表 or 文件)由拆单时按现役 sourceArtifact 家族现物定——**先核现物再定表,不在本稿凭记忆点名机关**。
- 查重指纹:原件 sha256(入库即算)+ 碎片流内容指纹(拓印时算)。
- 收据:拓印是一次动作,留拓印收据(谁触发/哪个转写器/耗时)。
- T0 存量(现役 pdf/docx/xlsx 解析)**对齐本格式 = 12.9c 首单**,⛔ 不在 12.9b 顺手做。

## §6 Killer 方向(拆单时具体化)

K-1 逐字保真(v0.2):对参照全文**扣除已申报残缺区间后**施加**同一申报类**归一化后逐字节比对(机械非模糊;页面族允许布局重排申报);申报 none 而实测有归一 ⇒ 必红(伪高保真同条)。K-2 锚真实性:抽样碎片按锚回原件取文本,须命中(fidelity 相应粒度)。K-3 伪高保真必红:出生证申报 page 级而碎片带 bbox ⇒ 校验器拒。K-4 顺序保真:seq 乱序注入 ⇒ 必红。K-5 残缺申报:人为坏页 ⇒ warnings 非空且对应碎片缺席,⛔ 不得以空 text 碎片顶位。

**v0.1(2026-08-28)**:归一化纳入保真阶梯——与 anchor_fidelity 同形(低保真合法,不申报违法)。待探:转写器能否另给原始 glyph 文本(能则取更高保真,不阻塞)。

**v0.1 补(2026-08-28,2b 实证)**:**引用校验闸**——理解轨产物以碎片 id 作出处时,入库前机械校验 `id ∈ 该拓印件碎片集`,违者拒收。依据:引用制不消灭幻觉,**把幻觉从「坐标不准」(需裁图人眼判)变成「引用不存在的 id」(一行 in 判掉)——错误可判定性的差别,不是能力的差别**;2b 实测 2/9 虚构 id ⇒ 查的义务在门,⛔ 不靠模型自觉。副证:删掉坐标字段后 JSON 残缺同步消失——**让模型少造一样东西,连格式都稳**。

**v0.2(2026-08-28 夜,b-1 二停实证两洞,修宪)**:
1. **K-1/K-5 互斥解消——分工定义**:K-1 守**忠实性**(凡交付的文本必须逐字),K-5 守**申报性**(凡未交付的区间必须申报)。总不变式:**碎片拼接 ⊎ 已申报残缺区间 = 原件全文的分割**——K-1 比对范围=原件减已申报区间;**未申报的缺失仍 K-1 必红**(丢文本不申报=藏不住)。
2. **warnings 元素升结构化**:`{code, anchor, detail?}`——anchor 用**与碎片同族的锰形状**(机械可扣,才扣得动 K-1);原 `anchor_hint` 字符串降为 detail。**申报与碎片说同一种地址语言。**
3. **拒收与申报分族(修订此前「拒收留痕走 warnings 族」之裁——它欠定义)**:warnings=**已收之件的自我申报**(残缺类闭集,随件走);拒收=**未收之件的审判记录**——落在**出生证本身**:出生证得 `status: accepted|rejected`,rejected 时带 `rejection_reasons`(**validation 族新闭集**:fidelity_mismatch / anchor_invalid / fidelity_overclaim / order_violation …),**碎片不落库**。出生证就是那次拓印尝试的收据——拒收也有收据,但两族 code ⛔ 永不混用(把未发生的解码失败写进申报=伪造申报)。

**v0.3(2026-08-29 凌晨,b-2 一停实证,修宪)**:
1. **申报住所总原则(统一三处落点)**:**申报住在被申报物身上**——描述拓印产物的申报住出生证 warnings(残缺族);描述拓印尝试被拒的住出生证 rejection_reasons(validation 族);**描述文件本身的住 source 记录层**(intake 申报族,新闭集)。
2. **二进制兜底采 (C)「只存不拓」字面义**:不产拓印件⇒无出生证无 warnings——intake 申报落 source 记录层。此前「拒收留痕走 warnings 族」之裁**限缩为拓印件层适用**(第三次修订自裁,就地记)。⛔ 锚族不加 whole_file(为从未出生之物造出生证=假身份);⛔ 锚不许置空(毁机械可扣性)。
3. **intake 申报族闭集 v1**:`unknown_extension` · `signature_mismatch` · `non_utf8_text` · `nul_bytes` · `binary_unparsed`——三套闭集(intake/残缺/validation)各守各层,永不互串。
4. **mime_extension_mismatch 在永不拒收射程内**:改判为收下+申报;**归族以魔数为准,后缀是自称**——字节是事实,名字是主张;不符即按魔数归族并申报 `signature_mismatch`。
