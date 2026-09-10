> **状态 (Status)**: ready
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-10
> **上游**: 13.5 段 plan 草案波次 A(Henry 放行非门控先行);走查 9 在案(停车场 C:provider/key 设置产品化);Tauri 打包前置(凭据出 repo)
> **单号**: 13.5 · A2 · OS 凭据库(provider/key 设置产品化)

# 13.5 A2 · OS 凭据库

**使命**:provider key 的存储从 repo 内 `.env` 迁出到**应用数据目录**,Settings 统一管理入口(填/换/清/测试连接)。**真实迁移=Henry 亲手**:单收官后他在 Settings 亲填 key、亲点测试连接、自行删 `.env` 旧行——builder/HQ 全程零接触真实 key 值。

## 零 · 红线(⛔违者即停)

1. **⛔ 读取真实 `.env` 的值**(改动读取代码可以,打开读值不可以);⛔ 任何真实 key 值出现在代码/测试/日志/回执/HTTP 响应;
2. 测试全用**明显合成的假值**(如 `synthetic-key-not-real-...`);test-connection 的自动化验证用 mock HTTP,**⛔ 向真实 provider 端点外呼**(真外呼验证=Henry 亲点);
3. **⛔ 设计/新增安全类测试**(存储加密、攻击面、越权探测一概不做);存储定性申报即可:数据目录明文文件=与 `.env` 同级明文,仅改住址;加密升级候裁⛔本单;
4. ⛔ 用户库接触;⛔ key 进用户数据库表(库会被备份/迁移,凭据属机器本地)。

## 一 · 射程

1. **侦察现物先行申报**:现有 provider/key 读取链(`server/src/agent/providers/*`、`getProviderFromSettings`、settings 服务与 `.env` 消费点),各 provider 名录按现物;
2. **Server 存储**:应用数据目录(与现有应用数据/DB 目录同族,⛔ repo 路径内)独立凭据文件;读取优先级=**数据目录凭据 > 环境变量**(`.env` 保留为 fallback,⛔ 本单删除其支持——删旧行是 Henry 的手);
3. **API**:GET 状态(每 provider:有/无 key + 掩码尾 4 位,⛔ 回传完整值)/PUT 写入/DELETE 清除/POST test-connection(服务端最小请求,返回成功或可辨识错误类别,⛔ 透传 key);
4. **Client Settings**:Providers 区——输入框(存后掩码显示)、Test connection、Clear;沿 Settings 现有形制;⛔ 显示/回填存量明文;
5. 与 A1 的 Settings 面和平共处(A1 已收官入库)。

## 二 · 验证(单内纪律)

- typecheck + build 全绿;定向回归(Settings + agent/providers 既有测试)不破;
- 冒烟五条:①合成值 PUT→GET 掩码状态正确→新进程(临时数据目录)重读生效;②test-connection 走 mock HTTP,成功/失败类别可辨;③无数据目录凭据时环境变量 fallback(合成值)不破;④agent/providers 既有套件整跑不破;⑤DELETE 后回退 fallback 或"无 key"状态明确,UI 同步。

## 三 · Result 格式

`## Result`:现物侦察申报 + numstat + 五冒烟逐条 + 存储定性申报 + 未做 + 停线;**⛔ commit**;⛔ 读 .env 值;⛔ key 出境;⛔ 用户库接触;⛔ 安全类测试(既有套件整跑⛔过滤;凭据扫描留 HQ)。
