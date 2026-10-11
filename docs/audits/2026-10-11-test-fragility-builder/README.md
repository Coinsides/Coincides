> **状态 (Status)**: active
> **性质**: builder 工作树交付证据；运行验证阻塞，未验收
> **日期**: 2026-10-11
> **工单**: [测试脆弱性两修单](../../agent-ops/handoffs/2026-10-11-v14-test-fragility-repair-order.md)

# 测试脆弱性两修：实现与验证记录

两处测试修改已落工作树；Node 启动被当前执行环境拒绝，**未完成验收，不能宣告 done**。无产品代码改动、无 git 写操作。

## 写点与静态复核

- `server/src/__tests__/v14CoverPage.test.ts`：在原路径上先 `mkdirSync(parentDirectory, { recursive: true })`，再 `mkdtempSync`；保留夹具数据库与断言。
- `client/src/pages/Courses/Courses.test.tsx`：共享本地假 now `new Date(2026, 7, 29, 16, 0, 0)`，复制后 `setHours(now.getHours() - 4)` 得同日 12:00，序列化为 `recent_note.updated_at`；假时钟使用同一个 now，保留 Today 断言。
- 时区推理：两个日期均按本地年月日构造，16−4=12 落在同一日内；UTC 偏移只改变 ISO 字符串中的 UTC 时点，解析后仍回到同日本地 12:00。这里按本地小时派生，不从固定 UTC 时点减毫秒；不需要改变系统时区或设置 TZ。
- 只读并行复核未发现问题；本地 `client/node_modules/typescript/lib/lib.es2015.core.d.ts` 的 DateConstructor 支持 `new Date(Date)`。此项为静态阅读，非 TypeScript 编译通过。
- `git --no-optional-locks diff --check` 返回 0；最终差异见 `changes.diff`。测试源码均为 LF，无 U+FFFD，详见 `static-inventory.json`。

## 测试数字与范围

| 侧 | 文件 | 静态声明数 | 实跑数 |
|---|---|---:|---:|
| server 目标 | `v14CoverPage.test.ts` | 8 | 0 |
| server 同目录邻接：卡片封面 | `v14CardCover.test.ts` | 4 | 0 |
| server 同目录邻接：装订设置 | `v14NoteBinding.test.ts` | 7 | 0 |
| client 目标 | `Courses.test.tsx` | 18 | 0 |
| client 同目录唯一邻接 | `CourseDetail.test.tsx` | 5 | 0 |
| 合计 | 5 文件 | 42 | 0 |

通过数 0，断言失败数未产生，跳过/取消数未产生；**测试进程没有启动，不能将此写成 0 失败即通过**。没有修前红测、修后绿测、删除父目录验收或 CST 运行证据。

环境恢复后仅运行以下定向范围（以下为待执行命令，非运行记录）：

```powershell
# cwd: server；既有 runner 隔离临时资产/源文件目录。
node ../scripts/run-server-test-suite.mjs src/__tests__/v14CoverPage.test.ts src/__tests__/v14CardCover.test.ts src/__tests__/v14NoteBinding.test.ts

# cwd: client；先把 COINCIDES_VALIDATION_ENV_DIR 指向仓内新建空目录，避免 Vite 加载 .env。
node node_modules/vitest/vitest.mjs run src/pages/Courses/Courses.test.tsx src/pages/Courses/CourseDetail.test.tsx
```

修 A 验收前须先核对现有 `.codex-tmp/a3-cover` 的归属并保留内容：当前并非工单所述空目录，而是含 18 个旧夹具子目录。可在仓内备份这些内容后移除空父目录，确认该路径不存在，再运行修 A 目标。现阶段没有移动或删除这些旧夹具，不能声称已做该验收。

按本单“定向、禁止全库马拉松”的明确范围，未运行 `npm run verify:v2-bn8-runtime`；不作全门通过声明。

## 环境申报

1. **默认文本编码**：Windows PowerShell 5.1 首次不带 `-Encoding UTF8` 读取中文文档出现乱码；显式 UTF-8 重读后正常。源码、工单回执及本证据按 UTF-8 写入；未改系统编码。
2. **检索工具**：`rg` 返回 `CommandNotFoundException`；改用 PowerShell `Get-ChildItem` / `Select-String`。仓库无 `.codegraph/`，按入口指令未调用或创建索引。
3. **运行时路径**：`node --version`、`npm --version` 均返回 `CommandNotFoundException`。PATH 包含 `C:\nvm4w\nodejs`；该符号链接指向 `C:\Users\henry\AppData\Local\nvm\v22.22.1`，目标 node.exe 文件元信息可读取。不将路径中的版本号冒充实际运行版本。
4. **访问/执行阻塞**：枚举 `C:\Users\henry\AppData\Local\nvm` 返回 Access denied；显式执行上述 node.exe 的 `--version` 和只读时区探针均返回 `Program 'node.exe' failed to run: Access is denied` / `NativeCommandFailed`。当前会话不允许提权；未更换启动通道、复制运行时、修改 ACL/PATH/权限配置或下载安装来绕开拒绝。具体是沙箱还是宿主 ACL 的根因未能进一步判定。需 HQ 在可执行 Node 的合规会话中接续定向验证。
5. **时区**：`Get-TimeZone` 实测 `China Standard Time`，UTC+08:00，无 DST，进程 TZ 未设置，符合工单要求；Node 自身时区探针因第 4 项未执行，故不作 Node 运行时确认或多时区验证声明。未改时区。
6. **父目录现状**：`.codex-tmp/a3-cover` 存在，含 18 个 `fixture-*` 子目录，各有 1 个条目，与“手建空目录”假设不同。只枚举目录元信息，未读取数据库内容，未删除或搬移。列表见 `environment-snapshot.json`。
7. **夹具现物差异**：工单病灶描述写笔记 12:00Z；源码的 `recent_note.updated_at` 实际是 13:00Z（course 自身 updated_at 是 12:00Z）。假 now 仍为 16:00Z；CST 下分别为 8/29 21:00 与 8/30 00:00，跨日病灶仍成立。
8. **既存工作树/依赖布局**：初始没有 tracked 文件修改；已有 `.claude/settings.local.json`、历史 audit 文件、根 `package-lock.json` 等未跟踪文件，均保留。根 `node_modules` 不存在，server/client 各自 `node_modules` 存在；未安装或更改依赖。
9. **本次操作失误，单列不归因环境故障**：静态统计初稿把 PowerShell `foreach` 语句直接接管道，产生 `EmptyPipeElement` 解析错误，未执行；改为先赋值再输出后成功。另一次猜测 `client/src/utils` 路径不存在；并行审查先按根 `node_modules/typescript` 读取失败，随后在实际 client 依赖目录确认声明。这些失败没有产品/测试副作用，均未被当作通过证据。

## 未做清单

- 未运行两目标及邻接测试，未执行修 A 无父目录验收，未宣告本机 CST 测试全绿。
- 未运行全库测试、完整 runtime gate、多时区测试、产品浏览器走查或主观验收。
- 未改产品代码、测试运行器、依赖锁文件、agent 指令/权限、系统设置或时区。
- 未进行 git add/commit/reset/checkout/stash/clean/push/PR/merge 等 git 写操作。
- 未读取 `.env` key 值、调用真实模型、接触用户数据库内容或生成凭据表单值。

工单 header 保持 `ready`，尾部追加本次 Result；待定向实跑与修 A 对照通过后，再补运行日志与数字并翻为 `done`。
