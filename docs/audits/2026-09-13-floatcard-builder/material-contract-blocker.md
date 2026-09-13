> **状态 (Status)**: superseded
> **层 (Layer)**: Builder evidence / 契约冲突举证
> **日期 (Updated)**: 2026-09-13
> **权威 (Authoritative)**: 否；修约前冲突的历史证据

# 套装快照不能保留现役出厂材质

**已解决（2026-09-13）**：HQ 补遗一批准 materialPreset 材质谱系指针，施工及暖纸全链复验已完成，见 [真浏览器复验](material-browser-smoke.md)。下文保留裁定前的原始举证，不再表示现状阻断。

本单第三节将套装限定为 `tokens + components`，迁移 071 只列六个字段，且明言不需要 origin；同时要求「存为套装」保留当前样子、删除套装后纸面不变。现役 `client/src/pages/Notes/canvasEngine/paperSkinStyles.ts:132` 的 `buildPaperMaterialStyles(tokens, preset)` 还消费 **preset 身份**：暖纸产生纸面渐变、桌面渐变、装订阴影与页边墙；工作台产生页边刻度。这些渲染属性没有进入 tokens 或 components。

因此相同的 tokens/components 不能唯一决定当前纸的完整外观。把 `warm-paper` 改绑为 `suite:<uuid>` 后，材质分支不再命中；删除后降级到 `default + 完整 overrides/components` 也不能恢复该身份信息。不能靠颜色近似反推来源：例如 `default` 配完整暖纸颜色覆盖，与 `warm-paper` 本身可具有相同 tokens/components，现役材质却不同。

主线程真浏览器证据见 [material-contract-evidence.json](material-contract-evidence.json)：保存前后 `--sk-ink` 同为 `#315D83`，`--sk-paper` 同为 `#F7F3EA`；保存前 `--paper-material-fill` 是暖纸渐变、`--paper-material-shadow` 有值、`--sk-wall-idle` 为 `0.55`，保存后前两项消失、墙值变成 `0`。这是可见材质丢失，不能以 tokens/components 逐字相同替代「当前样子」验收。

**候选修约方案（未实现）**：增加可选 `materialPreset`，值域仅现有四个出厂 preset ID，不增加 token 词汇。出厂绑定未显式设置时继续沿用现役 preset 身份；存套装与「更新套装为当前样子」携带当前有效 materialPreset；套装持久层保存该身份；删除事务同时把它写入消费者 detach snapshot，DELETE 回包与客户端 tombstone 同步携带。读取旧套装缺省值的兼容策略也须明确。这样颜色、部件仍按现役覆盖规则生效，材质身份不依赖颜色猜测。

该方案需要扩展本单六字段持久契约及 selection / create / update / delete 契约，属于规格决策，builder 未自行实施。当前只把 `buildPaperMaterialStyles` 的参数类型拓宽为合法 SkinSelection 绑定；其渲染规则没有改变。此项裁定前不能宣称「存为套装后纸面零变」已通过。
