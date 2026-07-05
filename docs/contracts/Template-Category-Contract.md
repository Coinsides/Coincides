> **状态 (Status)**: deferred
> **层 (Layer)**: 契约 / Contract
> **日期 (Updated)**: 2026-06-12
> **权威 (Authoritative)**: 否
> **取代 (Supersedes)**: —
> **被取代 (Superseded by)**: —

# Template / Category Contract

**状态**：V2.BN.6 合同
**用途**：定义 TemplateDefinition、TemplateVariant、CategoryMembership 与未来 Template Studio 的边界。

## 1. Template Identity

### TemplateDefinition

模板 truth。它可以定义：

- primitive family；
- structured field schema；
- default field values；
- render hints；
- behavior hints；
- source behavior；
- relation behavior；
- agent guidance。

### PrimitiveBlockFamily

最粗 block 家族。

第一版默认家族：

```text
text
heading
definition
formula
code
source_quote
sticky
```

### TemplateVariant

用户实际选择或创建的具体模板。

例子：

```text
text.paragraph
definition.basic
formula.math
code.snippet
source.quote
sticky.note
```

### TemplateCategoryMembership

发现入口，不是 block identity。

它只影响：

- slash menu 分组；
- insert menu 分组；
- Template Studio 组织；
- 用户查找。

## 2. 第一版分类入口

第一版只承认：

```text
Default
Math
User Defined
```

不预置：

- Physics；
- Chemistry；
- Biology；
- History；
- Engineering；
- Research。

原因：分类不是知识 truth，也不是 ontology。过早预置太多分类会制造维护负担和误导。

## 3. Category 不是 canonical identity

同一个 TemplateVariant 可以出现在多个 category。

```text
formula.math
  -> Default
  -> Math
```

Category 不能改变：

- primitive family；
- field schema；
- source semantics；
- relation semantics；
- AI visibility；
- export role。

## 4. Composition / Domain / Package

### CompositionTemplate

多个 template 组合成的 section / pattern。

### DomainBlockSet

领域包。它可以推荐某些 template / composition，但不能覆盖用户内容 truth。

### PackageManifest

模板、领域包、composition、metadata 的可移植包清单。

## 5. V2.BN.8 前置条件

Template Studio Productization 才做：

- user-owned template variant；
- copy from system template；
- field schema safe edit；
- field layout safe edit；
- category membership UI；
- template preview；
- reading/editing/debug preview；
- package import/export integration。

V2.BN.6 只锁定 contract，不做完整 Template Studio。
