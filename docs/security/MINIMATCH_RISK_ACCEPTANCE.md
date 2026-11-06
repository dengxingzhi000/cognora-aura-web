# 风险接受：minimatch（GHSA-g3hv-75wg-m249）

- 状态：**已接受（accepted）**
- 接受日期：2026-11-06
- 适用版本：`package-lock.json` 中所有受影响的 `minimatch` 副本（10.2.5 / 10.2.6）
- 公告：<https://github.com/advisories/GHSA-g3hv-75wg-m249>

## 结论

不升级、不 fork、不 vendored patch；在 Dependabot 中把该告警 dismiss 为
`vulnerable code is not used`。等上游把 `minimatch` 依赖推进到 `>= 11.0.1`
后，由分组更新自动关闭本条风险。

## 事实依据

1. **仅在开发期工具链**：受影响的副本全部来自 lint/build 依赖
   （`eslint@10.13.0`、`glob@13.0.6`、`@eslint/config-array`、
   `typescript-eslint` 的 `typescript-estree`），在 `package.json` 中均为
   `devDependencies`，不进入 Next.js 运行时产物，也不随镜像发布。
   根级 `minimatch@3.1.5` 不在公告受影响范围。
2. **没有可达的修复路径**：公告给出的最低修复版本是 `11.0.1`（跨一个大版本），
   而依赖树中的父包分别锁定：

   | 父包 | 版本 | 约束 |
   | --- | --- | --- |
   | `eslint` | 10.13.0 | `^10.2.5` |
   | `@eslint/config-array` | 0.23.5 | `^10.2.4` |
   | `glob` | 13.0.6 | `^10.2.2` |
   | `@typescript-eslint/typescript-estree` | 8.72.0 | `^10.2.2` |

   semver 无法解析到 `11.0.1`，Dependabot 只能报
   `security_update_not_possible`。
3. **强推 11.x 会破坏 lint**：`eslint@10` 与 `glob@13` 仍按 `minimatch`
   v10 的导出语义使用；用 npm `overrides` 强推到 11.0.1 会让 `npm run lint`
   在运行时失败，而这类不兼容不会在类型检查阶段暴露。
4. **生产依赖无该包**：`minimatch` 不出现在 `dependencies`，也不在
   `npm run build` 的服务端产物中，用户请求无法触达该代码路径。

## 影响评估

- 攻击面：需要攻击者控制 eslint/glob 的匹配模式，且发生在开发者本机或 CI
  的 lint 过程中；仓库内的 lint 目标由配置固定，不接受外部输入。
- 后果上限：构建期 CPU 占用（ReDoS），可由开发者或 CI 超时中断。
- 与“引入不兼容的 override 导致 lint/CI 全红”相比，接受该风险的成本更低。

## 复核触发条件

出现以下任一情况时重新评估（并把本条改为重新打开或直接关闭）：

- `eslint` / `glob` / `@eslint/config-array` / `typescript-eslint` 任一上游把
  `minimatch` 约束提升到 `>= 11.0.1`；
- 该公告的受影响范围或评分被上调（例如升为 high/critical）；
- 仓库引入在**运行时**使用 `minimatch` 的依赖。

## 相关记录

- Dependabot 告警：`GHSA-g3hv-75wg-m249`（dismissed，reason `not_used`）
