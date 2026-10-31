> **from**: claude(HQ Fable 会话)
> **to**: 临时工程对话1(Claude Opus 5.5 builder)
> **status**: ready(Henry 冒烟实测报虫,经学习会话取证转交,Henry 指示 HQ 统筹;三虫均 🅰 正确性级)
> **单号**: VPS-F1 · Source 首用三虫修理单
> **上游**: 学习会话取证报告两份(服务器侧证据,仓外);HQ 11-01 普查核实全部引用位点;协议照旧(回执落本文件/证据落 audits/HQ 自取)

# VPS-F1 · Source 首用三虫修理单

## 〇 · 背景一句话

Henry 在岛上(f3f0611f)首次真用 Source Library,三虫现形:原件打不开(路径双前缀 404)、正常 docx 被解压倍数闸误拦、中文文件名存成乱码。全部代码面,本地同样复现,与部署无关。

## 一 · 修一:blob 请求路径双前缀(404)

- **病灶**:服务端 `sourceFileIntake.ts:813` 返回 `blob_url: '/api/sources/<id>/blob'`;客户端 `sourceApi.ts:139` 把它交给 baseURL='/api' 的 axios → 实际请求 `/api/api/...` 404。抓包实锤(201→202→404 链)。
- **修法(HQ 已定:客户端侧)**:照画布资源先例(`canvasAssetRepository.ts:76` 自己拼不带 /api 的路径)——`openAuthenticatedSourceBlob` 改为用 source id 自拼 `/sources/${id}/blob`,或对 blob_url strip 前导 `/api`(二选一,申报);**服务端 blob_url 一字不动**(canvas 服务端同样带前缀,动了破一致性+动 API 形状)。
- **普查既知**:client 侧 blob_url 消费仅 sourceApi.ts:139 一处+类型声明;测试夹具 `SourceReprojectionDialog.test.tsx` 含 blob_url,涉改则同步。
- **测试**:mock 层断言实际请求 URL 恰为 `/api/sources/<id>/blob`(单前缀)。

## 二 · 修二:docx 解压闸换双闸

- **病灶**:`sourceArtifact.ts:145` `maxZipExpansionRatio: 5`——正常讲义 docx 实测 7.4x/11.7x 被拦(`resource_limit`);纯文本 XML 高压缩率属常态。
- **修法(HQ 已定)**:换**双闸**——①倍数上限放宽至 **100**;②新增**解压后总量绝对上限 `maxZipExpandedBytes: 200MB`**(挡资源滥用的主闸是绝对量,倍数为辅);两闸任一触发仍抛 `resource_limit`,错误消息分别可辨(倍数触发/总量触发);
- **重试通路核验**:确认既有 re-materialize/重试入口能把 `status=failed, error_code=resource_limit` 的记录重新跑起来(代码面核验+测试,⛔动真库——岛上两条失败记录由 HQ 部署后运维层重试);
- **测试**:①阳性=构造 10 倍左右压缩率的合法 docx 通过;②资源上限功能用例=构造超绝对上限的大体积件被拦、错误码不变;③既有 5 倍边界用例按新闸值更新。

## 三 · 修三:multipart 文件名编码还原

- **病灶**:`原始文件名` UTF-8 字节被按 Latin-1 解读入库(`网络与服务器.pdf`→`ç½ç»ä¸æå¡å¨.pdf`;Latin-1 回转字节再按 UTF-8 解码完整还原,实验已做)。疑 multer 2.x 底下 busboy 的 filename 默认字符集。
- **修法(优先级判据)**:①先查 multer/busboy 是否支持上游参数(如 `defParamCharset: 'utf8'` 直通)——支持则用上游开关;②不支持则在**两处中间件**(`sourceUpload.ts` 与 `upload.ts`,后者覆盖材料库同路)或其消费点做守卫式还原:`Buffer.from(name,'latin1').toString('utf8')`,仅当还原结果为合法 UTF-8 且与原值不同才替换(防误伤真 Latin-1 名);所选路线申报;
- **⛔数据迁移**:岛上已存的一条乱码名不在本单射程(运维层面处理);
- **测试**:中文名/纯 ASCII 名/真 Latin-1 名(如 `résumé.pdf`)三向用例——中文还原、ASCII 不变、真 Latin-1 不被二次损坏;两条上传中间件路径都要覆盖。

## 四 · 验收与测试面

- 服务端定向:涉改+同目录邻接,正门 cwd=server/ 下 `node ../scripts/run-server-test-suite.mjs <files…>`;
- client 定向:Sources 涉改面 vitest(含 SourceReprojectionDialog 若涉);
- 至少一处阳性对照(改坏→独红→还原复绿,留 TAP);
- ⛔真实模型调用;⛔全库马拉松;真机验收(Henry 重新上传两份讲义+中文名件)归部署后冒烟。

## 五 · 纪律(照抄现役)

⛔一切 git 写操作(交工作树,commit 归 HQ);⛔读 .env key 值;⛔真实模型调用;⛔用户库接触;⛔动依赖与锁文件(若修三查明必须升 multer 版本才能走上游开关:停线申报候 HQ,⛔自行动锁);新造凭据形合成值 ≤20 字符或用 `synthetic-key-not-real-*` 标记;⛔新设计安全对抗类用例——修二的上限用例属**资源上限功能测试**(构造超限输入验证闸值与错误码),措辞中性,射程=功能/数据/回归。

## 六 · 回执协议

本文件尾部追加 `## Result — <日期> · 临时工程对话1`(执行状态/写点/测试数字实跑实报/未做清单/环境申报);证据落 `docs/audits/2026-11-01-vps-f1-builder/`;回执落文件,HQ 自取(进度短讯可发跨会话消息)。

## 七 · 不在射程

材料库上传失败的独立复现(未取证,另案);岛上既存数据修正(乱码名一条/失败记录两条的实际重试=部署后运维);Source 三层方向的任何结构性改动;P2/P3。
