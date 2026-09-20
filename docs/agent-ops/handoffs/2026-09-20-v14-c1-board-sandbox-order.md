> **状态 (Status)**: ready(HQ 按代理权翻牌;上游全拍)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-20
> **单号**: V14 Agent 墙 · C1 板沙箱(14.3,Agent 首个写权域)
> **上游**: `plans/v14-agent-era-plan-draft.md` §14.3(板沙箱全款,拍)+宪法四条与机械闸(撤销覆盖率=写权边界)+ 板视觉 v1 现物(stickies/edges/anchors/体检器,commit 8bf691fd+63292986 后续)+ 14.1 同门同钥先例(agent executor 走人类 routes/services,actor=agent 同事务史记)+ 板上 Staging 装卸区现役(09-12 §十四:维持现役形态)+ 排版体检器 `inspectBoardLayout`(候消费者)+ 评测跟版纪律(每张新面单随附 1-2 场景)。**设计裁量已完成,照拍施工⛔重开设计。**

# C1 · 板沙箱(Agent 的手)

**性质**:Agent 获得第一块写权域。板=纯投影域,错摆零真相损失——这是宪法机械闸下风险最低的开闸处。**同门同钥**:每个动词=人类 routes/services 的薄适配,actor=agent,同事务史记+收据+可撤,⛔平行实现⛔直写 SQL。

## 一 · 板写动词族(照 14.3 拍定清单,⛔加⛔减)

1. `board_mount_member`:上件(note/content_group/item,member_kind 照现役枚举;text_range ⛔v1);
2. `board_move_member`:移位/改尺寸(x/y/w/h);
3. `board_set_member_layer`:图层/z 序(现役 layer 机制);
4. `board_create_edge`:连线(板视觉 v1 全款 API:两端 member/sticky/point、anchor 枚举、bend/dash/weight/caps/label,⛔接 relations——线=纯视觉,铁拍);
5. `board_create_sticky` / `board_update_sticky`:便签(text/x/y/w/weight/color_index 照 v1 枚举);
6. `board_patch_visual`:粉笔/形状装饰(现役 visuals API);
7. **⛔任何删除动词**(删除候仪式设计;Agent 撤=batch revert 整批);⛔建板⛔改 soul⛔改板题。

## 二 · 装卸区与采纳(宪法条照拍)

1. **交付一律先落装卸区**:Agent 所有 mount/sticky 产出带 staging 标志落板上 Staging 区(现役形态,考古 `useBoardStagingSelection` 族先);**人拖上板=采纳**(采纳动作=人的现役拖拽,零新机关);
2. Agent 对已采纳(非 staging)对象的 move/edge 操作合法(整理是它的本职),但每会话整批可撤兜底;
3. 用户明说「直接放上去」的显式授权通道⛔本单(归 14.4 意图路由)。

## 三 · 整批撤销(机械闸法源)

1. **每 Agent 会话共享 batch_id**:本会话全部板写共一个批次(申报存法——建议挂现役收据/undo 注册面,⛔新真相表若现役面够用);
2. **一键整批撤销**:人面(板工具栏「撤销 Agent 本批」)+API;复用现役 revert 机制(搬迁事务模式先例);批内逐条也可单撤(现役收据撤销);
3. 撤销覆盖率=写权边界:七个动词每一个都必须有可撤路径并有测试锁——**任何撤不掉的动作不得注册**。

## 四 · 注册表与闸群义务(本单在射程内,义务随行)

1. 动词注册走现役 AGENT_ACTION_TOOLS/tool-face 注册表;effectClassification 三封闭集归类(全部=door_write);完整性闸零漏;
2. `check:agent-knowledge` 指纹随单 `--update`(能力投影自动跟版);说明书 §五 能力边界表同步;
3. 收据条/claim 词表:板动词进收据分类(✓ 动词名 照现役机制);
4. **排版体检器首接消费者**:Agent 每批板写收尾自动跑 `inspectBoardLayout`,结构化报告随回执附给用户(诊断⛔阻断,照体检器宪章);
5. **评测跟版:随单附 2 个 agent-eval 场景**——①Agent 铺概念图旅程(sticky×N+edge×M 落装卸区,收据/史记/batch 对账,体检报告存在);②整批撤销旅程(撤后板回原状,receipts 对账,二次撤销幂等拒绝)。

## 五 · 验收与禁区

1. 定向:七动词各正反例+staging 落位+batch 对账+整批撤销+单条撤销+体检器消费+指纹闸绿;agent 族回归+client 全库+server 全量;既有板回归零破(板视觉 v1 全款/人类板操作/命令历史);
2. **验收剧本**:scripted eval 内 Agent 重摆「熙宁朝局图」等价物(9 便签+13 边落装卸区→体检报告→整批撤销复原)——夹具自铸;
3. **说明书义务**:`current-state/app-operating-manual.md` §四/§五 补板写动词与装卸区条目;
4. 证据落 `docs/audits/2026-09-20-c1-board-sandbox-builder/`(蒸馏件),原始日志留 `.codex-tmp/c1-board/`;
5. **禁区(全部带射程)**:⛔一切 git 写操作(add/commit/push/reset/改 `.git` 目录);**只读 git 子命令明文允许**(含验证门脚本内部调用);`verify:v2-bn8-runtime` 的 git 检查+secrets 扫描两组件留 HQ 收口,其余组件照跑按「非 git/secrets 的 N 组件」申报;**注册表/写门/prompt 投影仅限本单七动词及其义务面**(⛔动既有动词语义⛔新读器⛔note_patch/意图路由——归 14.4);⛔碰 Relation 域/判断域;⛔笔记写权;⛔动 TextFlow 真相 schema;⛔坐标契约九条;⛔新依赖;⛔真实模型调用(eval 场景=scripted);⛔用户库;⛔新设计安全对抗类用例(既有功能回归全库整跑明文允许零排除);合成凭据形值 ≤20 字符(域数据不在射程);新 `--sk-` token 后段 ≤18 字符。Result:动词注册申报(注册表 diff+分类+指纹)+batch 存法申报+逐件行号+两场景断言表+测试数字+说明书申报+未做项。冲突停线举证。
