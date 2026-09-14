> **状态 (Status)**: ready
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
