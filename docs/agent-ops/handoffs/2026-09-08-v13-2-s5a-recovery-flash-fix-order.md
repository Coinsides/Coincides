> **From**: fable
> **To**: codex
> **Status**: ready(两层制;13.2 附单=v2 失焦保存首发失败修复;Henry 真库眼验报障)
> **日期 (Date)**: 2026-09-08
> **性质**: 缺陷修复单(client/server 定位后定;⛔ 用户库接触)

# 13.2 · 附单 s5a · v2 下失焦保存首发失败(恢复队列橙盒闪现)

## 〇 · 症状与已证事实

- **Henry 真库眼验报障**:任一笔记,选中 paragraph block 后点击空白处,一个橙色提示框光速闪现即消;
- **HQ 侦查结论**:橙色样式全 UI 排查,唯一符合者=`.blockEditRecoveryQueue`(NoteDetail.module.css:973,var(--warning) 橙框);机制推定=失焦保存首发被拒→入恢复队列(盒弹出)→立即重试成功→盒消失;
- 稳态写路径已实测全绿(POST blocks 201/PUT block-placements 200/coordinate-contract 200,test note 1 上 HQ 亲测);
- 4a 相关新逻辑:"v2 正式页面新写要求有效 frame 与 page_frame_local;跨 note 恢复按收据取帧集合,使用冻结契约;缺帧拒写并保留恢复队列"(4a Result)。

## 一 · 任务(冻结)

1. **复现**:合成 fixture(可扩展 pageReadingSmoke)重现该手势链(选中既有段→点空白→失焦保存)在 v2 旗标下的首发失败入队;拿到确切拒因(疑点优先级:冻结契约会话未就绪时序 / blur 保存与 frame 集合加载竞态 / draft-blur 与 placement 写的先后 / 恢复收据路径误触);
2. **修根因**:首发保存必须一次成功,⛔ 以"重试反正会成"掩盖;⛔ 放宽 v2 有效帧校验;
3. **次级(若存在合法瞬时入队场景)**:恢复队列盒渲染加 300ms 消抖(瞬时自愈不闪 UI)——仅在根因修复后仍有合法场景时做,⛔ 用消抖掩盖根因;
4. **零变化面**:⛔ 4a 语义层判定规则、⛔ 执行器、⛔ canvas 模式、⛔ 用户库。

## 二 · 验证(段纪律)

server+client typecheck/build;单测:该手势链 v2 下首发保存成功断言+入队路径回归(真失败仍入队);一条冒烟:fixture 实跑手势链,零恢复盒闪现、placement 落库正确。

## 三 · 回执与边界

apply_patch 追加 ## Result(根因陈述+numstat+验证输出+未做);⛔ commit(工作树交 HQ);⛔ 读 .env;⛔ 打印 key;不动 3001/5173。现物冲突⇒停线举证。
