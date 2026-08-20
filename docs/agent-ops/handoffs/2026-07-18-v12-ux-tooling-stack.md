> from: claude | to: codex | status: ready | re: v12-ux-tooling-stack-install | date: 2026-07-18

# V12 体验侧工具栈 · 分类清单与安装单

## 背景与授权

V2.BN.11 已 engineering-complete,进入 V12 磨合期(调研供料 → 12.x 旅程段版本)。Henry 已拍:磨合期的 UX(Claude)与代码(Codex)高度依赖两个 agent 的品味,并引入外部工具辅助。本单来自 2026-07-18 的四路调研 + 逐仓核验(全档:`docs/agent-ops/analysis/2026-07-18-v12-ux-tooling-survey.md`),Henry 已过目并要求成单。

**本单双受众**:Henry(采购/拍板视角)+ Codex(照单安装视角)。Claude 侧与 Codex 侧各装一套,分工见每条的「装在哪」。

## 压倒性原则(先读)

1. **本产品的 token 与设计语法压倒一切外部默认。** 所有外部 skill 的 opinionated 规则(OKLCH、字体选择、禁令表)是佣兵,不是教义;与仓内既有决定冲突时,仓内赢。红线不变:Agent 能编辑的,人类必须 100% 能编辑。
2. **生成时/评审时分层,不混用**:taste 类 skill 作用于 Codex 施工时;design:*/audit 类作用于 Claude 评审时。同一轮里 Codex 不自审自过,评审仍归 Claude。
3. **公共设计词汇 = impeccable**:它同时发行 Claude Code 与 Codex CLI 版,两边都装,品味分歧用它的词汇表述后入总账,Henry 仲裁。
4. **版本一律 pin。** 这些仓库迭代很快(impeccable 8 个月发了 30+ 版),装完记录版本号,不追 main。

## 第一批:纯 skill,立即可装

### A. 生成时品味(装在 Codex 侧;Claude 侧只读不加载)

| # | 名称 | 仓库 | 用途 | 安装 |
|---|---|---|---|---|
| A1 | **impeccable**(skill 本体,pin v3.9.1) | `pbakaus/impeccable`(47.8k★,Apache-2.0) | 设计语言系统。**只用 product register**(标准="earned familiarity");七态齐全规则(default/hover/focus/active/disabled/loading/error 缺一=未完工)直接当施工验收线 | `npx impeccable install`(Codex CLI 包实存);先 `/impeccable init`;**跳过 brand register** |
| A2 | **redesign-existing-projects**(taste-skill 家族变体) | `Leonxlnx/taste-skill/skills/redesign-skill` | 既有应用的 Scan→Diagnose→Fix polish 轮;明文"不换栈、不破坏功能、每改必测" | `npx skills add https://github.com/Leonxlnx/taste-skill --skill "redesign-existing-projects"` |
| A3 | **emilkowalski/skills**(动效包) | `emilkowalski/skills`(17.3k★,Sonner/Vaul 作者) | 动效轴唯一覆盖者:时长带(按钮 100-160ms/dropdown 150-250ms/硬上限<300ms)、"UI 永不 ease-in"、scale 从 0.9 起。canvas 对象过渡/面板开合/拖拽反馈全用它 | `npx skills@latest add emilkowalski/skills`;⚠️ 只按**动效包**采纳(核验发现其宣传的排版规则仓内不存在) |

> ⚠️ **不装 Leonxlnx 旗舰 skill(design-taste-frontend)**:它明文只管 landing page、显式排除 editors/dashboards——排除的就是本产品。同理不装 anthropics frontend-design 整包(调性偏大胆,知识工具要安静;仅当词汇参考)。

### B. 机械闸——无 LLM 的确定性检查(两侧都装;进 verify/hook 链)

| # | 名称 | 用途 | 安装 |
|---|---|---|---|
| B1 | **impeccable detect**(46 规则检测器) | 静态扫 JSX/TSX/CSS 或活页;**挂 hook 在 UI 文件改动后自动跑**——设计层的 lint/契约脚本,与 `check:*` 家族同构 | 随 A1 附带;`npx impeccable detect client/src/`;hook 经 `.claude/settings.local.json` |
| B2 | **web-design-guidelines** | 100+ 规则机械审计(a11y/焦点/表单/动效/排版),**file:line 引用违规**;不开浏览器扫 client/src | `npx skills add vercel-labs/agent-skills`(只选 web-design-guidelines);注意运行时联网拉规则文档 |
| B3 | **axe-core** | WCAG 机械扫描 | 不装新服务:经 browser-harness 的 js() 注入 `axe.min.js` 即可;或 `npm i -D @axe-core/playwright` 随第二批;**跳过**付费 axe MCP 与社区 MCP 包装 |

> 已知盲区(三件共有):**只见 DOM/CSS,canvas 内绘制物不可见**。canvas 内容审美唯一覆盖者是 Claude 的 harness 截图循环。

### C. 一次性工具(Claude 侧跑一次,产物入库)

| # | 名称 | 用途 |
|---|---|---|
| C1 | **senlindesign/taste-skill**(238★,同名不同物) | `/taste <url>` 逆向参考站点 → Design Map(精确 token)+ Taste DNA(原则+trade-off)。对 Linear/Notion/Craft 各跑一次,产出成文参考文档,喂 A 组 skill 与 handoff spec。需 Playwright MCP(随第二批装后再跑亦可) |

### D. 评审时(Claude 侧已有,Codex 不装)

design:* 插件全家(design-critique/design-system/user-research/research-synthesis/ux-copy/accessibility-review)+ browser-harness(已在 `_external_tools/`)。分工:A 组给 Codex 施工,D 组给 Claude 审计,B 组两侧共用作机械闸。

## 第二批:运行时件,随 12.x 需要再装

| # | 名称 | 用途 | 触发时机 |
|---|---|---|---|
| E1 | **@playwright/test + toHaveScreenshot** | 视觉回归基线(harness 唯一真缺口:有截图无基线/diff/断言)。固定视口+种子数据+maxDiffPixelRatio 容差应对 canvas 抗锯齿 | 首个 12.x 旅程段收口前,由 Codex 搭架子 |
| E2 | **playwright-mcp**(microsoft 官方,35.2k★) | **Codex 的眼睛**(Codex 无内置浏览器);`--caps=testing` 把探索会话固化成定位器/断言。对 Claude ~70% 冗余,Claude 不常开 | 与 E1 同批 |
| E3 | **DevTools Recorder + @puppeteer/replay** | **Henry 亲手录制黄金流程**→可版本化 JSON→agents 重放+逐步截图。录制零安装(Chrome 内置) | Henry 首次长流程测试时开始录 |
| E4 | **chrome-devtools-mcp**(Google 官方,47.1k★) | 唯一不冗余件=性能 trace 自动洞察("拖 50 个对象卡在哪") | **缓装**:首次 canvas 卡顿排查时 |
| E5 | **ibelick/ui-skills → fixing-motion-performance** | compositor-only/layout-thrash 审计(canvas 顺滑的 CSS 侧) | 动效 polish 轮开始时;其 a11y 件与 D 组重复,不装 |

## 明确不装(有证据)

- **ui-ux-pro-max**(107k★):greenfield 风格选择器,虚火;与"已有设计语法"相反。仅可挖其 98 条 UX guidelines 当清单原料。
- **BackstopJS**(npm 停更于 2024-09)/ **lost-pixel**(仓库已归档 2026-04):死物,E1 全覆盖。
- **OneRedOak design-review**(2025-09 停更):抄其方法论(分阶段清单+原则文档为权威)进我们的评审流程,不装仓库。
- **Leonxlnx 旗舰 skill / frontend-design 整包**:见 A 组警告。

## 安装纪律

1. 浏览器类工具测试时用**独立 profile/窗口**,不碰 Henry 正开着的标签页;
2. 每装一件,在本单下方追记版本号与日期(pin 依据);
3. impeccable init 产生的 PRODUCT.md 若与仓内 `PRODUCT.md` 撞名,**放 `.impeccable/` 或改名隔离,不许覆盖仓内权威文档**;
4. 装完后 Codex 回执:装了什么版本、init 输出、detect 首跑对 client/src 的违规计数(作为磨合期基线数字,不要求先修)。

## 请 Codex 执行

1. 按 A(A1-A3)+ B(B1-B2)装 Codex 侧;B3 注入方式记入 agent_helpers 或脚本;
2. detect 首跑 client/src,回执违规计数与 top 类别(只记数,不修——修属 12.x 批次);
3. E1/E2 暂不装,等首个旅程段版本的 plan 点名;
4. 回执追加到本单,格式照旧(## Result)。

## 附:完整调研档案

`docs/agent-ops/analysis/2026-07-18-v12-ux-tooling-survey.md`(含每件的核验记录、star 数、活跃度、盲区与冗余判定)。
