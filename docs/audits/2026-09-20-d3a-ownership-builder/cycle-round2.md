> **状态 (Status)**: active
> **层 (Layer)**: D3a builder 静态取证
> **日期 (Updated)**: 2026-09-20

# TD-16 环拆证据

方法：TypeScript AST读取server/src + shared运行时相对import/export以及字面量import()/require()，排除type-only、测试与声明文件，再做Tarjan强连通分量。修改前取HEAD代码（二轮开工产品码无未提交修改），后取工作树。完整边表留round2-cycle-audit.json。

- 修改前：335模块/744边；routes/notes↔services/notes构成SCC。
- 修改后：338模块/757边；该SCC消失。全图service→route边从1→0；该import声明原携带两个ownership helper。
- routes/notes现在消费courseOwnership/noteOwnership，services/notes也消费两叶子；叶子只运行时依赖AppError，无回到route的路径。
- 全图另有既存sourceFileIntake↔sourceImprints SCC（其中包含动态import），前后均存在，本单未动；**不宣称全仓零环**。
- 射程不覆盖非字面量动态加载、第三方包、别名路径的全运行时解析。TD-16结论限定于本单指定ownership环及静态可见路径。

现役check:server-shared-runtime-import照跑；新增owned-helper-contract还禁止ownership所在模块反向引用routes。
