> **状态 (Status)**: done(HQ 收口补验通过,2026-09-14)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-14
> **单号**: V14 心智线 · 知识随版小单(自动跟版+义务跟版闸)
> **上游**: `analysis/2026-09-14-mr-zero-anatomy-and-redesign.md` §六(Henry 09-14"新组件他怎么知道"之问;资格闸判据="没有未登记的房间");同源公理:凡靠记忆保真的都会腐,凡与"使其失效的变更"物理挂钩的才活

# 知识随版小单

**性质**:两件套。①prompt 能力节改由权威源投影(手写工具清单必腐);②`check:agent-knowledge` 机械闸(知识欠账挡在门口⛔靠记性)。**评测跟版(第三层)⛔本单**,随评测集另批。

## 一 · 自动跟版:prompt 能力事实投影

1. **事实源**:`effectClassification.ts` 三封闭集(door/channel/read,针三已带完整性闸)+`toolDefinitions` 现物名单——system-prompt 中凡**逐个列举工具名**的片段改为构建时投影(分组:门内写动词/信道写/读器),⛔手写名单残留;
2. **世界观文字(为何存在/怎么体验/边界真话)⛔动**——那是义务跟版的领地,本单只换"名单类"事实;逐段申报哪些行由手写转投影、哪些保持手写及理由;
3. **token 预算护栏**:投影节字节数申报,相对现手写段的增减 ≤±15%(§150 砍下来的不许悄悄涨回去);断言锁字节上限进定向;
4. 行为回归:投影后 prompt 对既有 prompt 定向套件语义等价(边界问答行为抽测样张照旧过)。

## 二 · 义务跟版:`check:agent-knowledge` 闸

1. **指纹**:对(注册表导出工具名集+effectClassification 三集+暴露 toolDefinitions 名集)计算稳定哈希,存 `docs/agent-ops/current-state/agent-knowledge-fingerprint.json`(含 manual 版本戳快照);
2. **闸语义**:指纹漂移而 `app-operating-manual.md` 状态头版本/日期戳未动=红,输出人话(哪些名进/出+提示"补说明书条目或申报无涉后更新指纹");两者同步更新=绿;
3. 接入 runtime 非 git 门族(与既有 check:* 同法挂 package script);**阳性对照**:定向①合成注册新名→红且报名单差;②同步更新戳+指纹→绿;③无漂移→绿;
4. 指纹更新走显式命令(如 `check:agent-knowledge -- --update`),⛔闸自动改自己的对照物。

## 三 · 验收与禁区

1. 定向(投影内容/字节护栏/闸三态阳性对照)+prompt 既有套件+agent 族回归+server 全量+client 全库;
2. 证据落 `docs/audits/2026-09-14-knowledge-version-builder/`(只放蒸馏件,原始日志留 .codex-tmp);git/secrets HQ 收口;
3. ⛔碰注册表/写门/仪式机关;⛔新动词;⛔改说明书正文(闸只看戳,条目内容归 steward);⛔碰 .git;⛔commit;⛔新依赖;合成凭据 ≤20。Result:转投影段落对照表+指纹字段形状+闸三态证据+字节差+测试数字+未做项。冲突停线举证。

## Builder checkpoint — 2026-09-14（验收 blocked，状态保留 ready）

两件实现已落地并接线；尚未满足全量验收，按「冲突停线举证」不写完成 Result、不改 done。

- 投影局部 **520→584 UTF-8 字节，+12.3077%**，常驻上下限 442–598；世界观与其余规则原文还原哈希通过。感知保持注册读器家族（4），door/channel 完整集（10/2）；未额外新增全 34 工具目录。
- 知识门指纹覆盖 registry+三分类+definitions，显式 update 已初始化，三态与旧戳拒绝 update 已过。真实说明书戳/正文未动。
- 新定向 **28/28**；既有 prompt/context **34/34**；agent 族 **274/274**；client **172 文件 / 1762 用例通过**；runtime 子任务 **20/20 步通过**，两端 build 绿。
- **server 全量 91 文件：927 项，924 pass / 3 fail**。两项为 Python 环境（PATH 无 python.exe；固定 MinerU venv 无法启动其受限基础 Python）；另一个 builder 直接 runner 缺 npm_execpath 的问题已补正确环境，manifest hook **2/2 复跑通过**。未豁免环境失败。
- **docs 门未过**：`docs/agent-ops/INDEX.md`、`docs/generated/object-inventory.md` 过期；glossary 独立核查通过。未批量重写生成文档。
- 注册表、effectClassification、toolDefinitions、说明书 SHA256 与开工一致。未碰 `.git`，未 commit、未运行 secrets 检查、未加依赖或动机器权限。git/secrets 留 HQ。

段落对照表、指纹字段形状、三态证据、字节口径、逐项测试数字及未做项：[builder 蒸馏检查点](../../audits/2026-09-14-knowledge-version-builder/checkpoint.md)。原始日志：`.codex-tmp/2026-09-14-knowledge-version-builder/`。

**续验前提**：HQ 恢复可访问的 Python/固定 MinerU runtime，并收口两份生成文档；随后补跑 server 全量与 docs 门，验收满足后再写 `## Result` 并转 `done`。

## HQ 收口裁定(2026-09-14)

**检查点停线即此了结**:两阻塞项均按例归 HQ——①两 Python/MinerU 环境红:HQ 机全量 **758/758 全绿 EXIT 0(flaky-retries 0)**;②两份生成文档过期:HQ 用既有生成器再生(docs-index+docs-inventory),docs:check 全绿。闸在 HQ 机首跑 **PASS**(指纹 1b760ef2…/说明书 v1 2026-09-14 对齐),闸测 28/28。投影字节 +12.31% 在 ±15% 护栏内。状态改 done。义务跟版闸自此在 runtime 总门常驻——加工具不补说明书戳,commit 口见红。
