# V12.10 i18n Chinese copy archive

本档按施工单丙的现物差异逐行归档。计数口径为「含中文的实际替换行」：数组或同一表达式内的多个字面量合并在同一行记录，但原文逐项完整列出。合计 **98 条**，对应 `client/src` 94 条与 `client/scripts` 4 条。

| # | 文件 | 中文原文 | 英文替换 | 备注 |
|---:|---|---|---|---|
| 1 | `client/src/components/AgentPanel/PreferenceForm.tsx:91` | `偏好已提交` | `Preferences submitted` | 表单状态 |
| 2 | `client/src/components/AgentPanel/PreferenceForm.tsx:106` | `` `${vals[0]} 至 ${vals[vals.length - 1]}（${vals.length}天）` `` | `` `${vals[0]} to ${vals[vals.length - 1]} (${vals.length} days)` `` | 范围摘要 |
| 3 | `client/src/components/AgentPanel/PreferenceForm.tsx:131` | `请填写以下偏好` | `Complete the following preferences` | 表单标题 |
| 4 | `client/src/components/AgentPanel/PreferenceForm.tsx:152` | `提交` | `Submit` | 按钮 |
| 5 | `client/src/components/AgentPanel/PreferenceForm.tsx:187` | `(可选)` | `(Optional)` | 字段提示 |
| 6 | `client/src/components/AgentPanel/PreferenceForm.tsx:231` | `最多选择 {q.max_select} 项` | `Select up to {q.max_select} options` | 选择上限 |
| 7 | `client/src/components/AgentPanel/PreferenceForm.tsx:242` | `请输入数字` | `Enter a number` | 输入占位 |
| 8 | `client/src/components/AgentPanel/PreferenceForm.tsx:274` | `` `${doc.page_count}页` `` | `` `${doc.page_count} pages` `` | 页数元数据 |
| 9 | `client/src/components/AgentPanel/PreferenceForm.tsx:293` | `最多选择 {q.max_select} 个文档` | `Select up to {q.max_select} documents` | 文档选择上限 |
| 10 | `client/src/components/AgentPanel/PreferenceForm.tsx:300` | `` ` · 已选 ${totalPages} 页` `` | `` ` · ${totalPages} pages selected` `` | 已选页数摘要 |
| 11 | `client/src/components/MonthCalendar/MonthCalendar.tsx:71` | `日 / 一 / 二 / 三 / 四 / 五 / 六` | `Sun / Mon / Tue / Wed / Thu / Fri / Sat` | 星期数组逐项替换 |
| 12 | `client/src/components/MonthCalendar/MonthCalendar.tsx:203` | `请选择日期（拖选连续范围，或单击选择）` | `Select dates (drag for a range or click to select)` | 空选择提示 |
| 13 | `client/src/components/MonthCalendar/MonthCalendar.tsx:205` | `` `已选 1 天：${selectedDates[0]}` `` | `` `1 day selected: ${selectedDates[0]}` `` | 单日摘要 |
| 14 | `client/src/components/MonthCalendar/MonthCalendar.tsx:219` | `` `已选 ${sorted.length} 天：${sorted[0]} 至 ${sorted[sorted.length - 1]}` `` | `` `${sorted.length} days selected: ${sorted[0]} to ${sorted[sorted.length - 1]}` `` | 连续范围摘要 |
| 15 | `client/src/components/MonthCalendar/MonthCalendar.tsx:221` | `` `已选 ${sorted.length} 天` `` | `` `${sorted.length} days selected` `` | 多日摘要 |
| 16 | `client/src/components/MonthCalendar/MonthCalendar.tsx:236` | `{viewYear}年 {viewMonth + 1}月` | `{viewYear} / {viewMonth + 1}` | 保持表达式顺序，仅替换文字节点 |
| 17 | `client/src/pages/Calendar/Calendar.tsx:507` | `任务已移动` | `Task moved` | 成功提示 |
| 18 | `client/src/pages/Calendar/Calendar.tsx:509` | `移动失败` | `Could not move task` | 错误提示 |
| 19 | `client/src/pages/Calendar/Calendar.tsx:706` | `Time Block 模板` | `Time Block templates` | 按钮 title |
| 20 | `client/src/pages/Calendar/Calendar.tsx:709` | `模板` | `Templates` | 按钮文字 |
| 21 | `client/src/pages/Calendar/Calendar.tsx:1584` | `移动任务` | `Move task` | 对话框标题 |
| 22 | `client/src/pages/Calendar/Calendar.tsx:1589` | `目标日期` | `Target date` | 字段标签 |
| 23 | `client/src/pages/Calendar/Calendar.tsx:1599` | `放入 Time Block（可选）` | `Add to Time Block (optional)` | 字段标签 |
| 24 | `client/src/pages/Calendar/Calendar.tsx:1605` | `不放入 Time Block` | `Do not add to a Time Block` | 选择项 |
| 25 | `client/src/pages/Calendar/Calendar.tsx:1615` | `取消` | `Cancel` | 按钮 |
| 26 | `client/src/pages/Calendar/Calendar.tsx:1616` | `确认移动` | `Move task` | 按钮 |
| 27 | `client/src/components/TemplateEditor/TemplateWeekView.tsx:6` | `周一 / 周二 / 周三 / 周四 / 周五 / 周六 / 周日` | `Monday / Tuesday / Wednesday / Thursday / Friday / Saturday / Sunday` | 星期数组逐项替换 |
| 28 | `client/src/components/TemplateEditor/TemplateWeekView.tsx:136` | `` `在${day}添加` `` | `` `Add on ${day}` `` | 按钮 title |
| 29 | `client/src/components/TemplateEditor/TemplateWeekView.tsx:172` | `编辑` | `Edit` | 按钮 title |
| 30 | `client/src/components/TemplateEditor/TemplateWeekView.tsx:173` | `删除` | `Delete` | 按钮 title |
| 31 | `client/src/components/TemplateEditor/TemplateEditorModal.tsx:61` | `新模板` | `New template` | 默认名称 |
| 32 | `client/src/components/TemplateEditor/TemplateEditorModal.tsx:64` | `创建模板失败` | `Could not create template` | 错误提示 |
| 33 | `client/src/components/TemplateEditor/TemplateEditorModal.tsx:80` | `重命名失败` | `Could not rename template` | 错误提示 |
| 34 | `client/src/components/TemplateEditor/TemplateEditorModal.tsx:86` | `确定要删除这个模板集吗？` | `Delete this template set?` | 确认提示 |
| 35 | `client/src/components/TemplateEditor/TemplateEditorModal.tsx:91` | `删除模板失败` | `Could not delete template` | 错误提示 |
| 36 | `client/src/components/TemplateEditor/TemplateEditorModal.tsx:137` | `模板已保存` | `Template saved` | 成功提示 |
| 37 | `client/src/components/TemplateEditor/TemplateEditorModal.tsx:139` | `保存失败` | `Could not save template` | 错误提示 |
| 38 | `client/src/components/TemplateEditor/TemplateEditorModal.tsx:157` | `Time Block 模板` | `Time Block templates` | 标题 |
| 39 | `client/src/components/TemplateEditor/TemplateEditorModal.tsx:177` | `新建模板集` | `New template set` | 按钮 title |
| 40 | `client/src/components/TemplateEditor/TemplateEditorModal.tsx:182` | `重命名` | `Rename` | 按钮 title |
| 41 | `client/src/components/TemplateEditor/TemplateEditorModal.tsx:185` | `删除模板集` | `Delete template set` | 按钮 title |
| 42 | `client/src/components/TemplateEditor/TemplateEditorModal.tsx:203` | `确认` | `Confirm` | 按钮 |
| 43 | `client/src/components/TemplateEditor/TemplateEditorModal.tsx:204` | `取消` | `Cancel` | 按钮 |
| 44 | `client/src/components/TemplateEditor/TemplateEditorModal.tsx:220` | `还没有模板集。点击上方 + 号创建一个。` | `No template sets yet. Select + above to create one.` | 空态 |
| 45 | `client/src/components/TemplateEditor/TemplateEditorModal.tsx:228` | `保存模板` | `Save template` | 按钮 |
| 46 | `client/src/components/TemplateEditor/TemplateEditorModal.tsx:237` | `应用到日期范围` | `Apply to date range` | 按钮 |
| 47 | `client/src/components/TemplateEditor/TemplateEditorModal.tsx:290` | `` `已创建 ${result.created_count} 个 Time Block` `` | `` `Created ${result.created_count} Time Blocks` `` | 成功提示前半 |
| 48 | `client/src/components/TemplateEditor/TemplateEditorModal.tsx:291` | `` `，跳过 ${result.skipped_dates.length} 天（已有数据）` `` | `` `; skipped ${result.skipped_dates.length} days (existing data)` `` | 成功提示后半 |
| 49 | `client/src/components/TemplateEditor/TemplateEditorModal.tsx:297` | `应用模板失败` | `Could not apply template` | 错误提示 |
| 50 | `client/src/components/TemplateEditor/TemplateEditorModal.tsx:306` | `选择应用日期` | `Select dates` | 对话框标题 |
| 51 | `client/src/components/TemplateEditor/TemplateEditorModal.tsx:321` | `覆盖已有 Time Block` | `Overwrite existing Time Blocks` | 复选框标签 |
| 52 | `client/src/components/TemplateEditor/TemplateEditorModal.tsx:324` | `取消` | `Cancel` | 按钮 |
| 53 | `client/src/components/TemplateEditor/TemplateEditorModal.tsx:330` | `应用中... / 确认应用（${selectedDates.length} 天）` | `Applying... / Apply (${selectedDates.length} days)` | 同一条件表达式的两个字面量 |
| 54 | `client/src/components/TaskViewModal/TaskViewModal.tsx:112` | `编辑` | `Edit` | 按钮 |
| 55 | `client/src/components/TaskViewModal/TaskViewModal.tsx:122` | `已完成` | `Completed` | 状态徽标 |
| 56 | `client/src/components/TaskViewModal/TaskViewModal.tsx:210` | `关联卡片` | `Related cards` | 分区标题 |
| 57 | `client/src/pages/Goals/Goals.tsx:309` | `删除任务` | `Delete task` | 按钮 title |
| 58 | `client/src/pages/Goals/Goals.tsx:408` | `目标及其下属任务已删除` | `Goal and its tasks deleted` | 成功提示 |
| 59 | `client/src/pages/Goals/Goals.tsx:435` | `任务已删除` | `Task deleted` | 成功提示 |
| 60 | `client/src/pages/Goals/Goals.tsx:437` | `删除失败` | `Could not delete task` | 错误提示 |
| 61 | `client/src/pages/GroupGallery/GroupGallery.test.tsx:200` | `全部组 1` | `All groups 1` | 随产品文案同步的断言 token |
| 62 | `client/src/pages/GroupGallery/GroupGallery.test.tsx:201` | `最近` | `Recent` | 随产品文案同步的断言 token |
| 63 | `client/src/pages/GroupGallery/GroupGallery.test.tsx:202` | `按项目` | `By project` | 随产品文案同步的断言 token |
| 64 | `client/src/pages/GroupGallery/GroupGallery.test.tsx:223` | `Active Project · 项目级` | `Active Project · Project level` | 随产品文案同步的断言 token |
| 65 | `client/src/pages/GroupGallery/GroupGallery.test.tsx:235` | `Active Project · 未命名 · 8/29` | `Active Project · Untitled · 8/29` | 随产品文案同步的断言 token |
| 66 | `client/src/pages/GroupGallery/GroupGallery.test.tsx:248` | `Active Project · 项目级` | `Active Project · Project level` | 随产品文案同步的断言 token |
| 67 | `client/src/pages/GroupGallery/GroupGallery.test.tsx:276` | `全部组` | `All groups` | 参数化测试标签 |
| 68 | `client/src/pages/GroupGallery/GroupGallery.test.tsx:277` | `最近 / 最近` | `Recent / Recent` | 同行两个测试 token |
| 69 | `client/src/pages/GroupGallery/GroupGallery.test.tsx:282` | `全部组 1` | `All groups 1` | 随产品文案同步的断言 token |
| 70 | `client/src/pages/GroupGallery/GroupGallery.test.tsx:301` | `全部组` | `All groups` | 参数化测试标签 |
| 71 | `client/src/pages/GroupGallery/GroupGallery.test.tsx:302` | `最近 / 最近` | `Recent / Recent` | 同行两个测试 token |
| 72 | `client/src/pages/GroupGallery/GroupGallery.test.tsx:307` | `全部组 1` | `All groups 1` | 随产品文案同步的断言 token |
| 73 | `client/src/pages/Settings/Settings.tsx:231` | `中文` | `Chinese` | 语言选项；未改 locale JSON |
| 74 | `client/src/components/Layout/AppLayout.tsx:133` | `辅助` | `Utilities` | 导航分区标题；无现成等价 key |
| 75 | `client/src/pages/GroupGallery/groupGalleryNavigationModel.ts:98` | `全部组` | `All groups` | 固定去处标签 |
| 76 | `client/src/pages/GroupGallery/groupGalleryNavigationModel.ts:99` | `最近` | `Recent` | 固定去处标签 |
| 77 | `client/src/pages/GroupGallery/groupGalleryNavigationModel.ts:109` | `全部组` | `All groups` | 回退标签 |
| 78 | `client/src/pages/GroupGallery/groupGalleryShellModel.ts:39` | `未命名 · ${Number(match[1])}/${Number(match[2])} / 未命名` | `Untitled · ${Number(match[1])}/${Number(match[2])} / Untitled` | 同一条件表达式的两个字面量 |
| 79 | `client/src/pages/GroupGallery/groupGalleryShellModel.ts:71` | `Workspace · 工作区级` | `Workspace · Workspace level` | 来源范围标签 |
| 80 | `client/src/pages/GroupGallery/groupGalleryShellModel.ts:73` | `` `${sourceProject.name} · 项目级` `` | `` `${sourceProject.name} · Project level` `` | 来源范围标签 |
| 81 | `client/src/pages/GroupGallery/GroupGallery.tsx:542` | `返回` | `Back` | 按钮 |
| 82 | `client/src/pages/GroupGallery/GroupGallery.tsx:550` | `去处` | `Destinations` | 面板标题 |
| 83 | `client/src/pages/GroupGallery/GroupGallery.tsx:552` | `固定去处` | `Pinned destinations` | aria-label，语义保真 |
| 84 | `client/src/pages/GroupGallery/GroupGallery.tsx:566` | `按项目` | `By project` | 分区标签 |
| 85 | `client/src/pages/GroupGallery/GroupGallery.tsx:655` | `未命名` | `Untitled` | 笔记标题回退 |
| 86 | `client/src/pages/Courses/CourseDetail.tsx:1127` | `{snapshot.status} 璺?{snapshot.page_count \|\| 0} pages 璺?{snapshot.chunk_count \|\| 0} chunks` | `{snapshot.status} · {snapshot.page_count \|\| 0} pages · {snapshot.chunk_count \|\| 0} chunks` | 既有乱码分隔符归一化 |
| 87 | `client/src/pages/Courses/CourseDetail.tsx:1163` | `` ` 路 p.${scope.page_start}...` `` | `` ` · p.${scope.page_start}...` `` | 分隔符 |
| 88 | `client/src/pages/Courses/CourseDetail.tsx:1223` | ` 路 used by new proposals` | ` · used by new proposals` | 分隔符 |
| 89 | `client/src/pages/Courses/CourseDetail.tsx:1248` | `` ` 路 ${node.summary}` `` | `` ` · ${node.summary}` `` | 分隔符 |
| 90 | `client/src/pages/Courses/CourseDetail.tsx:1328` | `{count} exclusions 路 {count} open conflicts` | `{count} exclusions · {count} open conflicts` | 分隔符 |
| 91 | `client/src/pages/Courses/CourseDetail.tsx:1396` | `{event_type} 路 {next_status}` | `{event_type} · {next_status}` | 分隔符 |
| 92 | `client/src/pages/Courses/CourseDetail.tsx:1490` | `{count} sources 路 {confidence}%` | `{count} sources · {confidence}%` | 分隔符 |
| 93 | `client/src/pages/Notes/canvasEngine/layers/BlockEditorLayer.tsx:190` | `上接` | `From previous` | 只换续页徽标字符串，逻辑未动 |
| 94 | `client/src/pages/Notes/canvasEngine/layers/BlockEditorLayer.tsx:191` | `下续` | `To next` | 只换续页徽标字符串，逻辑未动 |
| 95 | `client/scripts/groupGalleryShellContractCheck.mjs:54` | `aria-label="固定去处"` | `aria-label="Pinned destinations"` | 保留契约断言并同步 token |
| 96 | `client/scripts/groupGalleryShellContractCheck.mjs:55` | `label: '全部组'` | `label: 'All groups'` | 保留契约断言并同步 token |
| 97 | `client/scripts/groupGalleryShellContractCheck.mjs:56` | `label: '最近'` | `label: 'Recent'` | 保留契约断言并同步 token |
| 98 | `client/scripts/groupGalleryShellContractCheck.mjs:57` | `按项目` | `By project` | 保留契约断言并同步 token |

## 分文件小计

| 文件 | 条数 |
|---|---:|
| `client/src/components/AgentPanel/PreferenceForm.tsx` | 10 |
| `client/src/components/MonthCalendar/MonthCalendar.tsx` | 6 |
| `client/src/pages/Calendar/Calendar.tsx` | 10 |
| `client/src/components/TemplateEditor/TemplateWeekView.tsx` | 4 |
| `client/src/components/TemplateEditor/TemplateEditorModal.tsx` | 23 |
| `client/src/components/TaskViewModal/TaskViewModal.tsx` | 3 |
| `client/src/pages/Goals/Goals.tsx` | 4 |
| `client/src/pages/GroupGallery/GroupGallery.test.tsx` | 12 |
| `client/src/pages/Settings/Settings.tsx` | 1 |
| `client/src/components/Layout/AppLayout.tsx` | 1 |
| `client/src/pages/GroupGallery/groupGalleryNavigationModel.ts` | 3 |
| `client/src/pages/GroupGallery/groupGalleryShellModel.ts` | 3 |
| `client/src/pages/GroupGallery/GroupGallery.tsx` | 5 |
| `client/src/pages/Courses/CourseDetail.tsx` | 7 |
| `client/src/pages/Notes/canvasEngine/layers/BlockEditorLayer.tsx` | 2 |
| `client/scripts/groupGalleryShellContractCheck.mjs` | 4 |
| **合计** | **98** |
