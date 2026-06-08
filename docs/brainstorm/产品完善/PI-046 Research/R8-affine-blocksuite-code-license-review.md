# R8 - AFFiNE / BlockSuite 代码和许可调研

## 本阶段目标

R8 从代码结构、license、工程复杂度和可拆分性角度研究 AFFiNE / BlockSuite。它承接 R7 的产品体验结论：AFFiNE 的体验值得深入，但不能直接等同于 Coincides 的答案。

R8 不决定最终路线，只判断：

- full fork / copy AFFiNE 是否现实；
- 是否能只用 BlockSuite；
- 是否适合 hybrid：BlockSuite 做编辑器，Coincides 保留 source / proposal / template / relation / graph-readable semantic layer；
- 哪些问题必须交给 R9-R11 继续验证。

## 证据来源

本阶段主要检查：

- AFFiNE 根目录：`_external_research/AFFiNE/README.md`、`_external_research/AFFiNE/LICENSE`、`_external_research/AFFiNE/package.json`
- AFFiNE backend/native license：`_external_research/AFFiNE/packages/backend/server/LICENSE`、`_external_research/AFFiNE/packages/backend/native/LICENSE`、`_external_research/AFFiNE/packages/common/native/LICENSE`
- AFFiNE build docs：`_external_research/AFFiNE/docs/BUILDING.md`
- AFFiNE package structure：`_external_research/AFFiNE/packages/*`
- BlockSuite 独立仓库：`_external_research/blocksuite/README.md`、`_external_research/blocksuite/LICENSE`、`_external_research/blocksuite/package.json`
- BlockSuite package structure：`_external_research/blocksuite/packages/*`
- BlockSuite package examples：`@blocksuite/affine`、`@blocksuite/store`、`@blocksuite/std`、`@blocksuite/sync`、`@blocksuite/affine-block-paragraph`、`@blocksuite/affine-gfx-connector`

## 一句话结论

从 R8 证据看，**full fork / copy 整个 AFFiNE 不应作为第一优先路线**。它是完整产品级 monorepo，包含 frontend、backend、native、server、sync、Rust native、Electron/mobile/web、多 license 分区和复杂依赖。

更现实的方向是 **BlockSuite-first 或 hybrid**：

```text
BlockSuite / AFFiNE editor components 负责成熟 page/editor/edgeless 体验
Coincides 自己保留 source/proposal/template/domain/relation/provenance/GraphRAG 语义层
```

但 BlockSuite-first 也不能直接定案，因为 R9-R11 仍要验证 freeform block-box、formal page / outside workspace、metadata / identity sidecar、ObjectRelation 映射等关键问题。

## AFFiNE license 与 full fork 风险

### 根目录不是一句 MIT 就能概括

AFFiNE 根 `package.json` 声明：

- monorepo 名称是 `@affine/monorepo`
- private: true
- license: MIT
- workspaces 包括 `blocksuite/**/*`、`packages/*/*`、frontend apps、tools、docs、tests

但根 `LICENSE` 说明：

- `packages/backend`
- `packages/common/native`

等目录另有 license 指向。

这意味着不能简单得出“整个 AFFiNE 都是 MIT，所以整搬无风险”的结论。

### backend/native 是明显高风险区

`packages/backend/server/LICENSE`、`packages/backend/native/LICENSE`、`packages/common/native/LICENSE` 都显示 Enterprise Edition 相关条款。其内容提到生产使用、subscription、禁止复制/合并/发布/分发/销售等限制，并说明 CE/client-side 部分另有 MPL2.0 规则。

这对 Coincides 的影响：

- 如果只是个人本地研究，风险较低，但仍应把 license 边界写清楚。
- 如果未来公开 repo 或发布应用，整搬 AFFiNE backend/native/server 是不合适的。
- 即使只做 copy/fork，也必须明确排除受限制目录或只作为阅读参考。
- R8 不做法律结论；如果未来真的公开发布基于 AFFiNE 的产品，需要单独 legal review。

### full fork / copy 的工程风险也很高

AFFiNE build docs 显示：

- 需要 Node.js。
- 需要 Rust toolchain。
- Windows 上需要处理 symlink / Developer Mode。
- 需要 build native dependencies。
- 需要 build server dependencies。
- E2E 需要启动 server。

这意味着 full fork/copy 不是“把 repo 拿来改 UI”，而是继承一个完整大型产品工程体系。

对 Coincides 来讲，这会带来：

- 依赖和构建复杂度显著上升。
- Windows 本地开发门槛上升。
- 现有 SQLite server/client 架构会被冲击。
- 我们很容易被 AFFiNE 的 app shell / backend / sync / cloud / native 逻辑拖走，而不是专注做笔记与 source-grounded note assembly。

## AFFiNE 代码结构判断

AFFiNE `packages` 至少包含：

```text
backend/native
backend/server
common/debug
common/env
common/error
common/graphql
common/infra
common/native
common/nbstore
common/reader
common/realtime
common/s3-compat
common/theme
common/y-octo
frontend/admin
frontend/apps/android
frontend/apps/electron
frontend/apps/electron-renderer
frontend/apps/ios
frontend/apps/mobile
frontend/apps/web
frontend/component
frontend/core
frontend/routes
frontend/templates
```

`@affine/core` 又依赖：

- `@blocksuite/affine`
- `@blocksuite/affine-block-root`
- `@blocksuite/affine-components`
- `@blocksuite/std`
- `@blocksuite/store`
- `@affine/nbstore`
- `@affine/graphql`
- `@affine/realtime`
- React 19
- Yjs
- socket.io-client
- PDF viewer
- KaTeX
- Mermaid
- Sentry
- many UI/runtime dependencies

这说明 AFFiNE 的前端核心不是轻量库，而是产品级核心运行时。

因此，full fork 的优势是：拿到完整成熟体验。

full fork 的代价是：Coincides 会继承大量暂时不需要的产品复杂度，并且要处理 license/native/backend/sync/route/app-shell 一整套问题。

## BlockSuite license 与独立性

### BlockSuite 根 license

独立 BlockSuite 仓库根 `package.json` 声明：

- name: `blocksuite`
- private: true
- license: MPL-2.0
- workspaces: `packages/**/*`, `docs`

根 `LICENSE` 是 MPL 2.0。

但是具体 package 中，许多 `package.json` 声明 license 是 MIT，例如：

- `@blocksuite/store`
- `@blocksuite/std`
- `@blocksuite/sync`
- `@blocksuite/affine`
- `@blocksuite/affine-block-paragraph`
- `@blocksuite/affine-gfx-connector`
- `@blocksuite/affine-widget-edgeless-toolbar`

这说明不能只看根 license，也不能只看某一个 package license。实际使用时需要逐包确认 license、发布包条款、以及改动方式。

R8 的保守判断：

- 直接使用 npm 包时，逐包 package license 是关键。
- 修改 BlockSuite 源码再发布时，根 MPL-2.0 以及具体包 license 都需要确认。
- 如果只作为本地研究或参考，实现自己的 editor，则 license 风险最低。

### BlockSuite 的定位更符合 Coincides 的 editor runtime 候选

BlockSuite README 明确说它是用于构建 editors 和 collaborative applications 的 toolkit，并提供：

- `PageEditor`
- `EdgelessEditor`
- custom blocks
- inline embeds
- command mechanism
- snapshot / transformer
- multi-document reuse
- CRDT / Yjs based state
- web components

README 还说明 BlockSuite 与 AFFiNE 的关系类似 Monaco Editor 与 VSCode：BlockSuite 是可独立复用的 editor framework，AFFiNE 是上层产品。

这点非常重要。它直接支持一个候选路线：

```text
不要 fork 整个 AFFiNE。
先研究 BlockSuite PageEditor / EdgelessEditor 是否能承载 Coincides 的文档和画布表面。
```

## BlockSuite 的工程复杂度

BlockSuite 不是小组件库。它包含：

```text
packages/framework/store
packages/framework/std
packages/framework/sync
packages/affine/blocks/*
packages/affine/gfx/*
packages/affine/widgets/*
packages/affine/inlines/*
packages/affine/fragments/*
packages/affine/model
packages/affine/rich-text
packages/affine/shared
```

以 `@blocksuite/affine` 为例，它依赖大量 block、gfx、inline、widget、store、std、sync 包。

这说明 BlockSuite-first 不是“只安装一个 editor 然后结束”，而是要选择：

- 用 preset editor，减少改动；
- 用 selected packages，承担组合成本；
- 或 fork/customize 部分 package，承担维护成本。

它比 full AFFiNE 更可控，但仍然需要 spike。

## 四条路线的 R8 评分

### 路线 A：full fork / copy AFFiNE

优点：

- 直接获得成熟 app shell、page editor、edgeless canvas、toolbar、export、favorite、local-first 体验。
- 最接近用户看到的 AFFiNE 效果。

风险：

- license 分区复杂，backend/native/server 高风险。
- 工程体量巨大。
- 需要继承 Rust/native/server/sync/web/mobile/electron 等复杂体系。
- Coincides 现有 source/proposal/template/domain/relation 层很可能要重写接入。
- 很容易变成“改 AFFiNE 产品”，而不是“做 Coincides 笔记系统”。

R8 判断：

```text
不推荐作为第一路线。
只适合作为产品体验参考、或极端情况下的新 repo 大重构路线。
```

### 路线 B：BlockSuite-first editor runtime

优点：

- BlockSuite 明确定位为 editor toolkit。
- 提供 PageEditor / EdgelessEditor。
- 支持 custom blocks、inline embeds、snapshot/transformer、Yjs state。
- 比 AFFiNE full fork 更接近“拿成熟编辑器层”的目标。

风险：

- package 依赖链仍然长。
- license 需要逐包确认。
- web components 与当前 React app 需要适配。
- Coincides canonical object identity 需要 sidecar / adapter。
- freeform block-box 和 source provenance 未验证。

R8 判断：

```text
推荐进入 R9-R11 重点验证。
这是目前最有希望的 adoption route。
```

### 路线 C：Hybrid

定义：

```text
BlockSuite 负责 page/editor/edgeless 交互
Coincides SQLite/未来 graph layer 负责 source/proposal/template/domain/relation/provenance truth
两者通过 adapter / sidecar / mapping / import-export bridge 连接
```

优点：

- 能保留 Coincides 现有地基。
- 能借成熟 editor/canvas 体验。
- 不必继承 AFFiNE backend/native/server。
- 未来可逐步替换 editor 层。

风险：

- adapter 复杂。
- 双写/同步/identity mapping 容易出错。
- 需要设计 BlockSuite block id 与 Coincides NoteBlock id 的稳定映射。
- R9/R10 若发现 PageEditor / EdgelessEditor 无法承载关键体验，则 hybrid 也会失败。

R8 判断：

```text
目前最理性的候选路线。
但必须通过 R9-R11 证据验证，不能凭感觉定案。
```

### 路线 D：仅借鉴，自研 Coincides editor/canvas

优点：

- ownership 最清晰。
- source/proposal/template/domain/relation/GraphRAG 接入最自然。
- 没有外部 editor runtime 的 license / adapter 风险。

风险：

- 成熟 page editor 和 canvas 工具箱工程量巨大。
- 需要自己补齐 rich text、selection、toolbar、resize、connector、frame、export 等能力。
- 很可能继续出现“工程可靠但用户体验粗糙”的问题。

R8 判断：

```text
可保留为 fallback。
除非 R9-R11 证明 BlockSuite 无法承载核心需求，否则不应急着回到全自研。
```

## 对 R9-R11 的关键问题

R8 后，真正的判断题变成：

### R9: PageEditor 可否承载 freeform block-box

必须验证：

- PageEditor 的 block 是否天然线性。
- 是否能把 block 放入可 resize 的 box。
- 是否能在 page 内任意位置放置并排 block。
- 是否能实现 spatial click-to-type。
- 如果要改 core block model，改动多深。

### R10: EdgelessEditor 可否承载 formal page / outside workspace

必须验证：

- 是否能把 A4/formal page 作为 canvas 内对象。
- 页面外 workspace 是否自然。
- 多页 grid / seamless stack 是否能实现。
- export intent 是否可控。
- connector 是否能作为 CanvasEdge 交互层。

### R11: Coincides semantic layer 如何接入

必须验证：

- BlockSuite block id 与 NoteBlock id 如何映射。
- SourceAnchor / SourceScope / Proposal provenance 如何挂载。
- TemplateDefinition / DomainBlockSet 如何影响 block creation。
- ObjectRelation 如何从 visual connector 或 block relation 映射出来。
- Snapshot/transformer 是否能用于 `.coincides` package。

## R8 对 roadmap 的初步影响

R8 建议暂时不要继续沿“当前 Course Detail 叠功能”的方向推进产品体验。

下一阶段 roadmap 应优先安排：

```text
Editor/runtime adoption spike
  -> PageEditor freeform block-box feasibility
  -> Edgeless formal page/outside workspace feasibility
  -> Coincides semantic sidecar feasibility
  -> Route score and decision
```

如果 BlockSuite route 成立，当前 v2.x 已做的 source/proposal/template/domain/package/relation/migration 不是废弃，而应成为 sidecar semantic layer 的设计素材。

如果 BlockSuite route 不成立，当前 v2.x 仍提供了自研 editor/canvas 所需的对象模型和语义边界。

## R8 结论

AFFiNE full fork/copy 的体验收益很大，但 license 和工程复杂度都太高，不适合直接作为第一路线。

BlockSuite-first / hybrid 是目前最值得继续验证的路线：

```text
BlockSuite 提供成熟编辑器和画布 runtime。
Coincides 保留自己的 NoteBlock / Source / Proposal / Template / Domain / Relation / GraphRAG 语义层。
```

R8 的最终判断是：

```text
不要整搬 AFFiNE。
优先验证 BlockSuite-first 或 hybrid。
R9-R11 是是否重构路线的真正决策点。
```
