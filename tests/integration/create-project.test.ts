import { createProject } from "@/lib/projects/create-project";
import { TemplateVersionUnavailableError } from "@/lib/projects/project-errors";
import { prisma } from "@/lib/db";
import { seedOfficialTemplate } from "@/prisma/seed";
import { POST } from "@/app/api/projects/route";
import * as projectService from "@/lib/projects/create-project";
import type { Prisma, TemplateStatus } from "@prisma/client";

const createdProjectIds: string[] = [];

const validInput = {
  templateVersionId: "",
  product: {
    name: "咖啡机",
    category: "厨房电器",
    sourceImageUrl: "https://cdn.example.com/coffee-machine.png",
  },
  marketing: {
    benefits: ["一键萃取", "恒温冲煮", "自动清洁"] as [string, string, string],
    price: "899 元",
    promotion: "新品九折",
    brandName: "晨雾",
  },
  direction: {
    style: "PREMIUM" as const,
    scene: "晨间厨房",
    primaryColor: "#6B4F3A",
    candidateCount: 4 as const,
  },
};

async function ensureTemplateFixture(options: {
  slug: string;
  status: TemplateStatus;
  invalidDefinition?: boolean;
}) {
  const officialVersion = await prisma.templateVersion.findFirstOrThrow({
    where: { template: { slug: "general-product-launch" }, version: 1 },
  });
  const template = await prisma.template.upsert({
    where: { slug: options.slug },
    update: { status: options.status },
    create: {
      slug: options.slug,
      name: "Task 5 独立测试模板",
      description: "不可变版本测试夹具",
      coverUrl: "/fixtures/task-5.svg",
      status: options.status,
    },
  });
  const existingVersion = await prisma.templateVersion.findUnique({
    where: { templateId_version: { templateId: template.id, version: 1 } },
  });

  if (existingVersion) {
    return existingVersion;
  }

  const boards = officialVersion.boardDefinition as Prisma.JsonArray;
  return prisma.templateVersion.create({
    data: {
      templateId: template.id,
      version: 1,
      formDefinition: officialVersion.formDefinition as Prisma.InputJsonValue,
      workflowDefinition: officialVersion.workflowDefinition as Prisma.InputJsonValue,
      boardDefinition: (options.invalidDefinition ? boards.slice(0, 4) : boards) as Prisma.InputJsonValue,
      brandRules: officialVersion.brandRules as Prisma.InputJsonValue,
      exportRules: officialVersion.exportRules as Prisma.InputJsonValue,
    },
  });
}

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/projects", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeAll(async () => {
  await seedOfficialTemplate();
  const version = await prisma.templateVersion.findFirstOrThrow({
    where: { template: { slug: "general-product-launch" }, version: 1 },
  });
  validInput.templateVersionId = version.id;
});

afterEach(async () => {
  vi.restoreAllMocks();
  if (createdProjectIds.length > 0) {
    await prisma.project.deleteMany({ where: { id: { in: createdProjectIds.splice(0) } } });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

test("creates a versioned project with typed input, protected source asset, and five template boards", async () => {
  const project = await createProject(validInput);
  createdProjectIds.push(project.id);

  expect(project.boards.map((board) => board.kind)).toEqual([
    "HERO_WHITE",
    "SCENE",
    "BENEFITS",
    "PROMOTION",
    "SOCIAL_SQUARE",
  ]);

  const stored = await prisma.project.findUnique({
    where: { id: project.id },
    include: {
      variables: { where: { key: "product.name" } },
      assets: true,
      boards: { orderBy: { positionX: "asc" } },
    },
  });

  expect(stored?.templateSnapshot).toBeTruthy();
  expect(stored?.variables).toEqual([
    expect.objectContaining({ key: "product.name", type: "STRING", value: "咖啡机" }),
  ]);
  expect(stored?.assets).toEqual([
    expect.objectContaining({
      kind: "PRODUCT_IMAGE",
      sourceUrl: validInput.product.sourceImageUrl,
      protectionDefinition: {
        outline: true,
        logo: true,
        packagingText: true,
        color: true,
        structure: true,
      },
    }),
  ]);
  expect(stored?.boards).toHaveLength(5);
});

test("rejects a missing template version without creating a partial project", async () => {
  const before = await prisma.project.count();

  await expect(
    createProject({ ...validInput, templateVersionId: "missing-template-version" }),
  ).rejects.toBeInstanceOf(TemplateVersionUnavailableError);

  expect(await prisma.project.count()).toBe(before);
});

test("rejects a version whose parent template is not published", async () => {
  const version = await ensureTemplateFixture({
    slug: "task-5-unpublished-template",
    status: "DRAFT",
  });
  const before = await prisma.project.count();

  await expect(
    createProject({ ...validInput, templateVersionId: version.id }),
  ).rejects.toBeInstanceOf(TemplateVersionUnavailableError);

  expect(await prisma.project.count()).toBe(before);
});

test("rejects an invalid stored template definition", async () => {
  const version = await ensureTemplateFixture({
    slug: "task-5-invalid-definition-template",
    status: "PUBLISHED",
    invalidDefinition: true,
  });
  const before = await prisma.project.count();

  await expect(
    createProject({ ...validInput, templateVersionId: version.id }),
  ).rejects.toBeInstanceOf(TemplateVersionUnavailableError);

  expect(await prisma.project.count()).toBe(before);
});

test("returns a serializable Chinese field error when four benefits are submitted", async () => {
  const response = await POST(
    jsonRequest({
      ...validInput,
      marketing: { ...validInput.marketing, benefits: ["一", "二", "三", "四"] },
    }),
  );
  const body = await response.json();

  expect(response.status).toBe(400);
  expect(body.code).toBe("INVALID_INPUT");
  expect(JSON.stringify(body.fieldErrors)).toContain("请填写恰好三个卖点");
});

test("returns INVALID_INPUT when the request body is not valid JSON", async () => {
  const response = await POST(
    new Request("http://localhost/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{invalid",
    }),
  );

  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({
    code: "INVALID_INPUT",
    fieldErrors: { body: ["请求内容必须是有效的 JSON"] },
  });
});

test("maps an unavailable template domain error to 404", async () => {
  const response = await POST(
    jsonRequest({ ...validInput, templateVersionId: "missing-template-version" }),
  );

  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ code: "TEMPLATE_VERSION_UNAVAILABLE" });
});

test("returns a safe 500 response when project creation throws an unknown error", async () => {
  vi.spyOn(projectService, "createProject").mockRejectedValueOnce(
    new Error("password authentication failed for database secret"),
  );

  const response = await POST(jsonRequest(validInput));

  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ code: "PROJECT_CREATE_FAILED" });
});

test("returns the created project with status 201", async () => {
  const response = await POST(jsonRequest(validInput));
  const body = await response.json();
  createdProjectIds.push(body.project.id);

  expect(response.status).toBe(201);
  expect(body).toEqual({
    project: expect.objectContaining({
      id: expect.any(String),
      name: "咖啡机 营销素材",
      templateVersionId: validInput.templateVersionId,
      boards: expect.arrayContaining([
        expect.objectContaining({ kind: "HERO_WHITE" }),
        expect.objectContaining({ kind: "SOCIAL_SQUARE" }),
      ]),
    }),
  });
});
