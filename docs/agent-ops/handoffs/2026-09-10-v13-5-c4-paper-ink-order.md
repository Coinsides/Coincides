> **状态 (Status)**: ready
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-10
> **上游**: 13.3"笔迹⛔入纸"已由 Henry 显式翻案(claude-log §74,两次口径一致);板 freehand 现物=数据模型参照(boardFreehandDataSchema/整笔橡皮);纸板底层侦察在案(板绘画栈内联 BoardPage⛔直接复用,搬模型不搬存储)
> **单号**: 13.5 · C4 · 纸上手绘(波次 C 末单)

# 13.5 C4 · 纸上手绘

**使命**:纸获得一支笔一块橡皮——笔画作为页归属的画布对象,写进纸的持久层,可撤可打印。

## 零 · 裁定(⛔复议;实现细节裁量申报)

1. **数据模型**:canvas_objects 新 kind `freehand`(客户端 CanvasObjectReserve 占位已有);data={points 或 path,style} 与板 boardFreehandDataSchema 同形(⛔共享存储:纸笔画住 canvas_objects,⛔board_visuals);服务端 KIND_HANDLERS+validator 注册;
2. **锚定=页归属**:落笔所在页=归属页,placement=page_frame_local+frame_id(formal_page 面,v2 落籍);**一笔限一页,点坐标页内裁剪⛔跨页**(v1 保守——crossing 面已退役,⛔造 crossing 写入);若现物几何有更自然方案,停线举证⛔擅改;
3. **工具**:纸工具条加 Pen/Eraser;橡皮=**整笔删除**(板同款 isPointInStroke 语义可参);颜色/笔宽=板 style token 同款起步⛔新调色板;板侧 pen 代码内联 BoardPage,**搬语义⛔搬依赖**(纸侧独立实现或抽共享纯函数,裁量申报);
4. **undo**:画一笔/擦一笔=canvas object create/delete,**入现有 canvas command 栈**(⛔新栈);
5. **投影**:打印(NotePrintLayer)与统揽(NoteReadOnlyPageContent)补 freehand 最小渲染(SVG path 纯展示)——画在纸上打印时必须在;若投影架构阻力大→停线拆单⛔静默跳过;
6. **⛔射程**:铸卡/被引用/进组(板粉笔的戏纸上不演,纯墨水);压感/多笔刷/笔画选中变换(v1 一支笔);Layout/页操作与笔画的交互按现有 generic object 语义,异常申报。

## 一 · 验证(单内纪律)

- typecheck + build 全绿;client 全库整跑⛔过滤;
- 冒烟六条:①Pen 画一笔→canvas_objects freehand 落库(page_frame_local+frame_id 正确页),刷新保持(修前断言现状:纸无画笔工具);②页边落笔→点页内裁剪,归属唯一;③橡皮整笔删+持久;④画/擦 undo/redo 入现有栈;⑤打印与统揽投影显示笔画(几何与书写面一致);⑥退役闸回归(⛔workspace/crossing 写入)+B 系/C 系全回归+全库。

## 二 · Result 格式

`## Result`:numstat + 六冒烟逐条 + 裁量申报 + 未做 + 停线;**⛔ commit**;⛔ 读 .env;⛔ key 出境;⛔ 用户库接触;⛔ 安全类测试(既有套件整跑⛔过滤;凭据扫描留 HQ)。
