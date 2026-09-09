> **状态 (Status)**: ready
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-09
> **上游**: 13.4 段 plan 修订二波次四单 5;现物证据=单 0 侦察 §五(页/裁片/只读打印渲染均有;⛔靠 fit-page 无限缩;旧选页处理有写副作用);停车场 H 区(一行 3~4 页,有限小,方便选择不方便阅读)
> **单号**: 13.4 单 5 · 铺陈统揽视图

# 13.4 单 5 · 铺陈统揽视图

**使命**:多页笔记的 Word 式并列全览——方便选页,不方便阅读;**有限小**,⛔ 无限缩小硬塞。

## 零 · HQ 已裁(⛔ 复议)

1. **入口=独立 overview 开关**(三档旁的独立按钮,⛔ 塞进既有三档 enum);开关状态按 noteId 局部,⛔ 持久化;
2. **网格参数**:CSS grid,宽屏 4 列/中屏 3 列/窄屏 2 列;缩略最小宽 **160px** 下限(常量可调),超容量**翻页**(上一屏/下一屏),⛔ 为塞完全部页无限缩;
3. **渲染=复用只读裁片内核**:提炼 NotePrintLayer 的 PrintPages 思路为共享只读页内容组件(frame+fragments+BlockEditorLayer 只读),⛔ 直接显示打印根(其生命周期是 print 事件专用);**保真边界如实申报**(fragments 为主,annotations 空、generic objects 覆盖按现物,Result 写明);
4. **点击语义=选页返回阅读**:点某页缩略→关 overview→正常阅读视图滚动定位到该页;**⛔ 沿用旧选页处理**(`useRuntimePresentationController:207` 的 onSavePageFrameCollection 写副作用)——纯展示导航,拆用局部滚动/聚焦动作;
5. **零写不变量**:overview 打开/翻页/关闭全程⛔ 写 placement/排版/TextFlow/frame(测试断言零写);打印链不动;
6. ⛔ 缩略图内编辑器;⛔ 无限画布;准备区/跨页裁片排除沿 engineModel 既有;⛔ 新 event verb。

## 一 · 交付面

- 共享只读页渲染组件(从打印层提炼,双消费者:打印照旧+overview);
- overview 层(grid+翻页+点击定位)+开关按钮;
- 与弹窗兼容:open-note 弹窗内也可用 overview(同一运行时,免费则做,贵则 Result 记未做⛔硬啃)。

## 二 · 裁量与停线

- 停线举证不改判;打印层提炼若牵动打印快照生命周期→停线;
- 长页(fit_width 降级那类)在 overview 里按比例截显+"long page"标识即可,⛔ 特殊引擎。

## 三 · 验证(单内纪律)

- typecheck + build 全绿;定向回归(canvasEngine+打印面)不破;
- 冒烟五条:①1 页/4 页/9 页笔记开 overview,列数按宽自适应,缩略不低于下限,9 页触发翻页;②点击第 N 页→回阅读视图定位到该页;③overview 全程零写断言(placement/排版/frame 无任何 PUT);④打印(NotePrintLayer)回归不破;⑤窄屏降列不缩过下限。

## 四 · Result 格式

`## Result`:numstat + 五冒烟逐条 + 保真边界申报 + 未做清单 + 停线事项;**⛔ commit**;⛔ 读 .env;⛔ key 出境;⛔ 用户库接触;⛔ 安全类测试(既有套件整跑⛔过滤;凭据扫描留 HQ)。
