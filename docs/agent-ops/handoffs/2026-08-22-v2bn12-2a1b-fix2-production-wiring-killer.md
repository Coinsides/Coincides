> from: claude(fable,上将军直发——Opus 调度会话离线;授权:claude-log/2026-08-19.md 条目1 代理权) | to: codex(builder) | status: ready(Fable 本人翻牌;设计裁定:log 08-22 #7) | re: v2bn12-2a-1b-fix2 | date: 2026-08-22

# 12.2a-1b-fix2:生产接线 killer —— 生产 CLI 必须调用同一投影函数

## 定位

修正链第 3 轮(S1a 主单 FAIL 2H → fix 封住 H-2 与 H-1 逻辑层 → fix 复核 FAIL 1H)。**本单只封一个洞**:`2026-08-22-v2bn12-2a1b-fix-projection-and-freshness-killers.md` `## Review` 的 **HIGH-1**(F3):把 `renderManifest` 里对 `buildToolFaceManifest(entries)` 的调用删掉、内联一份同字段 mapper,`test:tool-face-manifest` 仍 5/5 绿、`check:tool-face-manifest` 仍绿。即:纯函数被 F1 保护了,**生产 CLI 是否仍调用它没有任何测试看着**(12.1 线教训:测逻辑≠测接线;复核 5-2 合取:复制体里加过滤,F1 不红、freshness 把残缺 manifest 当 fresh)。

其余全部**不许动**:F1/F2 已红绿;F4 seam 不构成平行机关;F5 未钉死 Windows;七门全绿;M1/M3/M5/M6/M7 指纹未变。

## 交付物(只这两项)

1. **可注入的单一编排入口**:`renderManifest(entries, projector = buildToolFaceManifest)`(或等价形状:生产默认值就是 `buildToolFaceManifest`,`runCli` 不传 projector)。**投影逻辑一字不改**,只加参数与默认值。
2. **生产接线 killer 测试**(加进 `scripts/generate-tool-face-manifest.test.ts`,进入既有 `test:tool-face-manifest`):用 spy projector 调用**生产编排**(`renderManifest`,不是直接调纯函数),断言 ①spy 被调用恰一次且收到同一 `entries`;②输出字节 = `JSON.stringify(spy 返回值)+'\n'`(即编排没有自己另算一份)。**必红判据(builder 前置自查,复核方终判)**:复刻 F3(删调用、内联 mapper、忽略 projector 参数)→ 该测试必须红在「projector 未被调用」断言;还原后 5/5+1 绿。
   - 可选加固(不强制):结构契约——生产源码里九字段 mapper 只出现一次。若做,须同样给先红后绿。

## 硬闸

- ⛔ 不改投影逻辑、不改 freshness 比较、不改 seam、不改 registry、不改 generated manifest、不接主链(`verify:v2-bn8-runtime` / `docs:check` 不许出现 tool-face/manifest/parity)。
- ⛔ 若发现必须改上述任一处才能写出 killer:**停手**,header 不动,回执写 `needs: claude` + 需要什么接缝、为什么。
- 回执按实码抄取 fixture 的 exposure(上轮 LOW-1:Result 把 `internal_probe=public`、`__reserved_probe=internal` 写错),不按条目名推断。

## 边界(触及面申报)

允许:`scripts/generate-tool-face-manifest.ts`(仅编排签名/默认参数)· `scripts/generate-tool-face-manifest.test.ts`。其余一律禁区。INDEX 已由调度方重生成并提交,**不要再动 docs/**。

## D 段(`adjudication §7`,含反面分则)

阴性断言前先让同一探针看见已知阳性;命中后先问「这个字符串是谁写进去的」。📌 共享树 `client/.../useNoteCanvasRuntimeController.ts` 有 EOL 假阳性 `.M`(blob 两端 `3efe5f8…`),不是越界,判真改用 `git diff --numstat`。

## 验证与回执

门禁(docs-first):`docs:check` → `verify:v2-bn8-runtime` → client/server `tsc --noEmit` → `test:unit` → server `test:tool-face-registry` → server `test:tool-face-manifest` → `check:tool-face-manifest`,逐门 exit code 入表。
回执 **UTF-8** 追加 `## Result` 于本文件末;含:F3 复刻的先红后绿两段输出(红在哪条断言)· 七门表 · `git diff --numstat` 对照本节边界 · 显式范围排除。**M-1**:mutation 终判归 reviewer,自查只作前置;**M-2**:header 保持 `ready`,不翻牌;不 commit、不 push、不碰 main。

## Result

> builder: Codex builder | date: 2026-08-22 | branch: `fable/v2-bn12-exoskeleton` | header 保持 `ready`，未翻牌

### 1. 实现

- `renderManifest(entries, projector = buildToolFaceManifest)` 现为可注入的单一生产编排入口；`runCli` 仍调用 `renderManifest(TOOL_REGISTRY)`，不传 projector，故生产默认值就是原 `buildToolFaceManifest`。
- 新增 `renderManifest delegates production projection to the injected projector`：手写 spy 先断言恰调用一次，再用 `strictEqual` 断言收到同一个 `projectionFixture` 引用，最后断言输出精确等于 `JSON.stringify(spyProjection, null, 2) + '\n'`。既有真实 npm spawn freshness 测试原样保留。
- 这不是平行 projector / 状态载体 / 守卫层 / 事务边界：只给既有生产编排函数增加测试接缝与默认参数；投影逻辑仍只有 `buildToolFaceManifest` 一份，生产默认仍走原正门。既有正门此前无法让测试观察“是否仍被调用”，这是增加接缝的唯一原因。

fixture exposure 按实码抄取如下，不按名字推断：

| fixture | exposure |
|---|---|
| `public_probe` | `public` |
| `internal_probe` | `public` |
| `test_probe` | `test` |
| `__reserved_probe` | `internal` |

### 2. F3 前置 mutation 自查（终判归 reviewer）

复刻方式：保留 `buildToolFaceManifest` 与全部测试不动；只让 `renderManifest` 忽略 projector 参数，内联同 duplicate-name guard、同九字段、同顺序 mapper。

**先红：**

```text
server npm.cmd run test:tool-face-manifest
exit 1
not ok - renderManifest delegates production projection to the injected projector
error: renderManifest must call the production projector exactly once
actual: 0
expected: 1
tests 6 / pass 5 / fail 1
```

红点是“生产编排未调用 projector”，不是输出字节不同，也不是函数 / import 不存在。同一 mutation 下，纯函数投影测试与真实 npm spawn 的 fresh / missing / stale 三个子测试仍绿，证明等价内联本身仍能生成自洽字节。

**还原后绿：**逆补丁恢复后，generator 工作树 blob 回到 mutation 前的 `d5ad8dd660d8fb7b76754e497ed7af0538e4c79c`。

```text
server npm.cmd run test:tool-face-manifest
exit 0
tests 6 / pass 6 / fail 0

root npm.cmd run check:tool-face-manifest
exit 0
tool-face manifest 未过期：1 条条目，其中 1 条 public。
```

### 3. 七门（docs-first）

| 顺序 | cwd / 命令 | exit | 收据 |
|---|---|---:|---|
| 1 | root `npm.cmd run docs:check` | 0 | INDEX / object inventory 最新 |
| 2 | root `npm.cmd run verify:v2-bn8-runtime` | 0 | 19 files / 209 unit；159 runtime-boundary；60 model-contract；双端 build、performance、docs、diff / secret scan 全过 |
| 3a | client `npm.cmd exec -- tsc --noEmit` | 0 | 无输出 |
| 3b | server `npm.cmd exec -- tsc --noEmit` | 0 | 无输出 |
| 4 | root `npm.cmd run test:unit` | 0 | 19 files / 209 tests |
| 5 | server `npm.cmd run test:tool-face-registry` | 0 | 3/3 |
| 6 | server `npm.cmd run test:tool-face-manifest` | 0 | 6/6（含新增 production-wiring killer 与既有真实 npm spawn） |
| 7 | root `npm.cmd run check:tool-face-manifest` | 0 | 1 条条目 / 1 条 public / 未过期 |

### 4. 触及面与显式排除

实现完成、写本回执前的 `git diff --numstat -- <两份允许文件>`：

| 路径 | numstat | 边界核对 |
|---|---:|---|
| `scripts/generate-tool-face-manifest.ts` | +5 / -2 | 仅导出既有编排函数、增加 projector 默认参数并调用它 |
| `scripts/generate-tool-face-manifest.test.ts` | +45 / -1 | 仅 import / 类型格式化与新增一条 spy killer；既有真实 npm spawn 测试未改 |

本 `## Result` 是工单要求的唯一 docs 写入，使用 UTF-8 追加，首行 header 未改。`git diff --check` exit 0；cached diff 空。

显式未触及：F1 的投影字段集合、顺序、duplicate guard 与纯函数测试；F2 freshness 比较；F4 双键 seam；registry；generated manifest；root / client / server package scripts；`docs:check` 与 `verify:v2-bn8-runtime` 主链接线；server/client 产品代码；schema / migration / DB；main。porcelain 所示 `client/.../useNoteCanvasRuntimeController.ts` 为已知 EOL/stat 假阳性：HEAD、index、clean-filtered worktree blob 均为 `3efe5f820e2077850611b54d4d09482845e89545`，该路径 `git diff --numstat` 为空。

未 commit、未 push。


## 附注(Opus 补,2026-08-22 收口时)

### A. 「同一形状第三次」对照表(自 `5524788` 补回)

> 本单曾有两份并发草稿:Opus `5524788`(16:38:45)与 Fable `172c60a`(16:38:55,覆盖并成为磁盘版本)。**内容同向,builder 读的是 Fable 版。** 下表只在 Opus 版中,**因其为模式级观察而非本单要求,故补为附注**,原文见 `git show 5524788`。

## ⭐ 这是同一形状的第三次,请当作模式而非孤例

| # | 出处 | 被保护的 | 未被保护的 |
|---|---|---|---|
| 1 | 12.1.3 复核 X3 | hook 内部逻辑(6/6 绿) | **root 的生产调用者可删,204/204 仍全绿** |
| 2 | 12.2a-1b 复核 M4 | freshness comparator 逻辑 | **生产比较分支可绕过,三门仍全绿** |
| 3 | **本轮 F3** | 投影纯函数逻辑(5/5 绿) | **生产 CLI 对它的调用可换成内联复制,5/5 仍全绿** |

> **三次的共同句式**:「**我们测了那段代码是对的,但没测那段代码还在被用。**」
> **写护栏时请默认问一句:如果有人保留这个函数、却不再调用它,哪条断言会红?**

---


### B. LOW-1 的残余:名实不符**未修**

回执已**按实码抄取** exposure(`internal_probe=public` / `__reserved_probe=internal`),满足「不按名字推断」这条纪律。

**但 fixture 本身的名实不符仍在**:一个叫 `internal_probe` 的条目其 exposure 是 `public`。**这是下一个读者的陷阱** —— 上一轮正是有人(调度方 Opus)按名字推断而写出了不实叙述。

**处置**:killer 强度不依赖名称(基数断言),故**不阻塞收口**;记为**清理项**,在 12.2a-1c 触及该文件时顺带对齐。**本单不改**,避免在收口前动测试文件。
