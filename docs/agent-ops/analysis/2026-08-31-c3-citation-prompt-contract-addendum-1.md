> **状态 (Status)**: active(补遗 1;调度方裁定,原契约字节不动)
> **层 (Layer)**: 分析 / Analysis(c-3 引用契约 · 文件身份映射补遗)
> **日期 (Updated)**: 2026-08-31
> **权威 (Authoritative)**: 与主契约同级(仅 §5 第 1 步的身份映射);主契约 SHA `8dd249db1cbbb34a04c0f4080bd34c73ebf319f10a4eb191c94078c8583832aa` 不变

# c-3 引用契约补遗 1:存在域文件身份映射(机械冻结)

**背景**:主契约 §5 第 1 步「以收据单边 evidence 的 `path` basename 对齐 host 的 `original_filename`」在现物上字面不可满足——census 侧 basename 以 `.fragments.json` 结尾,host 侧 `original_filename` 以 `.pdf` 结尾,两组四名逐字交集为空。照字面实现会让 175 张收据全部零命中且**静默全绿**。腿 2 builder 按纪律停线交回,判断正确。

**裁定(取代主契约 §5 第 1 步,其余各步不变)**:

1. census evidence basename **必须**以字面后缀 `.fragments.json` 结尾;host `original_filename` **必须**以字面后缀 `.pdf` 结尾——任一不满足,该收据/该卷记 `identity_mapping_stop` 并在**首次 API 调用前**停线交回,⛔ 不猜测不模糊匹配;
2. 各自**只剥上述一个完整字面后缀**(census 剥 `.fragments.json`,host 剥 `.pdf`),不做其他归一化(大小写/空白/Unicode 一概不动);
3. 剥后两个 stem **逐字相等**才算对齐;
4. 本补遗只定文件身份映射,⛔ 不触及页级投影(§5 第 2-5 步)、判废码、prompt 字节与预算。

**自证义务**:腿 2 实现须含一条测试——construct 四对现物名,断言逐对对齐;再 construct 一个后缀不符样本,断言 `identity_mapping_stop` 路径触发(功能性数据样本,中性措辞)。
