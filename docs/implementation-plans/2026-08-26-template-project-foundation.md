# Template Project Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first usable product slice: browse a verified template, enter product and marketing data, create a versioned project snapshot, and open five initialized marketing boards.

**Architecture:** A Next.js application owns the web UI and HTTP route handlers. PostgreSQL stores templates, immutable template versions, projects, project variables, assets, and boards through Prisma; shared Zod schemas define the boundary between the creation wizard and the project service. The first phase creates deterministic placeholder boards and preserves extension points for later AI jobs without executing AI generation.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript 5, Tailwind CSS 4, PostgreSQL 16, Prisma 6, Zod 3, Vitest 3, Testing Library, Playwright 1.52, pnpm 10.

**Spec:** `docs/superpowers/specs/2026-08-26-template-canvas-product-design.md`

## Global Constraints

- The first release targets general physical goods; clothing try-on is excluded.
- A template combines an input form, workflow definition, multi-board layout, variables, brand rules, and export rules.
- The default project creates exactly five boards: white-background hero, scene, three-benefit, promotion poster, and social square.
- Template updates must not mutate an existing project's template snapshot.
- Product outline, logo, packaging text, color, and structural details are protected product attributes.
- The basic flow must remain understandable without exposing workflow nodes.
- No AI provider, billing, team permissions, public template marketplace, or real-time collaboration is implemented in this phase.
- All user-visible interface copy is Simplified Chinese.
- Package management commands use pnpm.

---

## File Structure

```text
app/
├─ api/projects/route.ts                 Project creation HTTP boundary
├─ projects/[projectId]/page.tsx         Initialized project workspace
├─ templates/[slug]/page.tsx             Template detail and wizard entry
├─ templates/page.tsx                    Template catalog
├─ layout.tsx                            Application shell
└─ page.tsx                              Redirect to template catalog
components/
├─ canvas/board-card.tsx                 Read-only first-phase board preview
├─ canvas/project-workspace.tsx          Five-board workspace shell
├─ templates/template-card.tsx           Catalog item
└─ wizard/
   ├─ create-project-wizard.tsx          Three-step controller
   ├─ product-step.tsx                   Product inputs
   ├─ marketing-step.tsx                 Marketing inputs
   └─ direction-step.tsx                 Visual direction inputs
lib/
├─ db.ts                                 Prisma singleton
├─ projects/create-project.ts            Transactional project snapshot service
├─ projects/project-types.ts             Project DTOs
├─ templates/get-template.ts             Template read service
├─ templates/template-types.ts           Template DTOs
└─ validation/create-project-schema.ts   Shared request validation
prisma/
├─ schema.prisma                         Relational model
└─ seed.ts                               Official starter template
tests/
├─ integration/create-project.test.ts    Snapshot and five-board integration
├─ unit/create-project-schema.test.ts    Wizard boundary validation
└─ unit/template-mapping.test.ts          Stable template DTO mapping
e2e/create-project.spec.ts               User journey
```

## Shared Interfaces

```ts
export type BoardKind =
  | "HERO_WHITE"
  | "SCENE"
  | "BENEFITS"
  | "PROMOTION"
  | "SOCIAL_SQUARE";

export type CreateProjectInput = {
  templateVersionId: string;
  product: {
    name: string;
    category: string;
    sourceImageUrl: string;
  };
  marketing: {
    benefits: [string, string, string];
    price?: string;
    promotion?: string;
    brandName?: string;
  };
  direction: {
    style: "MINIMAL" | "LIFESTYLE" | "PREMIUM";
    scene: string;
    primaryColor: string;
    candidateCount: 1 | 2 | 4;
  };
};

export type CreatedProject = {
  id: string;
  name: string;
  templateVersionId: string;
  boards: Array<{
    id: string;
    kind: BoardKind;
    name: string;
    width: number;
    height: number;
    positionX: number;
    positionY: number;
  }>;
};
```

### Task 1: Application Scaffold and Test Harness

**Files:**
- Create: `package.json`
- Create: `pnpm-lock.yaml`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `postcss.config.mjs`
- Create: `app/globals.css`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `playwright.config.ts`
- Create: `.env.example`
- Create: `.gitignore`
- Test: `tests/unit/app-shell.test.tsx`

**Interfaces:**
- Consumes: none.
- Produces: `pnpm test`, `pnpm test:integration`, `pnpm test:e2e`, `pnpm lint`, and `pnpm typecheck`; the `@/*` TypeScript alias.

- [ ] **Step 1: Scaffold the Next.js application and install exact dependencies**

Run:

```bash
pnpm create next-app@15.5.2 . --ts --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-pnpm
pnpm add @prisma/client@6.15.0 zod@3.25.76
pnpm add -D prisma@6.15.0 vitest@3.2.4 jsdom@26.1.0 @testing-library/react@16.3.0 @testing-library/jest-dom@6.8.0 @vitejs/plugin-react@4.6.0 vite-tsconfig-paths@5.1.4 @playwright/test@1.52.0 tsx@4.20.5
```

- [ ] **Step 2: Add deterministic scripts to `package.json`**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration --maxWorkers=1",
    "test:e2e": "playwright test",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts"
  }
}
```

- [ ] **Step 3: Write the failing application-shell test**

```tsx
import { render, screen } from "@testing-library/react";
import RootLayout from "@/app/layout";

test("shows the four primary product areas", () => {
  render(<RootLayout><main>内容</main></RootLayout>);
  for (const label of ["模板", "项目", "素材", "品牌"]) {
    expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
  }
});
```

- [ ] **Step 4: Run the test and verify the missing navigation failure**

Run: `pnpm test -- tests/unit/app-shell.test.tsx`  
Expected: FAIL because the four navigation links do not exist.

- [ ] **Step 5: Implement the Chinese application shell and home redirect**

`app/layout.tsx` must render links to `/templates`, `/projects`, `/assets`, and `/brand`. `app/page.tsx` must call `redirect("/templates")`. Keep the shell server-rendered and free of application state.

- [ ] **Step 6: Configure Vitest, Playwright, environment documentation, and verification**

`vitest.config.ts` uses `jsdom`, `vite-tsconfig-paths`, and `vitest.setup.ts`; `.env.example` contains `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_canvas`; Playwright starts `pnpm dev` on port 3000.

Run:

```bash
pnpm test -- tests/unit/app-shell.test.tsx
pnpm typecheck
pnpm lint
```

Expected: all commands exit 0.

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml next.config.ts tsconfig.json postcss.config.mjs app vitest.config.ts vitest.setup.ts playwright.config.ts .env.example .gitignore tests/unit/app-shell.test.tsx
git commit -m "chore: scaffold template canvas application"
```

### Task 2: Template, Project, Variable, Asset, and Board Persistence

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Create: `lib/db.ts`
- Create: `tests/integration/database-schema.test.ts`

**Interfaces:**
- Consumes: `DATABASE_URL` and Prisma 6.
- Produces: Prisma models `Template`, `TemplateVersion`, `Project`, `ProjectVariable`, `Asset`, and `Board`; enums `TemplateStatus`, `ProjectStatus`, `VariableType`, `AssetKind`, and `BoardKind`.

- [ ] **Step 1: Write the failing schema integration test**

```ts
import { prisma } from "@/lib/db";

test("persists an immutable template version with five board definitions", async () => {
  const template = await prisma.template.findUnique({
    where: { slug: "general-product-launch" },
    include: { versions: true },
  });
  expect(template?.versions).toHaveLength(1);
  expect((template?.versions[0].boardDefinition as unknown[])).toHaveLength(5);
});
```

- [ ] **Step 2: Run the test and verify Prisma models are missing**

Run: `pnpm test:integration -- tests/integration/database-schema.test.ts`  
Expected: FAIL because `lib/db.ts` and generated Prisma types do not exist.

- [ ] **Step 3: Define the relational schema**

`Template` owns ordered immutable `TemplateVersion` records. `Project.templateVersionId` references the exact version used. `ProjectVariable` has a unique compound key `(projectId, key)`. `Board` has a unique compound key `(projectId, kind)`. JSON fields store form, workflow, board, brand, export, layer, and protection definitions until later plans promote stable pieces into tables.

Required fields:

```prisma
model TemplateVersion {
  id                 String   @id @default(cuid())
  templateId         String
  version            Int
  formDefinition     Json
  workflowDefinition Json
  boardDefinition    Json
  brandRules         Json
  exportRules        Json
  createdAt          DateTime @default(now())
  template           Template @relation(fields: [templateId], references: [id])
  projects           Project[]
  @@unique([templateId, version])
}

model Board {
  id        String    @id @default(cuid())
  projectId String
  kind      BoardKind
  name      String
  width     Int
  height    Int
  positionX Int
  positionY Int
  layers    Json
  project   Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  @@unique([projectId, kind])
}
```

- [ ] **Step 4: Implement `lib/db.ts` and the official template seed**

The seed creates `general-product-launch` with version 1 and exactly five board definitions. Use dimensions: hero 1000×1000, scene 1000×1000, benefits 1000×1200, promotion 1080×1440, social 1080×1080. Use positions `(0,0)`, `(1120,0)`, `(2240,0)`, `(3360,0)`, and `(4560,0)`.

- [ ] **Step 5: Generate, migrate, seed, and verify**

Run:

```bash
pnpm db:generate
pnpm prisma migrate dev --name init_template_project
pnpm db:seed
pnpm test:integration -- tests/integration/database-schema.test.ts
```

Expected: migration succeeds and the test passes.

- [ ] **Step 6: Commit**

```bash
git add prisma lib/db.ts tests/integration/database-schema.test.ts
git commit -m "feat: add template and project persistence"
```

### Task 3: Template Catalog and Detail Pages

**Files:**
- Create: `lib/templates/template-types.ts`
- Create: `lib/templates/get-template.ts`
- Create: `components/templates/template-card.tsx`
- Create: `app/templates/page.tsx`
- Create: `app/templates/[slug]/page.tsx`
- Test: `tests/unit/template-mapping.test.ts`

**Interfaces:**
- Consumes: Prisma `Template` and latest published `TemplateVersion`.
- Produces: `listPublishedTemplates(): Promise<TemplateSummary[]>` and `getPublishedTemplate(slug: string): Promise<TemplateDetail | null>`.

- [ ] **Step 1: Write the failing mapping test**

```ts
import { mapTemplateSummary } from "@/lib/templates/get-template";

test("maps a published template to stable catalog data", () => {
  const result = mapTemplateSummary({
    id: "t1", slug: "general-product-launch", name: "通用商品上新套装",
    description: "一次生成五张营销素材", coverUrl: "/templates/general.webp",
    latestVersion: { id: "v1", boardDefinition: [{}, {}, {}, {}, {}] },
  });
  expect(result).toEqual(expect.objectContaining({ slug: "general-product-launch", boardCount: 5 }));
});
```

- [ ] **Step 2: Run and verify the missing mapper failure**

Run: `pnpm test -- tests/unit/template-mapping.test.ts`  
Expected: FAIL because `mapTemplateSummary` does not exist.

- [ ] **Step 3: Implement the DTO types and read service**

`TemplateSummary` contains `id`, `slug`, `name`, `description`, `coverUrl`, `boardCount`, and `templateVersionId`. `TemplateDetail` extends it with `requiredInputs`, `workflowSteps`, `boards`, `estimatedMinutes`, and `versionRequirement`. Reject templates without a published version instead of returning partial data.

- [ ] **Step 4: Implement catalog and detail pages**

The catalog page renders the heading “选择一个生产模板” and one `TemplateCard` per published template. The detail page shows five outputs, required inputs, workflow steps, estimated time, and one primary link labeled “用此模板创作” targeting `/templates/{slug}?create=1`.

- [ ] **Step 5: Verify tests and server build**

Run:

```bash
pnpm test -- tests/unit/template-mapping.test.ts
pnpm typecheck
pnpm build
```

Expected: all pass; `/templates` and `/templates/general-product-launch` are generated without runtime errors.

- [ ] **Step 6: Commit**

```bash
git add lib/templates components/templates app/templates tests/unit/template-mapping.test.ts
git commit -m "feat: add official template catalog"
```

### Task 4: Shared Wizard Validation and Three-Step UI

**Files:**
- Create: `lib/validation/create-project-schema.ts`
- Create: `components/wizard/create-project-wizard.tsx`
- Create: `components/wizard/product-step.tsx`
- Create: `components/wizard/marketing-step.tsx`
- Create: `components/wizard/direction-step.tsx`
- Modify: `app/templates/[slug]/page.tsx`
- Test: `tests/unit/create-project-schema.test.ts`
- Test: `tests/unit/create-project-wizard.test.tsx`

**Interfaces:**
- Consumes: `TemplateDetail.templateVersionId`.
- Produces: `createProjectSchema`, `CreateProjectInput`, and `<CreateProjectWizard templateVersionId string>`; submits JSON to `POST /api/projects`.

- [ ] **Step 1: Write validation failures first**

```ts
import { createProjectSchema } from "@/lib/validation/create-project-schema";

test("requires a valid image URL and exactly three benefits", () => {
  const result = createProjectSchema.safeParse({
    templateVersionId: "v1",
    product: { name: "咖啡机", category: "家电", sourceImageUrl: "bad" },
    marketing: { benefits: ["快速"] },
    direction: { style: "MINIMAL", scene: "厨房", primaryColor: "#112233", candidateCount: 4 },
  });
  expect(result.success).toBe(false);
});
```

- [ ] **Step 2: Run and verify the schema is missing**

Run: `pnpm test -- tests/unit/create-project-schema.test.ts`  
Expected: FAIL because the schema module does not exist.

- [ ] **Step 3: Implement the exact Zod boundary**

Validate non-empty names and categories, HTTP(S) image URLs, exactly three benefits, optional price/promotion/brand fields, a six-digit hex color, the three style values, and candidate count `1 | 2 | 4`. Export the inferred `CreateProjectInput` type.

- [ ] **Step 4: Write the wizard interaction test**

Render the wizard, verify the product step is first, enter valid product data, advance to marketing, provide three benefits, advance to direction, then verify the final button reads “生成整套素材”. Mock `fetch` to return `{ id: "p1" }` and assert navigation to `/projects/p1`.

- [ ] **Step 5: Implement the three-step wizard**

Keep one controlled state object in `CreateProjectWizard`. Validate the active step before advancing. Show field-level Chinese errors. The final submit disables the button, sends the shared schema shape, handles non-2xx responses with a visible message, and navigates only after receiving a project ID.

- [ ] **Step 6: Verify unit tests**

Run:

```bash
pnpm test -- tests/unit/create-project-schema.test.ts tests/unit/create-project-wizard.test.tsx
pnpm typecheck
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add lib/validation components/wizard app/templates tests/unit/create-project-schema.test.ts tests/unit/create-project-wizard.test.tsx
git commit -m "feat: add three-step project creation wizard"
```

### Task 5: Transactional Project Creation and Five-Board Initialization

**Files:**
- Create: `lib/projects/project-types.ts`
- Create: `lib/projects/create-project.ts`
- Create: `app/api/projects/route.ts`
- Test: `tests/integration/create-project.test.ts`

**Interfaces:**
- Consumes: `CreateProjectInput` and Prisma `TemplateVersion`.
- Produces: `createProject(input: CreateProjectInput): Promise<CreatedProject>` and `POST /api/projects` returning `{ project: CreatedProject }` with status 201.

- [ ] **Step 1: Write the failing snapshot integration test**

```ts
const project = await createProject(validInput);
expect(project.boards.map((board) => board.kind)).toEqual([
  "HERO_WHITE", "SCENE", "BENEFITS", "PROMOTION", "SOCIAL_SQUARE",
]);
const stored = await prisma.project.findUnique({ where: { id: project.id }, include: { variables: true } });
expect(stored?.templateSnapshot).toBeTruthy();
expect(stored?.variables.find((item) => item.key === "product.name")?.value).toBe("咖啡机");
```

- [ ] **Step 2: Run and verify the project service is missing**

Run: `pnpm test:integration -- tests/integration/create-project.test.ts`  
Expected: FAIL because `createProject` does not exist.

- [ ] **Step 3: Implement one transaction**

Load the template version and parent template, reject missing or unpublished templates, clone the six template definitions into `Project.templateSnapshot`, flatten the submitted fields into typed project variables, create one product asset with its protection definition, and create five boards from `boardDefinition` in the same transaction.

Do not recompute board names or dimensions outside the template snapshot. Return boards ordered by `positionX`.

- [ ] **Step 4: Implement the HTTP route**

Parse JSON, validate with `createProjectSchema`, return 400 with `{ code: "INVALID_INPUT", fieldErrors }`, return 404 for an unavailable template version, and return 201 with the created project. Unexpected failures return `{ code: "PROJECT_CREATE_FAILED" }` with status 500 and no database details.

- [ ] **Step 5: Test transaction rollback**

Add a test that passes a nonexistent template version and asserts the project count does not change. Add a test that calls the route with four benefits and asserts status 400.

- [ ] **Step 6: Verify integration and type checks**

Run:

```bash
pnpm test:integration -- tests/integration/create-project.test.ts
pnpm typecheck
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add lib/projects app/api/projects tests/integration/create-project.test.ts
git commit -m "feat: create versioned projects with five boards"
```

### Task 6: Initialized Project Workspace

**Files:**
- Create: `components/canvas/board-card.tsx`
- Create: `components/canvas/project-workspace.tsx`
- Create: `app/projects/[projectId]/page.tsx`
- Test: `tests/unit/project-workspace.test.tsx`

**Interfaces:**
- Consumes: `CreatedProject`-compatible project data with variables and boards.
- Produces: a read-only workspace shell that visually places five boards and exposes stable element hooks for the later Konva editor plan.

- [ ] **Step 1: Write the failing workspace test**

```tsx
render(<ProjectWorkspace project={projectFixture} />);
expect(screen.getAllByTestId("marketing-board")).toHaveLength(5);
expect(screen.getByText("商品白底主图")).toBeInTheDocument();
expect(screen.getByText("咖啡机")).toBeInTheDocument();
```

- [ ] **Step 2: Run and verify the component is missing**

Run: `pnpm test -- tests/unit/project-workspace.test.tsx`  
Expected: FAIL because `ProjectWorkspace` does not exist.

- [ ] **Step 3: Implement the workspace shell**

Render five scaled board previews on a pannable-looking neutral workspace using their stored position and dimensions. Each `BoardCard` renders `data-board-kind`, the board name, product name, three benefits where applicable, and a visible “等待 AI 生成” status. Do not introduce Konva in this phase.

- [ ] **Step 4: Implement the server page**

Load the project with variables and ordered boards. Return `notFound()` for an unknown project. Show project name, template version, five-board workspace, and disabled future actions labeled “重新生成” and “导出整套”.

- [ ] **Step 5: Verify component, build, and accessibility basics**

Run:

```bash
pnpm test -- tests/unit/project-workspace.test.tsx
pnpm typecheck
pnpm build
```

Expected: all pass; every board has an accessible name and no nested interactive controls.

- [ ] **Step 6: Commit**

```bash
git add components/canvas app/projects tests/unit/project-workspace.test.tsx
git commit -m "feat: show initialized five-board workspace"
```

### Task 7: End-to-End Creation Journey and Phase Documentation

**Files:**
- Create: `e2e/create-project.spec.ts`
- Create: `README.md`
- Create: `docs/development/phase-1.md`
- Modify: `.env.example`

**Interfaces:**
- Consumes: the complete template-to-project path from Tasks 1–6.
- Produces: reproducible local setup and a browser-level acceptance test.

- [ ] **Step 1: Write the failing browser journey**

```ts
test("creates a five-board project from an official template", async ({ page }) => {
  await page.goto("/templates");
  await page.getByRole("link", { name: "通用商品上新套装" }).click();
  await page.getByRole("link", { name: "用此模板创作" }).click();
  await page.getByLabel("商品名称").fill("咖啡机");
  await page.getByLabel("商品类目").fill("家电");
  await page.getByLabel("商品图片地址").fill("https://example.com/coffee-machine.png");
  await page.getByRole("button", { name: "下一步" }).click();
  for (const [index, value] of ["快速加热", "精准控温", "容易清洁"].entries()) {
    await page.getByLabel(`卖点 ${index + 1}`).fill(value);
  }
  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByLabel("使用场景").fill("现代厨房");
  await page.getByRole("button", { name: "生成整套素材" }).click();
  await expect(page.getByTestId("marketing-board")).toHaveCount(5);
});
```

- [ ] **Step 2: Run and verify the initial browser failure**

Run: `pnpm test:e2e -- e2e/create-project.spec.ts`  
Expected: FAIL at the first incomplete or mismatched product interaction.

- [ ] **Step 3: Fix only journey-blocking defects**

Align accessible labels, links, response parsing, redirect behavior, board ordering, and loading states with the test. Do not add AI calls, editing, billing, collaboration, or unrelated styling.

- [ ] **Step 4: Document exact local setup and scope**

`README.md` must include prerequisites, environment copy, database creation, `pnpm install`, migration, seed, development server, unit tests, integration tests, E2E tests, and build commands. `docs/development/phase-1.md` records completed capabilities, excluded capabilities, data reset instructions, and the next plan boundary: AI job orchestration plus editable Konva canvas.

- [ ] **Step 5: Run the complete verification suite**

Run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
```

Expected: every command exits 0.

- [ ] **Step 6: Commit**

```bash
git add e2e README.md docs/development .env.example
git commit -m "test: verify template to five-board project journey"
```

## Plan Self-Review

- Spec coverage in this phase: template catalog, template detail, three-step form, immutable template snapshot, global variables, product asset protection metadata, exactly five initialized boards, project workspace, errors, and first-use acceptance path.
- Explicitly deferred to later plans: real uploads and object storage, image quality analysis, AI tasks and candidate groups, Konva editing, variable propagation into editable layers, version restoration, export, billing, brand management, teams, and review workflow.
- Interface consistency: the wizard and route share `CreateProjectInput`; the service returns `CreatedProject`; board kinds and dimensions originate from the stored template version; project pages read the persisted snapshot rather than the current template.
- Placeholder scan: the plan contains no unspecified implementation steps or undefined future interfaces inside the phase boundary.


