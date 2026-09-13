> **状态 (Status)**: complete（单 worker 全库通过）
> **层 (Layer)**: 审计 / Builder 客户端终验
> **记录日期**: 2026-09-13（运行环境日期 2026-09-12）

# 客户端单 worker 终验

`client-final.log` 的两处失败为书签首次查询等待失败、图层第一条工作流5000ms超时。该日志开头记录的命令链是根脚本 `npm run test:unit --maxWorkers=2`，但内层最终为 **`vitest run`，没有worker参数**。根脚本向下一层npm传参时缺少分隔符，故此前不能算作限定两个worker的执行证据。

本轮直接调用本地CLI，绕开嵌套npm参数传递：在 `client` 目录执行 `node node_modules/vitest/vitest.mjs run --maxWorkers=1`（执行器使用CLI绝对路径）。`client-failures-serial.json` / `client-final-serial.json` 记录真实argv、cwd、退出码与耗时；环境仍指向自建空目录与空dotenv文件。

先只运行 `BoardPage.bookmarks.test.tsx` 和 `BoardPage.layers.test.tsx` 两个完整文件，**2文件 / 10测试全部通过**。原失败的图层首例392ms、书签首例351ms，均远低于原有限时；没有修改测试断言、超时、夹具或产品实现。结合之前初轮同文件通过、这次嵌套命令实际丢失worker限制，证据支持过高并发下的资源竞争，而非可稳定复现的功能回归。

随后对完整client库执行同一个直接CLI单worker命令，**157文件 / 1632测试全部通过，退出码0**。Vitest耗时192.70秒，执行器总耗时193.213秒；输出为 `client-final-serial.log`，运行元数据为 `client-final-serial.json`。本轮没有调整超时、断言、夹具或产品代码。

执行期间根会话调整了浮卡保存后滚动的effect时机，并追加第13条浮卡测试。本轮日志已经记录 `SkinFloatCard.test.tsx` 为 **12测试通过（983ms）**，采样早于该追加；因此本全库结果与根随后补跑的最终浮卡单文件、typecheck/build共同构成收口证据，不将本轮冒称为晚到改动后的全库快照。

本次不修改package脚本或测试配置。需要在今后的命令中保留worker限制时，可直接调用本地Vitest CLI，或从client目录使用一层 `npm run test:unit -- --maxWorkers=1`。
