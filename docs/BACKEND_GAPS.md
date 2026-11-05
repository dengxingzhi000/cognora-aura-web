# 后端接口缺口交接

本文档记录前端「个人中心 / 系统设置」在落地时确认缺失的四组后端接口。来源为仓库内 `openapi/` 的 16 份服务快照与对应服务的控制器实现。

每条包含：前端页面位置、期望的请求/响应字段（建议契约，后端可调整）、现有替代通道的缺陷、以及前端拿到接口后的使用方式。前端**不会**为这些能力伪造数据或调用管理员接口降级实现；当前页面统一渲染「暂未开放」。

## 1. 登录会话列表

- **前端页面**：`/[locale]/settings/security` — `src/features/profile/components/security-settings.tsx`
- **期望接口**：`GET /api/auth/sessions`
- **期望响应**：

  ```json
  {
    "data": [
      {
        "sessionId": "string",
        "deviceName": "string",
        "deviceType": "web | mobile | desktop",
        "ip": "string",
        "location": "string",
        "userAgent": "string",
        "createdAt": "ISO-8601",
        "lastActiveAt": "ISO-8601",
        "current": true
      }
    ]
  }
  ```

- **现有替代通道及缺陷**：
  - 唯一相关端点是 `POST /api/auth/force-logout/{userId}`（另有 `POST /api/system/users/{id}/force-logout`），需要 `system:user:edit`，是管理员按用户踢下线的通道；普通用户无法调用，也无法得知自己在哪些设备登录。
  - `GET /api/auth/webauthn/credentials` 只返回安全密钥凭证，不是登录会话。
- **前端使用方式**：替换「登录会话 / 退出其他设备」的暂未开放卡片；渲染会话列表并标记 `current` 会话；只读，不新增写操作。无会话时展示空态。

## 2. 本人作用域的「退出其他设备」

- **前端页面**：`/[locale]/settings/security` — `src/features/profile/components/security-settings.tsx`
- **期望接口**：以下两种任一
  - `POST /api/auth/logout-others`，响应 `{ "data": { "revokedCount": 0 } }`
  - 或 `DELETE /api/auth/sessions/{sessionId}` + `POST /api/auth/sessions/logout-others`
- **现有替代通道及缺陷**：
  - `POST /api/auth/force-logout/{userId}` 需要 `system:user:edit`，且作用于任意 `userId`，不是「保留当前会话、踢掉其他会话」的语义；直接复用会让普通用户 403，也让有权限用户误踢自己。
  - 没有「当前会话标识」，前端无法区分哪个会话应当保留。
- **前端使用方式**：在会话列表加载成功后启用「退出其他设备」按钮，二次确认后调用；成功后刷新会话列表并提示「当前设备的登录已保留」。没有该接口时按钮不渲染。

## 3. 系统参数（平台级配置）

- **前端页面**：`/[locale]/settings/preferences`（平台级设置）— `src/features/settings/components/system-settings.tsx`
- **期望接口**：
  - `GET /api/system/config`（或带分页的 `GET /api/system/config/page`）返回列表
  - `PUT /api/system/config` 单条 upsert
- **期望字段**：

  ```json
  {
    "configKey": "string",
    "configValue": "string",
    "valueType": "STRING | NUMBER | BOOLEAN | JSON",
    "description": "string",
    "isPublic": false,
    "updateTime": "ISO-8601"
  }
  ```

- **现有替代通道及缺陷**：
  - 现有 `GET /api/system/dicts/types` 及其 items 是「字典类型 + 字典项」的展示型数据，不能承载类型化的全局参数，也不应把平台参数塞进字典造成业务语义污染。
  - 没有任何写入通道；`platform` 侧也没有 `sys_config` 表/实体。
- **前端使用方式**：替换「系统参数」的暂未开放卡片；表格展示参数键/值/类型/说明，编辑对话框按 `valueType` 做校验（BOOLEAN 用开关、NUMBER 用数字输入）；新增权限码（如 `system:config:view` / `system:config:update`）后按权限控制只读与保存。

## 4. 本人资料更新（非管理员通道）

- **前端页面**：`/[locale]/settings/profile` — `src/features/profile/components/profile-overview.tsx`
- **期望接口**：`PUT /api/auth/profile`（或 `PUT /api/system/users/me`）
- **期望请求/响应**：请求体只允许本人可改字段，响应返回更新后的 userinfo 子集

  ```json
  { "realName": "string", "avatar": "string", "email": "string", "phone": "string" }
  ```

- **现有替代通道及缺陷**：
  - 前端当前复用 `PUT /api/system/users/{id}`，要求 `system:user:edit`；普通用户调用直接 403，所以页面只能按权限把编辑入口关掉。
  - 该接口按实体更新，MyBatis-Plus 的默认更新策略忽略 `null`，无法通过它清空邮箱、手机号或头像；提交空字符串又可能有别处校验。
  - 它以路径参数接受任意 `id`，作为「本人资料」端点暴露会把权限边界交给调用方，不适合对普通用户开放。
- **前端使用方式**：替换当前基于 `system:user:edit` 的编辑门槛，改为登录用户始终可编辑；表单只提交发生变化的字段；成功后刷新 `GET /api/auth/userinfo` 并同步 auth store 展示名/头像。头像上传仍走文件服务，接口只需接收最终 URL。

## 非阻塞但需要后端确认的点

- `sys_user_notification_preference.quiet_hours_start/end` 在 PostgreSQL 是 `TIME`，实体映射为 `LocalDateTime`。前端只展示、不提交；若需要编辑，建议改为 `HH:mm` 字符串字段或独立 DTO。
- 通知偏好没有显式记录时的默认策略未定义。前端按「无记录 = 未显式启用」展示，若后端默认是启用，需要提供默认值接口或文档说明。

## 当前替代行为的边界

- 所有缺口项在页面上都有明确「暂未开放」文案与所需端点，不渲染会返回 403 的按钮。
- 不改用管理员接口做降级实现，不写假数据。
