> **状态 (Status)**: ready(V14 之交批首单;Henry 认对标报告后令"开始做")
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-13
> **单号**: V14 之交批 · 单1 · 调色板资产 v1+统一取色器
> **上游**: `analysis/2026-09-13-appearance-benchmark-survey.md`(**交互规格权威**,本单吃不变量 7/8/9/12+§四调色板抽屉)+会议记录 09-12 §一(色盘三段式/命名色池,Henry 拍)

# 单1 · 调色板资产 v1 + 统一取色器

**性质**:命名色池(出厂 24+用户添)+全应用统一取色器部件。取色器是外观族共同地基——浮卡/设计室/贴纸将来全吃它。交互规格**逐条以对标报告为准**,本单只写机制与射程。

## 一 · 数据与契约

1. **迁移 070**:`palette_colors(id, user_id, name TEXT, value TEXT(hex), sort INTEGER, origin TEXT CHECK('factory'|'user'), created_at)`——分组⛔独立结构:**命名即分组**(名字含 `/` 前缀成组,如「暖调/杏黄」,报告不变量 9);
2. **出厂 24 色 seed**(每用户初始化,origin='factory',**⛔改⛔删**——Canva 出厂色同款;用户色可增改删):

   | 组 | 色(名=值) |
   |---|---|
   | 暖调 | 杏黄 #E8B04B · 赭石 #B8703F · 绯红 #C25B4E · 玫瑰 #C97B8E · 暖棕 #8A6248 · 奶油 #F2E3C6 |
   | 冷调 | 墨蓝 #4A6FA5 · 青碧 #4E8D7C · 黛紫 #6E5E8E · 湖蓝 #5B9BB5 · 松绿 #4F7350 · 靛蓝 #3D5273 |
   | 中性 | 炭黑 #2B2B2E · 石墨 #55565C · 暖灰 #8C8578 · 冷灰 #7E8794 · 米白 #EDE8DC · 纸白 #F7F4EC |
   | 点缀 | 琥珀 #E5A33C · 朱砂 #D14B3A · 苔绿 #7C9A4E · 天青 #6BB3C9 · 藕荷 #B48EAD · 金驼 #C9A15F |

3. **人面路由**:GET/POST/PATCH/DELETE `/api/palette-colors`(zod;名 1-64 字;值 #hex6/8;factory 行的 PATCH/DELETE 一律 409 可读明码);⛔Agent 面(V14 后随皮提案批);
4. **引用语义(skin 契约扩展)**:token override 值扩展为 `hex` **或** `palette:<uuid>`(shared/types/skin.ts+server validator 同步——B1e 五键台账先例照办);resolveSkin 解析引用为池色现值——**改池色=引用者自动跟**(读时解析天然);
5. **detach 合同(报告不变量 2,逐字执行)**:删用户池色=服务端**同一事务把全库引用该色的 overrides 改写为其当时 hex**(降级字面值)——零弹窗零外观变化零悬空引用;新增定向测试断言"删色后消费者解析值逐字不变";
6. 权威 ownership:新增 getOwned* 按 `analysis/2026-09-13-ownership-signature-ruling-draft.md` 权威签名写(active 法,增量止血条款)。

## 二 · 统一取色器部件(共同地基)

新部件 `UnifiedColorPicker`(client/src/components/ColorPicker/),分区自上而下(报告不变量 7):

1. **调色板区(第一屏)**:按斜杠分组折叠,色块 hover 显名;点击=**存引用**;区头「编辑」进就地编辑态(不变量 8):加色(**hex 输入一等公民**)/改名改值/删(factory 禁)/拖排序;「把当前颜色入池」+号常驻;
2. **标准色区**:固定栅格(一排常用+黑白灰);点击=存绝对值;
3. **最近使用**:client 本地(localStorage,≤12 色);
4. **自由取色**:色轮/色域+hex 输入(三段式的"高级保留");点击=存绝对值;
5. **色源标注**:当前值旁显示「引用·暖调/杏黄」或「一次性色+入池」一键(修 Word 静默分叉之坑,报告不变量 7);
6. 键盘可达+Esc 关。

## 三 · 接线射程(v1 收敛)

1. **SkinControls 高级颜色区**:ColorField(hex input)全部替换为 UnifiedColorPicker(弹出式);皮 token 从此可绑池色;
2. 其余取色处(墨水/标注/粉笔)**⛔本单接**——记 Result 未做,归后续单(地基先立);
3. 快选条/浮卡零动(浮卡单吃取色器,下一单)。

## 四 · 台账义务(常备条款)

挂载期新请求 `GET /api/palette-colors`:全夹具台账普查(unboxing 严格台账/Board 族/登记制夹具),凡渲染 SkinControls/SkinEditor 的场景显式登记或 mock;client **全库必跑**。

## 五 · 禁区

⛔动皮 token 词汇表(9 token 封闭不变);⛔Agent 面;⛔接墙/标注/墨水取色(记未做);⛔安全类测试;⛔碰 .git;⛔commit;⛔读 .env key 值;⛔用户库接触。

## 六 · 验收

1. typecheck+build 三端绿;`check:test-wiring`/`check:tech-debt-table` 绿;受影响静态门绿;
2. 定向新增:①路由 CRUD+factory 409 ②引用解析(改池色→绑定 token 跟变)③**detach 事务**(删色→消费者解析值逐字不变+引用清零)④命名分组(斜杠)⑤取色器分区与存储语义(点池色存引用/点标准存绝对);skin 族回归绿;server 全量+client 全库绿;
3. 冒烟(隔离库+真浏览器):取色器四区渲染→皮 token 绑池色→改池色纸面跟变→删池色纸面零变→hex 加色→入池一键→分组折叠;
4. 证据落 `docs/audits/2026-09-13-palette-builder/`(⛔构建产物);git/secrets HQ 收口补跑。

## 七 · 申报义务

Result 必含:交付清单+numstat、迁移与 seed 申报、detach 事务实现口径、台账普查清单、测试数字、未做项(墨水/标注接线等)。冲突停线举证⛔自作主张。

---

## 补遗一(HQ 裁定,2026-09-13 二轮)

裁:**是**——报告 §四 的"多命名板"在我们实现=**斜杠前缀派生分组**(不变量 9 优先于 Canva 的多板实体结构;"暖调/杏黄"的「暖调」即一块"板",零独立数据结构);本单落点=统一取色器内(调色板区分组折叠+就地编辑);设计室"抽屉的家"随后续壳单接入,届时读同一份数据(Canva"家与随身编辑口读写同一份"原则)。工单七节零变,续工。
