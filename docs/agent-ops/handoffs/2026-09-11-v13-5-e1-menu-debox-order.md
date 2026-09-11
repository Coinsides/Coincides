> **状态 (Status)**: ready
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-11
> **单号**: 13.5 · 波次 E1 · 菜单去盒 + 视图收纳
> **上游**: 09-11 设计日会议记录(`docs/brainstorm/产品完善/会议记录/2026-09-11-Note-Page-Design-Day-Meeting-Notes.md`)§一通用处方+§三.4,Henry 尾轮批量拍板(§十);三案打样 Artifact《纸的三种气质》方向 B 的去盒纪律

# E1 · 菜单去盒 + 视图收纳

## 零 · 裁定原文

1. **通用处方(去盒卫生工程)**:容器只许一层皮——浮层自身可有边框/阴影,**内部条目永远是"行"不是"卡"**:⛔逐条目边框/背景卡片/嵌套圆角容器;分组=间距+发丝线;hover=一层极淡底色;危险项(Delete note)=颜色⛔边框;小节题(如 TYPOGRAPHY)=大写小字+字距;Typography 参数收敛为浮层内安静小节(label+数值行),⛔再套一层控件框;
2. **⛔调色**:本单是结构手术不是换肤——现役深色配色维持,气质/palette 换肤归 B1 皮系统;
3. **视图收纳**:底部工具条的 Fit width / Fit page / 100% physical 三钮收进一个「视图」icon 钮(lucide 现成图标自选,tooltip "View options"),点开向上弹小菜单,**菜单内保留完整文字**(用户须读懂自己在干嘛),当前激活项有勾选态;Overview 独立保留原位(重做归 E4,本单⛔动其行为);
4. 缩放组(− 108% +)与其余钮维持。

## 一 · 交付面

- **去盒射程=笔记页全部浮层**:⋯ More 菜单、Info、Layout 面板(PageStack 行族)、块回收站、导出预览、删除确认 dialog——逐一按处方整形;More 菜单里的"Note-level actions"死占位卡**顺手删除**(历史注释可留代码);
- 视图收纳:NoteWritingSurfaceLayer 工具条改组;「视图」菜单开合与其他浮层互斥规则沿现役;
- 功能零变:所有 handler/开关/确认流/readonly 语义原样;仅结构与皮相。

## 二 · 禁区

⛔改任何浮层的功能语义/handler;⛔调色板(色值只删不改——删的是逐条目边框和卡底);⛔动 Overview 行为;⛔动 Write/Pen/Eraser(归 E3);⛔TextFlow 面;⛔安全类测试;⛔碰 .git(工作树交 HQ);⛔改 CLAUDE.md/AGENTS.md/权限配置。

## 三 · 验收

- typecheck+build 绿;D2 定向套件(chrome/layers/hooks 20 文件)保绿,若测试断言被删除的卡片 class,改断言随行申报;
- 冒烟(合成/真浏览器,⛔真库):①各浮层开合与功能全通(Layout 开关/删除确认/回收站/Typography 改值/导出预览);②「视图」菜单三项各自生效且勾选态正确;③视觉断言:任一浮层内**零嵌套边框元素**(可写 DOM 断言:浮层容器内 border 非零的后代计数=0,发丝线分隔除外);④死占位卡不再渲染;
- 证据落 `docs/audits/2026-09-11-e1-builder/`。

## 四 · 申报义务

Result 必含:交付清单+diff 规模;逐浮层整形对照(改前病灶→改后);测试改动申报;冒烟证据;测试数字。冲突停线⛔自作主张。
