## 描述

简要说明本次改动。

## 变更类型

- [ ] Bug 修复（不破坏现有行为的修复）
- [ ] 新功能（新增能力）
- [ ] 破坏性变更（现有调用方需要同步调整）
- [ ] 文档更新
- [ ] 重构（无行为变化）

## 关联 Issue

Fixes #(issue)

## 破坏性变更检查（勾选"破坏性变更"时填写）

- [ ] `openapi/` 下的契约快照已更新，且来源 platform 版本已记录
- [ ] 已运行 `npm run generate:api` 并提交生成的客户端
- [ ] 影响到 `API_*_TARGET` / `NEXT_PUBLIC_*` 时，已同步 `.env.example` 与部署文档
- [ ] 路由或页面入口变化已同步 README

## 检查清单

- [ ] 遵循项目代码规范（`npm run lint` 无新增错误）
- [ ] 已完成自测（`npm run typecheck`、`npm test`、`npm run build` 均通过）
- [ ] 已为修复/新功能补充测试
- [ ] 文档已同步（必要时更新 README / `.env.example`）
- [ ] 未提交任何密钥、`.env.local` 或内网地址

## 影响范围

- [ ] 页面 / 组件（`src/app`、`src/components`）
- [ ] 业务特性（`src/features`）
- [ ] API 客户端（`src/lib/api`）
- [ ] 构建与部署（`Dockerfile`、`scripts/`、`next.config.ts`）
- [ ] CI / 治理（`.github/`）

## 测试说明

说明你如何验证本次改动。

## 截图（如适用）
