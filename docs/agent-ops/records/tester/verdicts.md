> **状态 (Status)**: active（2026-11-07 Henry 拍板后生效）
> **层 (Layer)**: 记录 / Role Records（Tester 判语台账）
> **日期 (Updated)**: 2026-11-07
> **权威 (Authoritative)**: 否（回填初稿，Tester 核对后改为 active；判语的正本在各报告里，这里只放指针）

# 判语台账

> 回答：**哪单放行了、带什么尾巴、部署后核没核。**
> **规矩**：一次判语一行，行不删，只改「部署核对」列；判语的全文和条件都在报告里，这里只放指针。改判就在原行判语栏注明「更正」并指向更正那一节，不删原判。
> **单号** = 订单文件名去掉日期和 `-order.md`；一个订单文件里有几项的，按项分行。
> 下表是 2026-11-07 从现有报告回填的初稿（「个人学习讨论」会话只读回填），**Tester(1) 已于同日逐行对照报告核过**。改了四行的「部署核对」，以及编辑器组的「快照哈希清单」；每处都指向依据。

| 单号 | 项 | 判语 | 条件和尾巴（指针） | 依据（报告） | 快照哈希清单 | 部署核对 | 日期 |
|---|---|---|---|---|---|---|---|
| fidelity-1a2-docx-pages-snapshot | D1、D2、D4（D3 撤回） | 建议放行收割（T-P-6 待裁）；Main_Designer 裁定 D1 主路径、D2、D4 放行，D3 整件撤回 | 报告「收口结论（补丁轮）」；useChapterPresentation 红转修测试单 | `docs/audits/2026-11-04-fidelity-1a2-builder/review-tester.md` | —（这一单没留快照清单） | **部分已核（走人类操作链，没做哈希比对）**：第十七轮 `b7ebfb5b` 上岛后，round-04 报告的块 7 和第五节「docx 原页」把 D1 的导入、转换、原页全链走通了。D2 默认进原页，只在 V1 的复现路径里顺带见到；D4 没有单独复走。见 `docs/brainstorm/field-tests/round-04/2026-11-05-r04-report.md` | 2026-11-05 |
| a18-first-block-text-loss | A-18 | 中期报告，不是判语（并入编辑器组再判） | — | `docs/audits/2026-11-05-a18-builder/review-tester.md`（未入库） | `docs/audits/2026-11-05-a18-builder/tester-evidence/snapshot-hashes.txt` | 不适用 | 2026-11-05 |
| view-toggle-and-docx-text-formula | V1、F1、F2 | 原判放行；**更正**：F1 会静默写出错误公式，撤回，升为 F3 | 报告「判语」节 | `docs/audits/2026-11-05-toggle-formula-builder/review-tester.md` | `docs/audits/2026-11-05-toggle-formula-builder/tester-snapshot-hashes.txt` | **已核**：报告「九、上岛复核」，第十八轮 `51370281`，明细在 round-04 报告第九节。F1 是上岛后才被第十节更正的，由 F3、F3b 接替 | 2026-11-05 |
| view-toggle-and-docx-text-formula | F3 | 阻断当前版本，差一轮小修（F3b） | 报告「十一、F3 核验」 | 同上 | `docs/audits/2026-11-05-toggle-formula-builder/tester-f3-snapshot-hashes.txt` | **按止血版上线，我没单独复走**：第十九轮 `2c1fcd5d`，Main_Designer 在岛上抽查。我的建议是等 F3b，F3b 当天出不来才先止血，见报告第十一节「部署建议」。间接核到过一次：报告第十三节部署前那次，岛上第三语料的输出与本地 F3 基线 34/34 一致。已被 F3b 取代 | 2026-11-05 |
| view-toggle-and-docx-text-formula | F3b | 放行 | 报告「十二、F3b 核验」的「小尾巴（都不挡上线）」 | 同上 | `docs/audits/2026-11-05-toggle-formula-builder/tester-f3b/snapshot-hashes.txt` | **已核**：报告「十三、F3b 部署后岛上复走」，第二十轮 `412565b6`。部署前在仓库里、部署后在岛上，各做一次 16/16 哈希对账；公式导入和卡片页在岛上真服务器上复走 | 2026-11-07 |
| a19-a20-image-pages-and-idle-save | 编辑器组（A-18 残留、A-21、A-24） | 阻断，这一版不收割 | 七项放行条件：报告「零、判语」，加上订单尾部「编辑器组判语与返修裁定(Main_Designer 2026-11-07)」 | `docs/audits/2026-11-05-a21-builder/review-tester.md`（未入库） | `docs/audits/2026-11-05-a21-builder/tester-evidence/snapshot-hashes.txt`（HEAD `f7dd74ac` 加 15 个文件；11-07 从会话临时目录补进证据，未入库） | 不适用 | 2026-11-07 |
| a19-a20-image-pages-and-idle-save | V2（B-78、B-79、A-22） | 放行 | 三条小尾巴不挡上线：报告「判语」节 | `docs/audits/2026-11-06-v2-builder/review-tester.md` | `docs/audits/2026-11-06-v2-builder/tester/snapshot-hashes.txt` | **已核**：报告「部署后岛上复走」，第二十轮 `412565b6`。B-78、B-79 在岛上真包上的结果，与上岛前修后那次逐字段一致；唯一的不同是一次慢加载，与 V2 无关。注：`tester/` 下的 `island-*.rows.jsonl` 是上岛前「本地前端接岛上后端」的走查，不是部署核对；部署核对的证据在 `tester/island-postdeploy/` | 2026-11-07 |
| a19-a20-image-pages-and-idle-save | 编辑器组返修，最终包（纯 21 文件构建 `index-TKMm6sxh.js`） | **阻断，这一版不收割**；第二轮已派修 | 四条复现的红：K1/K2 退步、留字框重复、`od` 丢、提示条盖行；外加守恒闸缺边界断言。要保住的项和第二轮复测范围见报告「〇、返修验收判语」，明细在第十三节，补数在订单尾部「编辑器组返修第二轮 · Tester 补数」 | `docs/audits/2026-11-05-a21-builder/review-tester.md`（未入库） | 源码 `docs/audits/2026-11-05-a21-builder/tester-evidence/acceptance-2026-11-07/hashes/source-sha256-vs-9bc45e69.txt`；构建 `…/hashes/dist-editor-only-index-TKMm6sxh.sha256` | 不适用 | 2026-11-07 |
