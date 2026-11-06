# V2 走查(builder 2026-11-06,本地 scratch 库,真 Chrome 内嵌浏览器,1440×900)

后端:scratch 服务器、新库。前端:两份构建,同源同库对比。`pre` = 当前工作树去掉本单 CSS(scratch 副本里去掉,不碰共享树);`post` = 本单。
数据:上传 `docs/audits/2026-09-11-b1a-builder/warm-paper-print.pdf`,生成原页(1 页),在投影笔记上建一个内容组,再 Rebuild。

## B-79 原页头部可被滚走
在原页头部(切换所在行)滚轮向下 8 格,再量切换的位置和主区滚动量。
| 构建 | 切换 top | 主区 scrollTop |
|---|---|---|
| pre | -110(滚出屏幕) | 180 |
| post | 70(在屏) | 0 |
根因:原页模式下写作面 section 只是 `visibility: hidden`,仍占版面(120px 加间距),主区可滚 180px。原页视口自己 `overscroll-behavior: contain`,头部却会把滚轮交给主区。修法沿用 Overview 已有的那条规则:原页打开时主区 `overflow: hidden`。

## B-78 悬浮切换盖住 Overview 关闭键
文本模式打开 Overview,用 `elementFromPoint` 取关闭键中心实际命中的元素。
| 构建 | 关闭键中心命中 | 悬浮切换 display |
|---|---|---|
| pre | `Pages` 按钮 | flex |
| post | 关闭键 | none |
关闭 Overview 后切换回来(display flex),文本模式主区恢复 `overflow: auto`。截图 `b78-float-back-after-overview.jpg`。

## A-22 Rebuild 后内容组找不到
Rebuild 后 API:组仍 `active`,`note_id` 为空字符串,`course_id` 保留,旧笔记 404。
- 修前:Group Gallery 0 个组;新笔记 Groups 面板「No content groups yet」(`a22-before-groups-panel-empty.jpg`)。
- 修后:Gallery 底部「Not in any note」区列出该组(标题、项目、主题),只读,没有任何按钮(`a22-gallery-not-in-any-note.jpg`)。
- Rebuild 弹窗文案写明组会离开笔记、去哪找(`a22-rebuild-dialog.jpg`)。

## 顺带看到(未改)
- 打开带原页的笔记时,主区有 26px 初始滚动,pre、post 一样,不是本单引入。头部仍在屏内。
- 原页模式下右侧「Groups」入口不可见:它在写作面里,写作面整体隐藏。pre、post 一样。
- Gallery 有时长时间停在「Loading content groups」,和本单无关,未查。
