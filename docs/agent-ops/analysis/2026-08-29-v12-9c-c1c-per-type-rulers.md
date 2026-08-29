> **状态 (Status)**: active（语义实验档案；新口径已于实跑前冻结）
> **层 (Layer)**: 分析 / Analysis（V12.9c · c-1c 考卷分角色）
> **日期 (Updated)**: 2026-08-29
> **权威 (Authoritative)**: 否（证据归档；裁定来自 Fable，由 Claude 工程调度会话转写）

# V12.9c c-1c：MinerU 回程票按类型复测

## 0. 纪律与计数语法

- 本单是【零成本】语义实验：**未调用任何模型，未使用任何 API key，未产生任何花费**。
- 本单不改 MinerU，不改原始产物，只用两把不同的尺子重量同一批 160 条。
- 因而两个数字只作并列申报：「同一批 160 条，在【旧口径】下 154 通过；在【新口径】下 158 通过；差额 4 条的改判理由逐条在案。」不把它们写成同尺度的前后变化。
- 证据本体 `D:/Coinsides/v12.9-selection/**` 全程只读；重打分脚本与输出只落在仓外临时目录。

## 1. 样本与证据边界

### 1.1 四卷考卷

1. `ielts-academic-reading-sample-tasks-2023.pdf`
2. `ielts-academic-writing-example-responses-to-parts-1-and-2-with-band-scores-and-examiner-comments.pdf`
3. `ielts-academic-writing-sample-tasks-2023.pdf`
4. `ielts-listening-sample-tasks-2023.pdf`

样本仍为每卷按碎片原顺序取前 40 条「`text` 是字符串且长度 ≥ 25，并且 `anchor.bbox` 存在」的碎片，合计 **40 × 4 = 160**。新口径不事后剔除任何角色，不只重量旧口径的 6 条 miss。

### 1.2 开工哈希

`D:/Coinsides/v12.9-selection` 整树确定性哈希配方：递归枚举所有文件（含隐藏文件），以正斜杠相对路径排序；每行写 `relative_path<TAB>byte_length<TAB>file_sha256<LF>`（UTF-8 无 BOM），再对整份清单取 SHA-256。

- 文件数：**94,935**
- 总字节数：**3,149,405,801**
- 清单字节数：**14,624,025**
- 开工整树 SHA-256：`3ce243035350e653d824bea118cb0715acf4804bf9653ee63a56b6890985a6d7`

## 2. 新评分口径（冻结于实跑之前）

**冻结时刻**：`2026-08-29 04:42:55 -04:00`（America/Toronto）。

<!-- FROZEN_RULER_START -->
### 冻结口径原文

#### A. 样本与原始坐标约束

1. 对四份 `*.fragments.json` 分别按原顺序筛出「`text` 为字符串且长度 ≥ 25，且 `anchor.bbox` 存在」的碎片，每卷取前 40 条；必须恰好得到 160 条，否则整轮停止，不出分。
2. 按 12.9a `run_trial.py` 的原遍历顺序，将碎片 `seq` 对回同卷 `middle.json` 的原始 block。要求 block 总数与碎片总数相等、`fragment.seq` 可索引、`fragment.role == str(block.type)`；任一不成立，该条在新口径下记 miss，不换类补救。
3. 每条都先验 `page` / `bbox=[x0,y0,x1,y1]` / `page_size=[w,h]`：页号在原 PDF 范围内，全部数值有限，`0 ≤ x0 < x1 ≤ w`、`0 ≤ y0 < y1 ≤ h`。任一不成立即 miss。MinerU 坐标按已有证据固定为 TOPLEFT，不试多个方位取高分；以 `PDF 页尺寸 / page_size` 分轴缩放，每边只加 1 pt 容差。

#### B. 分类（只读产物字段）

1. **表格**：`fragment.role == block.type` 且其值在 `{table, table_body}`。表格类还必须在展平后的 `block.lines[].spans[]` / `block.blocks[].lines[].spans[]` 中有非空 `html`；缺 `html` 直接 miss，不退回正文尺。
2. **图块**：`fragment.role == block.type` 且其值在 `{image, chart}`。图块类还必须在同一批展平 span 中有非空 `image_path`；缺 `image_path` 直接 miss，不退回正文尺。
3. **正文（文本型）**：不属于上述两类的其余 role，包括 `title` / `text` / `list` / `index` 等。未知 role 也只能走正文尺，不事后新造第四把尺。

#### C. 每类的判定尺

1. **正文 = 严格文本回程票**：用独立提取器 `pypdfium2` 在该 bbox 裁原 PDF；取 `fragment.text[:40]` 为 probe。probe 与 crop text 只做「空白折叠 + lowercase」，**不做 NFKC、不改标点**；规范化后 probe 是 crop text 子串才通过，否则 miss。这把尺与 12.9a 旧严格尺相同。
2. **表格 = 单元格文本回程票**：用 Python 标准库 `html.parser.HTMLParser(convert_charrefs=True)` 逐个取出 `<td>` 与 `<th>` 的文本；对每个非空 cell 和独立 crop text 使用与正文完全相同的「空白折叠 + lowercase」。至少要有 1 个非空 cell，并且**每一个** cell 文本都必须是 crop text 的子串才通过；任一 cell 不命中即 miss。不比 HTML 标签外形，也不因其他 cell 命中而宽免失败 cell。
3. **图块 = 图像内容—位置回程票**：先将每个 `image_path` 解析到同卷 `auto/images/` 内；路径越界、文件缺失或非普通文件即 miss。用 `pypdfium2` 以固定 2.0 倍（144 dpi）渲染原 PDF 页，按该 bbox 的 TOPLEFT 坐标裁出页面图块。对「产物 `image_path` 图」和「独立 PDF 渲染 crop」做同一固定预处理：透明层铺白、转灰度、以灰度 `<250` 的前景外包矩形去掉纯白外边，再缩放到 `17×16`，生成 256-bit 水平 dHash。两图原始前景像素比都必须 ≥ 1%、去边后宽高都必须 ≥ 8 px，且 `1 - HammingDistance/256 ≥ 0.75` 才通过；任一引用图不通过，该碎片即 miss。不读取图块文本，不靠人眼选方位，不试多个阈值取高分。

#### D. 全量、差异与停线

1. 上述分类与尺子一次性应用到全部 160 条；旧口径也由同一份脚本对全部 160 条重放。
2. 输出必须保留每条的卷名、`seq`、样本内序号、`role`、`block.type`、页号、bbox、是否有 `image_path`、是否有 `html`、cell 数、旧判定、新判定、新判定理由与实测指标；改判清单由 `old_pass != new_pass` 机械生成。
3. 跑完后不修改上述口径。若产物字段与假设不符、不能恰好取得 160 条、旧口径不能重现 154/160，或独立 PDF 提取/渲染器不可用，即停线并标 `needs: claude`，不猜。
<!-- FROZEN_RULER_END -->

冻结段原文为 **3,893 UTF-8 字节**，SHA-256：`2dbc308a09d6173c945c3c3c6fe8180a1d43db36dac561fc3d4d78e21239222c`。该值在实跑前计算；收尾将对同一标记段复算。

## 3. 实测记录

**实跑时间**：`2026-08-29T04:47:00.419565-04:00` 至 `04:47:01.110922-04:00`。口径只跑这一轮；跑完后没有改阈值、没有另起第二轮。

**执行环境**：Python `3.12.11`、`pypdfium2 5.10.1`、Pillow `12.3.0`，Windows 11。评分器与报告均在 `C:/Users/70208/AppData/Local/Temp/codex-c1c-per-type-rulers-20260829-0442/`，不在本仓，也不在证据本体目录。

- 评分器：`score_per_type.py`，23,680 字节，SHA-256 `e64685e3058af73c9a39ddc96c7008ae66c7f409b36090f3bbd42879680cc073`
- 全量报告：`per-type-report.json`，232,138 字节，SHA-256 `cd82932f9a970a76c17f9d0cac445a59581077e05d2f186fd3ce992c80872137`
- 报告自证：`model_calls=0`、`api_keys_used=0`、`cost=0`。**本单未调用任何模型，未产生任何花费。**
- 运行时只出现 Pillow 12.3.0 对 `Image.getdata()` 的 2027 移除预警；无中止、无输入缺失、无口径停线点。

### 3.1 全 160 条的分类账

| 新尺子类别 | 条数 | 来自产物的 role |
|---|---:|---|
| 正文（文本型） | **155** | `title` 25 + `text` 125 + `index` 3 + `list` 2 |
| 表格 | **1** | `table` 1（同条 `block.type='table'`，有 `span.html`） |
| 图块 | **4** | `chart` 2 + `image` 2（各条 `block.type` 同 role，且均有 `span.image_path`） |
| **合计** | **160** | 四卷各 40 |

这是先冻结的分类规则对全部 160 条一次性得出的分布；不是只给旧 6 条 miss 贴类别。

### 3.2 每卷实测

| 卷 | 样本 | 旧口径通过 | 新口径通过 |
|---|---:|---:|---:|
| academic-reading | 40 | 39 | 39 |
| writing-example-responses | 40 | 40 | 40 |
| academic-writing | 40 | 36 | 39 |
| listening | 40 | 39 | 40 |
| **合计** | **160** | **154** | **158** |

## 4. 打分与逐条差异

同一批 160 条，在【旧口径】下 **154 通过**；在【新口径】下 **158 通过**；差额 **4 条**的改判理由如下逐条在案。两数是两把尺子的读数；本单没有修改 MinerU 或它的产物。

机械差异清单共 **4 条**：全部是 `old_pass=false → new_pass=true`；`old_pass=true → new_pass=false` 为 **0 条**。

### 4.1 逐条改判（K-2）

| # | 碎片与旧判定 | 产物字段分类证据 | 新尺子下的实测 |
|---|---|---|---|
| 1 | `academic-writing#seq=13`，样本内 #12，p2，bbox `[73,307,486,721]` / page_size `[595,841]`。旧尺把图片名哈希当文本，crop text 为空 ⇒ miss。 | `fragment.role='chart'`；对应 `block.type='chart'`；`span.image_path='6db4…e052b.jpg'` 非空；`html_count=0`。依冻结顺序归**图块**。 | 独立 PDF crop 与 `image_path` 图的 256-bit dHash 距离 **8**，相似度 **0.96875 ≥ 0.75**；两侧前景比 0.3510 / 0.3568 均过 1% 守门 ⇒ 非 miss。 |
| 2 | `academic-writing#seq=20`，样本内 #18，p3，bbox `[76,366,561,642]` / `[595,841]`。旧尺的文本 probe `Radio and television audiences…` 不在 crop text ⇒ miss。 | `fragment.role='chart' == block.type`；`span.image_path='73fc…b27ef.jpg'` 非空；`html_count=0`。依产物字段归**图块**。 | dHash 距离 **7**，相似度 **0.97265625**；前景比 0.0759 / 0.0777 均过门 ⇒ 非 miss。 |
| 3 | `academic-writing#seq=27`，样本内 #24，p4，bbox `[78,347,505,705]` / `[595,841]`。旧尺把图片名哈希当文本，crop text 为空 ⇒ miss。 | `fragment.role='image' == block.type`；`span.image_path='d117…be5c.jpg'` 非空；`html_count=0`。依产物字段归**图块**。 | dHash 距离 **13**，相似度 **0.94921875**；前景比 0.2720 / 0.2755 均过门 ⇒ 非 miss。 |
| 4 | `listening#seq=21`，样本内 #8，p2，bbox `[91,479,417,630]` / `[595,841]`。旧尺把图片名哈希当文本，crop text 只有 `Size of container…` ⇒ miss。 | `fragment.role='image' == block.type`；`span.image_path='1f4e…40c8db.jpg'` 非空；`html_count=0`。依产物字段归**图块**。 | dHash 距离 **7**，相似度 **0.97265625**；前景比 0.1354 / 0.1391 均过门 ⇒ 非 miss。 |

上表的分类只用了产物字段；没有凭肉眼看图决定哪条算图块。图像判定的参考内容是产物 `image_path`，位置内容来自 `pypdfium2` 对原 PDF 的独立渲染 crop。

### 4.2 新尺子下仍是 miss 的两条（K-3 反例）

1. **表格仍 miss**：`academic-reading#seq=38`，样本内 #27，p6，bbox `[55,142,550,314]` / page_size `[596,842]`。可复核字段为 `fragment.role='table' == block.type`、`html_count=1`、`has_image_path=true`；按冻结优先级归**表格**，不走图块尺。HTML 解出 **17** 个非空 cell，其中 **15** 个在独立 crop text 中严格命中，`1-2` 与 `13..` 两个未命中（crop 含 `1 - 2`，另一处为点引线/空格外形）。冻结规则要求每个 cell 都命中，所以不放过。
2. **目录仍 miss**：`academic-writing#seq=6`，样本内 #6，p1，bbox `[66,96,541,502]` / `[595,841]`。字段为 `fragment.role='index' == block.type`、无 `html`、无 `image_path`，因此按冻结规则归**正文（文本型）**。probe 为 `Academic Writing Sample Task – 1A. 3 Aca`，crop 为 `Academic Writing Sample Task – 1A...... 3…`；点引线差异下严格子串不成立，因此仍 miss。

反例真实存在：新尺子没有让旧 6 条失败全部消失。表格与目录的两条都按实跑前写死的守门条件留红。

### 4.3 K-4 措辞自查

- 本节只说「旧口径 154 通过；新口径 158 通过；4 条改判理由逐条在案」。
- 本单没有动 MinerU、没有重拓印、没有修改原始产物；因此不把两个读数写成同一把尺子下的性能变化。

## 5. 我自己的测量错误

1. **第一次字段盘点输出过宽，被终端截断。**我把 160 条的每条键集都打出来，得到 4,211 行并截断的回显；这是不合适的检查形状。我随后改为只输出全量 group count 和 5 条 special 的字段摘要，才得到可审查的冻结依据。截断输出没有进入评分器。
2. **评分器的 `pypdfium2` 版本自述位取错。**脚本用 `getattr(pdfium, '__version__', 'unknown')`，全量报告因而写了 `unknown`。实跑后我用 `importlib.metadata.version('pypdfium2')` 独立查得 **5.10.1**。这是我的环境记录错误，不影响已经计算的 160 条；为避免把一次实跑变成事后新一轮，我没有因这个纯元数据错误重跑。
3. **图块尺证明的是「这张产物图能按 bbox 回到原 PDF 中的同一图像内容」，不是「图块的语义分类必然正确」。** PDF crop 来自独立渲染器，但期望内容 `image_path` 与 bbox 都是 MinerU 产物，两者存在相关失败的可能。所以这把尺支持回程票的内容一致性，不支持更宽的视觉理解声明。
4. **表格尺量到的是单元格文本，不是单元格几何。** MinerU 3.4.5 的标准落盘产物没有逐 cell bbox，所以本单无法声明 cell 级位置可寻址。留红的 `1-2` / `13..` 更像文本外形差异；但冻结尺要求每 cell 严格命中，我不在看见结果后把它改为标点宽免。
5. **样本边界很窄。**只有 160 条，只有 4 卷英文、数字原生 IELTS PDF，只有 MinerU `3.4.5`；其中只有 1 条表格和 4 条图块。未覆盖中文、扫描件、手写、公式、更复杂表格、多图路径、坏路径、图块假阳性、其他 MinerU 版本，也未与 Docling 或任何其他转写器对比。
6. **外推边界**：结论最多外推到「这 4 卷中被固定取样的 160 条，按本文冻结尺的读数」。不外推为 MinerU 的全局准确性，不外推为其他文档类型的读数，不外推为 cell 几何已可寻址。

## 6. 结语

**同一批 160 条，旧口径下 154 通过，新口径下 158 通过；差额 4 条全部有逐条字段与图像—位置证据。**这 4 条均是旧文本尺下的图块 miss；新尺并没有把表格与目录两个反例一起放过。

这份档案支持一个很窄的判断：**在这批样本上，拿文本尺量产物字段明确标成 `image/chart` 且有 `image_path` 的图块，会产生 4 条可机械复核的假阴性。**表格 HTML 外形确实不再被直接当文本 probe，但冻结的逐 cell 文本尺仍找到 2 个未命中 cell，所以本轮不把它改判。

K-3 的反例成立：新口径下仍有 **2** 条 miss。因此这不是一把让所有旧失败都通过的尺子。本轮没有停线点，没有模型调用，没有 API key，没有花费，也没有任何 MinerU 产物或生产接线变更。

## 7. 可复现配方（实跑脚本逐字归档）

将下面代码保存为仓外 `score_per_type.py`。本次实跑所用文件的 SHA-256 为 `e64685e3058af73c9a39ddc96c7008ae66c7f409b36090f3bbd42879680cc073`；下列代码与该文件逐字相同。

<!-- SCORER_SCRIPT_START -->
```python
"""V12.9c c-1c per-type return-ticket scorer.

The ruler was frozen in the repository archive before this file was executed.
This script reads D:/Coinsides/v12.9-selection only and writes one JSON report
to the explicitly supplied out-of-repository path. It calls no model or API.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import platform
import sys
from collections import Counter
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path
from typing import Any

import pypdfium2 as pdfium
import PIL
from PIL import Image, ImageOps


N_PER_VOLUME = 40
MIN_TEXT_CHARS = 25
TEXT_PROBE_CHARS = 40
PAD_PT = 1.0
RENDER_SCALE = 2.0
FOREGROUND_RATIO_MIN = 0.01
FOREGROUND_THRESHOLD = 245
TRIM_THRESHOLD = 250
TRIM_MIN_PX = 8
DHASH_WIDTH = 17
DHASH_HEIGHT = 16
DHASH_BITS = (DHASH_WIDTH - 1) * DHASH_HEIGHT
DHASH_SIMILARITY_MIN = 0.75
TABLE_ROLES = {"table", "table_body"}
FIGURE_ROLES = {"image", "chart"}


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def strict_text(value: Any) -> str:
    return " ".join(str(value).split()).lower()


def finite_number(value: Any) -> bool:
    return not isinstance(value, bool) and isinstance(value, (int, float)) and math.isfinite(value)


class CellParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.cell_depth = 0
        self.current: list[str] = []
        self.cells: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        del attrs
        lowered = tag.lower()
        if lowered in {"td", "th"}:
            if self.cell_depth == 0:
                self.current = []
            self.cell_depth += 1
        elif self.cell_depth and lowered in {"br", "p", "div", "li"}:
            self.current.append(" ")

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() in {"td", "th"} and self.cell_depth:
            self.cell_depth -= 1
            if self.cell_depth == 0:
                self.cells.append("".join(self.current))
                self.current = []

    def handle_data(self, data: str) -> None:
        if self.cell_depth:
            self.current.append(data)


def cells_from_html(html_values: list[str]) -> list[str]:
    cells: list[str] = []
    for html in html_values:
        parser = CellParser()
        parser.feed(html)
        parser.close()
        cells.extend(parser.cells)
    return [strict_text(cell) for cell in cells if strict_text(cell)]


def flatten_spans(block: dict[str, Any]) -> list[dict[str, Any]]:
    spans: list[dict[str, Any]] = []
    for line in block.get("lines") or []:
        spans.extend(line.get("spans") or [])
    for sub_block in block.get("blocks") or []:
        for line in sub_block.get("lines") or []:
            spans.extend(line.get("spans") or [])
    return spans


def raw_blocks(middle: dict[str, Any]) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for page in middle.get("pdf_info") or []:
        blocks = page.get("para_blocks") or page.get("preproc_blocks") or []
        for block in blocks:
            spans = flatten_spans(block)
            result.append(
                {
                    "page": page.get("page_idx"),
                    "page_size": page.get("page_size"),
                    "block": block,
                    "type": str(block.get("type")),
                    "spans": spans,
                    "html_values": [str(span["html"]) for span in spans if span.get("html")],
                    "image_paths": [str(span["image_path"]) for span in spans if span.get("image_path")],
                    "span_types": sorted({str(span.get("type")) for span in spans}),
                }
            )
    return result


def validate_anchor(fragment: dict[str, Any], document: Any) -> tuple[dict[str, float | int] | None, str | None]:
    anchor = fragment.get("anchor")
    if not isinstance(anchor, dict):
        return None, "anchor is not an object"
    page_number = anchor.get("page")
    if isinstance(page_number, bool) or not isinstance(page_number, int):
        return None, "page is not an integer"
    if page_number < 0 or page_number >= len(document):
        return None, "page is outside the PDF"
    bbox = anchor.get("bbox")
    page_size = anchor.get("page_size")
    if not isinstance(bbox, list) or len(bbox) != 4 or not all(finite_number(value) for value in bbox):
        return None, "bbox is not four finite numbers"
    if not isinstance(page_size, list) or len(page_size) != 2 or not all(finite_number(value) for value in page_size):
        return None, "page_size is not two finite numbers"
    x0, y0, x1, y1 = (float(value) for value in bbox)
    width, height = (float(value) for value in page_size)
    if width <= 0 or height <= 0:
        return None, "page_size is not positive"
    if not (0 <= x0 < x1 <= width and 0 <= y0 < y1 <= height):
        return None, "bbox is non-positive or outside page_size"
    page = document[page_number]
    pdf_width = float(page.get_width())
    pdf_height = float(page.get_height())
    scale_x = pdf_width / width
    scale_y = pdf_height / height
    left = max(0.0, x0 * scale_x - PAD_PT)
    right = min(pdf_width, x1 * scale_x + PAD_PT)
    top_tl = max(0.0, y0 * scale_y - PAD_PT)
    bottom_tl = min(pdf_height, y1 * scale_y + PAD_PT)
    return {
        "page": page_number,
        "left": left,
        "right": right,
        "top_tl": top_tl,
        "bottom_tl": bottom_tl,
        "pdf_width": pdf_width,
        "pdf_height": pdf_height,
    }, None


def bounded_text(document: Any, geometry: dict[str, float | int]) -> str:
    page = document[int(geometry["page"])]
    pdf_height = float(geometry["pdf_height"])
    bottom = pdf_height - float(geometry["bottom_tl"])
    top = pdf_height - float(geometry["top_tl"])
    return page.get_textpage().get_text_bounded(
        float(geometry["left"]), bottom, float(geometry["right"]), top
    )


def rendered_crop(document: Any, geometry: dict[str, float | int]) -> Image.Image:
    page = document[int(geometry["page"])]
    page_image = page.render(scale=RENDER_SCALE).to_pil()
    left = max(0, math.floor(float(geometry["left"]) * RENDER_SCALE))
    top = max(0, math.floor(float(geometry["top_tl"]) * RENDER_SCALE))
    right = min(page_image.width, math.ceil(float(geometry["right"]) * RENDER_SCALE))
    bottom = min(page_image.height, math.ceil(float(geometry["bottom_tl"]) * RENDER_SCALE))
    return page_image.crop((left, top, right, bottom))


def white_composited_grayscale(image: Image.Image) -> Image.Image:
    image = ImageOps.exif_transpose(image)
    rgba = image.convert("RGBA")
    background = Image.new("RGBA", rgba.size, "white")
    return ImageOps.grayscale(Image.alpha_composite(background, rgba).convert("RGB"))


def dhash_evidence(image: Image.Image) -> dict[str, Any]:
    gray = white_composited_grayscale(image)
    pixels = list(gray.getdata())
    foreground_ratio = (
        sum(1 for value in pixels if value < FOREGROUND_THRESHOLD) / len(pixels) if pixels else 0.0
    )
    mask = gray.point(lambda value: 255 if value < TRIM_THRESHOLD else 0)
    trim_box = mask.getbbox()
    if trim_box is None:
        return {
            "ok": False,
            "reason": "no non-white foreground",
            "foreground_ratio": foreground_ratio,
            "trimmed_size": [0, 0],
            "bits": [],
        }
    trimmed = gray.crop(trim_box)
    trimmed_size = [trimmed.width, trimmed.height]
    if foreground_ratio < FOREGROUND_RATIO_MIN:
        return {
            "ok": False,
            "reason": "foreground ratio below 1%",
            "foreground_ratio": foreground_ratio,
            "trimmed_size": trimmed_size,
            "bits": [],
        }
    if trimmed.width < TRIM_MIN_PX or trimmed.height < TRIM_MIN_PX:
        return {
            "ok": False,
            "reason": "trimmed image is smaller than 8x8",
            "foreground_ratio": foreground_ratio,
            "trimmed_size": trimmed_size,
            "bits": [],
        }
    resized = trimmed.resize((DHASH_WIDTH, DHASH_HEIGHT), Image.Resampling.LANCZOS)
    resized_pixels = list(resized.getdata())
    bits = []
    for y in range(DHASH_HEIGHT):
        row = y * DHASH_WIDTH
        for x in range(DHASH_WIDTH - 1):
            bits.append(resized_pixels[row + x] > resized_pixels[row + x + 1])
    return {
        "ok": True,
        "reason": "ok",
        "foreground_ratio": foreground_ratio,
        "trimmed_size": trimmed_size,
        "bits": bits,
    }


def resolve_image_path(images_dir: Path, claimed_path: str) -> tuple[Path | None, str | None]:
    root = images_dir.resolve()
    candidate = (root / claimed_path).resolve()
    try:
        candidate.relative_to(root)
    except ValueError:
        return None, "image_path escapes auto/images"
    if not candidate.is_file():
        return None, "image_path is missing or is not a file"
    return candidate, None


def score_figure(
    document: Any,
    geometry: dict[str, float | int],
    images_dir: Path,
    image_paths: list[str],
) -> tuple[bool, str, dict[str, Any]]:
    if not image_paths:
        return False, "figure has no image_path", {"image_paths": []}
    source_crop = rendered_crop(document, geometry)
    crop_evidence = dhash_evidence(source_crop)
    comparisons: list[dict[str, Any]] = []
    all_pass = crop_evidence["ok"]
    for claimed_path in image_paths:
        resolved, path_error = resolve_image_path(images_dir, claimed_path)
        if path_error or resolved is None:
            comparisons.append({"image_path": claimed_path, "pass": False, "reason": path_error})
            all_pass = False
            continue
        with Image.open(resolved) as artifact_image:
            artifact_evidence = dhash_evidence(artifact_image)
        if not crop_evidence["ok"] or not artifact_evidence["ok"]:
            comparisons.append(
                {
                    "image_path": claimed_path,
                    "pass": False,
                    "reason": "foreground precondition failed",
                    "artifact": {key: value for key, value in artifact_evidence.items() if key != "bits"},
                }
            )
            all_pass = False
            continue
        distance = sum(left != right for left, right in zip(crop_evidence["bits"], artifact_evidence["bits"]))
        similarity = 1.0 - distance / DHASH_BITS
        passed = similarity >= DHASH_SIMILARITY_MIN
        comparisons.append(
            {
                "image_path": claimed_path,
                "pass": passed,
                "dhash_hamming": distance,
                "dhash_bits": DHASH_BITS,
                "dhash_similarity": similarity,
                "artifact": {key: value for key, value in artifact_evidence.items() if key != "bits"},
            }
        )
        all_pass = all_pass and passed
    evidence = {
        "render_scale": RENDER_SCALE,
        "similarity_min": DHASH_SIMILARITY_MIN,
        "crop": {key: value for key, value in crop_evidence.items() if key != "bits"},
        "comparisons": comparisons,
    }
    return all_pass, "all referenced images match the anchored PDF crop" if all_pass else "image-position comparison failed", evidence


def score_table(html_values: list[str], crop_text: str) -> tuple[bool, str, dict[str, Any]]:
    cells = cells_from_html(html_values)
    normalized_crop = strict_text(crop_text)
    missing_cells = [cell for cell in cells if cell not in normalized_crop]
    passed = bool(cells) and not missing_cells
    evidence = {
        "cell_count": len(cells),
        "cells": cells,
        "missing_cell_count": len(missing_cells),
        "missing_cells": missing_cells,
        "crop_text_head": crop_text[:240],
    }
    return passed, "every non-empty HTML cell occurs in the anchored PDF crop" if passed else "one or more HTML cells do not occur in the anchored PDF crop", evidence


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--evidence-root", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    evidence_root = args.evidence_root.resolve()
    output_path = args.output.resolve()
    if evidence_root == output_path or evidence_root in output_path.parents:
        raise SystemExit("output path must be outside the read-only evidence root")
    output_path.parent.mkdir(parents=True, exist_ok=True)

    samples_dir = evidence_root / "samples"
    mineru_out = evidence_root / "tools" / "_out" / "c2-mineru"
    fragment_files = sorted(mineru_out.glob("*.fragments.json"), key=lambda path: path.name)
    if len(fragment_files) != 4:
        raise SystemExit(f"expected four fragment files, found {len(fragment_files)}")

    started = datetime.now().astimezone().isoformat()
    rows: list[dict[str, Any]] = []
    input_hashes: dict[str, str] = {}
    stopped_reasons: list[str] = []

    for fragment_path in fragment_files:
        stem = fragment_path.name[: -len(".fragments.json")]
        pdf_path = samples_dir / f"{stem}.pdf"
        middle_path = mineru_out / "_raw" / stem / "auto" / f"{stem}_middle.json"
        images_dir = middle_path.parent / "images"
        for required in (fragment_path, pdf_path, middle_path):
            if not required.is_file():
                stopped_reasons.append(f"missing required input: {required}")
        if stopped_reasons:
            break

        input_hashes[str(fragment_path.relative_to(evidence_root)).replace(os.sep, "/")] = sha256_file(fragment_path)
        input_hashes[str(pdf_path.relative_to(evidence_root)).replace(os.sep, "/")] = sha256_file(pdf_path)
        input_hashes[str(middle_path.relative_to(evidence_root)).replace(os.sep, "/")] = sha256_file(middle_path)

        fragments = json.loads(fragment_path.read_text(encoding="utf-8"))
        middle = json.loads(middle_path.read_text(encoding="utf-8"))
        blocks = raw_blocks(middle)
        if len(blocks) != len(fragments):
            stopped_reasons.append(f"{stem}: raw block count {len(blocks)} != fragment count {len(fragments)}")
            break
        selected = [
            fragment
            for fragment in fragments
            if isinstance(fragment.get("text"), str)
            and len(fragment["text"]) >= MIN_TEXT_CHARS
            and isinstance(fragment.get("anchor"), dict)
            and fragment["anchor"].get("bbox")
        ][:N_PER_VOLUME]
        if len(selected) != N_PER_VOLUME:
            stopped_reasons.append(f"{stem}: selected {len(selected)} rows, expected {N_PER_VOLUME}")
            break

        document = pdfium.PdfDocument(str(pdf_path))
        try:
            for sample_index, fragment in enumerate(selected, start=1):
                seq = fragment.get("seq")
                row: dict[str, Any] = {
                    "id": f"{stem}#seq={seq}",
                    "volume": stem,
                    "sample_index": sample_index,
                    "seq": seq,
                    "role": fragment.get("role"),
                    "page": (fragment.get("anchor") or {}).get("page"),
                    "bbox": (fragment.get("anchor") or {}).get("bbox"),
                    "page_size": (fragment.get("anchor") or {}).get("page_size"),
                    "text_head": fragment.get("text", "")[:120],
                }
                if isinstance(seq, bool) or not isinstance(seq, int) or seq < 0 or seq >= len(blocks):
                    row.update(
                        {
                            "raw_type": None,
                            "has_html": False,
                            "html_count": 0,
                            "has_image_path": False,
                            "image_paths": [],
                            "old_pass": False,
                            "old_reason": "invalid seq",
                            "new_class": "invalid",
                            "new_pass": False,
                            "new_reason": "fragment.seq cannot index the raw block stream",
                            "new_evidence": {},
                        }
                    )
                    rows.append(row)
                    continue

                raw = blocks[seq]
                html_values = raw["html_values"]
                image_paths = raw["image_paths"]
                row.update(
                    {
                        "raw_type": raw["type"],
                        "span_types": raw["span_types"],
                        "has_html": bool(html_values),
                        "html_count": len(html_values),
                        "has_image_path": bool(image_paths),
                        "image_paths": image_paths,
                    }
                )
                for image_path in image_paths:
                    resolved, error = resolve_image_path(images_dir, image_path)
                    if error is None and resolved is not None:
                        relative = str(resolved.relative_to(evidence_root)).replace(os.sep, "/")
                        input_hashes[relative] = sha256_file(resolved)

                geometry, anchor_error = validate_anchor(fragment, document)
                crop_text = bounded_text(document, geometry) if geometry is not None else ""
                probe = fragment.get("text", "")[:TEXT_PROBE_CHARS]
                old_pass = geometry is not None and strict_text(probe) in strict_text(crop_text)
                row.update(
                    {
                        "old_pass": old_pass,
                        "old_reason": "strict text probe occurs in crop" if old_pass else (anchor_error or "strict text probe absent from crop"),
                        "old_probe": probe,
                        "old_crop_text_head": crop_text[:240],
                    }
                )

                role = str(fragment.get("role"))
                if role != raw["type"]:
                    new_class = "invalid"
                    new_pass = False
                    new_reason = "fragment.role does not equal raw block.type"
                    new_evidence: dict[str, Any] = {"anchor_error": anchor_error}
                elif geometry is None:
                    new_class = "invalid"
                    new_pass = False
                    new_reason = anchor_error or "anchor validation failed"
                    new_evidence = {"anchor_error": anchor_error}
                elif role in TABLE_ROLES:
                    new_class = "table"
                    if not html_values:
                        new_pass = False
                        new_reason = "table has no span.html"
                        new_evidence = {"cell_count": 0, "missing_cells": []}
                    else:
                        new_pass, new_reason, new_evidence = score_table(html_values, crop_text)
                elif role in FIGURE_ROLES:
                    new_class = "figure"
                    if not image_paths:
                        new_pass = False
                        new_reason = "figure has no span.image_path"
                        new_evidence = {"image_paths": []}
                    else:
                        new_pass, new_reason, new_evidence = score_figure(document, geometry, images_dir, image_paths)
                else:
                    new_class = "body"
                    new_pass = strict_text(probe) in strict_text(crop_text)
                    new_reason = "strict text probe occurs in crop" if new_pass else "strict text probe absent from crop"
                    new_evidence = {"probe": probe, "crop_text_head": crop_text[:240]}

                row.update(
                    {
                        "new_class": new_class,
                        "new_pass": new_pass,
                        "new_reason": new_reason,
                        "new_evidence": new_evidence,
                    }
                )
                rows.append(row)
        finally:
            document.close()

    if len(rows) != 4 * N_PER_VOLUME:
        stopped_reasons.append(f"scored {len(rows)} rows, expected {4 * N_PER_VOLUME}")

    old_pass_count = sum(bool(row.get("old_pass")) for row in rows)
    if len(rows) == 4 * N_PER_VOLUME and old_pass_count != 154:
        stopped_reasons.append(f"old ruler replayed {old_pass_count}/160, expected 154/160")

    new_pass_count = sum(bool(row.get("new_pass")) for row in rows)
    differences = [row for row in rows if row.get("old_pass") != row.get("new_pass")]
    new_misses = [row for row in rows if not row.get("new_pass")]
    per_volume: dict[str, dict[str, int]] = {}
    for row in rows:
        volume = str(row["volume"])
        bucket = per_volume.setdefault(volume, {"sampled": 0, "old_pass": 0, "new_pass": 0})
        bucket["sampled"] += 1
        bucket["old_pass"] += int(bool(row.get("old_pass")))
        bucket["new_pass"] += int(bool(row.get("new_pass")))

    completed = datetime.now().astimezone().isoformat()
    report = {
        "run": {
            "started": started,
            "completed": completed,
            "script": str(Path(__file__).resolve()),
            "script_sha256": sha256_file(Path(__file__).resolve()),
            "python": sys.version,
            "platform": platform.platform(),
            "pypdfium2": getattr(pdfium, "__version__", "unknown"),
            "pillow": PIL.__version__,
            "model_calls": 0,
            "api_keys_used": 0,
            "cost": 0,
        },
        "inputs": {
            "evidence_root": str(evidence_root),
            "hashes_sha256": dict(sorted(input_hashes.items())),
        },
        "constants": {
            "n_per_volume": N_PER_VOLUME,
            "min_text_chars": MIN_TEXT_CHARS,
            "text_probe_chars": TEXT_PROBE_CHARS,
            "pad_pt": PAD_PT,
            "render_scale": RENDER_SCALE,
            "figure_foreground_ratio_min": FOREGROUND_RATIO_MIN,
            "figure_dhash_bits": DHASH_BITS,
            "figure_dhash_similarity_min": DHASH_SIMILARITY_MIN,
            "table_roles": sorted(TABLE_ROLES),
            "figure_roles": sorted(FIGURE_ROLES),
        },
        "stopped": bool(stopped_reasons),
        "stopped_reasons": stopped_reasons,
        "summary": {
            "sampled": len(rows),
            "old_pass": old_pass_count,
            "new_pass": new_pass_count,
            "difference_count": len(differences),
            "old_to_new_pass": sum(not row["old_pass"] and row["new_pass"] for row in differences),
            "old_pass_to_new_miss": sum(row["old_pass"] and not row["new_pass"] for row in differences),
            "new_miss_count": len(new_misses),
            "class_counts": dict(Counter(str(row.get("new_class")) for row in rows)),
            "role_counts": dict(Counter(str(row.get("role")) for row in rows)),
            "per_volume": per_volume,
        },
        "differences": differences,
        "new_misses": new_misses,
        "rows": rows,
    }
    output_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"stopped": report["stopped"], **report["summary"]}, ensure_ascii=False, indent=2))
    return 2 if stopped_reasons else 0


if __name__ == "__main__":
    raise SystemExit(main())

```
<!-- SCORER_SCRIPT_END -->

本次 PowerShell 调用原文：

```powershell
$env:PYTHONDONTWRITEBYTECODE = '1'
& 'D:\Coinsides\v12.9-selection\tools\mineru\.venv\Scripts\python.exe' -B 'C:\Users\70208\AppData\Local\Temp\codex-c1c-per-type-rulers-20260829-0442\score_per_type.py' --evidence-root 'D:\Coinsides\v12.9-selection' --output 'C:\Users\70208\AppData\Local\Temp\codex-c1c-per-type-rulers-20260829-0442\per-type-report.json'
```

## 8. 收尾复核

### 8.1 证据本体前后哈希

| 时点 | 文件数 | 总字节 | 清单字节 | 整树 SHA-256 |
|---|---:|---:|---:|---|
| 开工前 | 94,935 | 3,149,405,801 | 14,624,025 | `3ce243035350e653d824bea118cb0715acf4804bf9653ee63a56b6890985a6d7` |
| 收尾 | 94,935 | 3,149,405,801 | 14,624,025 | `3ce243035350e653d824bea118cb0715acf4804bf9653ee63a56b6890985a6d7` |

四项完全相同：`D:/Coinsides/v12.9-selection/**` 没有被本单写入一个字节。

### 8.2 冻结、配方与 K-4 复核

- 冻结口径段实跑前/收尾 SHA-256 均为 `2dbc308a09d6173c945c3c3c6fe8180a1d43db36dac561fc3d4d78e21239222c`（3,893 UTF-8 字节）。
- 档案内的评分脚本与实跑临时文件逐字相同，SHA-256 均为 `e64685e3058af73c9a39ddc96c7008ae66c7f409b36090f3bbd42879680cc073`。
- K-4 机械扫描本档案中的禁用组合词，零命中；数字只按「旧 154 / 新 158 / 差额 4 条逐条在案」并列申报。

### 8.3 仓库允许面与禁区

本单在仓内只产生两个作业面变化：本档案，以及工单 `## Result`。`client/**`、`scripts/**`、`package.json`、`docs/agent-ops/INDEX.md`、测试和其他生产码没有本单变更；本单也没有运行生产验证门，因为工单明令只做语义档案。

⚠️ **`needs: claude`（开工前现物）**：进入本单时，工作树已有 `server/src/routes/projections.ts` 的 ` M` 状态，所以若把「禁区零 diff」字面解释为「相对 HEAD 必须干净」，该前提在开工时已不成立。我没有猜该改动归属，也没有触碰它；文件开工/收尾 SHA-256 均为 `c9072a7a3bfcbcfc20e48efa3050c0baea806b5ac89594b29e5249fe1ce08ed7`，并且禁区 `git status` 前后都只是这一条。请调度方确认其所有权；它不是本实验的产物。

其他停线点：**无**。本单未 commit，未翻工单顶部状态行。
