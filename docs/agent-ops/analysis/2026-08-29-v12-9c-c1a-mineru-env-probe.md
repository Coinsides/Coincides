> **状态 (Status)**: frozen（2026-08-29 单次环境体检收据）
> **层 (Layer)**: 分析 / Analysis（运行证据，非施工规格）
> **日期 (Updated)**: 2026-08-29
> **权威 (Authoritative)**: 否（结论只覆盖本机、本日、下列实际命令）
> **工单**: `handoffs/2026-08-29-v12-9c-c1a-mineru-env-probe.md`

# V12.9c c-1a：MinerU 遗产环境体检报告

结论：**遗产环境今天仍能立、身份仍是 Python 3.12.11 / MinerU 3.4.5，并且能对真正的 image-only 单页执行 OCR。** 生产 `pdf-parse` 对该页得到 0 块 / 0 页内文本，MinerU 得到 3 个非空块、500 个真实文本字符，阳性对照成立。现址四个 K-0 哈希前后逐一不变；没有安装、升级、搬迁、全卷或批量运行。

仓外证据根：

```text
C:\Users\70208\AppData\Local\Temp\coincides-mineru-probe-20260829-012536
```

## 1. K-0：证据本体前后四哈希

开跑前与全部探针完成后的命令同形：

```powershell
$targets = @(
  'D:\Coinsides\v12.9-selection\tools\mineru\.python-version',
  'D:\Coinsides\v12.9-selection\tools\mineru\pyproject.toml',
  'D:\Coinsides\v12.9-selection\tools\mineru\uv.lock',
  'D:\Coinsides\v12.9-selection\tools\mineru\.venv\pyvenv.cfg'
)
$targets | ForEach-Object {
  Get-FileHash -Algorithm SHA256 -LiteralPath $_
}
```

| 现址文件 | 字节 | 开跑前 SHA-256 | 全部探针后 SHA-256 | 判定 |
|---|---:|---|---|---|
| `.python-version` | 5 | `7b55f8e67b5623c4bef3fa691288da9437d79d3aba156de48d481db32ac7d16d` | `7b55f8e67b5623c4bef3fa691288da9437d79d3aba156de48d481db32ac7d16d` | ✅ 不变 |
| `pyproject.toml` | 184 | `253b88b01b81b69b6c68b4fc45392600322a20286fcce180b90a8d7183b8ba57` | `253b88b01b81b69b6c68b4fc45392600322a20286fcce180b90a8d7183b8ba57` | ✅ 不变 |
| `uv.lock` | 441341 | `67c4b42dcd269ffa3e9f05633ce98d6259812bc460f2dd2f8f58cb142e3ee231` | `67c4b42dcd269ffa3e9f05633ce98d6259812bc460f2dd2f8f58cb142e3ee231` | ✅ 不变 |
| `.venv/pyvenv.cfg` | 202 | `cb9ad065dd87e7ddb416cb8aeb7009424261bcce5743ad1da9de8b419d407a6e` | `cb9ad065dd87e7ddb416cb8aeb7009424261bcce5743ad1da9de8b419d407a6e` | ✅ 不变 |

后置输出末行：

```text
K0_ALL_UNCHANGED=True
```

**K-0 判定：绿。** 未触发“证据本体受污染”停线条件。所有 Python 探针均直接调用现址 `.venv/Scripts/python.exe`，带 `-B` 与 `PYTHONDONTWRITEBYTECODE=1`，cwd/TEMP/TMP 均指向仓外临时目录；没有在现址运行 `uv`。

## 2. K-1：遗产体检三层实况

### 2.1 能立

实际命令：

```powershell
$env:PYTHONDONTWRITEBYTECODE = '1'
$python = 'D:\Coinsides\v12.9-selection\tools\mineru\.venv\Scripts\python.exe'
& $python -B -c "import json,sys,importlib.metadata as md; import mineru; from mineru.cli.common import do_parse,read_fn; print(json.dumps({'executable':sys.executable,'python':sys.version.split()[0],'mineru_version':md.version('mineru'),'mineru_module':mineru.__file__,'do_parse_callable':callable(do_parse),'read_fn_callable':callable(read_fn)}, ensure_ascii=False))"
```

退出码与输出：

```text
EXIT_CODE=0
{"executable":"D:\\Coinsides\\v12.9-selection\\tools\\mineru\\.venv\\Scripts\\python.exe","python":"3.12.11","mineru_version":"3.4.5","mineru_module":"D:\\Coinsides\\v12.9-selection\\tools\\mineru\\.venv\\Lib\\site-packages\\mineru\\__init__.py","do_parse_callable":true,"read_fn_callable":true}
```

**第一层判定：绿。** 解释器能起、`mineru` 可导入、版本可由安装元数据解析、历史 API 入口可调用。

### 2.2 真跑了

实际运行命令（脚本落在仓外；SHA-256 `b778c4461179aa1932f398dae4e4a67191019cb4091a56c7f6d6030e2639ff19`）：

```powershell
$env:PROBE_PDF = 'C:\Users\70208\AppData\Local\Temp\coincides-mineru-probe-20260829-012536\ielts-page-001-image-only.pdf'
$env:PROBE_ROOT = 'C:\Users\70208\AppData\Local\Temp\coincides-mineru-probe-20260829-012536'
$env:MINERU_MODEL_REPO = 'C:\Users\70208\.cache\huggingface\hub\models--opendatalab--PDF-Extract-Kit-1.0'
$env:TEMP = $env:PROBE_ROOT
$env:TMP = $env:PROBE_ROOT
$env:PYTHONDONTWRITEBYTECODE = '1'
$env:HF_HUB_DISABLE_TELEMETRY = '1'
& 'D:\Coinsides\v12.9-selection\tools\mineru\.venv\Scripts\python.exe' -B `
  "$env:PROBE_ROOT\mineru_probe.py"
```

脚本中的实际单页调用（冷、热两次在同一 Python 进程中以相同参数执行，只改 `output_dir`）：

```python
do_parse(
    output_dir=str(output_dir),
    pdf_file_names=[PDF_PATH.stem],
    pdf_bytes_list=[read_fn(PDF_PATH)],
    p_lang_list=["en"],
    backend="pipeline",
    parse_method="ocr",
    formula_enable=True,
    table_enable=True,
    f_draw_layout_bbox=False,
    f_draw_span_bbox=False,
    f_dump_md=True,
    f_dump_middle_json=True,
    f_dump_content_list=True,
    f_dump_model_output=False,
    f_dump_orig_pdf=False,
)
```

实际输出片段：

```text
Pipeline processing-window multi-file run. doc_count=1, total_pages=1, ... total_batches=1
Use configured local pipeline model path: ...\models\Layout\PP-DocLayoutV2
Use configured local pipeline model path: ...\models\OCR\paddleocr_torch\ch_PP-OCRv6_small_det_infer.safetensors
DocAnalysis init done!
local output dir is ...\mineru-cold-success\ielts-page-001-image-only\ocr
RUN_RESULT: exit=0, pages=1, page_sizes={"0":[595,842]}, block_count=3,
            role_counts={"title":1,"text":2},
            text_block_count_excluding_image_path=3,
            text_chars_excluding_image_path=500,
            markdown_chars=506
EXIT_CODE=0
```

文本片段（来自 span `content` / `html`，明确不把 `image_path` 或图片哈希算作文本）：

```text
[title] IELTS Academic Reading Sample Tasks
[text] The IELTSAcademic Readingtest includes a variety of tasks. The task types are: ...
[text] Read the details of each task type on our Test format page.
```

**第二层判定：绿。** 不是“只看退出码”：实际看到了 3 个块、role 分布、页尺寸与 500 个非空文本字符。

### 2.3 会咬

见 §4。结论是生产 `pdf-parse` 页内文本 0，而同一份 image-only PDF 被 MinerU 识别出 500 个文本字符，故**第三层判定：绿**。

## 3. K-2：钉版副本逐字节一致与 ignore 正反

实际复制命令：

```powershell
$source = 'D:\Coinsides\v12.9-selection\tools\mineru'
$dest = 'D:\Coinsides\v2.x\Coincides\_external_tools\mineru'
New-Item -ItemType Directory -Path $dest
Copy-Item -LiteralPath "$source\.python-version" -Destination "$dest\.python-version"
Copy-Item -LiteralPath "$source\pyproject.toml" -Destination "$dest\pyproject.toml"
Copy-Item -LiteralPath "$source\uv.lock" -Destination "$dest\uv.lock"
```

没有重写、格式化或改行尾。逐件比对：

| 文件 | 现址 SHA-256 | 入库副本 SHA-256 | 长度（现址/副本） | 判定 |
|---|---|---|---:|---|
| `.python-version` | `7b55f8e67b5623c4bef3fa691288da9437d79d3aba156de48d481db32ac7d16d` | 同左 | 5 / 5 | ✅ 逐字节一致 |
| `pyproject.toml` | `253b88b01b81b69b6c68b4fc45392600322a20286fcce180b90a8d7183b8ba57` | 同左 | 184 / 184 | ✅ 逐字节一致 |
| `uv.lock` | `67c4b42dcd269ffa3e9f05633ce98d6259812bc460f2dd2f8f58cb142e3ee231` | 同左 | 441341 / 441341 | ✅ 逐字节一致 |

`.gitignore` 实际规则：

```gitignore
_external_tools/*
!_external_tools/mineru/
_external_tools/mineru/*
!_external_tools/mineru/.python-version
!_external_tools/mineru/pyproject.toml
!_external_tools/mineru/uv.lock
```

实际正反命令：

```powershell
git check-ignore -v -- _external_tools/mineru/.python-version
git check-ignore -v -- _external_tools/mineru/pyproject.toml
git check-ignore -v -- _external_tools/mineru/uv.lock
git check-ignore -v -- _external_tools/browser-harness/
git check-ignore -v -- _external_tools/mineru/.venv/pyvenv.cfg

git check-ignore -q -- <逐一路径>
```

`-v` 输出片段：

```text
.gitignore:58:!_external_tools/mineru/.python-version  _external_tools/mineru/.python-version
.gitignore:59:!_external_tools/mineru/pyproject.toml   _external_tools/mineru/pyproject.toml
.gitignore:60:!_external_tools/mineru/uv.lock          _external_tools/mineru/uv.lock
.gitignore:55:_external_tools/*                        _external_tools/browser-harness/
.gitignore:57:_external_tools/mineru/*                 _external_tools/mineru/.venv/pyvenv.cfg
```

`-q` 才作为最终 ignored 布尔判定：

```text
_external_tools/mineru/.python-version       exit 1  Ignored=false
_external_tools/mineru/pyproject.toml        exit 1  Ignored=false
_external_tools/mineru/uv.lock               exit 1  Ignored=false
_external_tools/browser-harness/             exit 0  Ignored=true
_external_tools/mineru/.venv/pyvenv.cfg      exit 0  Ignored=true
```

**K-2 判定：绿。** 三件放行，其他外部工具与 `.venv` 继续被挡。

## 4. K-3：image-only 阳性对照

### 4.1 自造配方与无文本层自验

源页：

```text
D:\Coinsides\v12.9-selection\samples\ielts-academic-reading-sample-tasks-2023.pdf
0-based page 0
```

PDF artifact 登记（仅执行一次，exit 0）：

```powershell
node container_tools/mark_artifact_operation_started.mjs --operation-kind create --expected-output-count 1 --output-format pdf
```

实际生成 payload（为便于复现按语句换行展示；使用现址解释器，输入与产物均在仓外）：

```python
import hashlib
import json
import os
from pathlib import Path
import importlib.metadata as md
import pypdfium2 as pdfium

root = Path(os.environ["PROBE_ROOT"])
source = Path(os.environ["SOURCE_PDF"])
png = root / "ielts-page-001-raster.png"
pdf = root / "ielts-page-001-image-only.pdf"
rendered = root / "ielts-page-001-image-only-render.png"

src = pdfium.PdfDocument(str(source))
page = src[0]
source_width, source_height = page.get_width(), page.get_height()
image = page.render(scale=2.0).to_pil().convert("RGB")
image.save(png, format="PNG")
image.save(pdf, format="PDF", resolution=144.0)
page.close()
src.close()

check = pdfium.PdfDocument(str(pdf))
check_page = check[0]
text_page = check_page.get_textpage()
extracted = text_page.get_text_range()
objects = [type(obj).__name__ for obj in check_page.get_objects()]
check_page.render(scale=1.5).to_pil().convert("RGB").save(rendered, format="PNG")
print(json.dumps({
    "pdf_pages": len(check),
    "page_object_types": objects,
    "pdfium_text_chars": len(extracted.strip()),
    "sha256": hashlib.sha256(pdf.read_bytes()).hexdigest(),
    "pdf_bytes": pdf.stat().st_size,
    "pypdfium2_version": md.version("pypdfium2"),
    "Pillow_version": md.version("Pillow"),
}))
```

实际调用外壳：

```powershell
$env:SOURCE_PDF = 'D:\Coinsides\v12.9-selection\samples\ielts-academic-reading-sample-tasks-2023.pdf'
$env:PROBE_ROOT = 'C:\Users\70208\AppData\Local\Temp\coincides-mineru-probe-20260829-012536'
& 'D:\Coinsides\v12.9-selection\tools\mineru\.venv\Scripts\python.exe' -B -c '<上方 payload>'
```

实际输出：

```json
{
  "pdf_pages": 1,
  "source_page_size_points": [595.3200073242188, 841.9199829101562],
  "output_page_size_points": [595.5, 842.0],
  "page_object_types": ["PdfImage"],
  "pdfium_text_chars": 0,
  "sha256": "503f2d8330d4568004df54409f92fc89cbd15051147a92ead441f0a45eaa9bb3",
  "pdf_bytes": 123516,
  "pypdfium2_version": "5.10.1",
  "Pillow_version": "12.3.0"
}
EXIT_CODE=0
```

最终 PDF 又被独立渲染成 PNG 并目检：标题、正文、页脚均清晰，零裁切/重叠/黑块。结构自验显示页对象只有 `PdfImage`，PDFium 页文本为 0，故不是带文本层原件冒充。

### 4.2 现役 `pdf-parse` 空证据

先走生产适配器本体（无 DB、无写库）：

```powershell
$env:PROBE_PDF = 'C:\Users\70208\AppData\Local\Temp\coincides-mineru-probe-20260829-012536\ielts-page-001-image-only.pdf'
Push-Location server
node --import tsx --input-type=module -e "import {basename} from 'node:path'; import {parseSourceArtifact} from './src/services/sourceArtifact.ts'; const p=process.env.PROBE_PDF; const a=await parseSourceArtifact({parser_key:'native-pdf',parser_version:'2.4.5',file_path:p,original_filename:basename(p),mime_type:'application/pdf'}); const chars=a.blocks.reduce((n,b)=>n+b.text.trim().length,0); console.log(JSON.stringify({page_count:a.metadata.page_count,block_count:a.blocks.length,text_chars:chars,blocks:a.blocks},null,2));"
Pop-Location
```

输出：

```json
{
  "page_count": 1,
  "block_count": 0,
  "text_chars": 0,
  "blocks": []
}
EXIT_CODE=0
```

底层 `PDFParse.getText()` 复核：

```text
document_text="\n\n-- 1 of 1 --\n\n"
document_trimmed_chars=12
page_text=""
page_trimmed_chars=0
EXIT_CODE=0
```

12 字只来自 `pdf-parse` 自动生成的页分隔符；真实页文本为 0。生产适配器正确过滤后为 0 块 / 0 字，故属于“空或近空”。

### 4.3 MinerU 非空证据与判读

MinerU 对**同一个 SHA-256 为 `503f…9bb3` 的 PDF**运行 §2.2 的 `pipeline + ocr` 调用：

```text
exit=0
pages=1
page_size=[595,842]
block_count=3
roles={title:1,text:2}
text_block_count_excluding_image_path=3
text_chars_excluding_image_path=500
markdown_chars=506
```

**K-3 判定：阳性对照成立。** `pdf-parse` 页内文本 0 + MinerU 真实文本 500；不是“两者皆空”的假绿。

## 5. K-4：冷 / 热时延与权重下载

口径：两次都在**同一个 Python 进程**，同一输入、同一 `backend="pipeline"`、同一 `parse_method="ocr"`、同一开关；只把输出写到不同的仓外目录。这样第二次复用了进程内模型 singleton，而不是另起进程只测磁盘缓存。

| 组 | 页数 | 总秒数 | 秒/页 | 块 / 文本字符 | 权重下载 |
|---|---:|---:|---:|---|---|
| 冷（首次成功模型调用，含模型初始化） | 1 | 13.175846 | 13.175846 | 3 / 500 | 未观察到，0 B |
| 热（紧接同进程第二次） | 1 | 6.151887 | 6.151887 | 3 / 500 | 未观察到，0 B |

冷态日志包含：

```text
DocAnalysis init, this may take some times......
DocAnalysis init done!
model init cost: 2.134260416030884
```

热态没有第二次 `DocAnalysis init`。权重仓前后量具：

| 时点 | 文件数 | 总字节 | latest_mtime_ns | 元数据集合变化 |
|---|---:|---:|---:|---|
| 冷前 | 16 | 1,082,446,549 | 1787896470816380200 | 基线 |
| 冷后 | 16 | 1,082,446,549 | 1787896470816380200 | 否 |
| 热后 | 16 | 1,082,446,549 | 1787896470816380200 | 否 |

日志逐项写的是 `Use configured local pipeline model path`，没有下载行；目录文件表、字节数和 mtime 元数据逐项相同，因此本单的**观测下载量为 0 B**。这里记录的是观测，不声称未来永不下载。

## 6. K-5：身份三元组与仓根可解析性

出生证三元组：

```json
{
  "transcriber_name": "mineru",
  "transcriber_version": "3.4.5",
  "transcriber_lockfile": "_external_tools/mineru/uv.lock"
}
```

实际命令：

```powershell
Resolve-Path -LiteralPath '_external_tools/mineru/uv.lock'
git ls-files --cached --others --exclude-standard -- `
  _external_tools/mineru/.python-version `
  _external_tools/mineru/pyproject.toml `
  _external_tools/mineru/uv.lock
```

输出：

```text
D:\Coinsides\v2.x\Coincides\_external_tools\mineru\uv.lock
_external_tools/mineru/.python-version
_external_tools/mineru/pyproject.toml
_external_tools/mineru/uv.lock
EXIT_CODE=0
```

**K-5 判定：绿。** 声明从仓根可解析，文件哈希可复核，Git 的“tracked + visible untracked candidates”视图认出三件且未被 ignore。补充诚实边界：本回执不替调度方 `git add`，所以交付尚未提交时，纯 tracked-only 的 `git ls-files --error-unmatch _external_tools/mineru/uv.lock` 返回 exit 1；这是当前 index 状态，不是路径或 ignore 失败。提交本交付后它会进入 tracked 集合。

## 7. K-6：现役版本与今日 dry-run 漂移版本

现役版本来自 K-1 安装元数据：

```text
Python 3.12.11
mineru 3.4.5
```

只在仓内副本目录运行，未在遗产现址运行：

```powershell
Set-Location D:\Coinsides\v2.x\Coincides\_external_tools\mineru
uv --version
uv lock --dry-run --upgrade-package mineru
uv lock --dry-run --upgrade-package mineru --refresh-package mineru
```

实际输出：

```text
uv 0.11.19 (7b2cff1c3 2026-06-03 x86_64-pc-windows-msvc)
Using CPython 3.12.11
Resolved 130 packages in 140ms
No lockfile changes detected
DRY_RUN_EXIT=0

Using CPython 3.12.11
Resolved 130 packages in 141ms
No lockfile changes detected
REFRESH_DRY_RUN_EXIT=0
UV_LOCK_UNCHANGED=True
```

强制刷新后仍无 lock diff；未变化 lock 的确切解：

```toml
name = "mineru"
version = "3.4.5"
source = { registry = "https://pypi.org/simple" }
```

**K-6 判定：今日 dry-run 漂移版本也是 `3.4.5`，与现役相同。** 这是“今日 registry 解未漂移”的直接证据，不把 `mineru[core]>=3.4.5` 的未来漂移风险写成已消失。dry-run 前后三副本 SHA-256 全部不变，没有安装，也没有生成 `.venv`。

## 8. 钉版三件逐字摘录

### `.python-version` 全文

```text
3.12
```

### `pyproject.toml` 的 `[project]` 块

```toml
[project]
name = "mineru-box"
version = "0.1.0"
description = "Add your description here"
readme = "README.md"
requires-python = ">=3.12"
dependencies = [
    "mineru[core]>=3.4.5",
]
```

### `uv.lock` 的 MinerU 三行

```toml
name = "mineru"
version = "3.4.5"
source = { registry = "https://pypi.org/simple" }
```

上述摘录来自入库副本；§3 已证明副本与现址逐字节一致。

## 9. 与工单假设不符、失败前置与机器边界

### `needs: claude`：现址 venv 没有 PyMuPDF

工单写“现址 venv 里的 PyMuPDF 可直接用”，实际第一条生成命令在创建文件前失败：

```text
ModuleNotFoundError: No module named 'fitz'
EXIT_CODE=1
```

没有安装、补包或改 lock。随后只读核验同一 venv 已有：

```text
{"pypdfium2":"5.10.1","Pillow":"12.3.0","pil_pdf_writer":true}
EXIT_CODE=0
```

于是用现有 `pypdfium2 + Pillow` 做完全同义的“源页渲染为位图 → 位图封成 PDF”；结构、文本层和视觉三重自验均通过。**请 Claude 决定后续工单是否把“PyMuPDF 在场”更正为“现有 PDFium + Pillow 路径”，不要把本次替代反写成遗产环境原本含 PyMuPDF。**

### 前置 runner 失败（如实保留，不计入冷热）

最初把 MinerU runner 从 stdin 送给 Python；Windows 子进程无法从 `<stdin>` 重载主模块：

```text
OSError: [Errno 22] Invalid argument: '...\<stdin>'
BrokenProcessPool('A process in the process pool was terminated abruptly ...')
RUN_RESULT: label=cold, exit=1, seconds=2.606485
```

该次在 PDF 渲染 worker 启动处失败，日志未出现 `DocAnalysis init`，没有有效模型推理，故不冒充 K-4 冷态。改为仓外真实脚本并加 `if __name__ == "__main__"` 后，首次成功调用才记为冷态；失败摘要仍保留在证据根。

### `needs: claude`：仓库总验证门与 INDEX 禁区冲突

按仓库 builder 红线实际运行：

```powershell
npm run verify:v2-bn8-runtime
```

在它之前，230 个 client 单测、工具面 registry / manifest / parity、server-shared 边界、Canvas / Source / Relation 契约、client + server build、Canvas performance smoke 均通过；随后链在这里 exit 1：

```text
> coincides@1.8.0 docs:check
> node scripts/docs-index.mjs --check && ...

过期: docs/agent-ops/INDEX.md
1 个 INDEX 过期。请运行: node scripts/docs-index.mjs
```

新报告带状态头，必然让递归索引识别到新条目；但本工单把 `docs/agent-ops/INDEX.md` 明列为零 diff 禁区，因此**不运行写模式、不越权修 INDEX，也不把总门写成全绿**。请 Claude 在调度层处理这一约束冲突。被短路的尾项已分别补跑：

```text
node scripts/docs-inventory.mjs --check            exit 0  最新
npm run check:glossary-shape-vs-capability         exit 0
git diff --check                                   exit 0（仅 CRLF warning）
npm run check:changed-file-secrets                 exit 0（8 changed files scanned）
```

### 边界与禁区核对

- 本单只成功处理同一份单页 PDF 两次；没有跑全卷、没有批量。
- 未观察到系统重启；无需登记重启时刻。
- 开工时 `server/src/routes/projections.ts` 已显示 status-only `M`；本单未读写该文件，收尾 `git diff --numstat -- server client docs/agent-ops/INDEX.md` 为空，故禁区**内容 diff 为零**。
- `client/**`、`docs/agent-ops/INDEX.md`、工单顶部状态行均未改。
- K-0 四哈希证明本单指定的遗产证据量具前后不变；未对 `D:/Coinsides/v12.9-selection/**` 写入。
- K 项停线点：**无**。PyMuPDF 假设不符与 stdin runner 失败都发生在输出创建/模型推理之前，且已有不改环境的等价路径；两者均已保留原始错误，不当绿处理。仓库总验证门另停在上述 INDEX 禁区冲突处，已标 `needs: claude`。
