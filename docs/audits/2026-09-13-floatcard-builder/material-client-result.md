> **状态 (Status)**: complete / 客户端修约施工
> **层 (Layer)**: 审计 / Material 增量回执
> **日期 (Updated)**: 2026-09-13
> **执行者**: Codex builder / client_material

# materialPreset 客户端增量

已完成补遗一的客户端链路。`readSkin` 只保留四出厂枚举，`resolveSkin` 在每个有效挂点重新解析材质：选择自身 `materialPreset` → 所绑套装 `materialPreset` → 工厂 preset；旧套装没有谱系时保持原默认材质，不按颜色猜来源。返回的完整解析值包含生效材质。

Note 样式、runtime/portal/print 的材质选择属性、暖纸阴影裁切边界及 Board 网格/字重等原 preset 分支均消费 `materialPreset ?? preset`。`useNoteSkin` 对外材质跟随临时 renderedResolved，而 committedResolved 保存提交态；因此 hover 的整纸材料与颜色同时预览，离开回滚，仍无保存调用。缩略纸样及命名对话框复用材质变量并绘制暖纸渐变、阴影与装订边；内联颜色使用 backgroundColor，避免简写覆盖背景图。

存为套装与“更新套装为当前样子”随 tokens/components 同包提交当前解析材质。绑定新套装只记 suite 引用，普通绑定者持续跟随更新后的材质。显式换绑移除旧 selection 的 materialPreset，保留颜色/部件偏差；单项修改与还原保留快照谱系。

DELETE 回执与列表刷新缺失项均保存材质 tombstone。已挂载消费者和旧草稿的 detach 优先选择自身谱系，其次套装谱系，再次默认；与服务端规则一致。palette 冻结和现役保存排序继续保留。删除后的完整纸面样式与删除前逐项相等。

定向验证：6 个测试文件、83 项全部通过：skinPresets 24、useSkinSuites 7、SkinFloatCard 16、useNoteSkin 11、boardSkinStyles 6、NoteChromeLayer 19。新增 10 项覆盖枚举/继承/旧套装、跨页刷新、暖纸整链完整外观、hover 材质零写、更新套装替换材质以及四工厂 Board 快照。client `node node_modules/typescript/bin/tsc -b` 最终 exit 0；首次仅两处新测试使用 `.at` 超出目标 lib，已改数组索引后补验通过。没有改变产品代码来迎合测试。

逐文件增量见 [material-client-numstat.json](material-client-numstat.json)：18 文件 **+164/-44**。所有文件编辑前已保存原字节，统计采用 CRLF 规范化行 LCS，附原/现 SHA-256；不是 git numstat，也没有使用 git。

全库后补验：主 builder 的 157 文件 / 1644 项首跑为 1643 通过、1 失败。唯一失败是 `useNoteCanvasDataAdapter.skin.test.tsx` 中旧 detach 请求的精确断言没有包含新谱系字段。已将 DELETE 夹具明确设为暖纸谱系，并要求原笔记保存请求完整携带 `materialPreset: warm-paper`，导航隔离与保存排空断言保持。该文件 12/12 补跑通过，见 [material-client-supplement.log](material-client-supplement.log)。补改仅两行测试，产品代码没有变化；无需因此重复全库。

按 React Best Practices 技能对多 TSX 改动完成局部复查：未增加 effect 或事件监听，临时材质由已有 resolved 状态派生，现有请求去重/写队列保持；没有新自由材料参数、额外 token、取色器内部改动或 placement 改动。真实浏览器、全库与允许静态门由主 builder 合并执行，本回执不代替它们或 HQ 放行。
