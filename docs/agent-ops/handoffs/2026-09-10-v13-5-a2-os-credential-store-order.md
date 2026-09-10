> **状态 (Status)**: done
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-10
> **上游**: 13.5 段 plan 草案波次 A(Henry 放行非门控先行);走查 9 在案(停车场 C:provider/key 设置产品化);Tauri 打包前置(凭据出 repo)
> **单号**: 13.5 · A2 · OS 凭据库(provider/key 设置产品化)

# 13.5 A2 · OS 凭据库

**使命**:provider key 的存储从 repo 内 `.env` 迁出到**应用数据目录**,Settings 统一管理入口(填/换/清/测试连接)。**真实迁移=Henry 亲手**:单收官后他在 Settings 亲填 key、亲点测试连接、自行删 `.env` 旧行——builder/HQ 全程零接触真实 key 值。

## 零 · 红线(⛔违者即停)

1. **⛔ 读取真实 `.env` 的值**(改动读取代码可以,打开读值不可以);⛔ 任何真实 key 值出现在代码/测试/日志/回执/HTTP 响应;
2. 测试全用**明显合成的假值**(如 `synthetic-key-not-real-...`);test-connection 的自动化验证用 mock HTTP,**⛔ 向真实 provider 端点外呼**(真外呼验证=Henry 亲点);
3. **⛔ 设计/新增安全类测试**(存储加密、攻击面、越权探测一概不做);存储定性申报即可:数据目录明文文件=与 `.env` 同级明文,仅改住址;加密升级候裁⛔本单;
4. ⛔ 用户库接触;⛔ key 进用户数据库表(库会被备份/迁移,凭据属机器本地)。

## 一 · 射程

1. **侦察现物先行申报**:现有 provider/key 读取链(`server/src/agent/providers/*`、`getProviderFromSettings`、settings 服务与 `.env` 消费点),各 provider 名录按现物;
2. **Server 存储**:应用数据目录(与现有应用数据/DB 目录同族,⛔ repo 路径内)独立凭据文件;读取优先级=**数据目录凭据 > 环境变量**(`.env` 保留为 fallback,⛔ 本单删除其支持——删旧行是 Henry 的手);
3. **API**:GET 状态(每 provider:有/无 key + 掩码尾 4 位,⛔ 回传完整值)/PUT 写入/DELETE 清除/POST test-connection(服务端最小请求,返回成功或可辨识错误类别,⛔ 透传 key);
4. **Client Settings**:Providers 区——输入框(存后掩码显示)、Test connection、Clear;沿 Settings 现有形制;⛔ 显示/回填存量明文;
5. 与 A1 的 Settings 面和平共处(A1 已收官入库)。

## 二 · 验证(单内纪律)

- typecheck + build 全绿;定向回归(Settings + agent/providers 既有测试)不破;
- 冒烟五条:①合成值 PUT→GET 掩码状态正确→新进程(临时数据目录)重读生效;②test-connection 走 mock HTTP,成功/失败类别可辨;③无数据目录凭据时环境变量 fallback(合成值)不破;④agent/providers 既有套件整跑不破;⑤DELETE 后回退 fallback 或"无 key"状态明确,UI 同步。

## 三 · Result 格式

`## Result`:现物侦察申报 + numstat + 五冒烟逐条 + 存储定性申报 + 未做 + 停线;**⛔ commit**;⛔ 读 .env 值;⛔ key 出境;⛔ 用户库接触;⛔ 安全类测试(既有套件整跑⛔过滤;凭据扫描留 HQ)。

## Result

2026-09-10 · Codex builder · 工程完成，待 HQ 复核与 Henry 真实迁移；`done` 不代表主观验收或放行。

### 现物侦察申报（先申报，后施工）

- 只读源码侦察：`agent/providers/index.ts` 的现有名录为 anthropic / openai / generic / deepseek / dashscope；Anthropic 使用 SDK，其余使用 OpenAI-compatible adapter。旧 `getProviderFromSettings` 先取 `ai_providers.*.api_key`，再对 Anthropic / DeepSeek / DashScope 取环境变量；OpenAI / Generic 旧实现无环境 fallback。
- Settings 旧入口通过 `users.settings` 保存并回填 AI 与 embedding key。独立消费点还包括 `documentParser` 的 Anthropic OCR、`organizedNoteProposals.hasAiKey`、Voyage embedding、DashScope embedding；本次一并接入机器凭据读取。Voyage 来自既有 embedding provider，管理名录因此为六项。
- `index.ts` 仍保留 `dotenv/config`；`db/init.ts` 现有 DB 路径来自显式参数 / `DB_PATH` / repo 内默认路径。未运行产品入口，未打开任何真实 `.env` 或用户数据库，未探查它们的值或实际位置。CodeGraph 的 `.codegraph/` 存在，但 CLI 不可用且未找到 MCP；`rg` 也不可用，改为限定源码目录的 PowerShell 查询。
- A1 的 `AgentMemoriesSection` 与 `/settings/agent-memories` 保留，初始工作区的其他未跟踪文件未改动。

### 已交付

- 独立 `provider-credentials.json`，路径选择为 `COINCIDES_APP_DATA_DIR` → 已配置且位于 repo 外的 `DB_PATH` 所在目录 → OS 应用数据目录。Windows 默认 `%LOCALAPPDATA%/Coincides`，macOS 默认 `~/Library/Application Support/Coincides`，Linux 默认 `$XDG_DATA_HOME/Coincides` 或 `~/.local/share/Coincides`。只计算 DB 路径，不打开 DB；拒绝 repo 内凭据目的地。
- 统一优先级为本机文件 > 环境变量；六 provider 分别支持 `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GENERIC_API_KEY` / `DEEPSEEK_API_KEY` / `DASHSCOPE_API_KEY` / `VOYAGE_API_KEY`。OpenAI / Generic 的环境 fallback 是本次补齐。每次读取重读文件，保存和清除后即时生效。
- `/api/settings/providers` GET 状态；`/:provider` PUT 保存、DELETE 清除；`/:provider/test-connection` POST 使用已保存凭据和当前 model/base URL。只返回有无、尾四位掩码、本机/环境来源、可清除状态；连接测试最小单请求、15 秒超时、固定错误类别，不转发上游正文。
- Settings 新增六 provider 的输入/替换/保存/Test connection/Clear；存量只显示掩码，输入始终从空草稿开始。清除后立即显示环境 fallback 或无 key；模型及 base URL 仍为普通 Settings 元数据，保留其他 provider 配置。
- 用户 Settings 类型和写入 schema 移除 key 字段；Settings、login/me、dev quick-login 的响应及后续 Settings 保存均去除旧凭据字段。运行消费链不再使用数据库内旧 key；没有迁移脚本或批量用户数据操作。

### numstat

代码与测试共 22 文件，`+1141 / -137`。已跟踪文件取 `git diff --numstat`；新文件取全文件行数、删除数 0。下表不含本回执（`+80 / -1`）和自动索引（`+2 / -1`），也不含忽略目录中的临时验证执行器/日志；合计 24 文件 `+1223 / -139`。

```text
+90   -0   client/src/pages/Settings/Settings.module.css
+54   -63  client/src/pages/Settings/Settings.tsx
+205  -0   client/src/pages/Settings/ProvidersSection.tsx
+120  -0   client/src/pages/Settings/ProvidersSection.test.tsx
+79   -0   client/src/pages/Settings/Settings.test.tsx
+7    -1   server/src/__tests__/v2DocumentParserPdf.test.ts
+2    -2   server/src/__tests__/v2ImprintEmbedding.test.ts
+202  -0   server/src/__tests__/providerCredentials.test.ts
+31   -20  server/src/agent/providers/index.test.ts
+2    -11  server/src/agent/providers/index.ts
+2    -1   server/src/dev/quickLogin.ts
+4    -2   server/src/embedding/dashscope.ts
+4    -3   server/src/embedding/index.ts
+3    -2   server/src/routes/auth.ts
+5    -2   server/src/routes/settings.ts
+66   -0   server/src/routes/providerCredentials.ts
+243  -0   server/src/services/providerCredentials.ts
+14   -0   server/src/services/publicSettings.ts
+4    -23  server/src/services/documentParser.ts
+2    -3   server/src/services/organizedNoteProposals.ts
+1    -2   server/src/validators/index.ts
+1    -2   shared/types/index.ts
```

### 五冒烟逐条

1. **PASS**：合成值经 PUT 保存，GET 返回预期尾四位及 local 状态；另起 Node 进程从同一 repo 外临时目录重读，状态与实际解析结果均生效。
2. **PASS**：六 provider 的 test-connection 均走 mock fetch，核对最小请求、默认模型、端点及自定义模型/URL。成功、缺 key、认证失败、限流、请求错误、provider 错误、网络和超时类别可辨。所有 provider HTTP 都为 mock，真实外呼 0。
3. **PASS**：无本机文件凭据时，六 provider 使用合成环境 fallback；本机值存在时覆盖环境值。既有 Anthropic / DeepSeek / DashScope fallback 回归保留。
4. **PASS**：`agent/providers/index.test.ts` 全部 **13/13**，未按测试名过滤或跳过；原 Settings key 用例改用临时本机凭据，全部明显合成，默认模型/URL 行为继续受既有用例覆盖。
5. **PASS**：DELETE 后分别验证环境 fallback 与无 key，两者 GET 一致；前端保存/替换/清除后状态和草稿同步，A1 与 provider 元数据保留的 Settings 集成测试通过。

### 验证记录

- 隔离：空 Vite envDir + 空合成 dotenv 文件；`COINCIDES_APP_DATA_DIR` 指向 repo 外临时目录；环境凭据先置空，测试仅赋明显合成值；`DB_PATH=:memory:`，资产目录隔离。既有测试只使用内存或临时合成库，无用户库接触。
- Server `tsc --noEmit` **PASS**；定向 Node 回归 **28/28、skip 0**（providers 13 + A2 5 + A1 1 + PDF 2 + embedding 7）。PDF 旧测试的合成 key 已从测试 Settings 行移到临时凭据文件。
- Client 全套 **89 文件 / 783 tests PASS**；随后新增最后一条 Settings 集成测试并完成最终定向复跑，Settings **3 文件 / 12 tests PASS**。最终 Client `tsc -b && vite build` **PASS**；Server build **PASS**。Vite 有现有大 chunk 提示，无构建错误。
- 按 `verify:v2-bn8-runtime` 顺序执行全部非扫描步骤：unit、tool-face registry/manifest/parity、runtime imports、canvas/gallery/groups/editor/source/lifecycle/freshness 检查、model contract、构建、performance 均通过。`git diff --check` 通过。首次 `docs:check` 发现已有 `docs/agent-ops/INDEX.md` 漏列本工单；自动生成补入 A2 done 行和总数，最终 `npm.cmd run docs:check` **PASS**（index + object inventory + glossary）。
- 执行记录：`.codex-tmp/a2-validation-results/`，临时执行器 `.codex-tmp/a2-validation.mjs`；均未加入版本控制。本单没有执行完整总门命令，因其最后一步是 HQ 保留的凭据扫描；不声称扫描通过。

### 存储定性申报

**应用数据目录中的独立明文文件，与 `.env` 同级明文，仅改住址。** 本单没有 OS Keychain/Credential Manager 接入，没有加密升级；不作更高安全等级声明。凭据为机器本地数据，不进入用户数据库表。

### 未做

- 未读真实 `.env` 值、未读取真实凭据文件、未接触用户库；未自动导入/迁移/删除旧 key 行。
- 未向真实 provider 外呼，未做真实连接验证或浏览器主观验收；新增测试只有本单功能冒烟，既有套件未过滤，未设计/新增安全类测试。
- 未做凭据扫描（留 HQ），未改 agent 操作指令或权限配置，未 stage/commit/push/PR/merge。
- Henry 后续亲自在 Settings 填 key、亲点 Test connection，并自行删 `.env` 旧行；这一步仍未发生，不以工程完成替代真实迁移。

### 停线

未触发红线停线。工程结果不包括真实迁移、主观放行和 HQ 凭据扫描；这些保留事项不能由本回执推定完成。
