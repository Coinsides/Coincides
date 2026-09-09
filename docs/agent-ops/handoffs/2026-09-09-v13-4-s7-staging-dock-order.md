> **状态 (Status)**: ready
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-09
> **上游**: 13.4 段 plan 修订二波次三单 7;现物证据=单 0 侦察附录⑧(placed 需显式契约,零几何≠状态;mounted 只记一次的承接面已在);Henry 拍定三(装卸区双向=码头)
> **单号**: 13.4 单 7 · 板级装卸区(双向码头)

# 13.4 单 7 · 板级装卸区

**使命**:板长出**装卸区**——收货零决策成本(先拿进来),落位才付摆放成本(延迟分类);同时预铸 Agent 交付码头(actor 字段)。**⛔ 第二自由画布:只列名字。**

## 零 · HQ 已裁(⛔ 复议)

1. **数据契约**:新迁移 board_members 加 **`placed` INTEGER NOT NULL DEFAULT 1**(存量成员默认已摆位)+ **`mounted_actor` TEXT NOT NULL DEFAULT 'human'**(Agent 码头预铸,本版恒 'human',⛔ 开 agent 写路);⛔ 新表;
2. **语义**:进装卸区=mount(记 mounted 一次,placed=0,几何列无语义);拖上板=PATCH 赋几何+placed=1(⛔ 再记事件——既有"几何 PATCH 无事件"契约不变);板面渲染过滤 placed=0(unplaced 不上画布、不参与连线/删除命中);
3. **UI**:右侧**略窄边栏**(约 280px),初始隐藏;板 chrome 加"Staging (n)"按钮唤出(n=unplaced 计数);行=kind 图标+名字/摘要一行+来源标签(源笔记名或"Board chalk"或 kind)+actor 徽章(human 隐式不显,留将来 agent 显);**⛔ 预览/⛔ 缩略图/⛔ 自由摆放**;
4. **卸货入口(v1 两条)**:①板 picker 每类候选加 "Stage" 动作(mount placed=0);②open-note 弹窗内选区工具栏加 **"Send to staging"**(复用单 2 铸锚+mount 链,placed=0)——弹窗与装卸区同开时正好演全流程;拖拽进装卸区手势候后⛔本单;
5. **triage 动词(行内)**:**Place**(拖行到板面落点→赋几何 placed=1;或按钮"Place on board"落网格默认位)+ **Remove**(unmount,走既有 unmounted 记账);对引用语义"退回来源"="Remove"(名单除名,真相无损),⛔ 另造第三动词;
6. **布局联动**:装卸区展开时 open-note 弹窗**让位靠左**(modal 定位偏移,两者并存不遮);装卸区关闭恢复居中;板面本身⛔缩放;
7. 文案家族=Staging/准备区(与笔记侧 tray 同心智不同器官);⛔ 动笔记侧 tray 代码。

## 一 · 交付面

- 迁移+base schema(placed/mounted_actor,含 059/060 后续号)+validators/DTO/hydrate(placed 进 member DTO;mount 契约加 staged 参数或 placed 显式);
- BoardPage:Staging 侧栏组件+按钮+计数;板面 placed 过滤;Place 拖放(HTML DnD 或 pointer,拖到板面 world 坐标落卡)+按钮落位兜底;Remove;
- picker "Stage" 动作;弹窗选区工具栏 "Send to staging";
- 弹窗联动定位(单 6 modal 加偏移态)。

## 二 · 裁量与停线

- 停线举证不改判;⛔ 动 tray/搬迁批次;⛔ 新 event verb;⛔ agent 写路;
- unplaced 成员在 GET 解析照常(reference 照解析,staging 行显示要用);
- 单 A 删板确认框的成员计数含 unplaced(数字要真)。

## 三 · 验证(单内纪律)

- typecheck + build 全绿;定向回归(Boards+modal+tray 面)不破;
- 冒烟六条:①picker Stage 一个 item→装卸区列出、板面不出现、重开仍在装卸区;②从装卸区 Place 上板→落卡 placed=1 有几何,重开保持;③弹窗内选段"Send to staging"→装卸区出现 range 行(带源笔记名),⛔ 板面直落;④装卸区行 Remove→名单除名(events 见 unmounted);⑤装卸区展开时弹窗让位靠左、关闭复原;⑥存量板成员迁移后全部 placed=1 显示如常(迁移保全)。

## 四 · Result 格式

`## Result`:numstat + 六冒烟逐条 + 未做清单 + 停线事项;**⛔ commit**;⛔ 读 .env;⛔ key 出境;⛔ 用户库接触;⛔ 安全类测试(凭据扫描留 HQ)。
