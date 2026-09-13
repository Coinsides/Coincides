> **状态 (Status)**: partial / 材质契约待裁定
> **层 (Layer)**: Builder 真实浏览器证据
> **日期 (Updated)**: 2026-09-13

# 浮卡真浏览器冒烟

使用 `client/scripts/skinFloatCardSmoke/serve.mjs` 启动实际 server/Vite，端口 5195/5196；数据库、资源目录、dotenv、APPDATA 均在本单新建隔离目录。通过浏览器正常登录合成账号，密码 `FloatSmokePw42`（14 字符）、JWT 合成值 `FloatSmokeKey42`（14 字符）。未使用用户库或读取真实 key。CUA 在独立测试标签页操作，未操作用户其他标签。

fixture 身份见 [smoke-fixture.json](smoke-fixture.json)。`/__floatcard-evidence` 仅供本隔离开发服务读数据库快照与 API 方法/路径账本，不输出登录令牌。它不挂在产品 API。

| 流程 | 已观察事实 | 证据 |
|---|---|---|
| 打开与窄卡 | 默认浏览器 1920×1080，卡宽 280、高 648（60vh），不透明度 1 | `smoke-open.png` |
| 拖动及 clamp | 仅标题条拖动；从中部拖至左上屏外，松手坐标变为 (8,8) | `smoke-collapsed.png`；几何单测另覆盖16px磁吸边界 |
| 折叠及会话位置 | 双击标题后收成42px标题条，重新加载并打开仍为 (8,8)、collapsed=true | `smoke-collapsed.png`；localStorage读写在单测逐字验证 |
| 窄视口恢复 | 临时360×640下为 (8,8)、280×384，不透明度1；之后恢复原视口 | `smoke-narrow.png` |
| 四预设悬停 | 真实指针从空纸移动至缩略卡，等待300ms后整纸依次变为 #101114、#17181C、#F7F3EA、#1A1E25；绑定仍是暖纸；移开还原 | `smoke-hover-values.json` 与 `smoke-hover-*.png` |
| 悬停不落库 | 预览前后笔记 metadata.skin 均为 warm-paper；此段请求账本没有任何外观写，唯一早先写是登录 POST | `smoke-before-hover.json` / `smoke-after-hover.json` |
| 池色绑定 | 实际 UnifiedColorPicker 选择 阅读/蓝，笔记正文保存 palette 引用，纸面 ink=#315D83，出现1项偏差 | `smoke-pool-bound.png` |
| 存为套装 | 命名蓝墨阅读，完整13 tokens+5 components为字面值，存后绑定新suite且Custom选中；切出厂再切回来仍读同suite | `smoke-suite-selected.png` |
| 新卡可见 | 初次检查发现新卡在滚动区外；调整弹窗关闭后的滚动时机。复跑“回显验收”新卡 aria-pressed=true，卡片bounds在浮卡内 | `smoke-save-reveal.json` 是失败轨迹；`smoke-save-reveal-final.json/png` 是通过证据 |
| 更新套装 | 在第二张静墨纸右键“更新套装为当前样子”，套装纸面成为 #17181C；原笔记保持suite绑定，跟随整包 | `smoke-after-suite-update.json` |
| 删除套装 | 两张纸绑定该suite后删除，suite列表为空；两张笔记均改为 default+完整13 tokens overrides+5 components。当前渲染的全部 --sk-* 与 --paper-material-* 删除前后逐字相同 | `smoke-after-delete.json`、`smoke-delete-styles.json`、`smoke-deleted.png` |
| 原生分组与焦点 | 宿主允许原生控件暂借焦点；最终复跑通过取色器select选择末尾分组，蓝→点缀/蓝，提交后activeElement为Note title的TEXTAREA，标题值不变 | `smoke-native-focus.json`、`smoke-native-select-passed.png`；`*-before.png`及`*-final.png`是早期失败尝试，不能作通过证据 |

跨纸检查通过浏览器改变 hash 地址触发了 React Router 的“非本router创建的POP”警告及一次保存提示；虽目标纸加载且原浮卡实例保留，此路径不计作干净的产品导航验收。真实 loading 期间同一个浮卡DOM存活、控件只作用当前owner另由 `NoteCanvasRuntime.appearance.test.tsx` 与保存队列测试覆盖。没有基于工具导航警告修改产品路由。

**阻断**：暖纸“存为套装”后颜色保持，但纸纹、阴影与墙材质丢失。见 [material-contract-blocker.md](material-contract-blocker.md) 及 [material-contract-evidence.json](material-contract-evidence.json)。删除冒烟是在已经更新成静墨整包后进行，因此不能拿这次删除前后相等证明暖纸材质保真。

本次是开发中真实浏览器证据。服务进程早于最后一处 DELETE palette 回执增强启动；该增强有最终服务端7条和客户端冻结/队列定向测试覆盖。材质裁定并实现后须以最终树重新启动隔离服务补完整冒烟，当前不宣称最终整单冒烟通过。触屏按住/长按/移动取消有合成PointerEvent回归，未用真实触屏设备复验。

阶段结束已停止本单隔离服务，并核对5195/5196无监听；没有关闭用户其他浏览器标签或服务。
