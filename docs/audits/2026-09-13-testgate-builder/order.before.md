> **状态 (Status)**: ready(13.6 裁决半场执行单2,先行;Henry 2026-09-13 拍板"单2先行单1在后")
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-13
> **单号**: 13.6 · 单2 · 测试门修复(TD-22 置顶还款)
> **上游**: `analysis/2026-09-13-v13-6-adjudication.md`(裁决档,执行以其为准);tech-debt.md TD-22/TD-6/TD-21 行

# 单2 · 测试门修复:漏挂发现机关+24 文件接门

**背景**:69 个 server 测试文件中 24 个不被任何 npm script 引用——其中含 TD-6 的 killer(`v13AtomicTextSave`)、TD-21 的字素守护(`v13GraphemeTextRanges`)、TD-7 的退役闸(`v13CanvasRetirement`)。"一个绿的、没人跑的契约测试,和不存在的契约测试,在 CI 里是同一回事"(TD-22 原文)。本单先修网,单1(死码大单)随后动刀。

## 一 · 漏挂发现机关(新静态门)

1. 新脚本(如 `server/scripts/check-test-wiring.mjs` 或按仓惯例落位):扫描 server 测试目录全部 `*.test.ts`,与 package.json 全部 script 引用的文件列表比对;**存在未被任何 script 引用的测试文件即红**,输出漏挂清单;
2. 显式豁免机制:确需排除的文件走豁免清单(带理由注释),⛔静默跳过;
3. 接入 `verify:v2-bn8-runtime` 链(秒级);
4. **⛔改用 glob 跑测试**——"curated gate"语义维持,glob 改法候裁(TD-22 原文),本单只做"发现机关"。

## 二 · 24 漏挂文件接门

1. 以机关首跑输出为准,逐个核每个漏挂文件:①还测得到现物吗(被测物没死)②跑起来绿吗;
2. 绿且有效→接入 `test:v2`(或其所属既有分组 script);红→逐个诊断:陈旧(被测物已退役)→列入"候单1同批处置"清单⛔本单删;真红→停线举证;
3. 特别确认三件接门后绿:`v13AtomicTextSave`(TD-6 killer)、`v13GraphemeTextRanges`(TD-21 守护)、`v13CanvasRetirement`(TD-7 退役闸——注意单1 将拆桥,本单先接门,拆桥时该测试随单1 改写);
4. 接门后 server 全量跑一遍申报数字(14700F 姑息:如需降并发按既定节奏)。

## 三 · check:tech-debt-table 接总门

根 package.json 的 `check:tech-debt-table` 现不在 `verify:v2-bn8-runtime` 链——接入(秒级;三行历史豁免语义零动)。

## 四 · 禁区

⛔删任何测试文件(陈旧者列清单交单1);⛔改被测产品代码;⛔glob 化测试入口;⛔安全类测试;⛔碰 .git;⛔commit;⛔读 .env key 值;⛔用户库接触。registry/parity 等含安全语义断言的套件若在漏挂名单:**接门照做**(它们属既有回归套件,例行整跑不违例),⛔name-pattern 过滤子例,⛔为接门而修改其内容。

## 五 · 验收

1. 新机关:阳性对照(临时造一个未挂测试文件→红→删除→绿,证据留档)+接入 verify 链;
2. 24 文件处置台账:逐文件(接门 script/陈旧候单1/停线)三分类,零遗漏;
3. server 全量数字+typecheck/build 绿;`check:tech-debt-table` 在 verify 链内跑绿;
4. 证据落 `docs/audits/2026-09-13-testgate-builder/`(⛔构建产物)。

## 六 · 申报义务

Result 必含:交付清单+numstat、机关阳性对照证据、24 文件三分类台账、接门前后 script 对照、全量测试数字、未做项。冲突停线举证⛔自作主张。
