> **状态 (Status)**: active
> **层 (Layer)**: builder 验证收据
> **日期 (Updated)**: 2026-09-11
> **权威 (Authoritative)**: 否；证据范围以下列实际运行记录为准

# E3 Selection builder 证据

工单：[E3 Selection 模式](../../agent-ops/handoffs/2026-09-11-v13-5-e3-selection-mode-order.md)。未 git commit；待 HQ 复核。

## 交付与验证

- [implementation.diff](implementation.diff)：8 个既有源码/测试文件修改，1 个新增测试文件。生产代码仅 5 个客户端文件，无 schema、服务端或 TextFlow 内核改动。
- [tests.log](tests.log)：11 文件 / **99 项通过**，新增 **13 项**，Vitest 6.34s。覆盖三档屏幕容差、单选/跨页替换、modal 宿主、选中视觉、缩放拖动与页界、取消/失败、禁用面、文本/媒体点击、保存后保持选中，以及真实 adapter + 现役 history 的移动/删除回放。
- [static.log](static.log)：`canvasRuntimeBoundaryCheck.mjs` **167/167 PASS**，64ms。按本单仅跑受影响静态门，未运行包含安全检查的全库 verify omnibus，也未改 verify 接线。
- [build.log](build.log)：`tsc -b` **exit 0**（30.427s）；`vite build` **exit 0**（Vite 5.93s）。既有混合导入与 chunk 体积警告仍在。
- [validation-manifest.json](validation-manifest.json)：交付源码 SHA-256，便于核对回执所对应的版本。

## 真浏览器冒烟

真实 Chrome，真实应用及服务端，在 Test 项目中新建专用笔记 `E3 builder smoke 2026-09-11`，ID `eb0fa550-c96a-41a7-bf1c-2aaf7ded9fd9`。未修改其他笔记。测试笔记保留供复核。

[browser-observations.json](browser-observations.json) 是本会话 CUA 操作及只读 DOM 输出的人工转录，包含笔画 ID、移动前后 transform、回放与刷新结果；不是模拟 API 输出。

1. Selection 默认激活。经现役空白书写入口输入 `E3 Selection writing remains unchanged.`，失焦保存、刷新后正文一致。
2. Pen 画一笔后仍为 Pen；显式切回 Selection，距线中心约 6 CSS px 的点击选中笔画。最终蓝色加宽描边已截图目视检查。
3. 拖动后 placement 更新，选中状态保留；Ctrl+Z 回原位，Ctrl+Y 回新位。重新载入应用后仍是同一 ID、同一新坐标，确认真实持久化。
4. 重新选中后 Delete 删除；Ctrl+Z 恢复同一 ID 与坐标，Ctrl+Y 再删。最终另走一次“拖动落库→直接 Delete”，无需重新选中，笔画数由 1 变 0；随后撤销恢复。
5. Selection/Pen/Eraser 的 DOM 可访问名称和 `title` 均为全名，按钮可见文本为空且包含 SVG。E1 的 ⋯与视图按钮位置关系回归通过。

**证据边界**：现役空白入口是“双击启动写入”，单击只聚焦纸面；本单保留此行为。历史回放期间现役 controller 暂设只读并清 UI 选中，回放后欲 Delete 需重新点选，笔画身份/位置的撤销重做不受影响。截图在会话中目视检查，未归档 PNG。Board modal 宿主与跨页单选由组件测试覆盖，不宣称已在真实 Board 中走完整旅程。

## 原生几何冒烟

[native-hit-results.json](native-hit-results.json)：真实 Chrome **12 场景 / 72 采样全部符合预期**。50% / 100% / 200% × 细直线 / path-only 曲线 / 旋转线 / 点状笔画；中心法向偏移 0、7、7.9 px 命中，8.1、9、12 px 不命中。旋转是投影几何兼容测试，不表示新增纸面旋转写入能力。

初版 `vector-effect` 假设被本夹具证伪：Chrome 的 `isPointInStroke` 仍按局部宽度查询。最终 helper 用实际 CTM 比例换算，临时调整透明查询 path 的宽度，查询后 `finally` 复原。既有橡皮路径宽度不受影响。

复跑：

```powershell
node docs/audits/2026-09-11-e3-builder/validate.mjs tests
node docs/audits/2026-09-11-e3-builder/validate.mjs static
node docs/audits/2026-09-11-e3-builder/validate.mjs build
node docs/audits/2026-09-11-e3-builder/prepare-fixture.mjs
# client dev server 运行时，Chrome 打开 http://localhost:5173/e3-hit-smoke.html
node docs/audits/2026-09-11-e3-builder/prepare-fixture.mjs --clean
```

临时 HTML/TSX 已清理；可复跑夹具保留在本目录。浏览器 harness 初次因 Chrome 配置目录权限失败，后续全部改用已提供的 CUA Chrome 通道，未更改权限或配置。
