> **状态 (Status)**: ready
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-09
> **上游**: 13.4 段 plan 修订二波次二(`plans/v13-4-projection-itemization-plan.md`);现物证据=单 0 侦察 §一(`analysis/2026-09-09-v13-4-s0-recon.md`)
> **单号**: 13.4 单 1 · item 化地基

# 13.4 单 1 · item 化地基

**使命**:item 作为 board_members 第三种投影上板(全链:写门→resolver→候选→卡面→导航);CG/Gallery/板共享 Item 读侧;深水题(Board–Item 身份桥/块卡绑定)**只量水深不实装**。

## 一 · 实装面

### B1 · member kind `item` 开闸全链
- 写门:`server/src/validators/boards.ts:45` 枚举加 `item`;client `boardTypes.ts:32` 同步;数据库 CHECK 已留位⛔动;
- resolver:`server/src/services/boards.ts:149` 族补 item 实读——当前正文(plain_text)摘要、type/topic、origin note_id(有则给导航)、active/retired/missing 状态(现有三态判定保留);⛔ 只 SELECT status;
- 候选:`boardRepository.loadBoardCandidates` 增 item 来源(既有 items list API);picker 分组展示(note/CG/item);
- 卡面:BoardPage 按 kind=item 渲染正文摘要+状态徽章;retired/missing 走既有降级卡样式,⛔ 静默空白;
- 导航:双击 item 卡——有 origin note 则开笔记(沿 reference.note_id 既有路径);无 origin 的 standalone item **禁用双击并给 title 提示**(v1 ⛔ 建独立 item 目的地页,HQ 已裁);
- 刷新:沿既有"GET 时重解析"契约;若便宜,itemRepository 的 update/retire 成功后失效板候选缓存(⛔ 大改订阅机制)。

### B2 · 共享 Item 读侧 adapter
- 按单 0 侦察最小接线候选:抽共享"Item 摘要解引用"读侧(按 item id 去重批量),Gallery(`groupGalleryData.ts:63` 族,item 成员预览现为空)与板候选两个消费者共用;
- 若需新批量端点,DTO 只服务这两个消费者;⛔ 正文写回 membership;⛔ 重铸旧 block/annotation/content_range 成员;workbench 逐卡加载现路径不动。

## 二 · 量水深报告(⛔ 实装,报告交 HQ)

产出 `docs/agent-ops/analysis/2026-09-09-v13-4-s1-item-depth.md`,三题各给最小实现面+改动清单+风险,⛔ 代裁:
1. **Board–Item 身份桥**:候选 A(boards.item_id 一对一 FK)与 B(共主键)成本对比;三前置题逐一列选项——identity item 的正文/标题谁拥有(板名同步?)、普通 item edit/retire 对板身份的边界、存量板回填;
2. **块卡绑定(编入/安家)**:block 承载 item 正文的最小机制——绑定字段落点、编辑单写/双写路径、板投影读宿主、"摘出"逆动作、迁移面;引用 07-12 relation-item-graph 三层结构与 09-09 安家模型(段 plan 修订二已拍裁定四);
3. **板上铸卡 origin 扩展**:items origin 目前 note/course,扩 board 出生地的 schema 与消费面射程(单 9 前置)。

## 三 · 裁量与停线

- 停线举证不改判;现物与本单行号/假设冲突→申报;
- ⛔ 新 event verb;⛔ 动 047 既有表结构;⛔ 动 castItem 认领语义。

## 四 · 验证(单内纪律)

- typecheck + build 全绿;既有测试回归不破;
- 冒烟四条:①mount 一个 item 上板,卡面显当前正文摘要,重开仍在;②retire 该 item,板卡显 retired 降级(⛔消失);③含 item 成员的组在 Gallery 预览显当前正文(不再空);④standalone item 卡双击禁用有提示,有 origin 的双击开笔记。

## 五 · Result 格式

`## Result`:numstat + 四冒烟逐条 + 量水深报告路径 + 未做清单 + 停线事项;**⛔ commit**;⛔ 读 .env;⛔ key 出境;⛔ 用户库接触;⛔ 安全类测试(总门末项凭据扫描留 HQ 例行补跑)。
