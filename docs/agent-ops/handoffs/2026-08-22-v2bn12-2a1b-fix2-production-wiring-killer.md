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
