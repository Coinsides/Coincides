> **状态 (Status)**: active(研究简报,样式三档① 施工依据)
> **层 (Layer)**: 分析 / 外部协同
> **日期 (Updated)**: 2026-08-29
> **权威 (Authoritative)**: 是(OpenDesign 协同方式以本文为准);上游:external-candidate-registry OD 条目(08-18 核)
> **来源**: Fable 委派研究员实读现网(GitHub nexu-io/open-design 0.21.0),⛔ 非训练知识

# OpenDesign 协同简报(样式三档① × OD)

**一句话总判**:OD 的三件套包格式(manifest v1 schema + tokens.css 真源 + DESIGN.md 散文)与我们「token 闭集作为资产」裁定**天然同构,喂进去成本极低**(一段导出脚本);但其运行时是 prompt 行为非 schema 强制,**且 DS 3.0 结构化运行时已于 0.20.0 整体回滚**(0.19.2 引入,连 CLI/API 一起撤)——**协同价值全在「资产格式互认」,一切「行为保证」必须由我们的导入闸自持**。

## 事实要点(出处见会话档研究简报全文)

1. **包三件套**:`manifest.json`(schema 强制 `od-design-system-project/v1`)+ `DESIGN.md`(散文软约束,连标题名都不规定)+ `tokens.css`(机器侧唯一真源,`:root` 单块无前缀语义命名)。自定义包放 `user-design-systems/`。
2. **⚠️ DS 3.0 已回滚**:现行 0.21.x 的硬化程度 = manifest schema + 仓库 CI 守卫;运行时消费 = 把 DESIGN.md/tokens.css 塞给 agent 读。⛔ 不对 3.0 建任何依赖(重做落地且稳 ≥2 release 前不接)。
3. **吐回物**:project 文件夹(HTML/CSS/JSX),我们只取其中 tokens.css;⛔ 渲染件永不进管线(登记册旧判维持)。
4. **接口**:首选**文件系统直读**(零耦合);MCP 仅可选且只用读工具(write 面无鉴权);Windows CLI 有在案毛边(#4852/#4648)。
5. **版本节奏**:8 月 8 个 release、大特性一周撤回 ⇒ 适配器隔离 + 锁版本,⛔ 不追新。

## 施工顺序(样式三档① 定案)

1. **先自建(主权件)**:①五类闭集本体(强调色/块边框/背景/排版档/疏密——枚举 + 语义变量名单,我们仓库为唯一真源);②**导入闸**五条:只收 token 文件 / 名单闸(未知 token 名整体拒收)/ 值域闸(自由值量化或拒,⛔ 不落地)/ WCAG AA 对比度守卫 / 溯源戳(OD project id + 源 hash + 量化记录)。
2. **再借 OD(资产加工厂)**:一段脚本从闭集真源**编译**出三件套包(⛔ 不手维护两份),喂 OD 产主题变体与预览页。
3. **回收**:tokens.css 过闸 → 量化/拒绝 → 采纳者登记为预设。
4. **缓建/不采**:DS 3.0 API、components fixtures、deck 等输出面全不采;MIT 模板不复用(免许可传染)。

**与家法的同构**:导入闸 = 「闸与生产者同生」;先自建闭集 = 「骨骼是我们的,OD 只捏皮」;DESIGN.md 散文 = 说服 agent 的礼貌标签,tokens.css 才是字节事实。
