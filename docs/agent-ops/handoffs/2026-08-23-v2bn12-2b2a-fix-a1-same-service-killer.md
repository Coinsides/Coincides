> from: claude(fable,上将军代发——Opus 调度会话阻塞;授权:claude-log/2026-08-19.md 条目1 代理权) | to: codex(builder) | status: ready(Fable 本人翻牌;上游:b-2a Review FAIL(方向成立)0B/0H/1M) | re: v2bn12-2b-2a-fix | date: 2026-08-23

# 12.2b-2a-fix:A-1「route 调用同一 listNotes」killer 补强(只写测试)

## 定位
b-2a 主单 `2026-08-23-v2bn12-2b2a-human-trash-restore-doors.md` 复核唯一 MED(R5):`server/src/__tests__/v2NotesListService.test.ts` 的 A-1 断言被收窄为 regex「同一 import 含 listNotes」,**无法证明 route 调用的是 `../services/notes` 的 canonical export**——reviewer 反例:canonical 以别名 import 保留 token,另建复制模块二次 import 本地名 `listNotes` 供 route 调用 → tsc 0、专项仍绿。产品侧全部 PASS,本单**只写测试**。

## 交付物(单项)
把 A-1 改成**承重**的「同一 service」killer,二选一(builder 按可行性选,回执写明理由):
- **(A) 行为法**:用 node:test 的 `mock.module`(或等价)把 `../services/notes.js` 的 `listNotes` 替换为 spy,真实启动 route 发 `GET /api/notes`,断言 spy 被调用恰一次且收到 `{ userId, courseId, status }`;复制模块/别名二次 import 下 spy 不会被调用 → 红。
- **(B) 结构法**:静态解析 `routes/notes.ts`:①对 `listNotes` 的 import 恰一处且 source 解析为 `../services/notes`(路径规范化后与 `services/notes.ts` 同文件);②除该 import 外源码中不得出现第二个 `listNotes` 绑定(含别名、二次 import、本地函数);③GET handler 体内调用的标识符解析到该 import。三条任一不满足即红。
必红判据(builder 前置自查,终判归 reviewer):复刻 reviewer 的 R5 反例(canonical 别名 + 复制模块二次 import)→ 新 A-1 红;还原后绿;原有 S1a 的 M1a(route 改 `res.json([])`)仍红。

## 硬闸
⛔ 不改产品代码(`routes/notes.ts`、`services/notes.ts` 零 diff);不改其他测试;不改 b-1/b-2a 已复核的 killer;不新增依赖。无法在测试内兑现 → 停手 `needs: claude`。

## 边界(触及面申报)
允许:`server/src/__tests__/v2NotesListService.test.ts`(仅 A-1 及其 helper)· 如需 `server/package.json` 测试脚本。其余禁区。

## D 段 + 锁纪律
阴性断言前先让同一探针看见已知阳性;命中后先问「这个字符串是谁写进去的」。📌 共享树两处 porcelain `.M` 为 EOL 假阳性。`.codex-tmp/builder.lock.d` 非你所有,只读确认。

## 验证与回执
门禁 docs-first:`docs:check` → `verify:v2-bn8-runtime` → client/server `tsc --noEmit` → `test:unit` → server `test:v2`(隔离资产目录)→ `v2NotesListService` 单跑。回执 **UTF-8** 追加 `## Result`(不需确认):R5 反例复刻红 + 还原绿两段输出、M1a 仍红、`git diff --numstat` 产品码为 0;header 保持 `ready`;不 commit、不 push、不碰 main、不碰锁。
