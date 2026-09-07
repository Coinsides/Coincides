> **状态 (Status)**: active(13.0 施工图四 · 版面模板 schema v1;13.5 实装与产房链的落点契约)
> **层 (Layer)**: 分析 / 设计
> **日期 (Updated)**: 2026-09-07
> **权威 (Authoritative)**: 是(schema 形状与家规);工程细节以 13.5 拆单 K-0 为准
> **上游**: 方向档 · 工程日记 §六(落位:卡槽+揭示语法章)§十~十三(空间语法/揭示三钟/动画四分治)§二十三(三层同体:形态层)· 产房章程(OD:可加工的是资产不是行为)· 现物:PageFrameTemplateId 四值枚举 + DocumentTypographyProfile + PageFrameModel(types.ts:55-139)

# 13.0 图四 · 版面模板 schema v1 —— 纸的第三设计层

## 〇 · 定位

纸的可设计面三层:**皮**(主题 token,12.10 已裁只做①)· **件**(组件,产房链)· **纸**(版面,本图)。版面模板=形态层的复用资产,同一条 OD 管线三层共用。本图定 schema 契约;13.5 实装存储与消费;渲染端的揭示/动画实装⛔ 不在 V13(归产房/V14)。

## 一 · 现物与升格路径

现物:`PageFrameTemplateId` 四值枚举(a4_portrait/letter_portrait/screen_note/custom)+ `PageFrameModel` 携 pageSize/background/contentInset + `DocumentTypographyProfile`(排版 profile,13.1 与纸物理尺寸绑定)。升格:**模板从枚举升为实体**,四个现物值升格为四个 v1 内置实例(零行为变化起步);`PageFrameModel.templateId` 从 enum 松为 string id(旧值兼容)。

## 二 · Schema v1

```ts
LayoutTemplateV1 {
  id, name, version,
  paper: { pageSize: 'A4'|'Letter'|'Custom', orientation, margins: CanvasInset,
           background: PageFrameBackgroundStyle },
  typography_profile_id,        // 绑定 13.1 的 pt-px 阅读标尺,⛔ 模板自带字号自由变量
  slots: SlotSpec[],
  rhythm: PageRhythm,
  overflow: OverflowPolicy,
  reveal?: RevealChapter,       // 揭示语法章(schema 缝,V13 零渲染)
  provenance: { kind: 'builtin'|'hand'|'od_import', od_lock?: string },
  metadata
}

SlotSpec {
  id, role: 'title'|'body'|'figure'|'sidebar'|'header'|'footer'|'card_slot'|string,
  rect,                         // 相对纸坐标(比例制,随纸物理尺寸解析)
  accepts: BlockOrItemKind[],   // 收纳白名单;'concept_card' 是一等值(卡槽)
  flow: boolean,                // 是否参与文流(false=钉几何位——两宿形的模板侧表达)
  style_hooks: string[]         // token 挂点,OD 装饰全权域
}

PageRhythm {
  first_page: SlotRef[],        // 首页槽组
  repeat_page: SlotRef[],       // 续页槽组(section 重复规则)
  section_break: 'none'|'new_page'|'new_first_page'
}

OverflowPolicy { on_overflow: 'next_page'|'grow_page'|'ask' }   // 与「允许溢出」改判联动(候走查①)

RevealChapter {
  clocks: ('manual'|'timed'|'data_driven')[],   // 三种时钟(伪动画=后两者)
  steps?: { slot_ids: string[], order: number }[]
}
```

## 三 · 五条设计裁定

1. **卡槽只留插座**:`accepts` 含 `concept_card` 即卡槽;卡的三字条铭牌契约、背面交互归产房章程(14.x)——本图⛔ 定义卡的内部;
2. **揭示语法只入 schema 不入渲染**:三钟是形态层的合法维度(版面自带"何时显形"),V13 只保字段与校验,渲染实装候产房;装饰动效⛔ 进 schema——那是 style_hooks 上 OD 的全权(动画四分治:装饰=OD,编排=分治);
3. **槽位空置合法**:空卡槽=虚位,是结构超前内容在形态层的对应物;⛔ 校验强制填满;
4. **模板是资产不是行为**(产房章程 08-26):od_import 供体解剖的落点=本 schema;OD 产变体经导入闸采纳;`od_lock` 记锁版号(OD 锁版候 Henry);分享出口=成品 HTML,⛔ 工程包出境;
5. **形态层纪律**(三层同体):**模板只摆不改字**——版面永不触内容真相;换模板=重摆,内容层零 diff 可验。

## 四 · 家规(⛔ 面)

⛔ 模板改内容 · ⛔ 强制模板(无模板纸=默认 a4 系,零仪式)· ⛔ 模板自带字号自由变量(标尺归 typography profile,比例无解定理防线)· ⛔ Template Studio 复活(降级切口已裁:运行时留、工作室删,TD-33 债随码销)· ⛔ V13 做揭示渲染/动画原语。

## 五 · 存储与版位

- v1 起步:内置模板注册表(client 常量,四现物升格),**够 13.5 用**;`layout_templates` 库表(用户自存模板/OD 导入件)建于 13.5 后半或候第一个真实消费者——**⛔ 形状跑在能力前**(structure≠capability 家法);
- 模板实例与钢:模板的采纳/修改走正常对象事件(`published`/`proposal_approved` 族),零特设。

## 六 · K-0 侦察清单(13.5 拆单必做)

1. DocumentTypographyProfile 族谱与 13.1 绑定后的现状(profileId 消费面);
2. 导出管线(exportPreviewService 等)对槽位/流式布局的消费改造面;
3. OD 导入闸现状(12.10 样式①的采纳协议留了什么缝);
4. Template Studio 降级切口执行状态(~4600 行删除是否已做,TD-33 账面);
5. `PageFrameTemplateId` 字面量登记面全仓 grep(枚举松绑的反向依赖)。
