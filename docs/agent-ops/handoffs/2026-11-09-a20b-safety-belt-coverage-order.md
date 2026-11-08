> **状态 (Status)**: active
> **层 (Layer)**: 交接 / Handoff(订单;本文件只放 A-20b,别单⛔追加)
> **日期 (Updated)**: 2026-11-09
> **权威 (Authoritative)**: 是(规格与裁定);判语归 Tester,发现归 Reviewer,裁定、收割、部署归 Main_Designer

# A-20b · 保险带覆盖缺口(Reviewer r3e Q2 / Q3 / Q4 / Q5;阶段一「写字不丢」A-20 的补单)

## 单卡(现行,覆盖写)

> 按 `operating-workflow.md` §6:验收臂先于施工;每单一文件;验过即上岛。本单**不挡 A-20 r3e**(四条都不比修前差、都是「没保住」不是「写错」),r3e 放行照常上第 23 轮;本单 = 第 24 轮,排 **A-25 ② 之前**(两条修法都小、都正中「写字不丢」)。

### 状态(Main_Designer)
- 2026-11-09 开单。底 = A-20 r3e 包(`index-Dkbj0u5K.js`,`<ops>/packages/a20-idle-save-r3e`)。builder 在**独立 scratch**(⛔ 混 A-25 文件)施工;A-25 之后换底到 A-20b。

### 规格(Main_Designer;来源 `reviewer-r3e/findings.md` + builder 读码答,行号对 r3e 包 `src/`,H = `hooks/useTextFlowHistory.ts`)
1. **Q2 多行粘贴首行片段不入账**(成立):`abc|def` 粘 `X⏎Y` 走 `TextBlockProjection.tsx:1508` `pasteTextIntoTextFlow`,首段保 tu-1 成 `abcX`、`Y` / `def` 新 id;`emitFlowChange` 无 edit → kind structural(:859–866);单元变多 → `isSplit` 真 → `unsentSplits`(H:693)。离开时 H:796 把 tu-1 的 cutText 记成组后文 `abcX`,H:815 起点 == 终点 → H:817 不留记录;X 两张账都不进,关页丢 X。**修**:cutText = **was(服务器 / 组前文)与组后文的公共前缀**——行中回车 `abcdef → abc` 仍得 `abc`;粘贴得 `abc` → edit 记录 `abc → abcX`,由 `mergeTypedText` 落地;选区替换 `abcdef → abX` 得 `ab`。动 H:796 + 一个小 helper。**副作用(接受)**:`abc → abcX` 落到服务器 `abcdef` 得 `abcXdef`,`def` 同时在框里作 split 记录 = 今日「回车后在前半末尾打字」同形(TD-66 族,手册「框里多一条后半」已覆盖),不丢。
2. **Q3 单元集合不变的 structural 组不入账**(窄化后成立;行内选中几个字打新字**不**在此列——textarea 自身选区塌到一个单元后 :729–733 清 flowSelection,打字走 :941–975 kind typing,plainTyping 真 → unsent):命中路 = 列表形单行粘贴(`- item`,:1499 跳过早返回 → `pasteTextIntoTextFlow` structural、单元集合可不变)、不允许标题时的单行 `# ` 粘贴(:1502–1505 `replaceFlowSelection`)、插行内链接(`NoteWritingSurfaceLayer.tsx:1618`)、接受 agent 补丁(`useNoteAgentHumanEditor.ts:53`);窗口 = 该组在队列里排在别的保存后面、persist 未起时关页。**修**:H:691 加一支——单元集合不变 + 文字变 ⇒ 也进 `unsent`(ends.before = 组前快照 = 起点)。`unsent` 的两处用法(交接删 H:174–178、空闲保存接管 H:696–699)不依赖 kind。**只改角色不改字**的组仍不留(与 Reviewer r3d P7 同节,TD)。
3. **Q4 谓词前导斜杠**:`#notes/<id>` 无前导 `/` 路由补 `/` 判本篇(router:278–279)、谓词判离开 → `released` 卡真;`#login` 同理。**修**:`hashRoutePath` 归一前导斜杠,与路由同。
4. **Q5 两条测试债**:(a) C:417–419(`??` 回退 + isVisitReceipt)加穿真 controller 的测试;(b) 谓词单测改成**对照路由逐形取值的表**(同一张表喂路由与谓词,差异即红)——「不变量只写一次」的测试版。
5. ⛔ 别的。⛔ 动 A-20 r3e 包。⛔ 动契约。

### 阳性对照(各一条,在 r3e 上红、A-20b 上绿)
- Q2:`abc|def` 粘 `X⏎Y`,上一保存在途,关页 → 重开:X 在 edit 记录里(`abc → abcX`)或已落地,`Y`、`def` 在框;r3e 上 X 无处。
- Q3:`- item` 粘进一行(或插链接),排在在途保存后,关页 → 重开:字在记录里;r3e 上无记录。
- Q4:`#notes/<id>` 不扣、`released` 0;r3e 上扣。
- Q5(a):断真 controller 把别次条目传到 HSC;(b) 表驱动。

### 验收(Tester;包 `a20b-belt-coverage`,报告 `docs/audits/2026-11-09-a20b-builder/tester/review-tester.md`,判语最前 + verdicts.md)
同源 → A-20 链 190 全保(对 r3e 判语链 diff)→ a20m 全部 → a20n 全臂(r3e 预期照旧)+ **新臂**:MULTIPASTE-close(修前 / r3e / A-20b,REPS=2:X 的去向)、LISTPASTE-close(`- item` 粘贴 + 在途保存 + 关页)、LINK-close(插链接同序;便宜才加)、`#notes/<id>` 两形 → 9 对 → 第 10 对。判语标准不变。

### Reviewer 小核(封后)
Q2 的公共前缀 helper 对三形(回车 / 粘贴 / 选区替换)各取什么;Q3 的新支与 plainTyping / isSplit / removesUnits 三支互斥完备(每个组恰入一张账或明确不入且理由);Q4 与路由逐形;Q5 表与路由同源。

### 收割与部署(Main_Designer)
copy-back → 收割(含 `docs/audits/2026-11-09-a20b-builder/`)→ 手册「已知」删 Q2 / Q3 那两句 → 告 Tester 版本 → 第 24 轮(前端 only)。
