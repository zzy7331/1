import { createProject } from "@/lib/projects/create-project";
import { TemplateVersionUnavailableError } from "@/lib/projects/project-errors";
import { prisma } from "@/lib/db";
import { seedOfficialTemplate } from "@/prisma/seed";
import { POST } from "@/app/api/projects/route";
import * as projectService from "@/lib/projects/create-project";
import type { Prisma, TemplateStatus } from "@prisma/client";

const createdProjectIds: string[] = [];
let officialTemplateId = "";

const expectedBoardDefinitions = [
  {
    kind: "HERO_WHITE",
    name: "白底主图",
    width: 1000,
    height: 1000,
    positionX: 0,
    positionY: 0,
    layers: [{ type: "product", name: "商品主体" }],
  },
  {
    kind: "SCENE",
    name: "场景图",
    width: 1000,
    height: 1000,
    positionX: 1120,
    positionY: 0,
    layers: [{ type: "scene", name: "商品使用场景" }],
  },
  {
    kind: "BENEFITS",
    name: "三卖点图",
    width: 1000,
    height: 1200,
    positionX: 2240,
    positionY: 0,
    layers: [{ type: "benefits", name: "核心卖点" }],
  },
  {
    kind: "PROMOTION",
    name: "促销海报",
    width: 1080,
    height: 1440,
    positionX: 3360,
    positionY: 0,
    layers: [{ type: "promotion", name: "优惠信息" }],
  },
  {
    kind: "SOCIAL_SQUARE",
    name: "社媒方图",
    width: 1080,
    height: 1080,
    positionX: 4560,
    positionY: 0,
    layers: [{ type: "social", name: "社媒标题" }],
  },
];

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

  const boards = officialVersion.boardDefinition as Prisma.JsonArray;
  const version =
    existingVersion ??
    (await prisma.templateVersion.create({
      data: {
        templateId: template.id,
        version: 1,
        formDefinition: officialVersion.formDefinition as Prisma.InputJsonValue,
        workflowDefinition: officialVersion.workflowDefinition as Prisma.InputJsonValue,
        boardDefinition: (options.invalidDefinition
          ? boards.slice(0, 4)
          : boards) as Prisma.InputJsonValue,
        brandRules: officialVersion.brandRules as Prisma.InputJsonValue,
        exportRules: officialVersion.exportRules as Prisma.InputJsonValue,
      },
    }));

  await prisma.template.update({
    where: { id: template.id },
    data: { publishedVersionId: version.id },
  });

  return version;
}

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/projects", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeAll(async () => {
  await seedOfficialTemplate(prisma);
  const version = await prisma.templateVersion.findFirstOrThrow({
    where: { template: { slug: "general-product-launch" }, version: 1 },
    include: { template: true },
  });
  validInput.templateVersionId = version.id;
  officialTemplateId = version.template.id;
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
      variables: true,
      assets: true,
      boards: { orderBy: { positionX: "asc" } },
    },
  });

  expect(stored?.templateSnapshot).toEqual({
    templateId: officialTemplateId,
    templateSlug: "general-product-launch",
    templateName: "通用商品上新套装",
    templateVersionId: validInput.templateVersionId,
    version: 1,
    formDefinition: {
      title: "通用商品上新素材",
      fields: [
        { key: "product.name", label: "商品名称", type: "text", required: true },
        { key: "product.category", label: "商品类目", type: "text", required: true },
        { key: "product.sourceImageUrl", label: "商品图片", type: "url", required: true },
      ],
    },
    workflowDefinition: {
      steps: [
        { key: "product", name: "商品信息" },
        { key: "marketing", name: "营销卖点" },
        { key: "direction", name: "视觉方向" },
      ],
      estimatedMinutes: 5,
      versionRequirement: "专业版",
    },
    boardDefinition: expectedBoardDefinitions,
    brandRules: {
      protectedAttributes: ["商品轮廓", "品牌标识", "包装文字", "主色", "结构细节"],
    },
    exportRules: { formats: ["png", "jpg"], quality: "high" },
  });
  expect(
    stored?.variables
      .map(({ key, type, value }) => ({ key, type, value }))
      .sort((left, right) => left.key.localeCompare(right.key)),
  ).toEqual([
    { key: "direction.candidateCount", type: "NUMBER", value: 4 },
    { key: "direction.primaryColor", type: "STRING", value: "#6B4F3A" },
    { key: "direction.scene", type: "STRING", value: "晨间厨房" },
    { key: "direction.style", type: "STRING", value: "PREMIUM" },
    { key: "marketing.benefit.1", type: "STRING", value: "一键萃取" },
    { key: "marketing.benefit.2", type: "STRING", value: "恒温冲煮" },
    { key: "marketing.benefit.3", type: "STRING", value: "自动清洁" },
    { key: "marketing.brandName", type: "STRING", value: "晨雾" },
    { key: "marketing.price", type: "STRING", value: "899 元" },
    { key: "marketing.promotion", type: "STRING", value: "新品九折" },
    { key: "product.category", type: "STRING", value: "厨房电器" },
    { key: "product.name", type: "STRING", value: "咖啡机" },
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
  expect(
    stored?.boards.map(
      ({ kind, name, width, height, positionX, positionY, layers }) => ({
        kind,
        name,
        width,
        height,
        positionX,
        positionY,
        layers,
      }),
    ),
  ).toEqual(expectedBoardDefinitions);
});

test("does not create variables for optional marketing fields that are undefined", async () => {
  const project = await createProject({
    ...validInput,
    marketing: {
      benefits: validInput.marketing.benefits,
      price: undefined,
      promotion: undefined,
      brandName: undefined,
    },
  });
  createdProjectIds.push(project.id);

  const variables = await prisma.projectVariable.findMany({
    where: { projectId: project.id },
    orderBy: { key: "asc" },
    select: { key: true },
  });

  expect(variables.map(({ key }) => key)).toEqual([
    "direction.candidateCount",
    "direction.primaryColor",
    "direction.scene",
    "direction.style",
    "marketing.benefit.1",
    "marketing.benefit.2",
    "marketing.benefit.3",
    "product.category",
    "product.name",
  ]);
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

test.each<[string, unknown]>([
  ["null body", null],
  ["scalar body", "咖啡机"],
  ["missing product object", { ...validInput, product: undefined }],
  ["missing marketing object", { ...validInput, marketing: undefined }],
  ["missing direction object", { ...validInput, direction: undefined }],
])("returns non-empty Chinese field errors for %s", async (_label, input) => {
  const response = await POST(jsonRequest(input));
  const body = await response.json();
  const serializedErrors = JSON.stringify(body.fieldErrors);

  expect(response.status).toBe(400);
  expect(body.code).toBe("INVALID_INPUT");
  expect(body.fieldErrors).toHaveProperty("body");
  expect(body.fieldErrors).not.toEqual({});
  expect(serializedErrors).toMatch(/[\u3400-\u9fff]/);
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
