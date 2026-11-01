> **from**: claude(Main_Designer,原 HQ)
> **to**: 临时工程对话1(builder)
> **status**: ready(Henry 11-01 亲令:删除按钮必须可达+确认后完全删除——「导致我根本不能用这个东西」,🅰 直令)
> **单号**: VPS-F2 · Source 删除可达性单
> **上游**: Henry 首日实测;HQ 普查:确认对话(SourceDeleteDialog,含 impact 预检+deletion_blocked 禁用)与永久删除语义**均已存在**,缺口=入口可达性

# VPS-F2 · Source 删除可达性单

## 〇 · 背景

Henry 首日实测:失败的 Source 想删后重传,项目视图删除键是灰的(`SourceDetailDialog.tsx:64-67`:无 onDelete 即 disabled,提示「Delete Sources from the global Source Library」),他没找到全局库那条路 → 判「不能用」。裁定:**凡是看得见一条 Source 的地方,两步内必须能删它**;确认对话保留(用户要有心理准备);删除=完全删除(现语义即是,quarantine 为实现细节)。

## 一 · 修一:项目视图开放删除

- 把删除能力接进项目视图的 Source 详情(onDelete 接线,复用现成 SourceDeleteDialog 与 impact 预检);
- **侦察义务**:查明当初项目视图不传 onDelete 是否有活跃态/设计理由(git blame/注释/测试);若有真实理由(如 materialization 进行中)——那部分用 deletion_blocked 已有机制表达,⛔用「整视图禁删」表达;侦察结论进回执;
- 删除成功后的列表/状态刷新要正确(项目视图上下文)。

## 二 · 修二:死胡同文案清理

- 「Delete Source unavailable here」类指路文案在修一后应消失或仅存于真实受限态;
- 确认对话文案核对:须让用户明白①不可恢复②会连带删除其投影笔记与块(deleteSourceWithCompensation 现实)——若现文案未说清,补清(UX copy:说人话,主按钮措辞与后果一致)。

## 三 · 验收与测试面

- client Sources 定向 vitest + 新用例:项目视图删除全流(开详情→删除→确认→列表移除);失败态(failed)Source 可删;
- 服务端若零涉改则只跑邻接回归申报;
- 阳性对照一处(照前三单样板);⛔真实模型调用;⛔全库马拉松。

## 四 · 纪律(照抄现役)

⛔git 写操作(交工作树,commit 归 HQ);⛔读 .env key 值;⛔用户库;⛔动依赖锁文件;合成值 ≤20 字符或 synthetic-key-not-real-* 标记;⛔新设计安全对抗类用例,既有功能回归明文允许;措辞中性。

## 五 · 回执协议

本文件尾部 `## Result`(五件套);证据落 `docs/audits/2026-11-01-vps-f2-builder/`;HQ 自取。

## 六 · 不在射程

「agent 参与删除」的专用通道(现状:各 agent 以各自认证账号走既有 DELETE API 即可;给 Henry 账号的受控运维通道=候拍另案);回收站/软删设计;Source 结构性改动;批量删除(单条可达先行,批量候 Tester 报告)。
