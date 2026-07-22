# 清华附中湾区学校新生Q&A

面向新生、在校生、毕业生与教师的中文校园问答社区。项目采用 Next.js App Router、TypeScript、PostgreSQL/pgvector、Prisma、Tailwind CSS，包含邮件认证、问答互动、分离的权限/身份标识、多管理员与审计、学年升级、知识库和兼容 OpenAI API 的流式 AI 助手。

> 这是可部署的首版 MVP。已实现项和仍未完成项在本文末尾明确列出；不要在未做安全审计和学校内部验收前直接面向公网开放。

## 技术栈

- Next.js 15.5（App Router）+ React 19 + TypeScript strict
- Tailwind CSS；自建可复用基础组件（未安装完整 shadcn 组件集）
- PostgreSQL 16 + pgvector + pg_trgm
- Prisma 6；Argon2id 密码哈希；数据库 Session + HttpOnly Cookie
- Nodemailer + SMTP/Mailpit
- OpenAI 兼容接口 + SSE 流式输出 + 关键词降级检索
- Vitest + Playwright；Docker Compose + Caddy 示例

## 环境要求

- 推荐：Docker Engine 24+、Docker Compose v2
- 非 Docker：Node.js 22、npm 10+、PostgreSQL 16（安装 `vector` 与 `pg_trgm` 扩展）

## 快速启动（Docker Compose）

```bash
cp .env.example .env
# 修改 AUTH_SECRET 和初始管理员密码
docker compose up -d
docker compose exec web npm run db:seed
docker compose logs -f
```

访问：应用 `http://localhost:3000`，Mailpit `http://localhost:8025`。

停止服务：

```bash
docker compose down
```

清除数据库卷会永久删除数据，不应在生产环境执行 `docker compose down -v`。

## 非 Docker 本地启动

```bash
npm install
cp .env.example .env
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

如果 PostgreSQL 在宿主机，将 `DATABASE_URL` 的主机名从 `db` 改为 `localhost`。

## 环境变量

必须设置：

- `DATABASE_URL`：PostgreSQL 连接串。
- `AUTH_SECRET`：至少 32 个随机字符，可用 `openssl rand -base64 48` 生成。
- `APP_URL`：外部可访问的完整地址，生产环境必须是 HTTPS。
- `INITIAL_ADMIN_EMAIL`、`INITIAL_ADMIN_USERNAME`、`INITIAL_ADMIN_PASSWORD`：初始化管理员；密码至少 12 位并包含字母与数字。
- `SMTP_HOST`、`SMTP_PORT`、`SMTP_FROM_EMAIL`：邮件服务器和发件地址。启用 SMTP 认证时还需 `SMTP_USER`、`SMTP_PASSWORD`。
- `EMAIL_VERIFICATION_ENABLED`：是否要求完成邮箱验证，生产环境建议保持 `true`。

其他变量及默认值见 [`.env.example`](./.env.example)。真实密钥不得提交到 Git。

## 数据库与初始管理员

迁移使用：

```bash
npm run db:migrate
```

初始化分类、标签、当前学年及可选测试数据：

```bash
npm run db:seed
```

单独创建初始管理员：

```bash
INITIAL_ADMIN_EMAIL=admin@example.edu.cn \
INITIAL_ADMIN_USERNAME=初始管理员 \
INITIAL_ADMIN_PASSWORD='替换为强密码123' \
npm run admin:init
```

创建的管理员邮箱视为已验证，且 `mustChangePassword=true`。首次登录应立刻通过重置密码流程更换初始密码。系统在服务端事务中阻止取消最后一名管理员，权限与教师标识变更会写入 `AuditLog`。

生产 Seed 设置 `SEED_EXAMPLES=false`，避免创建标有“测试数据”的公告、FAQ、问题和回答。

## SMTP 与 Mailpit 测试

Compose 默认配置为 `mailpit:1025`、无认证、`SMTP_SECURE=false`。注册后打开 `http://localhost:8025`，进入验证邮件并点击链接。忘记密码邮件也会出现在该收件箱。

使用真实 SMTP 时：

- 465 端口通常使用 `SMTP_SECURE=true`；587 通常使用 `false` 并由 STARTTLS 升级。
- 管理员也可以在 `/admin/settings` 填写邮件服务商提供的 SMTP 参数。数据库配置优先于环境变量，密码/授权码使用由 `AUTH_SECRET` 派生的 AES-256-GCM 密钥加密保存且不会回显到浏览器。
- 这里的 SMTP 是第三方邮件服务商提供的投递服务；应用不会在服务器上自行搭建邮件服务器。
- 设置 SPF、DKIM、DMARC，使用专用发件账号，并验证供应商发送限制。
- 邮件 Token 只以 SHA-256 哈希存储，具有有效期和一次性状态。

## AI 接口与知识库

兼容 OpenAI Chat Completions API：

```env
AI_ENABLED=true
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=server-side-secret
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
AI_DAILY_LIMIT_PER_USER=30
AI_MAX_CONTEXT_ITEMS=8
```

管理员也可以在 `/admin/settings` 配置 AI 开关、兼容 API 地址、模型、额度和 API Key。数据库配置优先于环境变量；API Key 使用服务端 AES-256-GCM 加密保存，只显示是否已配置，不会返回密钥内容。当前检索会聚合启用的文本知识库、公告和历史最佳答案；无 Embedding 时自动使用关键词检索。系统提示词将检索文本视为不可信数据，要求资料不足时明确说明并对重要事项建议人工确认。

在 `/admin/knowledge` 可创建 FAQ/TXT/Markdown 正文，系统按段落切分并写入 `KnowledgeChunk`。数据库已包含 `vector(1536)` 字段和 HNSW 索引，但当前 MVP 尚未调用 Embedding API 写入向量，也尚未实现 PDF/DOCX 上传提取。

## 测试

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e
```

集成测试默认跳过，避免误操作开发数据库。创建独立测试库并设置 `TEST_DATABASE_URL` 后运行 `npm test`。E2E 需要正在运行的应用；设置 `E2E_EMAIL` 执行注册场景，设置 `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD` 执行管理员场景。完整邮件验证自动化需要根据 Mailpit API 补充一次性链接提取。

## 数据备份与恢复

每日创建 PostgreSQL 自定义格式备份，并将备份加密保存到独立存储：

```bash
docker compose exec -T db pg_dump -U qa -d qa -Fc > qa-backup.dump
```

恢复到空数据库：

```bash
docker compose exec -T db pg_restore -U qa -d qa --clean --if-exists < qa-backup.dump
```

生产恢复前先在隔离环境演练，并同步备份外部对象存储中的上传文件。以上命令中的 shell 重定向发生在宿主机。

## 生产部署注意事项

1. 使用 HTTPS 反向代理；`Caddyfile` 提供最小示例。正确传递 `Host`、`X-Forwarded-For` 并只信任自己的代理。
2. 更换数据库密码、`AUTH_SECRET`、初始管理员密码；不要把 `.env` 烘焙到镜像或提交仓库。
   Session Cookie 是否启用 `Secure` 会依据 `APP_URL` 判断，因此生产环境的 `APP_URL` 必须使用 `https://`。
3. 将内存频率限制替换为 Redis/集中式限流，以支持多实例和重启后保持计数。
4. 上传文件应放对象存储，配置病毒扫描、内容嗅探、图片重编码、私有 ACL 和生命周期。
5. 配置日志脱敏、告警、数据库最小权限、备份与恢复演练；审计管理员账号和 Session。
6. 根据学校未成年人隐私规范完成法律文本、数据保留周期、实名/匿名政策和应急处置流程审核。
7. 在网关增加 CSP；确认 AI 供应商的数据处理协议，不向模型发送个人敏感信息。
8. 执行依赖漏洞审计并由人工评估修复。不要未经审阅运行带破坏性升级的 `npm audit fix --force`。

## 已实现

- 注册、Argon2id、SMTP 验证/重发、登录/退出、Session、忘记与重置密码、旧 Session 失效。
- USER/ADMIN 与身份标识分离；用户自选年级；管理员授予教师/管理员；最后管理员保护；审计日志。
- 问题、回答、点赞、收藏、最佳答案、官方答案；问题/回答编辑与软删除；回答下一级评论的发布、回复、编辑、软删除和举报；站内通知。问题本身不显示或接收评论。
- 首页、问题/分类/搜索/公告/用户主页、个人中心和全部规定的后台路由。
- 相似问题前端提示；中文 `pg_trgm` 索引；合并数据结构和跳转行为。
- 学年预览、二次确认、幂等批量升级与审计。
- 文本知识库切分、AI 会话持久化/改名/软删除、回答重新生成与反馈、每日额度、SSE 流式输出、来源引用和关键词降级检索；引用按词组命中、覆盖率、可信度和时效精确排名并展示命中片段。
- 举报后台筛选、忽略、隐藏与删除联动，可同时警告、临时封禁或永久封禁目标用户；封禁立即使其 Session 失效，警告记录可在用户详情查看。
- 后台当前栏目高亮；动态分类新增、编辑、排序、停用和空分类删除；用户详情页可设置全部身份标识与管理员权限。
- 用户管理支持带最后管理员保护的批量软删除；用户详情展示可跳转的历史问题、回答和评论，评论后台也可返回原文锚点。
- 知识库旧资料可删除并级联清理检索片段；学年开始和结束日期可按校历自定义。
- 问题、回答、内容编辑和知识库正文使用统一 Markdown 编辑器，提供粗体、斜体、删除线、标题、列表、引用、链接、代码与预览快捷工具。
- 后台集中配置邮箱验证、第三方 SMTP 与 AI；敏感配置服务端加密保存。全站主题改为浅紫色，并统一复选框/单选框/多选框样式。
- 标签和公告均支持后台新增、编辑、启停/公开、置顶和安全删除；公告正文复用 Markdown 编辑器。
- 个人中心支持用户名、简介、头像地址、年级身份和邮箱换绑；安全页可查看有效 Session、退出其他设备并软注销账号。通知支持逐条软删除。
- 动态 SEO 元数据、Sitemap、robots、响应式导航、浅色/深色模式、Docker/Caddy、迁移和 Seed。

## 当前未完成

- PDF/DOCX 文件上传、文本提取、对象存储、图片上传/重编码；当前知识库只支持粘贴文本。
- Embedding 生成/重建任务、真正的向量召回与后台文档处理队列；数据库字段和索引已就绪。
- 内容恢复和重复问题合并的完整操作 UI/API；合并模型与跳转行为已预留。
- 问题关注（区别于收藏）。
- 全文搜索当前主要使用 `ILIKE` + trigram；尚未实现中文分词器和统一跨类型相关度评分。
- E2E 邮件抓取与完整用户旅程仍是可运行骨架，需要继续扩充 Mailpit API 自动取链覆盖；外部 SMTP 与真实 AI 服务需使用服务商凭据单独验证。

## 目录概要

```text
app/                 Next.js 页面与 Route Handlers
components/          表单、问答卡片、导航、后台操作组件
lib/                 认证、安全、权限、验证、邮件、AI、数据库
prisma/              Schema、迁移、Seed
scripts/             初始管理员命令
tests/               Vitest 单元/集成测试
e2e/                 Playwright 场景
Dockerfile           多阶段生产镜像
docker-compose.yml   Web + pgvector/PostgreSQL + Mailpit
```
