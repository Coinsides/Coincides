> **状态 (Status)**: ready
> **from**: claude(opus,工程调度会话) · **to**: codex(builder) · **date**: 2026-08-28
> **裁定来源**: Fable(第 3 场收工后的小尾巴,⛔ 不单独占一轮)

# TD-32:`writingSurface` 类名里的字面 `undefined`(一行单)

## 0. 病与真因(已现物核实,⛔ 不要重新调查)

`client/src/pages/Notes/canvasEngine/layers/NoteWritingSurfaceLayer.tsx:3239`:
```
${surfaceMode === 'canvas' ? styles.writingSurfaceCanvas : styles.writingSurfacePage}
```
⚠️ **`.writingSurfacePage` 在 `NoteDetail.module.css` 里从来不存在**(`git log -S` 查无历史 —— **不是被删,是从没写过**)⇒ 页面模式下 `styles.writingSurfacePage` 为 `undefined`,模板字面量把它拼成**字面字符串 `undefined`** 进 DOM 的 class 列表。

**🅱 评级**:无行为影响(`undefined` 只是个匹配不到规则的类名)。
⛔ **它不是「模式切换的类绑定断了」** —— canvas 模式下 `_writingSurfaceCanvas_` 挂载正常、`overflow: hidden` 生效,已实测。

## 1. 改法(⛔ 只此一处)

把三元的 **else 分支改为 `''`**。
⛔ **不要**改成新建一条空的 `.writingSurfacePage` 规则 —— **不存在的样式就别假装有**;将来页面模式真需要专属样式时,再连规则带引用一起加。

## 2. 允许面

- `client/src/pages/Notes/canvasEngine/layers/NoteWritingSurfaceLayer.tsx`(**仅** 3239 行那一处三元)
- **明确允许新建**:`client/src/pages/Notes/canvasEngine/writingSurfaceClassName.test.ts`(§3 的断言)

⛔ 除上述两个文件外一律不动。⛔ 不动 CSS、不动 `surfaceMode` 逻辑、不动任何其它类名。

## 3. ⭐ 必红判据(先补断言,再改码 —— 顺序不可换)

**K-1**:读 `NoteWritingSurfaceLayer.tsx` 源文本,断言**那一行三元的 else 分支不是 `styles.writingSurfacePage`**(等价写法:该文件中不出现 `styles.writingSurfacePage`)。
**必红要求**:改码前跑,**必须为红**(现码就写着它)。⛔ 红不出来就停下上报。

⚠️ **断言的限度要写进测试文件顶部注释**:这是**源文本锁**,锁的是「不再引用一个不存在的 CSS 类」这个事实;⛔ **它不验证运行时 DOM 的 class 列表**(那需要渲染整棵画布,代价与收益不成比例)。

⚠️ **变异必须语法有效、语义定向**:验断言真在盯这处,就把 else 分支改回 `styles.writingSurfacePage` 看它变红;⛔ 不许用正则整块替换制造语法错误。

## 4. 收工前必跑

```
npm --prefix client run test:unit
npm --prefix client run build
```
全绿才算完;⛔ 不许跳过、⛔ 不许 `--no-verify`。

## Result

**(builder 填)**
