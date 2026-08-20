> from: claude(fable,代理权:claude-log/2026-08-19.md 条目1) | to: codex(builder) | status: ready | re: v2bn12-01-editing-rootcause | date: 2026-08-19

# V2.BN.12 首单:编辑机件焦点/坐标 root-cause 并案侦查

## 背景与授权

V2.BN.12「外骨骼与地板」开工首单(宪章:`docs/agent-ops/analysis/unified-direction-concept-design.md` v1,§13)。本单为**侦查单**:先诊断后开方,不做大改动。分支:`fable/v2-bn12-exoskeleton`(所有 V12 工作在此分支或其子分支)。

## 并案的四个症状(2026-08-08 实测,复现细节见 `analysis/2026-08-08-econ-note-rebuild-experience-report.md` + 同日会议卷问题 3/6/9/10)

1. **焦点不移交**:Page 模式双击"开始写作"占位按钮消费后,键入全部落进标题输入框;
2. **Page 模式死胡同**:占位按钮消费且未产生内容后,纸面任意点击/双击永久无反应,F5 不恢复(Canvas 模式双击正常——差异本身是线索);
3. **编辑态静默污染**:斜杠菜单失败残留"/hea"于正文、字符重复累积,无"哪个单元在接键"的可见指示;
4. **所见文本与可编辑面错位**:单击/三连击可见文本行,命中的 textarea 为空(selStart=0,value="");空单元 Backspace 不发生向前合并——ADR-0001"transform 内 TextFlow 编辑稳定性"风险的首个实证。

**并案假设**:四症状同源于焦点/坐标管理与可见渲染的对位层(疑似 NoteWritingSurfaceLayer / textarea 捕获层 / overlay 渲染层之间的状态同步)。假设可以被推翻——若诊断出多个独立 root cause,如实分列。

## 任务

1. **复现**:在本地起 dev(.claude/launch.json 双服务;test@test.com/testtest),逐一复现四症状,记录精确触发路径;
2. **诊断**:定位每一症状的机制链(哪层丢焦点/哪层坐标失配/占位按钮消费后进入什么状态),给出 root-cause 判定(同源或分列),引用具体文件:行号;
3. **开方**:修复方案设计(不实施):改动面、风险、与新方向的关系(此机件为未来流式装配面共用内核——修法须服务新面,不为旧 Page 模式表层镀金;Page 模式死胡同若根因在"占位按钮状态机",修状态机而非修按钮);
4. **顺手可修**:若诊断中发现 ≤10 行的低风险即时修(如焦点移交一行补),可修并单列申报;大改动一律只开方等下一单。

## 边界

- 不碰:斜杠菜单键盘导航(症状 3 的菜单部分另单)、三图标样式、任何 schema;
- 测试:诊断结论须配最小复现测试(能 RED 的形状最好);
- 回执:本文件追加 `## Result`,含诊断报告+修复方案+顺手修申报;**不自评 PASS**——复核由 reviewer 单独进行。

## 验证基线

`cd server && npm run test:v2`(244 基线)与 `npm run verify:v2-bn8-runtime` 在你改动后必须仍绿(侦查单通常零改动,顺手修后必跑)。
