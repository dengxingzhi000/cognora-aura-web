<div align="center">

# Cognora Aura Web

### 供应链中台的控制塔前端。

**一套 Next.js 应用，覆盖商品、库存、订单、仓储、采购、财务、物流、会员、营销与分析。**

[![CI](https://img.shields.io/github/actions/workflow/status/dengxingzhi000/cognora-aura-web/ci.yml?branch=main&style=flat-square&logo=github&label=ci)](https://github.com/dengxingzhi000/cognora-aura-web/actions/workflows/ci.yml)
[![CodeQL](https://img.shields.io/github/actions/workflow/status/dengxingzhi000/cognora-aura-web/codeql.yml?branch=main&style=flat-square&logo=github&label=codeql)](https://github.com/dengxingzhi000/cognora-aura-web/actions/workflows/codeql.yml)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue?style=flat-square)](./LICENSE)
[![Node](https://img.shields.io/badge/node-22-339933?logo=node.js&logoColor=white&style=flat-square)](https://nodejs.org/)

[快速开始](#快速开始) · [常用脚本](#常用脚本) · [构建与部署](#构建与部署) · [API 契约](#api-契约) · [安全](#安全与依赖)

</div>

## 概览

`cognora-aura-web` 是 Cognora Aura 供应链平台的独立前端仓库。它不依赖后端的 Maven 构建，也不和任何 Java 服务一起发布：通过 HTTP 与平台后端通信（开发期走 `API_*_TARGET` 重写，生产期走网关），并在自己的 CI、镜像与发布流程中独立演进。

职责边界：

- 本仓库负责页面、组件、状态管理、API 客户端、代理重写与部署产物。
- 平台后端（订单、库存、商品、权限、审计、支付等 26 个服务）在 `cognora-aura-platform` 仓库维护，本仓库只消费其 OpenAPI 契约。
- 权限、租户隔离、金额与库存校验由后端强制，前端不做兜底判断。

## 技术栈

| 层 | 选型 |
|---|---|
| 框架 | Next.js 16（App Router、Turbopack、`output: "standalone"`）、React 19 |
| 语言 | TypeScript 7（`@typescript/native` 做 typecheck，TS 6 供 ESLint 使用） |
| 样式 | Tailwind CSS v4（CSS-first）、shadcn/ui（`src/components/ui` 源码内联） |
| 服务端状态 | TanStack Query v5 |
| 客户端状态 | Zustand（仅 UI 状态） |
| 表单 | React Hook Form + Zod |
| 表格 | TanStack Table（默认）、AG Grid（按需，走懒加载包装） |
| 图表 | Recharts（KPI）、ECharts（复杂图表）、G6（拓扑），全部懒加载 |
| 测试 | Vitest（单元）、Playwright（E2E） |

## 目录结构

```text
src/
  app/[locale]/(app)/   # 路由页面（zh-CN / en-US）
  components/           # ui（shadcn）、charts、data-grid
  features/<domain>/    # 业务特性、mappers、hooks
  lib/api/              # axios 客户端、contracts、services、generated
  lib/design-tokens.css # 颜色与设计 token 单一来源
scripts/
  fetch-openapi.mjs     # 从运行中的服务抓取 OpenAPI 文档
  build-deploy.sh       # standalone 组装 + tar
openapi/                # 后端契约快照（生成客户端输入）
```

## 快速开始

前置：Node.js 22+、npm 11+。后端可选；没有后端时页面能启动，但接口会失败。

```bash
npm ci
cp .env.example .env.local     # 填入你需要的 API_*_TARGET
npm run dev                    # http://localhost:3000
```

默认语言路由为 `/zh-CN/...` 与 `/en-US/...`；未登录访问会重定向到 `/login`。

## 常用脚本

| 命令 | 作用 |
|---|---|
| `npm run dev` | 开发服务器（Turbopack），默认 3000 |
| `npm run build` | 生产构建，产出 `.next/standalone` |
| `npm run start` | 本地以生产模式启动 |
| `npm run typecheck` | TypeScript 7 类型检查 |
| `npm run lint` | ESLint（flat config） |
| `npm test` | Vitest 单元测试 |
| `npm run test:coverage` | 单元测试 + 覆盖率 |
| `npm run test:e2e` | Playwright（会自动拉起 dev server） |
| `npm run generate:api` | 由 `openapi/` 快照生成 5 个 typed client |
| `npm run fetch:api` | 从运行中的后端刷新 `openapi/` 快照 |

## 构建与部署

生产构建使用 `output: "standalone"`。两种交付方式：

**镜像（推荐）**

```bash
docker build -t ghcr.io/dengxingzhi000/cognora-aura-web:0.2.0 \
  --build-arg API_AUTH_TARGET=http://<host>:8106 \
  --build-arg API_SYSTEM_TARGET=http://<host>:8081 .
docker run -d --name cognora-aura-web -p 3000:3000 ghcr.io/dengxingzhi000/cognora-aura-web:0.2.0
```

**目录 + tar（无镜像仓库时）**

```bash
./scripts/build-deploy.sh
# dist/scm-web-deploy/ contains server.js, .next/static, public, node_modules
# dist/scm-web-deploy.tar.gz is the upload artifact
```

注意：`API_*_TARGET` 在构建期被写进 `next.config.ts` 的重写规则，换后端地址必须重新构建，不能只重启容器。仓库也提供 `docker.yml`，在 push 到 `main` 或打 `v*` tag 时构建并推送 GHCR。

## API 契约

- `openapi/` 存放后端文档快照；`openapitools.json` 的 5 个 generator 直接读这些文件，因此 `npm run generate:api` **离线可跑**。
- 契约变更流程：平台侧发布新的 `openapi-*.json` → 本仓库更新快照 → 重新生成客户端 → PR 中注明来源提交/标签。
- 生成目录 `src/lib/api/generated/` 由生成器拥有，禁止手改，CodeQL 也已忽略该目录。
- 浏览器请求默认走 Next 自身的重写（`API_*_TARGET`）；把 `NEXT_PUBLIC_API_BASE_URL` 指向网关即可绕过重写。

## 安全与依赖

- 安全报告流程见 [SECURITY.md](./SECURITY.md)；请勿用公开 issue 报告漏洞。
- CodeQL 覆盖 JavaScript/TypeScript 与 GitHub Actions，每周一与每次 PR 运行。
- Dependabot 每周一检查 npm、GitHub Actions 与 Docker 基础镜像。
- 凭据一律走环境变量，`.env.local` 不入库；仓库开启了 secret scanning 与 push protection。

## 贡献

见 [CONTRIBUTING.md](./CONTRIBUTING.md) 与 [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)。`main` 只接受 PR，禁止强推与删除分支。

## 许可证

Apache License 2.0，与 `cognora-aura-platform` 保持一致，全文见 [LICENSE](./LICENSE)。
