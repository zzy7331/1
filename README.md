# 画布：模板化营销素材工作区

第一阶段提供一条可验证的项目创建路径：从已发布的生产模板进入三步向导，提交商品和营销信息后创建一个含五个画板的只读项目工作区。当前仓库不附带产品截图；运行本地服务后，可从模板中心开始查看实际界面。

> 该阶段的“等待 AI 生成”仅是画板状态占位。项目不会生成 AI 图片，也不提供编辑、导出或计费能力。

## 前置条件

- Node.js 20 或更高版本
- Corepack
- pnpm 10.32.1
- PostgreSQL 16

## 本地启动

```bash
git clone <repository-url>
cd template-project-foundation
corepack enable
corepack prepare pnpm@10.32.1 --activate
pnpm install
```

复制环境变量文件并创建专用开发数据库：

```bash
cp .env.example .env
createdb ai_canvas
```

Windows PowerShell 可使用以下复制命令：

```powershell
Copy-Item .env.example .env
```

确认 `.env` 中的 `DATABASE_URL` 指向本机 PostgreSQL 16 的 `ai_canvas` 数据库后，生成 Prisma Client、应用迁移并写入官方模板：

```bash
pnpm db:generate
pnpm db:migrate -- --name init
pnpm db:seed
```

`pnpm db:migrate -- --name init` 适用于本地开发，会在需要时创建新的迁移。若仓库已有迁移且只需应用它们，使用下面的部署式命令，不要创建额外迁移：

```bash
pnpm prisma migrate deploy
```

启动开发服务：

```bash
pnpm dev
```

打开 `http://127.0.0.1:3000/templates`，选择“通用商品上新套装”即可走完整创建流程。

## 验证命令

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
```

端到端测试依赖独立的 PostgreSQL 测试数据库：迁移必须已应用，且已运行 `pnpm db:seed` 写入官方模板。测试自行创建项目，不依赖既有项目的数量、顺序或 ID。请为测试数据库单独设置 `DATABASE_URL`，不要连接生产数据库。

## 第一阶段范围

已交付的范围是模板读取与验证、三步中文向导、事务化项目初始化、模板快照/变量/资产/五画板持久化及只读工作区。完整边界、数据库重置说明和后续计划见 [第一阶段开发说明](docs/development/phase-1.md)。
