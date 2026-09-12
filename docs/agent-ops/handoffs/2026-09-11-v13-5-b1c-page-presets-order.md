> **状态 (Status)**: ready
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-11
> **单号**: 13.5 · B1c · 纸型预设 + 建纸选型
> **上游**: token spec §六;13.5 plan 波次 B B1 条(纸型预设 A4/Letter/Web 长页+建纸时选型);现物=pageFramePrintScaleService 预设族(a4_portrait/letter_portrait/screen_note,client 内存定义未持久化选型)

# B1c · 纸型预设

## 零 · 裁定原文

1. **三纸型**:A4(现役缺省)/Letter/**Web 长页**(定宽不限长不分页——单帧持续生长,打印面按既有"Web 长页"语汇分页);现物预设几何为准,⛔改现有 A4 帧几何;
2. **建纸时选型**:新建笔记入口(project 页/板上 New note)加纸型选择(缺省 A4,安静 UI——一个小选择器⛔向导);选型落 note(现物 page_format 列或 metadata,勘定申报);
3. **既有纸零迁移**:存量笔记维持现状;纸型建后 v1 ⛔改型(改型=候后续裁);
4. 墙(contentInset)默认值随纸型(spec §六),建后可调(D1 现役);
5. **双常备条款**:挂载期新请求→全夹具普查;改产品代码→client 全库必跑。

## 一 · 禁区

⛔改现役 A4 几何/打印刻度语义;⛔存量迁移;⛔建后改型;⛔Agent 面;⛔安全类测试;⛔碰 .git;⛔改权限配置。收口跑受影响静态门。

## 二 · 验收

- 两端 typecheck+build 绿;定向+全库绿;
- 冒烟(真浏览器+隔离库):①三型各建一纸,几何正确(Letter 比例/Web 长页定宽持续生长不分页);②Web 长页打字超长不切页,打印预览按 Web 语汇分页;③墙默认随型且可调;④存量纸零变;
- 证据落 `docs/audits/2026-09-11-b1c-builder/`。

## 三 · 申报义务

Result 必含:交付清单+diff、选型持久化勘定申报、Web 长页生长机制说明、冒烟证据、全库数字。冲突停线⛔自作主张。
