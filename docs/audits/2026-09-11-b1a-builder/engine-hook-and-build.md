> 状态: builder evidence
> 日期: 2026-09-11
> 范围: B1a client engine/hook tests 与构建输出目录适配

## 新增定向用例

`client/src/styles/skinPresets.test.ts`：8/8 PASS。四个预设逐项核对九个字面颜色；rollout 空值落默认；三级覆盖及逐层清除；稀疏 override 属于本层命名快照，不携带上层改色；解析/返回对象互不污染工厂与已存选择。

`client/src/pages/Notes/canvasEngine/hooks/useNoteSkin.test.ts`：7/7 PASS。真实 Zustand 订阅加完全替身的 API：既有 project summary 单次读取；切路由晚到响应作废；等待下一 project 时不泄漏上一个 project 色；请求失败可重试；全局改色即刻响应且不重复读 project；纸 metadata 覆盖/清除与保存委托；未挂载纸不请求。

命令 `npm --prefix client run test:unit -- src/styles/skinPresets.test.ts src/pages/Notes/canvasEngine/hooks/useNoteSkin.test.ts`。日志 `client-skin-engine-hook-tests.log`；2 文件、15 用例通过，无外部请求。

续补 `useNoteCanvasDataAdapter.skin.test.tsx`：4/4 PASS，日志 `client-skin-adapter-tests.log`。连续选择即时预览、HTTP 串行、`whenIdle` 等待整个队列；切至 paper-b 后排队保存仍只写 paper-a 且不污染新纸；失败保留预览、路由 drain 报同一失败、成功 retry 清除 registry 失败；Source 纸可写/清除外观而不提交内容属性。Source server guard 静态检查仅将 title/description/page_format/status 判为内容身份变更，`{skin}` 不触发该守卫。新 client 定向总计 3 文件、19 用例通过。此续补未运行安全类测试。

## 输出目录适配

只读检查发现 `shared/dist` / `client/dist` 都是普通目录，非链接，也无 ReadOnly 属性；`shared/dist/types/index.d.ts` 同样非 ReadOnly。实际工具进程对既有 shared 构建输出返回 EPERM，因此如实称为输出写入受限，不声称已证明是文件只读属性造成。不改 ACL、权限或生产配置。

- Client 保留完整 npm build 管线，只指定 Vite 新输出目录：`npm --prefix client run build -- --outDir ../docs/audits/2026-09-11-b1a-builder/client-skin-build`。`tsc -b && vite build` 完整通过，exit 0，产物 `client-skin-build/`，日志 `client-skin-build-local.log`。既有大 chunk warning 是非阻断提示。
- Server 的 manifest check 已由原 `npm run build` 通过（14 个 public 工具）；审计配置直接引用同一份 server/shared 源码，完整 typecheck 与 declaration/JS emit 均通过，详见 `server-persistence.md`。
- Server manifest copy 使用原脚本已提供的测试输出覆盖，`NODE_ENV=test` 与 `TOOL_FACE_COPY_TEST_DESTINATION=<audit>/server-skin-build/server/src/tool-face-manifest.json`，执行原 `npm --prefix server run copy:tool-face-manifest` 通过。日志 `server-skin-manifest-copy-local.log`。上述变量只在该工具进程有效；未更改脚本或权限。

因此保留原构建命令失败记录，同时提供同源编译、原 manifest 两门及可检查的独立产物，不把受限路径写入伪报为成功。

## 最终二轮收口

最终 client 定向集合为 14 文件、183/183，通过报告 client-final-tests.json。皮 adapter 已扩充至 10 项，并亲跑原 adapter 105 项，保护晚到 Typography / 阅读解释 / 批注建议响应不回滚皮状态；metadata-concurrency-tests.json 的 115 项是这两文件子集，不能与 183 相加。CourseModal / SkinEditor 的 6 项同样已包含在 183 中。

最终完整 client 管线为 `npm.cmd --prefix client run build -- --outDir ../docs/audits/2026-09-11-b1a-builder/client-final-build`，exit 0，日志 client-final-build.log。使用 npm.cmd 避免本机 PowerShell 对 npm.ps1 的执行策略限制，未改策略。第一次最终 tsc 找到新增测试的可选 metadata 类型访问，现已修正；保留前次诊断，不以 vitest 通过替代 typecheck。
