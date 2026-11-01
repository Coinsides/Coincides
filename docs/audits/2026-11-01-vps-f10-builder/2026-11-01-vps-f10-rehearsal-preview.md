> **状态 (Status)**: frozen
> **层 (Layer)**: 审计 / 只读多用户预览
> **权威 (Authoritative)**: 否；机械核对单，不是用户迁移放行

# V13.2 单 4b · 预览核对单

scopes=b4748af4-7e42-449d-9e31-a338c29d1a2b。

## 用户 b4748af4-7e42-449d-9e31-a338c29d1a2b

> **状态 (Status)**: frozen
> **层 (Layer)**: 审计 / dry-run 收据
> **权威 (Authoritative)**: 否；只读候选与合成验证，不是迁移放行

### V13.2 单 3 · 显式只读 census核对单

user scope: b4748af4-7e42-449d-9e31-a338c29d1a2b。工具版本 v13.2-s3。

本次为 dry-run；所有“after”均为预计保留的行身份，不是迁移后实测。P/O/M 是三张表的独立分母，不相加冒称内容件数。
crossing 一律托盘；50% 参数只产诊断，不启用收编。legacy 原地封存；page_frame 结构行只进原始三表守恒。
去处未明的行保留原地并明确列入待核；守恒通过不表示这些行已裁决。坐标定案仅表示三解释的完整归页结果一致，不选择坐标来源或单个最佳页。

#### 只读证据

readonly=true; query_only=true; SELECT readonly=true; total_changes=0→0。
census SHA-256: a85c1d47c3f90f72100379836ee108fcf7556c6f74a6b2ce94b6966afeba5d77

参数 adoptionThreshold=0.5（diagnostic only）；adoptionEnabled=false。
三表守恒：全部全等。placement 歧义 29；legacy 歧义 0；去处待核 0 行。
全局无主 note 的 legacy 行数（无法划归 user scope，只返回数量）：0。

#### 逐 note 内容矩阵

| note | inside 块 | crossing 块 | crossing 收编 / 托盘 / 原地（含待核） | outside 块 | 画物 / 野地画物 | mount / 野地独占 / mixed | 坐标 定案 / 歧义 / 不适用 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0b15c033-e0ef-4253-a0a6-7a647702852b | 1 | 0 | 0 / 0 / 0 | 0 | 0 / 0 | 1 / 0 / 0 | 0 / 1 / 0 |
| 26402ffe-fa58-4def-8d15-2374572715e3 | 8 | 0 | 0 / 0 / 0 | 0 | 0 / 0 | 8 / 0 / 0 | 0 / 8 / 1 |
| 3a9cf7d6-b0c7-4683-bd6c-50a44248363b | 1 | 0 | 0 / 0 / 0 | 0 | 0 / 0 | 1 / 0 / 0 | 0 / 1 / 0 |
| 3d1c7a3e-6bbd-4546-8d33-a8828c8394ce | 5 | 0 | 0 / 0 / 0 | 0 | 0 / 0 | 5 / 0 / 0 | 0 / 5 / 1 |
| 46ea5e7f-651d-4357-8d19-142d7ba373d3 | 1 | 0 | 0 / 0 / 0 | 0 | 0 / 0 | 1 / 0 / 0 | 0 / 1 / 0 |
| 67ebe34c-e77c-4922-bf1e-b3b5f6284a98 | 1 | 0 | 0 / 0 / 0 | 0 | 0 / 0 | 1 / 0 / 0 | 0 / 1 / 0 |
| 9bfc6e17-25cb-4701-b1e2-03cc7588e6c8 | 1 | 0 | 0 / 0 / 0 | 0 | 0 / 0 | 1 / 0 / 0 | 0 / 1 / 0 |
| a877719c-8a1d-4a70-b2a7-ed1fa4bcd90b | 1 | 0 | 0 / 0 / 0 | 0 | 0 / 0 | 1 / 0 / 0 | 0 / 1 / 0 |
| be75c6b9-395f-4c02-b99a-75b595e1fd27 | 7 | 0 | 0 / 0 / 0 | 0 | 0 / 0 | 7 / 0 / 0 | 0 / 7 / 0 |
| cd99c591-3059-4efa-9c7c-2c0b2dbacb92 | 1 | 0 | 0 / 0 / 0 | 0 | 0 / 0 | 1 / 0 / 0 | 0 / 1 / 0 |
| db3b8f3d-e6bb-412a-a95b-bac493c82fb8 | 1 | 0 | 0 / 0 / 0 | 0 | 0 / 0 | 1 / 0 / 0 | 0 / 1 / 0 |
| e2e988bf-0bd6-4703-8bfe-b1c9b223403f | 1 | 0 | 0 / 0 / 0 | 0 | 0 / 0 | 1 / 0 / 0 | 0 / 1 / 0 |

#### 逐表守恒（每行一次，预计 after）

| note | 表单位 | before | 原地（含保留待核） | 收编 | 托盘 | after | 其中待核 | 严格全等 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0b15c033-e0ef-4253-a0a6-7a647702852b | placement | 1 | 1 | 0 | 0 | 1 | 0 | ✓ |
| 0b15c033-e0ef-4253-a0a6-7a647702852b | object | 1 | 1 | 0 | 0 | 1 | 0 | ✓ |
| 0b15c033-e0ef-4253-a0a6-7a647702852b | mount | 1 | 1 | 0 | 0 | 1 | 0 | ✓ |
| 26402ffe-fa58-4def-8d15-2374572715e3 | placement | 9 | 9 | 0 | 0 | 9 | 0 | ✓ |
| 26402ffe-fa58-4def-8d15-2374572715e3 | object | 9 | 9 | 0 | 0 | 9 | 0 | ✓ |
| 26402ffe-fa58-4def-8d15-2374572715e3 | mount | 8 | 8 | 0 | 0 | 8 | 0 | ✓ |
| 3a9cf7d6-b0c7-4683-bd6c-50a44248363b | placement | 1 | 1 | 0 | 0 | 1 | 0 | ✓ |
| 3a9cf7d6-b0c7-4683-bd6c-50a44248363b | object | 1 | 1 | 0 | 0 | 1 | 0 | ✓ |
| 3a9cf7d6-b0c7-4683-bd6c-50a44248363b | mount | 1 | 1 | 0 | 0 | 1 | 0 | ✓ |
| 3d1c7a3e-6bbd-4546-8d33-a8828c8394ce | placement | 6 | 6 | 0 | 0 | 6 | 0 | ✓ |
| 3d1c7a3e-6bbd-4546-8d33-a8828c8394ce | object | 6 | 6 | 0 | 0 | 6 | 0 | ✓ |
| 3d1c7a3e-6bbd-4546-8d33-a8828c8394ce | mount | 5 | 5 | 0 | 0 | 5 | 0 | ✓ |
| 46ea5e7f-651d-4357-8d19-142d7ba373d3 | placement | 1 | 1 | 0 | 0 | 1 | 0 | ✓ |
| 46ea5e7f-651d-4357-8d19-142d7ba373d3 | object | 1 | 1 | 0 | 0 | 1 | 0 | ✓ |
| 46ea5e7f-651d-4357-8d19-142d7ba373d3 | mount | 1 | 1 | 0 | 0 | 1 | 0 | ✓ |
| 67ebe34c-e77c-4922-bf1e-b3b5f6284a98 | placement | 1 | 1 | 0 | 0 | 1 | 0 | ✓ |
| 67ebe34c-e77c-4922-bf1e-b3b5f6284a98 | object | 1 | 1 | 0 | 0 | 1 | 0 | ✓ |
| 67ebe34c-e77c-4922-bf1e-b3b5f6284a98 | mount | 1 | 1 | 0 | 0 | 1 | 0 | ✓ |
| 9bfc6e17-25cb-4701-b1e2-03cc7588e6c8 | placement | 1 | 1 | 0 | 0 | 1 | 0 | ✓ |
| 9bfc6e17-25cb-4701-b1e2-03cc7588e6c8 | object | 1 | 1 | 0 | 0 | 1 | 0 | ✓ |
| 9bfc6e17-25cb-4701-b1e2-03cc7588e6c8 | mount | 1 | 1 | 0 | 0 | 1 | 0 | ✓ |
| a877719c-8a1d-4a70-b2a7-ed1fa4bcd90b | placement | 1 | 1 | 0 | 0 | 1 | 0 | ✓ |
| a877719c-8a1d-4a70-b2a7-ed1fa4bcd90b | object | 1 | 1 | 0 | 0 | 1 | 0 | ✓ |
| a877719c-8a1d-4a70-b2a7-ed1fa4bcd90b | mount | 1 | 1 | 0 | 0 | 1 | 0 | ✓ |
| be75c6b9-395f-4c02-b99a-75b595e1fd27 | placement | 7 | 7 | 0 | 0 | 7 | 0 | ✓ |
| be75c6b9-395f-4c02-b99a-75b595e1fd27 | object | 7 | 7 | 0 | 0 | 7 | 0 | ✓ |
| be75c6b9-395f-4c02-b99a-75b595e1fd27 | mount | 7 | 7 | 0 | 0 | 7 | 0 | ✓ |
| cd99c591-3059-4efa-9c7c-2c0b2dbacb92 | placement | 1 | 1 | 0 | 0 | 1 | 0 | ✓ |
| cd99c591-3059-4efa-9c7c-2c0b2dbacb92 | object | 1 | 1 | 0 | 0 | 1 | 0 | ✓ |
| cd99c591-3059-4efa-9c7c-2c0b2dbacb92 | mount | 1 | 1 | 0 | 0 | 1 | 0 | ✓ |
| db3b8f3d-e6bb-412a-a95b-bac493c82fb8 | placement | 1 | 1 | 0 | 0 | 1 | 0 | ✓ |
| db3b8f3d-e6bb-412a-a95b-bac493c82fb8 | object | 1 | 1 | 0 | 0 | 1 | 0 | ✓ |
| db3b8f3d-e6bb-412a-a95b-bac493c82fb8 | mount | 1 | 1 | 0 | 0 | 1 | 0 | ✓ |
| e2e988bf-0bd6-4703-8bfe-b1c9b223403f | placement | 1 | 1 | 0 | 0 | 1 | 0 | ✓ |
| e2e988bf-0bd6-4703-8bfe-b1c9b223403f | object | 1 | 1 | 0 | 0 | 1 | 0 | ✓ |
| e2e988bf-0bd6-4703-8bfe-b1c9b223403f | mount | 1 | 1 | 0 | 0 | 1 | 0 | ✓ |

#### legacy 分母（封存，不并入三表）

| note | legacy 行 | legacy-only | legacy-ambiguous | dual-any | dual-active |
| --- | --- | --- | --- | --- | --- |
| 0b15c033-e0ef-4253-a0a6-7a647702852b | 1 | 0 | 0 | 0 | 0 |
| 26402ffe-fa58-4def-8d15-2374572715e3 | 8 | 0 | 0 | 0 | 0 |
| 3a9cf7d6-b0c7-4683-bd6c-50a44248363b | 1 | 0 | 0 | 0 | 0 |
| 3d1c7a3e-6bbd-4546-8d33-a8828c8394ce | 5 | 0 | 0 | 0 | 0 |
| 46ea5e7f-651d-4357-8d19-142d7ba373d3 | 1 | 0 | 0 | 0 | 0 |
| 67ebe34c-e77c-4922-bf1e-b3b5f6284a98 | 1 | 0 | 0 | 0 | 0 |
| 9bfc6e17-25cb-4701-b1e2-03cc7588e6c8 | 1 | 0 | 0 | 0 | 0 |
| a877719c-8a1d-4a70-b2a7-ed1fa4bcd90b | 1 | 0 | 0 | 0 | 0 |
| be75c6b9-395f-4c02-b99a-75b595e1fd27 | 7 | 0 | 0 | 0 | 0 |
| cd99c591-3059-4efa-9c7c-2c0b2dbacb92 | 1 | 0 | 0 | 0 | 0 |
| db3b8f3d-e6bb-412a-a95b-bac493c82fb8 | 1 | 0 | 0 | 0 | 0 |
| e2e988bf-0bd6-4703-8bfe-b1c9b223403f | 1 | 0 | 0 | 0 | 0 |

#### 去处分配明细

| note | 单位 | 行 ID | 预计去处 | 依据 | 需人裁 | 坐标判定 |
| --- | --- | --- | --- | --- | --- | --- |
| 0b15c033-e0ef-4253-a0a6-7a647702852b | placement | 638dd6f6-6e0e-4885-8c49-7c61adeb7330 | original | inside_unchanged | 否 | ambiguous |
| 26402ffe-fa58-4def-8d15-2374572715e3 | placement | canvas-placement:26402ffe-fa58-4def-8d15-2374572715e3:page-frame:primary-page-frame | original | structural_frame | 否 | not_applicable |
| 26402ffe-fa58-4def-8d15-2374572715e3 | placement | 02c18816-22e3-4a60-a3fd-e98eb88dcf25 | original | inside_unchanged | 否 | ambiguous |
| 26402ffe-fa58-4def-8d15-2374572715e3 | placement | 643c3108-69aa-4f30-9651-c3bfacc74123 | original | inside_unchanged | 否 | ambiguous |
| 26402ffe-fa58-4def-8d15-2374572715e3 | placement | 35df3d60-934d-4971-b635-19a71bbf5b70 | original | inside_unchanged | 否 | ambiguous |
| 26402ffe-fa58-4def-8d15-2374572715e3 | placement | 8173a657-0a5e-4ac9-92d8-7a2897cdb6dc | original | inside_unchanged | 否 | ambiguous |
| 26402ffe-fa58-4def-8d15-2374572715e3 | placement | 452bafef-191a-4306-9f1b-77153be3002a | original | inside_unchanged | 否 | ambiguous |
| 26402ffe-fa58-4def-8d15-2374572715e3 | placement | 172cfb09-c616-49c3-a017-eef927256305 | original | inside_unchanged | 否 | ambiguous |
| 26402ffe-fa58-4def-8d15-2374572715e3 | placement | 64b47c41-d363-4514-aab6-4bff2b1109f4 | original | inside_unchanged | 否 | ambiguous |
| 26402ffe-fa58-4def-8d15-2374572715e3 | placement | 6f134a5a-17d0-4dfd-97c9-2e80ec79c146 | original | inside_unchanged | 否 | ambiguous |
| 3a9cf7d6-b0c7-4683-bd6c-50a44248363b | placement | e9745993-5eda-4285-a80a-4e7ca9106324 | original | inside_unchanged | 否 | ambiguous |
| 3d1c7a3e-6bbd-4546-8d33-a8828c8394ce | placement | canvas-placement:3d1c7a3e-6bbd-4546-8d33-a8828c8394ce:page-frame:primary-page-frame | original | structural_frame | 否 | not_applicable |
| 3d1c7a3e-6bbd-4546-8d33-a8828c8394ce | placement | 7729a10f-c621-465c-bd31-e4955c658e2e | original | inside_unchanged | 否 | ambiguous |
| 3d1c7a3e-6bbd-4546-8d33-a8828c8394ce | placement | 61cfce15-fd7a-4b11-b8f2-e79a4e5c2323 | original | inside_unchanged | 否 | ambiguous |
| 3d1c7a3e-6bbd-4546-8d33-a8828c8394ce | placement | 6632fb7a-7f4b-4827-8588-ffbccd5ebfe9 | original | inside_unchanged | 否 | ambiguous |
| 3d1c7a3e-6bbd-4546-8d33-a8828c8394ce | placement | 3f7cefa9-cd5a-4e9c-9f9e-7437ec453eb2 | original | inside_unchanged | 否 | ambiguous |
| 3d1c7a3e-6bbd-4546-8d33-a8828c8394ce | placement | 642cb259-18bf-4c5f-92f4-23898009fbf1 | original | inside_unchanged | 否 | ambiguous |
| 46ea5e7f-651d-4357-8d19-142d7ba373d3 | placement | d9b8cec5-7bd1-4632-8dc8-5a1bb8acb2cb | original | inside_unchanged | 否 | ambiguous |
| 67ebe34c-e77c-4922-bf1e-b3b5f6284a98 | placement | 04ca3469-9074-49b1-a5d7-d9a7fc45ea1b | original | inside_unchanged | 否 | ambiguous |
| 9bfc6e17-25cb-4701-b1e2-03cc7588e6c8 | placement | 10baf642-fabb-47ea-bc16-e9c227e64a9e | original | inside_unchanged | 否 | ambiguous |
| a877719c-8a1d-4a70-b2a7-ed1fa4bcd90b | placement | bf5d1633-e568-49e2-9926-c409b1503509 | original | inside_unchanged | 否 | ambiguous |
| be75c6b9-395f-4c02-b99a-75b595e1fd27 | placement | 83187107-032d-4563-af31-dacae5c88b71 | original | inside_unchanged | 否 | ambiguous |
| be75c6b9-395f-4c02-b99a-75b595e1fd27 | placement | 7bafeb90-dac2-4bcf-bcfe-c5093f947988 | original | inside_unchanged | 否 | ambiguous |
| be75c6b9-395f-4c02-b99a-75b595e1fd27 | placement | 33c9a1ec-6102-42a8-9d58-65852d14478e | original | inside_unchanged | 否 | ambiguous |
| be75c6b9-395f-4c02-b99a-75b595e1fd27 | placement | 3794ae7e-854e-4b21-a471-331bda80151d | original | inside_unchanged | 否 | ambiguous |
| be75c6b9-395f-4c02-b99a-75b595e1fd27 | placement | 2ee35249-0bc3-473e-9453-d4c18d131052 | original | inside_unchanged | 否 | ambiguous |
| be75c6b9-395f-4c02-b99a-75b595e1fd27 | placement | 4c27a7fc-d775-41b1-94bb-3cc67bb780d7 | original | inside_unchanged | 否 | ambiguous |
| be75c6b9-395f-4c02-b99a-75b595e1fd27 | placement | b6000d8e-dc0b-4365-8c0b-37f80ebd30fa | original | inside_unchanged | 否 | ambiguous |
| cd99c591-3059-4efa-9c7c-2c0b2dbacb92 | placement | 032b14ad-4db6-4819-8787-8a360315f4c3 | original | inside_unchanged | 否 | ambiguous |
| db3b8f3d-e6bb-412a-a95b-bac493c82fb8 | placement | 5d312cf3-3cb3-4225-9e05-bd2acee49888 | original | inside_unchanged | 否 | ambiguous |
| e2e988bf-0bd6-4703-8bfe-b1c9b223403f | placement | 58ad8d57-8264-4a2a-9905-547fd604a70a | original | inside_unchanged | 否 | ambiguous |
| 0b15c033-e0ef-4253-a0a6-7a647702852b | object | canvas-object:0b15c033-e0ef-4253-a0a6-7a647702852b:block-placement:638dd6f6-6e0e-4885-8c49-7c61adeb7330 | original | block_identity_retained | 否 | — |
| 26402ffe-fa58-4def-8d15-2374572715e3 | object | canvas-object:26402ffe-fa58-4def-8d15-2374572715e3:page-frame:primary-page-frame | original | structural_frame | 否 | — |
| 26402ffe-fa58-4def-8d15-2374572715e3 | object | canvas-object:26402ffe-fa58-4def-8d15-2374572715e3:block-placement:02c18816-22e3-4a60-a3fd-e98eb88dcf25 | original | block_identity_retained | 否 | — |
| 26402ffe-fa58-4def-8d15-2374572715e3 | object | canvas-object:26402ffe-fa58-4def-8d15-2374572715e3:block-placement:643c3108-69aa-4f30-9651-c3bfacc74123 | original | block_identity_retained | 否 | — |
| 26402ffe-fa58-4def-8d15-2374572715e3 | object | canvas-object:26402ffe-fa58-4def-8d15-2374572715e3:block-placement:35df3d60-934d-4971-b635-19a71bbf5b70 | original | block_identity_retained | 否 | — |
| 26402ffe-fa58-4def-8d15-2374572715e3 | object | canvas-object:26402ffe-fa58-4def-8d15-2374572715e3:block-placement:8173a657-0a5e-4ac9-92d8-7a2897cdb6dc | original | block_identity_retained | 否 | — |
| 26402ffe-fa58-4def-8d15-2374572715e3 | object | canvas-object:26402ffe-fa58-4def-8d15-2374572715e3:block-placement:452bafef-191a-4306-9f1b-77153be3002a | original | block_identity_retained | 否 | — |
| 26402ffe-fa58-4def-8d15-2374572715e3 | object | canvas-object:26402ffe-fa58-4def-8d15-2374572715e3:block-placement:172cfb09-c616-49c3-a017-eef927256305 | original | block_identity_retained | 否 | — |
| 26402ffe-fa58-4def-8d15-2374572715e3 | object | canvas-object:26402ffe-fa58-4def-8d15-2374572715e3:block-placement:64b47c41-d363-4514-aab6-4bff2b1109f4 | original | block_identity_retained | 否 | — |
| 26402ffe-fa58-4def-8d15-2374572715e3 | object | canvas-object:26402ffe-fa58-4def-8d15-2374572715e3:block-placement:6f134a5a-17d0-4dfd-97c9-2e80ec79c146 | original | block_identity_retained | 否 | — |
| 3a9cf7d6-b0c7-4683-bd6c-50a44248363b | object | canvas-object:3a9cf7d6-b0c7-4683-bd6c-50a44248363b:block-placement:e9745993-5eda-4285-a80a-4e7ca9106324 | original | block_identity_retained | 否 | — |
| 3d1c7a3e-6bbd-4546-8d33-a8828c8394ce | object | canvas-object:3d1c7a3e-6bbd-4546-8d33-a8828c8394ce:page-frame:primary-page-frame | original | structural_frame | 否 | — |
| 3d1c7a3e-6bbd-4546-8d33-a8828c8394ce | object | canvas-object:3d1c7a3e-6bbd-4546-8d33-a8828c8394ce:block-placement:7729a10f-c621-465c-bd31-e4955c658e2e | original | block_identity_retained | 否 | — |
| 3d1c7a3e-6bbd-4546-8d33-a8828c8394ce | object | canvas-object:3d1c7a3e-6bbd-4546-8d33-a8828c8394ce:block-placement:61cfce15-fd7a-4b11-b8f2-e79a4e5c2323 | original | block_identity_retained | 否 | — |
| 3d1c7a3e-6bbd-4546-8d33-a8828c8394ce | object | canvas-object:3d1c7a3e-6bbd-4546-8d33-a8828c8394ce:block-placement:6632fb7a-7f4b-4827-8588-ffbccd5ebfe9 | original | block_identity_retained | 否 | — |
| 3d1c7a3e-6bbd-4546-8d33-a8828c8394ce | object | canvas-object:3d1c7a3e-6bbd-4546-8d33-a8828c8394ce:block-placement:3f7cefa9-cd5a-4e9c-9f9e-7437ec453eb2 | original | block_identity_retained | 否 | — |
| 3d1c7a3e-6bbd-4546-8d33-a8828c8394ce | object | canvas-object:3d1c7a3e-6bbd-4546-8d33-a8828c8394ce:block-placement:642cb259-18bf-4c5f-92f4-23898009fbf1 | original | block_identity_retained | 否 | — |
| 46ea5e7f-651d-4357-8d19-142d7ba373d3 | object | canvas-object:46ea5e7f-651d-4357-8d19-142d7ba373d3:block-placement:d9b8cec5-7bd1-4632-8dc8-5a1bb8acb2cb | original | block_identity_retained | 否 | — |
| 67ebe34c-e77c-4922-bf1e-b3b5f6284a98 | object | canvas-object:67ebe34c-e77c-4922-bf1e-b3b5f6284a98:block-placement:04ca3469-9074-49b1-a5d7-d9a7fc45ea1b | original | block_identity_retained | 否 | — |
| 9bfc6e17-25cb-4701-b1e2-03cc7588e6c8 | object | canvas-object:9bfc6e17-25cb-4701-b1e2-03cc7588e6c8:block-placement:10baf642-fabb-47ea-bc16-e9c227e64a9e | original | block_identity_retained | 否 | — |
| a877719c-8a1d-4a70-b2a7-ed1fa4bcd90b | object | canvas-object:a877719c-8a1d-4a70-b2a7-ed1fa4bcd90b:block-placement:bf5d1633-e568-49e2-9926-c409b1503509 | original | block_identity_retained | 否 | — |
| be75c6b9-395f-4c02-b99a-75b595e1fd27 | object | canvas-object:be75c6b9-395f-4c02-b99a-75b595e1fd27:block-placement:83187107-032d-4563-af31-dacae5c88b71 | original | block_identity_retained | 否 | — |
| be75c6b9-395f-4c02-b99a-75b595e1fd27 | object | canvas-object:be75c6b9-395f-4c02-b99a-75b595e1fd27:block-placement:7bafeb90-dac2-4bcf-bcfe-c5093f947988 | original | block_identity_retained | 否 | — |
| be75c6b9-395f-4c02-b99a-75b595e1fd27 | object | canvas-object:be75c6b9-395f-4c02-b99a-75b595e1fd27:block-placement:33c9a1ec-6102-42a8-9d58-65852d14478e | original | block_identity_retained | 否 | — |
| be75c6b9-395f-4c02-b99a-75b595e1fd27 | object | canvas-object:be75c6b9-395f-4c02-b99a-75b595e1fd27:block-placement:3794ae7e-854e-4b21-a471-331bda80151d | original | block_identity_retained | 否 | — |
| be75c6b9-395f-4c02-b99a-75b595e1fd27 | object | canvas-object:be75c6b9-395f-4c02-b99a-75b595e1fd27:block-placement:2ee35249-0bc3-473e-9453-d4c18d131052 | original | block_identity_retained | 否 | — |
| be75c6b9-395f-4c02-b99a-75b595e1fd27 | object | canvas-object:be75c6b9-395f-4c02-b99a-75b595e1fd27:block-placement:4c27a7fc-d775-41b1-94bb-3cc67bb780d7 | original | block_identity_retained | 否 | — |
| be75c6b9-395f-4c02-b99a-75b595e1fd27 | object | canvas-object:be75c6b9-395f-4c02-b99a-75b595e1fd27:block-placement:b6000d8e-dc0b-4365-8c0b-37f80ebd30fa | original | block_identity_retained | 否 | — |
| cd99c591-3059-4efa-9c7c-2c0b2dbacb92 | object | canvas-object:cd99c591-3059-4efa-9c7c-2c0b2dbacb92:block-placement:032b14ad-4db6-4819-8787-8a360315f4c3 | original | block_identity_retained | 否 | — |
| db3b8f3d-e6bb-412a-a95b-bac493c82fb8 | object | canvas-object:db3b8f3d-e6bb-412a-a95b-bac493c82fb8:block-placement:5d312cf3-3cb3-4225-9e05-bd2acee49888 | original | block_identity_retained | 否 | — |
| e2e988bf-0bd6-4703-8bfe-b1c9b223403f | object | canvas-object:e2e988bf-0bd6-4703-8bfe-b1c9b223403f:block-placement:58ad8d57-8264-4a2a-9905-547fd604a70a | original | block_identity_retained | 否 | — |
| 26402ffe-fa58-4def-8d15-2374572715e3 | mount | content-mount:8173a657-0a5e-4ac9-92d8-7a2897cdb6dc | original | other_surface_unchanged | 否 | — |
| 26402ffe-fa58-4def-8d15-2374572715e3 | mount | content-mount:02c18816-22e3-4a60-a3fd-e98eb88dcf25 | original | other_surface_unchanged | 否 | — |
| cd99c591-3059-4efa-9c7c-2c0b2dbacb92 | mount | content-mount:032b14ad-4db6-4819-8787-8a360315f4c3 | original | other_surface_unchanged | 否 | — |
| 0b15c033-e0ef-4253-a0a6-7a647702852b | mount | content-mount:638dd6f6-6e0e-4885-8c49-7c61adeb7330 | original | other_surface_unchanged | 否 | — |
| be75c6b9-395f-4c02-b99a-75b595e1fd27 | mount | content-mount:2ee35249-0bc3-473e-9453-d4c18d131052 | original | other_surface_unchanged | 否 | — |
| 26402ffe-fa58-4def-8d15-2374572715e3 | mount | content-mount:643c3108-69aa-4f30-9651-c3bfacc74123 | original | other_surface_unchanged | 否 | — |
| a877719c-8a1d-4a70-b2a7-ed1fa4bcd90b | mount | content-mount:bf5d1633-e568-49e2-9926-c409b1503509 | original | other_surface_unchanged | 否 | — |
| 3d1c7a3e-6bbd-4546-8d33-a8828c8394ce | mount | content-mount:3f7cefa9-cd5a-4e9c-9f9e-7437ec453eb2 | original | other_surface_unchanged | 否 | — |
| 3d1c7a3e-6bbd-4546-8d33-a8828c8394ce | mount | content-mount:642cb259-18bf-4c5f-92f4-23898009fbf1 | original | other_surface_unchanged | 否 | — |
| e2e988bf-0bd6-4703-8bfe-b1c9b223403f | mount | content-mount:58ad8d57-8264-4a2a-9905-547fd604a70a | original | other_surface_unchanged | 否 | — |
| 67ebe34c-e77c-4922-bf1e-b3b5f6284a98 | mount | content-mount:04ca3469-9074-49b1-a5d7-d9a7fc45ea1b | original | other_surface_unchanged | 否 | — |
| 26402ffe-fa58-4def-8d15-2374572715e3 | mount | content-mount:64b47c41-d363-4514-aab6-4bff2b1109f4 | original | other_surface_unchanged | 否 | — |
| 26402ffe-fa58-4def-8d15-2374572715e3 | mount | content-mount:172cfb09-c616-49c3-a017-eef927256305 | original | other_surface_unchanged | 否 | — |
| 3a9cf7d6-b0c7-4683-bd6c-50a44248363b | mount | content-mount:e9745993-5eda-4285-a80a-4e7ca9106324 | original | other_surface_unchanged | 否 | — |
| 9bfc6e17-25cb-4701-b1e2-03cc7588e6c8 | mount | content-mount:10baf642-fabb-47ea-bc16-e9c227e64a9e | original | other_surface_unchanged | 否 | — |
| 3d1c7a3e-6bbd-4546-8d33-a8828c8394ce | mount | content-mount:61cfce15-fd7a-4b11-b8f2-e79a4e5c2323 | original | other_surface_unchanged | 否 | — |
| be75c6b9-395f-4c02-b99a-75b595e1fd27 | mount | content-mount:33c9a1ec-6102-42a8-9d58-65852d14478e | original | other_surface_unchanged | 否 | — |
| be75c6b9-395f-4c02-b99a-75b595e1fd27 | mount | content-mount:4c27a7fc-d775-41b1-94bb-3cc67bb780d7 | original | other_surface_unchanged | 否 | — |
| 3d1c7a3e-6bbd-4546-8d33-a8828c8394ce | mount | content-mount:6632fb7a-7f4b-4827-8588-ffbccd5ebfe9 | original | other_surface_unchanged | 否 | — |
| 26402ffe-fa58-4def-8d15-2374572715e3 | mount | content-mount:35df3d60-934d-4971-b635-19a71bbf5b70 | original | other_surface_unchanged | 否 | — |
| 26402ffe-fa58-4def-8d15-2374572715e3 | mount | content-mount:452bafef-191a-4306-9f1b-77153be3002a | original | other_surface_unchanged | 否 | — |
| 3d1c7a3e-6bbd-4546-8d33-a8828c8394ce | mount | content-mount:7729a10f-c621-465c-bd31-e4955c658e2e | original | other_surface_unchanged | 否 | — |
| 46ea5e7f-651d-4357-8d19-142d7ba373d3 | mount | content-mount:d9b8cec5-7bd1-4632-8dc8-5a1bb8acb2cb | original | other_surface_unchanged | 否 | — |
| be75c6b9-395f-4c02-b99a-75b595e1fd27 | mount | content-mount:83187107-032d-4563-af31-dacae5c88b71 | original | other_surface_unchanged | 否 | — |
| be75c6b9-395f-4c02-b99a-75b595e1fd27 | mount | content-mount:b6000d8e-dc0b-4365-8c0b-37f80ebd30fa | original | other_surface_unchanged | 否 | — |
| 26402ffe-fa58-4def-8d15-2374572715e3 | mount | content-mount:6f134a5a-17d0-4dfd-97c9-2e80ec79c146 | original | other_surface_unchanged | 否 | — |
| db3b8f3d-e6bb-412a-a95b-bac493c82fb8 | mount | content-mount:5d312cf3-3cb3-4225-9e05-bd2acee49888 | original | other_surface_unchanged | 否 | — |
| be75c6b9-395f-4c02-b99a-75b595e1fd27 | mount | content-mount:7bafeb90-dac2-4bcf-bcfe-c5093f947988 | original | other_surface_unchanged | 否 | — |
| be75c6b9-395f-4c02-b99a-75b595e1fd27 | mount | content-mount:3794ae7e-854e-4b21-a471-331bda80151d | original | other_surface_unchanged | 否 | — |

#### 坐标歧义清单（三解释全部保留）

| note | 单位 | 行 ID | 原因 | world | local | mixed (x-local + y-world) |
| --- | --- | --- | --- | --- | --- | --- |
| 0b15c033-e0ef-4253-a0a6-7a647702852b | placement | 638dd6f6-6e0e-4885-8c49-7c61adeb7330 | incomplete_evidence | resolved / no_valid_frames; 无相交页; 主帧比=unknown | origin_unknown / origin_unknown; 无相交页; 主帧比=unknown | origin_unknown / origin_unknown; 无相交页; 主帧比=unknown |
| 26402ffe-fa58-4def-8d15-2374572715e3 | placement | 02c18816-22e3-4a60-a3fd-e98eb88dcf25 | interpretation_disagreement | resolved / one_frame; primary-page-frame@page-stack-primary-page-frame:inside (1); 主帧比=1 | resolved / one_frame; primary-page-frame@page-stack-primary-page-frame:crossing (0.866171003717472); 主帧比=0.866171003717472 | resolved / one_frame; primary-page-frame@page-stack-primary-page-frame:crossing (0.866171003717472); 主帧比=0.866171003717472 |
| 26402ffe-fa58-4def-8d15-2374572715e3 | placement | 643c3108-69aa-4f30-9651-c3bfacc74123 | interpretation_disagreement | resolved / one_frame; primary-page-frame@page-stack-primary-page-frame:crossing (0.905263157894737); 主帧比=0.905263157894737 | resolved / one_frame; primary-page-frame@page-stack-primary-page-frame:inside (1); 主帧比=1 | resolved / one_frame; primary-page-frame@page-stack-primary-page-frame:inside (1); 主帧比=1 |
| 26402ffe-fa58-4def-8d15-2374572715e3 | placement | 35df3d60-934d-4971-b635-19a71bbf5b70 | interpretation_disagreement | resolved / one_frame; primary-page-frame@page-stack-primary-page-frame:crossing (0.905263157894737); 主帧比=0.905263157894737 | resolved / one_frame; primary-page-frame@page-stack-primary-page-frame:inside (1); 主帧比=1 | resolved / one_frame; primary-page-frame@page-stack-primary-page-frame:inside (1); 主帧比=1 |
| 26402ffe-fa58-4def-8d15-2374572715e3 | placement | 8173a657-0a5e-4ac9-92d8-7a2897cdb6dc | interpretation_disagreement | resolved / one_frame; primary-page-frame@page-stack-primary-page-frame:crossing (0.905263157894737); 主帧比=0.905263157894737 | resolved / one_frame; primary-page-frame@page-stack-primary-page-frame:inside (1); 主帧比=1 | resolved / one_frame; primary-page-frame@page-stack-primary-page-frame:inside (1); 主帧比=1 |
| 26402ffe-fa58-4def-8d15-2374572715e3 | placement | 452bafef-191a-4306-9f1b-77153be3002a | interpretation_disagreement | resolved / one_frame; primary-page-frame@page-stack-primary-page-frame:crossing (0.905263157894737); 主帧比=0.905263157894737 | resolved / one_frame; primary-page-frame@page-stack-primary-page-frame:inside (1); 主帧比=1 | resolved / one_frame; primary-page-frame@page-stack-primary-page-frame:inside (1); 主帧比=1 |
| 26402ffe-fa58-4def-8d15-2374572715e3 | placement | 172cfb09-c616-49c3-a017-eef927256305 | interpretation_disagreement | resolved / one_frame; primary-page-frame@page-stack-primary-page-frame:crossing (0.905263157894737); 主帧比=0.905263157894737 | resolved / one_frame; primary-page-frame@page-stack-primary-page-frame:inside (1); 主帧比=1 | resolved / one_frame; primary-page-frame@page-stack-primary-page-frame:inside (1); 主帧比=1 |
| 26402ffe-fa58-4def-8d15-2374572715e3 | placement | 64b47c41-d363-4514-aab6-4bff2b1109f4 | interpretation_disagreement | resolved / one_frame; primary-page-frame@page-stack-primary-page-frame:crossing (0.905263157894737); 主帧比=0.905263157894737 | resolved / one_frame; primary-page-frame@page-stack-primary-page-frame:inside (1); 主帧比=1 | resolved / one_frame; primary-page-frame@page-stack-primary-page-frame:inside (1); 主帧比=1 |
| 26402ffe-fa58-4def-8d15-2374572715e3 | placement | 6f134a5a-17d0-4dfd-97c9-2e80ec79c146 | interpretation_disagreement | resolved / one_frame; primary-page-frame@page-stack-primary-page-frame:crossing (0.905263157894737); 主帧比=0.905263157894737 | resolved / one_frame; primary-page-frame@page-stack-primary-page-frame:inside (1); 主帧比=1 | resolved / one_frame; primary-page-frame@page-stack-primary-page-frame:inside (1); 主帧比=1 |
| 3a9cf7d6-b0c7-4683-bd6c-50a44248363b | placement | e9745993-5eda-4285-a80a-4e7ca9106324 | incomplete_evidence | resolved / no_valid_frames; 无相交页; 主帧比=unknown | origin_unknown / origin_unknown; 无相交页; 主帧比=unknown | origin_unknown / origin_unknown; 无相交页; 主帧比=unknown |
| 3d1c7a3e-6bbd-4546-8d33-a8828c8394ce | placement | 7729a10f-c621-465c-bd31-e4955c658e2e | interpretation_disagreement | resolved / one_frame; primary-page-frame@page-stack-primary-page-frame:inside (1); 主帧比=1 | resolved / one_frame; primary-page-frame@page-stack-primary-page-frame:crossing (0.866171003717472); 主帧比=0.866171003717472 | resolved / one_frame; primary-page-frame@page-stack-primary-page-frame:crossing (0.866171003717472); 主帧比=0.866171003717472 |
| 3d1c7a3e-6bbd-4546-8d33-a8828c8394ce | placement | 61cfce15-fd7a-4b11-b8f2-e79a4e5c2323 | interpretation_disagreement | resolved / one_frame; primary-page-frame@page-stack-primary-page-frame:crossing (0.905263157894737); 主帧比=0.905263157894737 | resolved / one_frame; primary-page-frame@page-stack-primary-page-frame:inside (1); 主帧比=1 | resolved / one_frame; primary-page-frame@page-stack-primary-page-frame:inside (1); 主帧比=1 |
| 3d1c7a3e-6bbd-4546-8d33-a8828c8394ce | placement | 6632fb7a-7f4b-4827-8588-ffbccd5ebfe9 | interpretation_disagreement | resolved / one_frame; primary-page-frame@page-stack-primary-page-frame:crossing (0.905263157894737); 主帧比=0.905263157894737 | resolved / one_frame; primary-page-frame@page-stack-primary-page-frame:inside (1); 主帧比=1 | resolved / one_frame; primary-page-frame@page-stack-primary-page-frame:inside (1); 主帧比=1 |
| 3d1c7a3e-6bbd-4546-8d33-a8828c8394ce | placement | 3f7cefa9-cd5a-4e9c-9f9e-7437ec453eb2 | interpretation_disagreement | resolved / one_frame; primary-page-frame@page-stack-primary-page-frame:crossing (0.905263157894737); 主帧比=0.905263157894737 | resolved / one_frame; primary-page-frame@page-stack-primary-page-frame:inside (1); 主帧比=1 | resolved / one_frame; primary-page-frame@page-stack-primary-page-frame:inside (1); 主帧比=1 |
| 3d1c7a3e-6bbd-4546-8d33-a8828c8394ce | placement | 642cb259-18bf-4c5f-92f4-23898009fbf1 | interpretation_disagreement | resolved / one_frame; primary-page-frame@page-stack-primary-page-frame:crossing (0.905263157894737); 主帧比=0.905263157894737 | resolved / one_frame; primary-page-frame@page-stack-primary-page-frame:inside (1); 主帧比=1 | resolved / one_frame; primary-page-frame@page-stack-primary-page-frame:inside (1); 主帧比=1 |
| 46ea5e7f-651d-4357-8d19-142d7ba373d3 | placement | d9b8cec5-7bd1-4632-8dc8-5a1bb8acb2cb | incomplete_evidence | resolved / no_valid_frames; 无相交页; 主帧比=unknown | origin_unknown / origin_unknown; 无相交页; 主帧比=unknown | origin_unknown / origin_unknown; 无相交页; 主帧比=unknown |
| 67ebe34c-e77c-4922-bf1e-b3b5f6284a98 | placement | 04ca3469-9074-49b1-a5d7-d9a7fc45ea1b | incomplete_evidence | resolved / no_valid_frames; 无相交页; 主帧比=unknown | origin_unknown / origin_unknown; 无相交页; 主帧比=unknown | origin_unknown / origin_unknown; 无相交页; 主帧比=unknown |
| 9bfc6e17-25cb-4701-b1e2-03cc7588e6c8 | placement | 10baf642-fabb-47ea-bc16-e9c227e64a9e | incomplete_evidence | resolved / no_valid_frames; 无相交页; 主帧比=unknown | origin_unknown / origin_unknown; 无相交页; 主帧比=unknown | origin_unknown / origin_unknown; 无相交页; 主帧比=unknown |
| a877719c-8a1d-4a70-b2a7-ed1fa4bcd90b | placement | bf5d1633-e568-49e2-9926-c409b1503509 | incomplete_evidence | resolved / no_valid_frames; 无相交页; 主帧比=unknown | origin_unknown / origin_unknown; 无相交页; 主帧比=unknown | origin_unknown / origin_unknown; 无相交页; 主帧比=unknown |
| be75c6b9-395f-4c02-b99a-75b595e1fd27 | placement | 83187107-032d-4563-af31-dacae5c88b71 | incomplete_evidence | resolved / no_valid_frames; 无相交页; 主帧比=unknown | origin_unknown / origin_unknown; 无相交页; 主帧比=unknown | origin_unknown / origin_unknown; 无相交页; 主帧比=unknown |
| be75c6b9-395f-4c02-b99a-75b595e1fd27 | placement | 7bafeb90-dac2-4bcf-bcfe-c5093f947988 | incomplete_evidence | resolved / no_valid_frames; 无相交页; 主帧比=unknown | origin_unknown / origin_unknown; 无相交页; 主帧比=unknown | origin_unknown / origin_unknown; 无相交页; 主帧比=unknown |
| be75c6b9-395f-4c02-b99a-75b595e1fd27 | placement | 33c9a1ec-6102-42a8-9d58-65852d14478e | incomplete_evidence | resolved / no_valid_frames; 无相交页; 主帧比=unknown | origin_unknown / origin_unknown; 无相交页; 主帧比=unknown | origin_unknown / origin_unknown; 无相交页; 主帧比=unknown |
| be75c6b9-395f-4c02-b99a-75b595e1fd27 | placement | 3794ae7e-854e-4b21-a471-331bda80151d | incomplete_evidence | resolved / no_valid_frames; 无相交页; 主帧比=unknown | origin_unknown / origin_unknown; 无相交页; 主帧比=unknown | origin_unknown / origin_unknown; 无相交页; 主帧比=unknown |
| be75c6b9-395f-4c02-b99a-75b595e1fd27 | placement | 2ee35249-0bc3-473e-9453-d4c18d131052 | incomplete_evidence | resolved / no_valid_frames; 无相交页; 主帧比=unknown | origin_unknown / origin_unknown; 无相交页; 主帧比=unknown | origin_unknown / origin_unknown; 无相交页; 主帧比=unknown |
| be75c6b9-395f-4c02-b99a-75b595e1fd27 | placement | 4c27a7fc-d775-41b1-94bb-3cc67bb780d7 | incomplete_evidence | resolved / no_valid_frames; 无相交页; 主帧比=unknown | origin_unknown / origin_unknown; 无相交页; 主帧比=unknown | origin_unknown / origin_unknown; 无相交页; 主帧比=unknown |
| be75c6b9-395f-4c02-b99a-75b595e1fd27 | placement | b6000d8e-dc0b-4365-8c0b-37f80ebd30fa | incomplete_evidence | resolved / no_valid_frames; 无相交页; 主帧比=unknown | origin_unknown / origin_unknown; 无相交页; 主帧比=unknown | origin_unknown / origin_unknown; 无相交页; 主帧比=unknown |
| cd99c591-3059-4efa-9c7c-2c0b2dbacb92 | placement | 032b14ad-4db6-4819-8787-8a360315f4c3 | incomplete_evidence | resolved / no_valid_frames; 无相交页; 主帧比=unknown | origin_unknown / origin_unknown; 无相交页; 主帧比=unknown | origin_unknown / origin_unknown; 无相交页; 主帧比=unknown |
| db3b8f3d-e6bb-412a-a95b-bac493c82fb8 | placement | 5d312cf3-3cb3-4225-9e05-bd2acee49888 | incomplete_evidence | resolved / no_valid_frames; 无相交页; 主帧比=unknown | origin_unknown / origin_unknown; 无相交页; 主帧比=unknown | origin_unknown / origin_unknown; 无相交页; 主帧比=unknown |
| e2e988bf-0bd6-4703-8bfe-b1c9b223403f | placement | 58ad8d57-8264-4a2a-9905-547fd604a70a | incomplete_evidence | resolved / no_valid_frames; 无相交页; 主帧比=unknown | origin_unknown / origin_unknown; 无相交页; 主帧比=unknown | origin_unknown / origin_unknown; 无相交页; 主帧比=unknown |

#### 未执行

未迁移、未建备份表、未改坐标、未写 events、未改产品行为或 UI；未开启 crossing 收编。真实用户库执行留 HQ/Henry 扳机日。
未测真实存量或大库耗时；旋转/坏帧/无绑定等只报告证据不足。当前文件不能替代坐标消费链切换、真实迁移后复测或人工验收。

