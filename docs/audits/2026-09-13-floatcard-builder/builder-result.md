> **状态 (Status)**: pending-decision / 未完成
> **层 (Layer)**: Builder 阶段回执
> **日期 (Updated)**: 2026-09-13

# 单2 · 浮卡与套装阶段回执

浮卡壳、套装 CRUD、071 迁移、detach 事务、客户端引用与保存队列、现役入口切换已落代码。**当前不能翻 done**：现役暖纸材质依赖 preset 身份，规格只允许 tokens/components 快照，存为套装会丢纸纹/阴影。已提出可选 materialPreset 修约问题，尚未获答；没有按颜色猜来源或私加数据字段。详见 [材质冲突举证](material-contract-blocker.md)。

## 交付清单与 numstat

- 新浮卡 `SkinFloatCard.tsx`、CSS、几何 helper 与消费者测试；实际 `UnifiedColorPicker` 直接消费，内部文件未修改。
- 新 `useSkinSuites` 全用户套装 store、回执快照、资产写/外观写双向排序屏障；Note/Board/Project/全局继承读取同步解析；运行时浮卡宿主跨当前纸 loading 保持同实例。
- shared `suite:<uuid>` 类型、server skin validator、071 `skin_suites`、套装 validator/service/人面路由与7条后端测试；未接 Agent 面。
- 27个既有夹具/脚本适配新挂载请求；新浮卡/套装测试另列。对象清单生成件同步071与人面路由。
- 隔离服务脚本、真实浏览器截图/API账本、运行门与测试日志。

逐文件身份、当前行数、SHA256 和可核对增删见 [delivery-files.json](delivery-files.json)，由 `build-file-manifest.mjs` 机械生成。62文件中41文件可核对，**已知子集 +1817/-55**；已知新文件按空基线统计，夹具及生成件按开工前保存的字节做逐行 LCS。**其余21个既存产品文件没有保留本单开工字节，numstat 留 null，不能拿当前文件大小假充改动量**；完整 Git numstat 待 HQ 补。该清单覆盖 source/test/script/生成对象清单，审计收据及 handoff Result 单列，不把测试输出算产品改动。

## 十条浮卡壳

| 工单 §一 | 实现与完成态 |
|---|---|
| 1 单实例常开 | 已实现。独立 appearanceOpen，不因选区、点纸、More菜单关闭；NoteCanvasRuntime在 loading 提前返回之外挂宿主。X/Esc和入口按钮切换关闭。生命周期/当前owner有定向测试。 |
| 2 实时应用、纸即预览 | 已实现。token/部件走既有保存通道，hover只写临时渲染状态；没有卡内独立预览区。快选缩略和命名弹窗小样按规格保留。 |
| 3 约280px、60vh内滚 | 已实现。真浏览器1920×1080测得280×648；360×640测得280×384。 |
| 4 唯一header拖动 | 已实现。内容区和header按钮不启动拖动。 |
| 5 clamp与16px磁吸 | 已实现。释放clamp四边8px；距实际边≤16px才吸至8px；无其他停靠。几何边界单测及真实左上拖动通过。 |
| 6 卷帘折叠 | 已实现。双击header或chevron，折成42px标题条；收起清预览。 |
| 7 不透明与保焦 | 已实现不透明度1、按钮保纸焦与文本框正常输入。原生系统取色/分组弹层暂借焦点，完成后归还，连续color input不抢焦；原生分组变更并回到纸面标题已真浏览器通过。窗口普通获焦不会提前终结select。未修改共享picker内部。 |
| 8 不穿透、不躲避 | 已实现。实体固定浮层接收事件，无自动躲避；不吞共享picker依赖的document外点监听。 |
| 9 UI记忆 | 已实现。localStorage仅(x,y,collapsed)，首开锚入口旁，此后记忆；恢复及viewport/内容尺寸变化clamp。跨重新加载实测(8,8)折叠态保持。 |
| 10 纯UI窗 | 已实现。几何不写笔记、不创建placement、不接钉住系统。 |

## 内容与不变量

遵照工单本地化，四出厂在前，Custom独立分区在后；未按survey把Custom移到前方。样张由每卡真实tokens/components渲染；300ms鼠标悬停/触屏按住预览，650ms用户套装长按菜单，移动取消，按住结束不误应用。点击换绑保留手工overrides/components；偏差按解析值对绑定整包比较，九token逐项还原、一键全还原，五部件也有偏差与还原。

存为套装只有名字必填；保存完整13 tokens与5 components字面值，成功即绑新suite；弹窗关闭后将新卡滚入可视区。若POST已成功而笔记绑定失败，重试复用已建suite，避免重复建卡。右键/键盘菜单支持重命名、删除、更新套装为当前样子；更新以当前纸解析整包写回套装，现有绑定跟随，个体覆盖继续优先。套装整包无“只存颜色”半套开关。材质保真阻断独立列明，不能将这段tokens/components闭环称为完整当前样子保真。

## detach 实现口径

DELETE使用SQLite immediate transaction：读取当前套装与当时palette，普查 `users.settings.skin`、`courses.skin`、`notes.metadata.skin`（含垃圾箱）与 `boards.skin`；每个消费者按自身override/component优先合并，把池引用解析成该owner当时字面值，写为default+完整tokens overrides/components，保留其他metadata，最后删套装。任一挂点失败全部回滚。响应携同一事务palette快照。

客户端保留删除回执/tombstone，旧挂点及继承选择规范化成字面值，之后池色再改不污染已detach外观。删除等待此前外观写；之后外观写等待删除并规范化，避免过时suite引用复活。Note保存仍由既有串行owner队列捕获当前note identity。后端7条覆盖隔离、验证、全挂点round-trip、rollback、palette冻结；前端store/Note/Board/adapter测试覆盖继承、冻结与写入顺序。

## hover 不落库证明

300ms计时结束只调用当前note的preview状态，`useNoteSkin`把临时selection解析成 `renderedResolved/style`。提交selection和tokens/components仍来自持久选择，hover不经过save。移开、折叠、关闭、换纸或取消gesture清除临时状态。真实浏览器四预设纸面换色期间，前后数据库都仍是warm-paper，API账本没有外观写请求。见 [browser-smoke.md](browser-smoke.md) 及 `smoke-before-hover.json` / `smoke-after-hover.json`。

## 台账与验证

[fixture-census.md](fixture-census.md) 普查154个原有测试文件，53处API mock、24处严格未知请求guard、27个实际消费者/预注册点、7个合成API适配器；新增suite端点精确注册，不改成宽松兜底。额外补齐上一单漏到的两个palette消费者。夹具定向25文件274测试通过，后续并行合入的失败已定向修复再验。

- 客户端直接Vitest单worker全库：**157文件、1632测试通过**；晚到浮卡交互变更单独补验 **14/14通过**（含后增触屏和原生控件事件时序），client tsc无诊断通过，见 [client-final-serial.md](client-final-serial.md)、[最终浮卡日志](final-floatcard-tests.log) 与 `native-focus-typecheck.log`。早前npm链丢失maxWorkers参数导致的两例失败保留日志，两例单独10/10通过，未调超时或削断言。
- 服务端非安全全量：56文件460项，原457通过/3失败；manifest环境修正后该文件2/2通过。**仍有Python ENOENT、MinerU解释器启动101两处环境失败**，不宣称server全量绿；3个安全类文件按禁区未跑。最终suite定向7/7通过。见 [server-verification.md](server-verification.md)。
- shared/server/client正式typecheck+build已通过，运行门其余18个允许段18/18通过；test-wiring 77/77、tech-debt-table通过。最终宿主交互变更后的client正式构建也exit0，最后docs:check三段通过。见 [runtime-gates.md](runtime-gates.md) 与 [final-validation.md](final-validation.md)。
- 真浏览器覆盖打开、拖动、clamp、折叠、四预设hover、池色绑定、存套装、切回、更新与删除快照、重新加载UI位置记忆。材质、最终服务器重启冒烟及工具hash导航限制详列 [browser-smoke.md](browser-smoke.md)。

## 未做与边界

1. materialPreset修约未获答，未实施；不能保证暖纸/工作台完整材质保真，**本单未完成**。
2. Python/MinerU环境失败未消除；未修改相关产品代码或安全测试掩盖失败。
3. material裁定完成后需最终树重启隔离服务，补干净完整冒烟；真实触屏未测。
4. 完整numstat、git diff/secrets收口及安全域回归交HQ；未commit/push/PR。开工完整读取工单前误执行过一次只读git status；之后遵守禁区未再调用git，也无git写入。
5. 没有修改取色器内部、九token词汇、More菜单内容、Settings默认外观界面、placement/钉住、Agent面、操作权限文件；没有读取真实.env key或接触用户库。
