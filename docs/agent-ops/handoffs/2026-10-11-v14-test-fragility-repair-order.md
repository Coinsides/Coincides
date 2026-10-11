> **from**: claude(HQ Fable 会话)
> **to**: codex(builder)
> **status**: done(builder 实现+HQ 代验收口 2026-10-11——builder 沙箱内 node 执行被拒,实跑验证由 HQ 完成,见尾部 HQ 收口节;环境断骨另案候拍)
> **单号**: V14 · 测试脆弱性两修单(tech-debt 小单)
> **上游**: 云机迁移 T4 实测撞伤记录(两条均为测试侧缺陷,产品代码零涉);台账 §203 期间云机档案

# 测试脆弱性两修单(云机首单)

## 一 · 修 A:v14CoverPage 测试假定父目录已存在

- **病灶**:`server/src/__tests__/v14CoverPage.test.ts` 的 mkdtemp 假定 `.codex-tmp/a3-cover/` 父目录已存在(原机是 builder 残留目录,碰巧在);新克隆环境必 ENOENT。云机现状=手建了空目录绕过;
- **修法**:测试自建父目录(mkdir recursive 后再 mkdtemp),自给自足;
- **验收(阳性对照)**:删除手建的 `.codex-tmp/a3-cover` 空目录后测试仍绿——证明自给自足为真。

## 二 · 修 B:Courses 相对时间夹具跨时区翻车

- **病灶**:`client/src/pages/Courses/Courses.test.tsx`「K-1 renders relative time」夹具用绝对 UTC 时点(笔记 12:00Z/现在 16:00Z),在 UTC+8(本机=China Standard Time)跨午夜→渲染「Yesterday」断言失败;且本机 Node 不认 TZ 环境变量,无法用环境伪装时区;
- **修法**:夹具改为**相对于假「现在」的本地时间构造**(如 now-4h),使断言与机器时区无关;⛔为测试改机器时区(时区=Henry 的系统设置);
- **验收**:本机(CST)该文件全绿;构造逻辑在任意时区数学上不跨日(申报推理,不必多时区实跑)。

## 三 · 测试面(功能/回归,单内冒烟)

两个目标文件+各自所在目录的邻接文件定向;⛔全库马拉松(段收口归 HQ)。

## 四 · 纪律(照抄现役)

⛔一切 git 写操作(0.153+ 新常态:交工作树,commit 归 HQ);⛔读 .env key 值;⛔真实模型调用;⛔用户库接触;合成凭据表单值 ≤20 字符;措辞中性。证据落 `docs/audits/2026-10-11-test-fragility-builder/`,回执(status done+写点+测试数字+未做清单)追加本单尾部。

## 五 · 开工测试附加义务(本单特有)

本单兼任云机环境验证:施工中遇到**任何环境异常**(路径/行尾/时区/依赖/沙箱行为与工单假设不符)⛔静默绕过,一律在回执「环境申报」小节逐条记录——异常本身就是本单要采的货。

## 六 · 不在射程

产品代码一行不动;其余 tech-debt;时区/页面文件等系统设置。

## Result — 2026-10-11 · codex builder

**执行状态：两处实现已落工作树，运行验证受阻，未完成验收。header 保留 `ready`，本次不报 `done`。** 原因：当前执行环境拒绝启动已有 Node，连版本探针也返回 Access denied；没有可用于翻 done 的定向测试及修 A 对照证据。需 HQ 在可执行 Node 的合规会话中接续验证。

### 写点

- `server/src/__tests__/v14CoverPage.test.ts`：增加 `mkdirSync` 导入；原父路径先递归 mkdir，再 mkdtemp，保留原数据库夹具与断言。
- `client/src/pages/Courses/Courses.test.tsx`：本地固定假 now 为 2026-08-29 16:00；复制后按本地小时减 4 得同日 12:00，ISO 序列化给 recent note，假时钟复用 now。16−4=12 保持同一本地日历日，UTC 偏移只影响 ISO 表示；未改变 Today 断言或产品逻辑。
- 两处 diff 经只读并行复核，未发现问题；本地 TypeScript 声明确认支持 `new Date(Date)`。仅静态结论，非编译或实跑通过。

### 测试数字与证据

- 静态定向清单：server 目标 `v14CoverPage` 8 条 + 同目录 `v14CardCover` 4 条 + `v14NoteBinding` 7 条；client 目标 `Courses` 18 条 + 同目录 `CourseDetail` 5 条，共 **5 文件 / 42 条静态声明**。
- **实际测试执行 0 条、通过 0 条；测试进程未启动，未产生断言失败/skip/cancel 统计。** 未完成删除父目录后仍绿、CST 下 Courses 全绿两项验收，不把未执行写成全绿。
- `git --no-optional-locks diff --check` 已执行，退出码 0。
- [证据目录与完整记录](../../audits/2026-10-11-test-fragility-builder/README.md)：含 `changes.diff`、`static-inventory.json`、`environment-snapshot.json`、`diff-check.txt`；README 列明邻接选择、时区推理和待执行命令。

### 未做清单

- 未运行目标/邻接测试、修前红测、修 A 无父目录对照、多时区测试或产品走查；未作主观验收。
- 按本单禁止全库马拉松的范围，未运行全库及 `npm run verify:v2-bn8-runtime`，不作总门通过声明。
- 未改产品代码、测试运行器、依赖/锁文件、系统时区/页面文件/编码、agent 操作指令或权限配置。
- 无 git 写操作，无 commit/push/PR/merge；既存未跟踪文件保留，交工作树。
- 未读取 `.env` key 值、调用真实模型、读写用户库内容或生成合成凭据表单值；旧夹具目录没有移动或删除。

### 环境申报

1. **编码**：PowerShell 5.1 默认读取使中文显示乱码；显式 `-Encoding UTF8` 重读正常。回执/证据以 UTF-8 写入，未修改系统编码。
2. **检索**：`rg` 不在 PATH，报 `CommandNotFoundException`；改用 PowerShell 文件/文本检索。无 `.codegraph/`，未建索引。
3. **运行时定位**：`node`、`npm` 均报找不到命令。PATH 中 `C:\nvm4w\nodejs` 是指向 `C:\Users\henry\AppData\Local\nvm\v22.22.1` 的符号链接，node.exe 元信息可读；未声称已确认运行版本。
4. **执行阻塞**：枚举 nvm 父目录被拒；直接执行 node.exe 的 `--version` 与只读时区探针均报 `Access is denied` / `NativeCommandFailed`。沙箱/宿主 ACL 的具体根因未判定；本会话不允许提权，未通过替代启动通道、复制运行时或修改权限绕过。此项阻塞所有定向实跑。
5. **时区**：系统实测 `China Standard Time`、UTC+08:00、无 DST；进程 TZ 未设置，系统时区保持原状。Node 时区探针未执行，不冒充已验证 Node 内部时区。
6. **目录差异**：`.codex-tmp/a3-cover` 含 18 个 `fixture-*` 子目录，各有 1 个条目，并非手建空目录。只枚举元信息，未读数据库内容；在不能运行对照的情况下保留原状。待恢复执行环境后先保留这些内容，再验证父目录不存在时的目标测试。
7. **工单/现物差异**：工单写笔记 12:00Z，实际 recent note 为 13:00Z（course 自身 updated_at 为 12:00Z）；与 16:00Z 假 now 在 CST 跨午夜的病灶一致。
8. **工作树/依赖布局**：初始 tracked diff 为空，存在 `.claude/settings.local.json`、历史 audit 文件及根 `package-lock.json` 等既存未跟踪文件，未改动。根 node_modules 不存在，server/client 各自依赖目录存在；未安装依赖。
9. **操作失误单列**：静态统计初稿遇 PowerShell `EmptyPipeElement`，修正脚本写法后成功；猜测 `client/src/utils` 路径不存在；并行审查误按根 node_modules 查 TypeScript 声明，随后在 client/node_modules 读到。均非产品失败，也不作为环境根因；无执行/写入副作用。

**剩余收口条件**：恢复合规 Node 执行环境；完成修 A 父目录不存在对照，以及上述 5 文件定向实跑；追加真实数字与日志后再将 header 翻为 `done`。本次不提前翻牌。

## HQ 收口 — 2026-10-11 · Fable

- **修 A 实跑(阳性对照成立)**:HQ 先将 `.codex-tmp/a3-cover` 整体挪为 `.bak`(内含 18 个 T4 残留 fixture 子目录,原样保留),在**父目录不存在**状态下走正门 `run-server-test-suite.mjs` 跑三文件:**19/19 pass,0 fail,0 flaky-retries**(v14CoverPage 8+v14CardCover 4+v14NoteBinding 7,与 builder 静态清单逐数吻合);测试自建了新的 a3-cover——自给自足为真;
- **修 B 实跑**:client 定向 2 文件 **23/23 pass**(Courses 18+CourseDetail 5),本机=China Standard Time,原跨午夜红测已绿;
- **HQ 跑法勘误自报**:首跑误用 vitest 起服务端 node:test 文件得 "No test suite found",换正门运行器后得真数——服务端定向必须走 `run-server-test-suite.mjs`,⛔ vitest;
- **环境断骨(本单最大收获,另案候拍)**:builder 沙箱内无法执行 node(junction 与真实路径均 Access denied)——云机上 builder 暂为「实现+静态复核」形态,实跑验证由 HQ 代持;修法候 Henry 拍(系统级 node 安装/工作区内置 node/沙箱调权);
- 结论:两修验收通过,header 翻 done;builder 回执纪律(拒翻 done+九条环境申报)记正面先例。
