> **状态 (Status)**: active（builder 检查点；验收 blocked，非放行）
> **日期 (Updated)**: 2026-09-14
> **来源**: `docs/agent-ops/handoffs/2026-09-14-v14-knowledge-follows-version-order.md`
> **证据边界**: 本目录仅蒸馏件；原始命令、输出、基线和失败日志均在 `.codex-tmp/2026-09-14-knowledge-version-builder/`。

# 知识随版 builder 检查点

两件实现已落地并接线；新增定向、既有 prompt、agent 族和 client 全库通过。server 全量与文档门仍有下述阻塞，按工单「冲突停线举证」保留 `ready`，不写完成 Result，不标 `done`。

## 验收阻塞

| 项目 | 现场事实 | 处置与边界 |
|---|---|---|
| `v2SourceMineruWiring.test.ts` | 文件启动时 `spawnSync python.exe ENOENT`；测试的 Windows fixture 在模块顶层调用 PATH 上的 Python | 未修改既有测试或制造 skip，待运行环境提供可用 Python |
| `v2SourceRegionCells.test.ts` | 固定 `D:/Coinsides/v12.9-selection/tools/mineru/.venv/Scripts/python.exe` 退出 101，不能启动其基础 Python | 该 venv 的 `pyvenv.cfg` 指向 `C:/Users/70208/AppData/Roaming/uv/python/cpython-3.12.11-windows-x86_64-none`；目录枚举返回访问拒绝。未绕过权限、未安装依赖、未修外部 venv |
| `docs:check` | `docs/agent-ops/INDEX.md` 过期 | 未自行重写整库文档索引，交 HQ/steward 收口 |
| 文档门独立子检查 | `docs/generated/object-inventory.md` 过期 | `docs-index` 短路后单独执行 inventory 发现；glossary 子检查通过。未把短路伪报为后两项通过 |

全量首次另有一项由 builder 测试入口造成的失败：直接调用 runner 没有 `npm_execpath`，`v2TestV2ManifestHook.test.ts` T-1 失败。提供本机真实 npm CLI 路径后该文件 **2/2 通过**；这是测试入口修正，不是源代码修复。原始失败不覆盖，且未把两项环境失败消成绿色。

## 实现文件与接线

| 文件 | 改动 |
|---|---|
| `server/src/agent/capabilityProjection.ts` | 只读导入分类三集、现物定义和注册感知读器家族；分组名单与名称查询；复用完整性断言 |
| `server/src/agent/system-prompt.ts` | 名单转投影；其余工具名转现物查询，原操作文字与世界观保持 |
| `server/src/__tests__/v14AgentKnowledgeProjection.test.ts` | 8 条投影、现物覆盖、未知名称、新 reader 文案回退、上下字节护栏和整篇原文还原测试 |
| `scripts/check-agent-knowledge.ts` | 稳定指纹、状态头戳、差异解释、显式更新 CLI；普通 check 只读 |
| `scripts/check-agent-knowledge.test.ts` | 20 条（含 5 个来源子测试），隔离文件/子进程验证实际 CLI 门逻辑 |
| `docs/agent-ops/current-state/agent-knowledge-fingerprint.json` | 通过显式 `npm run check:agent-knowledge -- --update` 初始化 |
| 根 `package.json` | `check:agent-knowledge`、`test:agent-knowledge`、manifest check/copy 的 `pretest:agent-knowledge`；test/check 接入原 runtime 链非 git 段 |
| `server/package.json` | 新投影测试接入 `test:v2`，无孤儿测试 |

`pretest:agent-knowledge` 是独立复查发现并修正的生命周期接线：定义模块依赖已有 dist manifest，测试前沿用现有 check/copy 流程。check 本体不负责生成 manifest，也不自动更新指纹。

## 转投影段落对照

下列行号指开工基线 `system-prompt.ts`，便于与原文逐段核对。名称查询只生成现物名称；不能从现物找到的操作名会显式失败，不继续输出退休能力。

| 原段落 / 行号 | 转换与保留理由 |
|---|---|
| 感知能力 L35–38 | 成员由 `AGENT_READ_TOOLS ∩ READ_TOOLS ∩ toolDefinitions` 投影，四条用法原句保留。用法映射只是操作说明，不决定成员；新注册读器使用现物 description 回退 |
| Key Rules #2 L97 | 原七名 Container 枚举改为完整门内写集 10 名；个人任务条件、可撤收据句、生成批提案规则原文保留 |
| Key Rules #2 后新增一行 | 完整信道写集 2 名投影；放在门内写的收据规则之外，不给读器/信道写强加域写规则 |
| 两库 L32；分页 L39；记忆宣称 L48 | 名称改查询；材料库与 Source Library 的区别、分页/截断、成功保存条件均原字节保留 |
| Available Documents L75；Decks L84 | 名称改查询；全部条件分支、IDs 与刷新条件保留 |
| Key Rules L88、92、97–99、101 | 提案、个人任务、完成锚、关联原子性与记忆规则只替名称；提案类型等非工具事实不改 |
| Tool Efficiency L108 | 双查询引用改查询；同轮与刷新规则保留 |
| Study Planning L126、128、139、143、145、150、160、162 | 文档/排程/偏好/目标等引用改查询；参数、步骤、层级、用户选择和提案仪式保留 |
| Goal Breakdown L166、168；Rescheduling L173、175 | 引用改查询；用户决定、pending 条件、日期和提案结构保留 |
| Suggesting Next Topics L179 | 工具名查询；其余推理与建议规则保留 |
| Document Questions L184、187、188 | 搜索与读取名称查询；语义检索、页数阈值、简单问答与并行读取规则保留 |
| Card Generation L196、197、199 | 工具名查询；容器准备、提案路径、IDs 优先与卡片字段规则保留 |
| Task-Card Linkage L214、220 | 工具名查询；前置次序、关联可选与批准边界保留 |
| Identity、Constitution、仪式说明、能力边界、禁止事项、L1 及上述各段其余文字 | 保持手写；它们表达身份、意图、体验和边界，不属于工具成员名单 |

**范围申报**：感知节延续现有注册感知读器家族，目前 4 名；没有额外把所有 22 个 read 效果工具塞成新目录。全部 34 项 provider 工具的三分类均参与投影对象的覆盖校验和知识指纹。感知家族由注册现物选择，不靠 `read_` 前缀，也无手写成员 allowlist。

曾核算「新增全量 34 项目录」方案并暂停核对；独立复查确认这是 builder 自加范围，不是工单的必然要求，随后恢复较小范围施工。该方案未进入最终 prompt，也未用零变化段落扩大预算分母。

## 字节护栏与语义证据

计量 UTF-8 渲染字节，不是 TS 源文件大小，不是 provider token 账单。

| 量 | 字节 |
|---|---:|
| 原四 reader 用法（不含末尾换行） | 363 |
| 原 Container 枚举句（含末尾空格） | 156 |
| 基线：两片段加一个 LF | **520** |
| 新片段：reader + LF + door + LF + channel | **584** |
| 差值 | **+64 / +12.3077%** |
| 常驻断言范围 | **442–598**（ceil 85% / floor 115%） |

四 reader 原句 363 字节完全不变。将门内写名单换回旧句、移除新增信道行后，整个空上下文 prompt SHA256 回到开工基线 `44affa4b6d7a9aa940e450602900856c567af3ae43fda983b18c3a08820ff2af`。整体渲染 19151→19215 只作旁证，**不作护栏分母**。既有六组身份与动态上下文哈希检查继续通过。

## 指纹字段形状与门语义

```ts
{
  schemaVersion: 1,
  algorithm: 'sha256',
  hash: string,
  facts: {
    registryNames: string[],
    effects: { doorWrite: string[], channelWrite: string[], read: string[] },
    toolDefinitionNames: string[]
  },
  manual: { path: string, version: string, updated: string }
}
```

固定键顺序、数组集合去重并稳定排序，然后 SHA256(JSON facts)。五组均参加哈希，移组即使并集不变也漂移；description/schema 不在本单指纹范围。现物：registry 28、door 10、channel 2、read 22、definitions 34。当前哈希 `1b760ef2f84ce745d7e684f7ea99f458095ba2a0a5a29a0b93546d94204c5668`；manual 快照 `v1 / 2026-09-14`。

状态戳只读取首个标题前的 active 状态头，支持现存内联版本/日期及独立版本/日期头；正文中的版本/日期不算。版本或日期与快照有变化即可，未声称要求单调递增。漂移且旧戳红；新戳但旧指纹仍红并要求显式更新；普通 check 从不改对照物。坏 hash 拒绝覆盖；缺基线仅显式 update 可建立。

| 三态及加测 | 观察 |
|---|---|
| 合成注册名 `probe_new` 进入，旧说明书戳 | exit 1；明确报 TOOL_REGISTRY 进入 `probe_new`、退出无，提示补条目/申报无涉后更新指纹；对照文件字节未动 |
| 同时更新状态头版本/日期，显式 `--update` | exit 0；保存新事实 hash 及 `v2 / 2026-09-15` 快照 |
| 再次无漂移普通 check | exit 0；对照文件字节未动 |
| 旧戳直接 `--update` | exit 1，不允许洗白漂移 |
| 仅新戳、尚未显式 update | exit 1，要求显式更新，不自动改指纹 |

三态原始证据示例：`.codex-tmp/2026-09-14-knowledge-version-builder/gate/three-state-OlT3XJ/cli-1.log` 至 `cli-5.log`。均为隔离合成文件，未改真实注册表、分类器或说明书。

## 测试数字与执行边界

各行存在交叠，不能相加作为独立测试总数。

| 检查 | 结果 | 原始证据（均相对 raw 根） |
|---|---|---|
| 新增定向：知识门 + prompt 投影 | **28/28**，fail/skip 0 | `checks/knowledge-final.log` |
| prompt 投影 + 既有 prompt/context/SSE 套件 | **42/42**，其中既有 34、新增 8 | `checks/prompt-targeted.log` |
| agent 族，15 文件 | **274/274**，fail/skip 0，flaky retry 0 | `checks/agent-regression.log` |
| server 全量枚举，91 文件 | **927 项，924 pass / 3 fail**，skip 0，flaky retry 0；两项环境阻塞，另一个入口问题已单独修正 | `checks/server-all-files.txt`、`checks/server-all.log` |
| manifest hook 正确 npm 路径复跑 | **2/2** | `checks/manifest-hook-corrected.log` |
| client 全库 | **172 文件 / 1762 用例全部通过**，fail/skip 0 | `client/test-unit.log` |
| runtime 独立子任务 | **20/20 项通过**，含两端 build、registry 5、manifest 10、parity 10、174 boundary checks、60 model groups、5 performance 场景 | `runtime/results.json` 及各步日志 |
| runtime 整链口径 | 25 顶层项：20 子任务通过 + 本主代理 knowledge test 与已跑 client unit；docs 门红；git/secrets 两项留 HQ | 同上及 `checks/docs-check.log` |
| docs inventory / glossary 独立核查 | inventory 过期红；glossary 绿 | `checks/docs-inventory-check.log`、`checks/glossary-check.log` |
| 真实指纹初始化、最后普通 check | 两次均 exit 0 | `checks/knowledge-initialize.log`、`checks/knowledge-check-final.log` |

已有 Source Library 问答样张是确定性 provider stub + 实际 SSE/DB 持久化验证，**不是真实模型行为评测**。新测试使用 0 凭据/0 账号；合成名仅测试用，不注册产品新动词。初次门测试的 CJS/ESM runner 兼容失败已经修复，失败原始 `gate/test.log` 保留，后续正确测试通过。

## 未做项、保护面与续验

- 未扩大产品写权、未新增动词、未修改写门/仪式机关、未新增依赖、未调用真实模型、未扩评测集。
- 注册表、effectClassification、toolDefinitions、说明书正文与开工 SHA256 一致，原始对照在 `checks/protected-hashes-final.json`。说明书条目申报：**无涉**（无新增用户操作面）；仅新增机器指纹文件，未变更说明书戳。
- 未读写 `.git`，未执行 git/commit/push/PR/merge，未执行 secrets 扫描；收口留 HQ。
- 未修复或更换机器 Python / 仓外 MinerU venv，未绕过环境权限，未豁免失败测试；未批量刷新 HQ/steward 的生成文档。
- 续验需恢复可访问的 Python 与固定 MinerU runtime，收口两份生成文档后，使用正确 npm 环境跑 server 全量与 docs 门。通过后再将本检查点收束为工单 `## Result` 并改 `done`。
