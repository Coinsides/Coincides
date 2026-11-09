# A-20 r3d 验收（Tester(1)，2026-11-09）

> 对象：包 ops `packages/a20-idle-save-r3d/`，主 JS `index-DY5t0krb.js`（sha256 `2bd78e4f…1b1e5e`），基线 `04f6f822`，src 17 个文件，dist 63 个文件。
> 环境：本地后端（server = `04f6f822`），前端直接服务包里的 `dist/client`，或与它逐字节相同的冻结副本；修前对照是 `04f6f822` 等价构建。真 Chrome 走 CDP。没碰岛，没碰 Henry 的账号，没用真实模型，应用里的 Agent 0 条。
> **只测了 Chrome。** 本报告按 Main_Designer 11-09 的要求从简：r3d 已挡，全量验收移到 r3e。

## 〇、判语

**挡放行，原因 P1、P2。** 两条都由 Reviewer 读码提出，builder 读码证实，阳性对照在 r3d 真浏览器上红。r3e 接（Main_Designer 11-09 已开）。

### 比修前差的臂

1. **HEADCLOSE-applyslow（P1，① 丢字）**：r3d 红 2/2，修前绿 2/2。
   - 设置：同 HEADCLOSE，`aaa` 是关页时在途的那次保存，`bbb` 在它之后。重开约 0.6 秒内点 Apply，代理扣住 Apply 那次 PUT（请求没到服务器）约 2 秒。
   - r3d 两行一样，时刻按 Apply 的 PUT 发出算：
     - +636 毫秒：框的退避重试把 bbb 落进草稿，而且**立即**发出保存（没有等 2 秒空闲），`'warmup bbb|'` 得 200。
     - +2.0 秒放行，Apply 得 **409**，弹「Failed to save block」。
     - 之后服务器和屏上都是 `['warmup bbb','']`。回执库剩 1 条，不含 aaa；恢复项变成「A block edit is waiting for recovery warmup bbb」，给的是 bbb，不是 aaa。到 +13 秒都不变。**aaa 哪里都没有。**
   - 修前：没有框。Apply 扣 8 秒后放行，得 200，aaa 在服务器上；bbb 照旧丢（修前已知）。
   - 走的是 Reviewer 说的「409 支」，不是他预测的主线（Apply 200 → 不采纳 → 空闲保存覆盖），因为落地那次保存是立即发的。builder 读码确认两条路都从同一处缺口出发：Apply 在途时，这块的回执不在 HSC 等候的列表里。r3e 一并覆盖。
   - 没跑的变体：Apply 先到服务器、只把回应扣住。
2. **MENTER-close（P2，自动把错的内容写进正文）**：r3d 红 2/2（REWRITE），修前 2/2 是 LOST。
   - 设置：服务器 `['ab','cd']`。在途的那次保存是 `ab` 末尾打的 `x`：请求到了服务器（服务器 `['abx','cd']`），回应扣 60 秒。然后在 `cd` 行首退格合行，行尾回车，打 `Z`，关页。在途保存的回执文字等于服务器现文，按 N6 (a) 不拦，也就是 Reviewer 说的「没有回执拦着」。所以 P2 的预期形状是 `['abx','Z']`，不是 `['ab','Z']`。
   - r3d：关页时屏上 `['abxcd','Z']`。重开时应用自己发出 `PUT 'abx|Z'` 得 200，服务器和屏上都是 `['abx','Z']`。**服务器上的 `cd` 那一行被 Z 改写**，cd 只剩在框里的 `abxcd`（记录 `'' → 'abxcd'`）。提示「A previous block edit is queued for recovery」，没有 Apply。
   - 修前：服务器 `['abx','cd']` 原样，Z 丢，没有框。恢复项「A block edit is waiting for recovery abx cd」带 Apply（在途保存那条多余的回执，A-25 ②a 的形状）。

### 与修前一样（不挡）

- **HEADCLOSE-putback**（Main_Designer 11-09 加，×1）：重开后把 bbb 手动放回第一行，等它的保存（r3d 空闲保存，修前点外面封口）得 200，再按 Apply。
  - 两版都在这次保存时把回执库改写成只有 bbb 自己那一条，200 后又删掉。存储追踪：r3d 在 localStorage，修前在 sessionStorage。
  - 结果两版一样：aaa 的恢复项消失，Apply 点不到，没有 409，也没有「This draft is based on an older version」冲突项。**aaa 在两版上都丢了。**
  - 所以 Main_Designer 的预期（409 → 冲突项）在两版上都不成立。原因是一块只存一条回执，本人随后对同一块的保存会挤掉先前的回执。
  - **已裁 A-25 ②a (iv)，手册「已知」**（Main_Designer 11-09）：属 ⑤ 族，不进 r3e。修法方向：本次访问的保存不得顶掉别次挂载的回执；Apply 遇 409 时按锚点合并。r3e 手册「已知」加一句。此臂留作读数，分析器按读数打印，不计红。

## 一、同源

- 包内 `sha256sum -c`：src 17/17 OK，dist 63/63 OK。
- 自建：`git archive 04f6f822`（client、shared、scripts、docs/generated、package.json）加包里 17 个文件，`npx vite build`。产物 63/63 与 `dist.sha256` 一致，主 JS 逐字节相同（`hashes/tester-rebuild-dist-r3d.sha256`）。
- 提示文案核对（`scripts/check-a20m-oracle.mjs`）：LEFT_UNSAVED 与 SAVE_FAILURE 和判官一致，两条文案都在 `index-DY5t0krb.js` 里。
- 包的 dist 与我封包前冻结的 `dist-r3d-preseal2` 63/63 逐字节相同。所以下面封包前那一轮（5609）的读数就是这份 JS 的读数。

## 二、探针自证（封包前参照，主 JS 与封包相同）

参照轮 `runs/r3dps2-n`（`index-DY5t0krb.js`，5609）。对照是上一版封包前的 `runs/r3dps-n`（`index-DmN6Is1f.js`）。三个独立 Opus 读者对着原始 rows.jsonl 复核过，都判 MATCH。

- **heldhead 3/3，(乙) 在真机上跑了**：后退那一刻写下留住记录（+1 毫秒），+9 到 +11 毫秒由 `withdrawKeptEdit` 收回，早于路由在 +19 到 +20 毫秒踏回本篇。人留在 A 上，第二次离开 REFUSED。r3 上记录活约 1.6 秒，正是 N5 那个洞。
- **heldhead-undo**：撤销在扣留期间无效，屏上和服务器最后都是 `['warmup bbb','aaa']`。r3d 上记录在撤销键按下前约 650 毫秒就已收回，所以「窗口内撤销」造不出来，这是焦点盲区，照实写。分析器在 r3 和 r3d 上都读 0/3 红，原因相同：规则只看撤销有没有生效（`undoOk`），与记录活多久无关。**🅱 维持。**
- **heldback 1/1/1**：按原始数组的多重集重数，每行恰 1 条「Please retry」（+1614、+1633、+1625 毫秒）。r3 是 2/2/2（N3 必现）。
- **N6b 新部件：单测 + 此冒烟。**（笔记 A → B → A，×1，两份 JS 各一次，同形）
  - 切到 B 被扣到两次保存落地（6.8 秒）。A 的字一个都没到 B，B 仍是 `['warmup','bnote']`。
  - 回到 A：`['warmup bbb','aaa']`，各 1 份。没有恢复项，没有提示。
- **HEADCLOSE 5/5 合 Main_Designer 预期**（r3 和修前都是红）：
  - 重开时和 20 秒后再重开，aaa 都是「横幅加 Apply」，bbb 都在框里，服务器 `['warmup','']`。
  - Apply：aaa 先上服务器，bbb 约 4.4 秒后落地。Dismiss：bbb 落地，aaa 不写。
  - 新加的读数（`runs/hcsmoke`，只读不判）：
    - 重开时编辑器两个时刻都是 `['warmup','']`。
    - 提示是「A previous block edit is queued for recovery」（0.2 到 3 秒后消失）和「Not in the note yet Discard」（一直在）。
    - 点 Apply 后弹「Recovered block edit applied」，点 Dismiss 后弹「Block edit recovery dismissed」。

## 三、r3d 链（参照）

- r3 链 190 行（r2 链 153 行 + a20m BACKIN 与 LIST 37 行），在 r3d 封包上 5607 → 3607 照跑（05:16 到 06:43，占一位，单浏览器）。Main_Designer 令跑到 r3e 封包为止作参照；r3e 封包前已经跑完。
- **190/190 行，0 红，13 步的行数与 r3 逐步相同。** 分析器的逐臂注记与 r3 做了 diff（id 与数字归一化后），**16 个标签全部 0 行差异**（`diff-chain` 输出见 `gate/r3d-*.txt`）。
- OFFKILL 的 probe 自己记 ok:false，与修前、r1、r2、r3 相同，是参照臂，分析器读 0 红。
- 所以 r3d 对 r3 链全保。这个结果作 r3e 全保的参照。
- a20n 全量、9 对、第 10 对：没有在 r3d 上跑，移到 r3e。

## 四、Reviewer P3（`#/Notes/<id>`，只记读数）

- ADDR-noncanon 加两形：`case`（脚本改 hash，可扣）与 `caseaddr`（CDP 地址栏）。r3d 预期红，r3e 预期绿；在 r3d 上不进判语。各 ×1（`runs/case-r3d`、`runs/case-pre`）：
  - r3d 两形都红（P3 形）：人留在 A，放行 1 次，第二次离开 **STUCK**；扣留期间有 1 条留住记录；`backin words more` 在服务器上恰 1 份。
  - 修前两形也是 STUCK（修前不扣 hash 离开），而且 `backin words more` 丢了，服务器 `['warmup','']`。所以 r3d 在这一形上不比修前差。
  - 两形在 Chrome 里读数一样：同一文档内用 CDP 改地址栏也被当成可扣的离开（与 r3 报告第五节同）。

## 五、过程里我这边的问题（照实记）

- HEADCLOSE-putback 第一版的设置有误：修前没有空闲保存，手动放回的字没有发出保存（`runs/pbk-pre`，作废）。改成「3.5 秒内没有空闲保存就点外面封口」并记录下来，在 `runs/p12-pre` 重跑。
- 在 r3d 上，点 `warmup` 行末会点进覆盖在那一行上的框，所以探针改为直接给这一行设焦点，再打字（行里记作 `putHow: focus`）。
- 我之前对 heldhead-undo 分析器红的原因说错过（说成「规则按 r3 的 1.6 秒写」），三个 Opus 读者查出，已在第二节改正。

## 六、环境与证据

- 修前 5601 → 3601。r3d 封包前副本 5609 → 3605。r3d 封包 5607 → 3607（全新数据目录）。
- 锁位：每次跑都占一位，单浏览器，CPU 低于 40%。
- 目录：
  - `runs/`：r3dps-n、r3dps-n6b、r3dps2-n、hcsmoke、pbk-pre、pbk-r3d、p12-r3d、p12-pre，各自的 rows.jsonl。
  - `gate/`：分析器输出。
  - `hashes/`：我的重建清单。
  - `scripts/`：`a20n_arms.mjs`、`analyze-a20.mjs`。探针头含本机路径，不进仓。
