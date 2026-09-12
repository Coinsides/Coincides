> **状态 (Status)**: completed (builder controller slice; final aggregate verification belongs to root)
> **日期 (Updated)**: 2026-09-12 (America/Toronto; evidence directory follows order date)
> **范围**: purge order batch 4 toggle + TD-7/TD-9; no Git calls

# 批四退役桥与替身测试

`useSurfaceModeController`收敛为固定Page authority，保surfaceMode/surfacePolicy/pageOffsetX三返回值；删除状态切换、hydration裁定、resolveInitialSurfaceMode、toggleSurfaceMode及旧options。`modePolicyService`删除next-mode/transition函数与类型。`useRuntimeSurfaceStateController`、`useNoteCanvasRuntimeController`、`useNoteCanvasLayerProps`、`NoteChromeLayer`只抽桥调用/props传递；Page/墙/外观/阅读控制装配留。

TD-7 hydration layout effect整段拆除；TD-9 mock的resolverCalls、resolverCallCount、layoutPhaseReceipts及三条G-X3参数化桥接契约测试同拆。旧双cast的layerProps观察通道改为类型化presentation options收据，现役墙门与A4/Letter物理字号测试仍在。

## 四文件替身与逐条退役

| 文件 | 旧测试/断言处置 | 最终测试数 |
|---|---|---:|
| canvasRetirementPolicy.test.tsx | 首用例不再调用已删hydrate/toggle，改断两个属性不存在；legacy route/state→Page、persisted对象不变以及后两条旧值读/写门断言逐字留。 | 3 |
| useSurfaceModeController.test.tsx | 旧8个hydration/toggle锁收敛2条：Page authority三返回值+无两回调，历史混合笔记Page可见性；原G-X1 Page过滤表达式原样保留。 | 2 |
| useRuntimeSurfaceStateController.pageReading.test.tsx | 原第2/3用例的toggle调用改为属性不存在；焦点取消/重排、viewport、gear/step所有断言留。 | 3 |
| useNoteCanvasRuntimeController.test.tsx | 退役G-X3的canvas-only/mixed/empty三桥测试及5条旧桥专用assertion；新增Page装配无onToggleSurfaceMode锁。A4/Letter用例以rerender取代已删toggle，原物理字号、测量、版心宽、对象不变的断言原样留；墙门用例原样留。 | 3 |

`useSurfaceModeController.test.tsx`旧8条逐条在此登记：①S5 hydrated canvas-only legacy specimen、②S5 Page before/after hydration、③previous-route hydration、④T-1b empty hydrated note、⑤G-X1 mixed note、⑥S5 stale pre-hydration toggles、⑦S5 A→B、⑧S5 A→B→A。它们仅测试退役桥/常值锁，依原单“改为无toggle导出或删用例”收口；⑤活Page可见性迁入替身原表达式。没有删除现役TextFlow、媒体生命周期、安全测试。

`NoteChromeLayer.test.tsx`仅删死onToggleSurfaceMode占位；其17个测试全部保留。`v13CanvasRetirement.test.ts`现物原为两条S5读/写门测试，没有独立桥源码断言，因此保原文件与两用例，并新增TD-7/TD-9“桥已拆、Page三返回值还在”的源码锁；原17个assert表达式逐字保留。

## 验证

- [4文件+Chrome定向](batch4-controller-locks.log)：5文件28/28；之后新增root no-toggle锁。
- [最终控制器+导航组合](controllers-all-final.log)：8文件67/67，safety-title-excluded=0。
- [server退休锁](batch4-retirement-after.log)：3/3通过、0 skip；:memory:、隔离资产、dotenv读阻断、OS env白名单。
- [逐字断言审计](controllers-assertion-preservation.log)：runtime root原33条留28条，所删5条仅来自已拆的G-X3桥测试；server原17条留17条。
- [numstat](controllers-numstat.md)：只报源码快照差，非Git diff。
- [最终类型门](controllers-typecheck-green.log)：client/shared/server三端类型全部通过；props收口后的5文件46/46见[日志](controllers-props-final-tests.log)。

25条陈旧server fixture转绿由server分片负责，不在本分片重复申报。主单Result/status由root按总验收更新。
