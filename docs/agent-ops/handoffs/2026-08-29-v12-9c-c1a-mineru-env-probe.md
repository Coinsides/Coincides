> **状态 (Status)**: done(复核方 2026-08-29 亲刀四处通过;⚠️ K-6 措辞已收窄为「mineru 包未漂移」;⛔ 钉版三件本轮**未提交**,与 `.gitattributes` 推 c-1a-2 同批 —— 见文末复核批注)
> **from**: claude(opus,工程调度会话) · **to**: codex(builder) · **date**: 2026-08-29
> **裁定来源**: Fable 2026-08-29 四条裁定 · 段计划 `plans/v12-9c-segment-plan.md` · 初赛实录 `analysis/2026-08-28-v12-9a-trial-1-transcriber.md`

# c-1a:MinerU 环境体检(⭐ 这是**遗产体检**单,⛔ 不是安装单,⛔ 也不是重建单)

## 0. ⛔⛔ 先读这五句

> **① 环境不用装,它一直在。** 初赛那套 MinerU 完整存活于**仓外**的 `D:/Coinsides/v12.9-selection/tools/mineru/`,`.venv` 仍在。**它就是产出 12.9a 全卷证据与 187× 价格表的那一套。**
>
> **②(裁定)⛔ 不搬、⛔ 不重建、⛔ 不重解依赖。** c-1 期间**就用现址**。理由:重建现在**没有消费者**——形状先于能力,环境版同样适用。搬迁推迟到真有打包/部署需求时。
>
> **③ ⭐⭐ 现址是【证据本体】,不是工作区。** 本单对 `D:/Coinsides/v12.9-selection/**` **只读**。⛔ 探针**不许改写它一个字节** —— 包括不许让 `uv` 顺手更新那里的 `uv.lock` 或 `.venv`。
>
> **④ 沿用现物版本:Python **3.12** / `mineru` **3.4.5**。** ⛔ 不许改 `requires-python`,⛔ 不许升级。**证据连续性优先于版本整齐。**
>
> **⑤ 本单不碰任何生产码。** `server/**` 与 `client/**` **一行不改**,不写库,不产碎片流。映射是 c-1b 的活。

---

## 1. 目标

**只回答一个问题:那套产出过初赛证据的 MinerU 环境,今天还立得起来、还是不是同一套、会不会真的干活?**

并把**将来能复核它的凭据**(钉版三件)固化进仓。

## 2. 允许面(⛔ 只这些)

- `_external_tools/mineru/.python-version`(由现址**拷贝**,⛔ 不重写)
- `_external_tools/mineru/pyproject.toml`(同上)
- `_external_tools/mineru/uv.lock`(同上)
- `.gitignore`(⭐ 裁定 ③ 已放行:改 `_external_tools/*` + 反选,见 K-2)
- `docs/agent-ops/analysis/2026-08-29-v12-9c-c1a-mineru-env-probe.md`(**体检报告,本单的真正交付物**)
- 本工单的 `## Result` 段

⛔ **禁区(逐条零 diff)**:`server/**`、`client/**`、`docs/agent-ops/INDEX.md`、本工单顶部状态行(翻牌是调度方的活)、以及 **`D:/Coinsides/v12.9-selection/**`(只读证据本体)**。

## 3. 判据

> ⚠️ 探针单本无 killer,但**量具必须自证** ——「⛔ 量具没证明自己能报警之前,它的沉默不算证据」。K-1③ 与 K-3 就是这条的落实。

### ⭐ K-0 证据本体不受污染(⛔ 这一刀最优先,先摆后跑)

- **开跑前**先记下现址三件的哈希:`.python-version` / `pyproject.toml` / `uv.lock`,以及 `.venv/pyvenv.cfg`。
- **全部探针跑完后**再记一次。**四个哈希必须逐一不变。**
- **怎么做到**:⭐ **优先直接调用现址 venv 的解释器**(`D:/Coinsides/v12.9-selection/tools/mineru/.venv/Scripts/python.exe`),它**不碰 lock**。
  若非用 `uv` 不可,**必须带 `--frozen`**(⛔ 裸 `uv run` / `uv sync` 会重解并改写现址的 lock —— 那是**在证据上作案**)。
- **若任一哈希变了**:⛔ **立刻停线上报**,如实记「探针污染了证据本体、哪一步污染的」。⚠️ **不许自行从 git 恢复** —— 现址不在版本控制里,恢复不了,记录才是唯一价值。

### K-1 遗产体检三层法(⭐ 三层各防一种两义,⛔ 不许合并成一句「跑通了」)

1. **能立**:现址 venv 的解释器能起,`mineru` 可导入,`uv pip show mineru`(或等效)能取到版本。
2. **真跑了**:单页小 PDF 冒烟,产出**非空**块清单;记块数、role 分布、`page_size`。
   ⚠️ 「退出码 0」不算跑了 —— **必须看到非空输出**(两义性 #3:绿可能是根本没跑起来)。
3. ⭐ **会咬(阳性对照)**:见 K-3。

### ⭐ K-2 入库副本与现址原件**逐字节一致**(裁定 ③ 加的刀)

- 三件拷入 `_external_tools/mineru/` 后,**逐件与现址原件比哈希,必须全等**。
- ⛔ **不许"顺手整理"**:不改缩进、不改行尾、不删注释、不重新格式化。**改一个字节,入库的就是另一个谎言。**
- `.gitignore` 改法:`_external_tools/` → `_external_tools/*`,再反选三件所在路径。
  ⚠️ **gitignore 无法从被忽略的父目录里反选子文件** —— 必须先把父目录改成 `/*` 形式,否则 `!` 不生效。
- **自验**:改完跑 `git check-ignore -v` 逐件确认三件**未被忽略**,且 `_external_tools/browser-harness/` **仍被忽略**、`.venv` **仍被忽略**。
  ⭐ **这是本刀的反例半边** —— 只证明"三件进来了"不够,还要证明**没把别的也放进来**。

### ⭐ K-3 阳性对照:**自造一份真扫描件**(裁定 ⑤)

- ⛔ **不许拿有文本层的 PDF 冒充**。
- ✅ **自造**:取一页样题**渲染成位图**,再封成 **image-only PDF**(⚠️ **2026-08-29 更正(builder 实测,调度方复核确认)**:原文写的「依赖链带 PyMuPDF」是**调度方未查现物的断言,事实是错的** —— `PyMuPDF`/`fitz` **不在**现址 venv,`uv.lock` 里**零命中**。实际在场的是 **Pillow 12.3.0**,builder 用它完成了同义的「渲染位图再封 PDF」。⛔ 后续任何单**不得**反写为 PyMuPDF 原本在场;⛔ 产物落仓外临时目录,不入仓)。
  ⇒ 它**是**无文本层的原件,不是冒充。
- **自验(⭐ 这一步不能省)**:先用**现役 `pdf-parse`** 抽这份自造 PDF,**必须得空或近空**。
  ⇒ 若 `pdf-parse` 抽出了文本,**说明这份"扫描件"根本没造成功**(文本层还在),⛔ 此时不许拿它当对照,重造。
- **然后**用 MinerU 抽同一份,**应得非空文本**。
- ⚠️ **判读**:`pdf-parse` 空 + MinerU 非空 ⇒ 对照成立,MinerU 确在做真识别。
  **两者皆空 ⇒「MinerU 跑通了」是假绿** —— 它没在干活,只是没报错。**如实记,⛔ 不许粉饰。**

### K-4 时延**必须分冷热**(⛔ 不许只报一个数)

- **冷**:首次调用(含模型权重下载 / 首次加载)——单独记,并注明**是否发生权重下载、下载量**。
- **热**:紧接的第二次调用。
- 两者都记页数与总秒数,**换算成秒/页**。
- ⚠️ **187× 教训**:那张价格表的意义是「**第一份价格表**」——⛔ **先小样、先量,量完才谈批量**。
  **本单不许跑全卷、不许跑批量。**

### K-5 身份三元组当场验可解析性

- 记录将来要写进出生证的 `{transcriber_name, transcriber_version, transcriber_lockfile}` 三值。
- ⭐ **当场验**:`transcriber_lockfile` 指 `_external_tools/mineru/uv.lock`,**从仓根解析得到吗?`git ls-files` 认它吗?**
  ⇒ 这正是 K-2 的目的:**让这个字段成为可复核的声明**。
  ⚠️ 病名(与 TD-29「遮蔽」并族):**不可复核的声明比没有声明更危险。**

### ⭐ K-6 漂移风险的**直接目击**(证据,不是失败)

- `pyproject.toml` 写的是 `mineru[core]>=3.4.5` —— **下限,不是钉死**。
- 跑一次**只解析、⛔ 不落地安装**的 dry-run(如 `uv lock --dry-run` 或等效,**⛔ 必须在仓内副本目录跑,不许在现址跑**,否则违反 K-0),**如实记它今天会解出哪个版本**。
- ⚠️ **两者相同也照记**(说明今日 registry 尚未出新版)。**⛔ 这不是失败,这是风险的目击证据。**

### K-7 机器风控(此机在禁睿频诊断窗)

- **分小批跑,批间落盘** —— ⛔ 不许把结果只留在内存里等最后一起写。
- 若夜间发生重启:**重启本身是诊断数据,如实记**(几点、当时在跑什么、CPU 形态)。
- 遗产按既有家法:**无回执 = 未验证**。

## 4. 交付物

**一份体检报告** `docs/agent-ops/analysis/2026-08-29-v12-9c-c1a-mineru-env-probe.md`,含:

1. **K-0 的前后四个哈希**(⭐ 放最前面,它是其余一切的前提)
2. K-1 三层各层的**实况**(命令、退出码、实际输出片段),⛔ 不许只写结论
3. K-2 的三个哈希比对 + `git check-ignore -v` 的正反两组输出
4. K-3 的自造配方(**逐字可复现的命令/脚本**)+ `pdf-parse` 空证据 + MinerU 非空证据
5. K-4 的冷热两组时延表
6. K-5 的三元组 + 可解析性判定
7. K-6 的正版本与 dry-run 漂移版本
8. 钉版三件的逐字摘录(`.python-version` 全文、`pyproject.toml` 的 `[project]` 块、`uv.lock` 里 `mineru` 那三行)
9. 任何与本单假设不符之处 —— ⛔ **不要猜**,记下并标 `needs: claude`

## 5. 回执

> **⚠️ 第一件事:无论结果如何,退出前必须把回执写进本工单的 `## Result` 段;若预算紧张,先写 Result 再做别的。**

回执须含:K-0 四哈希判定、K-1 三层红绿实况、K-2 逐字节比对与 check-ignore 正反、K-3 对照成立与否(**含两者皆空的诚实判读**)、K-4 冷热两组、K-5 判定、K-6 两个版本号、以及**任何停线点**。
⛔ 不许翻本工单顶部状态行(那是调度方的活)。

## Result

**总判定：遗产环境可继续沿用。** Python `3.12.11` / MinerU `3.4.5` 能立且能对真正 image-only 单页执行 OCR；本单没有安装、升级、搬迁、全卷或批量运行。完整命令、输出和九节证据见 `../analysis/2026-08-29-v12-9c-c1a-mineru-env-probe.md`。

- **K-0 ✅ 四哈希逐一不变**：`.python-version` `7b55f8e6…7d16d`、`pyproject.toml` `253b88b0…8ba57`、`uv.lock` `67c4b42d…e231`、`.venv/pyvenv.cfg` `cb9ad065…07a6e`；前后全等，`K0_ALL_UNCHANGED=True`，证据本体未触发污染停线。
- **K-1 三层均绿**：①“能立”——现址解释器 exit 0，Python `3.12.11`，`mineru` 可导入且安装元数据为 `3.4.5`；②“真跑了”——单页 exit 0，`page_size=[595,842]`，3 块，roles=`{title:1,text:2}`，排除 `image_path` 后仍有 3 个文本块 / 500 字，Markdown 506 字；③“会咬”——见 K-3 阳性对照。
- **K-2 ✅ 逐字节与 ignore 正反均成立**：入库三件各自与现址 SHA-256、长度完全相同；`git check-ignore -q` 对三件均 exit 1（未忽略），对 `_external_tools/browser-harness/` 与 `_external_tools/mineru/.venv/pyvenv.cfg` 均 exit 0（仍忽略）。
- **K-3 ✅ 对照成立，不是两者皆空的假绿**：自造 PDF 为单页、仅一个 `PdfImage`、PDFium 文本 0；生产 `parseSourceArtifact/native-pdf@2.4.5` 得 0 blocks / 0 chars，底层 `pdf-parse` 只有自动页分隔符、页内文本 0；MinerU 对同一 SHA-256 `503f2d83…9bb3` 的 PDF 得 3 块 / 500 真实文本字符。
- **K-4 ✅ 冷热两组**：同一 Python 进程、同一单页、同一 `pipeline+ocr` 参数；冷 `13.175846 s`（`13.175846 s/页`），紧接热 `6.151887 s`（`6.151887 s/页`）。模型仓三次均为 16 文件 / `1,082,446,549` 字节且元数据集合不变，日志使用 configured local model path，观测权重下载 `0 B`。
- **K-5 ✅ 三元组可复核**：`{transcriber_name:"mineru", transcriber_version:"3.4.5", transcriber_lockfile:"_external_tools/mineru/uv.lock"}`；仓根 `Resolve-Path` 成功，`git ls-files --cached --others --exclude-standard` 精确认出三件。诚实边界：调度方尚未 `git add` 前，tracked-only `--error-unmatch` 仍 exit 1；本回执不越权改 index。
- **K-6 ✅ 今日未漂移**：现役版 `3.4.5`；在仓内副本目录执行 `uv lock --dry-run --upgrade-package mineru --refresh-package mineru`，exit 0、`No lockfile changes detected`，今日 dry-run 仍解 `3.4.5`。三副本 dry-run 前后哈希不变，没有安装或生成 `.venv`。
- **`needs: claude`**：工单假设“现址 venv 带 PyMuPDF”不成立，`import fitz` 实测 `ModuleNotFoundError`。本单未补包，改用同一 venv 已有的 `pypdfium2 5.10.1 + Pillow 12.3.0` 完成同义的“渲染位图再封 PDF”，结构/文本层/视觉自验均通过；请后续更正工单环境描述，不要反写为 PyMuPDF 原本在场。
- **失败前置如实保留**：stdin runner 因 Windows multiprocessing 无真实主模块路径而 `BrokenProcessPool`，发生在 `DocAnalysis init` 前，不计冷热；改为仓外真实脚本后两次成功。无系统重启。
- **验证门 `needs: claude`**：`npm run verify:v2-bn8-runtime` 在 230 个 client 单测、各契约、双 build 与 performance smoke 通过后，停于 `docs:check` 报 `docs/agent-ops/INDEX.md` 过期；该 INDEX 又被本工单明确列为零 diff 禁区，故未越权生成。被短路的 inventory / glossary / `git diff --check` / secret scan 已单跑且 exit 0。总门不冒充全绿。
- **K 项停线点：无。** `server/**`、`client/**`、`docs/agent-ops/INDEX.md` 收尾 `git diff --numstat` 为空；工单顶部状态行未改；遗产现址 K-0 四量具前后不变。仓库总验证门的 INDEX 冲突见上一条。

## 复核批注(claude 工程调度会话,2026-08-29,亲刀非读回执)

**总判定:通过。** 十项证据我逐条对过,亲刀四处,**一处措辞需收窄,两处如实记差**。

### ✅ 亲刀实况

| 刀 | 我做了什么 | 结果 |
|---|---|---|
| **K-0** | 用**派工前**自记的四个 md5(⛔ 非抄回执)复测现址 | 四个**逐一相等**;跑完 MinerU 两遍后再测,`uv.lock` 仍 `d05dd29…` |
| **K-2** | 三件副本 vs 现址逐字节 + ⭐ `git add -n _external_tools/` **枚举** | 三件全等;目录下 **208 个文件**,`add -n` 只输出**那三行** |
| **K-3 上半** | 自己用现役 `pdf-parse` 抽那份自造 PDF(sha256 `503f2d83…` 与回执同) | **去空白字符数 = 0** ⇒ 无文本层,自造成立、非冒充 |
| **K-3 下半** | 自己写脚本、用现址 venv 跑 MinerU 同一份文件,**跑两遍** | 两遍均 **3 块 / roles {title:1,text:2} / 494 字符**,样本 `IELTS Academic Reading` ⇒ **非空,阳性对照真成立** |

### ⚠️ 一处措辞收窄:K-6 的「今日未漂移」**只覆盖 mineru 这一个包**

回执与报告 §7 用的命令是 `uv lock --dry-run --upgrade-package mineru [--refresh-package mineru]` —— **包级**,不是环境级。结论却写成「今日 registry 解未漂移」,**从一个包推到了整个解**。

⭐ **复核方在副本上跑了环境级的那一问**(`uv lock --upgrade`,仓外副本,现址零触碰):
`mineru` **仍是 3.4.5**,但 **`uv.lock` 441341 → 441757 字节、md5 变**,五个**传递依赖**漂了 —— `modelscope-hub 0.2.0→0.3.0`、`pydantic 2.13.4→2.13.5`、`pydantic-core`、`typer`、`wcwidth`。

⇒ **改判措辞**:**「mineru 包今日未漂移」成立;「环境今日未漂移」⛔ 不成立。**
⇒ ⚠️ **这一条在 v0.7.2 之后是要害**:身份 = **lockfile 原始字节指纹**,而指纹**已经会变**。「顶层版本号没动」正是那条法要防的假安心 —— **同名不同物**。
📌 ⛔ 不是 builder 的错:工单 K-6 只写了「记它今天会解出哪个版本」,**是发单方把问题问窄了**。归发单方账。

### ⚠️ 两处如实记差

1. **字符数 494(复核方) vs 500(回执)**。已排除 OCR 不确定 —— 我**两个独立进程各跑一遍都是 494**,稳定复现。⇒ 差异在**计数口径**(回执另记 `markdown_chars=506`,可见口径本就多套)。**K-3 的判定(非空 vs 零)不受影响。**
   ⭐ **教训入档**:**一个数字要能被复核,必须连同【计数口径】一起申报。** 回执给了数没给规则,独立重数就对不上。⚠️ 这在 c-1b 会变成硬伤 —— 那时碎片计数要进**对账等式**。
2. **「冷」不是真冷**。K-4 记 `冷 13.18s / 热 6.15s`,但同时证明**权重下载 0 B**(模型仓三次均 16 文件 / 1,082,446,549 字节不变)⇒ **权重早就在盘上**。**首次真冷启(含约 1 GB 下载)的代价本单没有测到**,⛔ 别把 13.18s 当作全新机器上的首次成本。

### 📌 处置

- **`needs: claude` 之一(PyMuPDF)**:已核实 —— `fitz` 不在 venv、`uv.lock` 零命中,**builder 对、发单方错**。工单 K-3 已更正,并写明 ⛔ 后续不得反写为原本在场。**记 builder 一功**:它没沉默绕过,而是指着发单方的错要求更正。
- **`needs: claude` 之二(`docs:check` 报 INDEX 过期)**:处置正确 —— INDEX 是本单禁区,**⛔ 不该由 builder 生成**,且它**拒绝把总门冒充全绿**。INDEX 由调度方在收口时重生成。
- **⛔ 钉版三件本轮【不提交】**:本仓 `core.autocrlf=true` 且仓根无 `.gitattributes`,实测三件走一次 git 往返后 `uv.lock` **441341 → 443957** 字节 ⇒ 入库副本与证据本体的**原始字节指纹必不相等**,v0.7.2 的同一性判据会**每次 checkout 产一个假阴性**。⇒ 三件与 `.gitattributes` 推到 **c-1a-2** 同批提交。**本轮只提交体检报告与 `.gitignore`。**
