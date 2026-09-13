> **状态 (Status)**: active / Builder 自检
> **层 (Layer)**: 审计 / Material 增量源码复审
> **日期 (Updated)**: 2026-09-13
> **执行者**: Codex builder / verify_prepare

# materialPreset 增量自检

依据本单补遗一，对 `material-baseline-root/`、`material-baseline-client/`、`material-baseline-server/` 保存字节与当前树做逐行比较，并阅读相关现役调用。范围覆盖 shared 类型、两组 server validator、072 迁移、套装 CRUD 与 detach 回执、客户端套装缓存与删除快照、继承解析、Note/portal/print/Board 材质消费，以及浮卡保存、更新、切换和小样。未使用 git；未修改业务代码、权限配置或禁区文件。

谱系主链源码自检未发现遗漏：枚举只有四出厂 id；材质参数仍由出厂实现拥有；旧套装缺谱系不按颜色猜来源；删除事务与客户端 tombstone 都保留选择自身谱系优先、套装谱系其次的同一规则；渲染入口及暖纸阴影裁切均消费有效材质身份。实际测试与真浏览器结果另见本轮验证收据，本档不预先宣称它们通过。

存为套装时，POST 记录当前解析的 `materialPreset`，随后的消费者写入只有 `{ preset: suite:<id> }`，不复制显式谱系覆盖，因此后续“更新套装为当前样子”可继续带动所有普通绑定者的材质。更新请求与 tokens/components 同包发送当前有效谱系。换绑清除之前 detach 留下的显式谱系，同时保留已有颜色和部件偏差；仅在 detach 快照中固定谱系以保住完整外观。

发现并修复一处暖纸小样绘制冲突：`SkinSample` 的内联 `background` 简写会覆盖新 CSS 的 `background-image`。客户端实现者已改为 `backgroundColor`，本自检再次读取当前源码确认修复落树；小样断言同步改为检查颜色长属性。客户端实现者回报本轮 6 文件 / 83 项定向通过，完整允许门与真浏览器证据仍由各自收据记录。

这是本单 builder 的增量源码自检，不是专职 reviewer 的独立复核，也不作 HQ 放行判定。真实浏览器仍须对暖纸“存套装→切走→切回→删除”的完整纸纹、阴影与墙材质逐阶段留证。
