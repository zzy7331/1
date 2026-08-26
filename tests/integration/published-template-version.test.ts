import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createProject } from "@/lib/projects/create-project";
import { TemplateVersionUnavailableError } from "@/lib/projects/project-errors";
import { getPublishedTemplate, listPublishedTemplates } from "@/lib/templates/get-template";
import { seedOfficialTemplate } from "@/prisma/seed";

const fixtureSlug = "published-version-pointer-fixture";

let fixtureTemplateId = "";
let versionOneId = "";
let versionTwoId = "";
let invalidVersionId = "";

const validInput = {
  templateVersionId: "",
  product: {
    name: "发布指针测试商品",
    category: "测试类目",
    sourceImageUrl: "https://cdn.example.com/pointer-fixture.png",
  },
  marketing: {
    benefits: ["卖点一", "卖点二", "卖点三"] as [string, string, string],
  },
  direction: {
    style: "MINIMAL" as const,
    scene: "测试场景",
    primaryColor: "#112233",
    candidateCount: 1 as const,
  },
};

beforeAll(async () => {
  await seedOfficialTemplate(prisma);
  const sourceVersion = await prisma.templateVersion.findFirstOrThrow({
    where: { template: { slug: "general-product-launch" }, version: 1 },
  });
  const template = await prisma.template.upsert({
    where: { slug: fixtureSlug },
    update: { status: "PUBLISHED" },
    create: {
      slug: fixtureSlug,
      name: "发布指针测试模板",
      description: "验证准备版本不会自动发布",
      coverUrl: "/fixtures/published-version-pointer.svg",
      status: "PUBLISHED",
    },
  });
  fixtureTemplateId = template.id;

  const boards = sourceVersion.boardDefinition as Prisma.JsonArray;
  const versionTwoBoards = boards.map((board) => ({
    ...(board as Prisma.JsonObject),
    name: `${String((board as Prisma.JsonObject).name)} V2`,
  }));

  await prisma.templateVersion.createMany({
    data: [
      {
        templateId: template.id,
        version: 1,
        formDefinition: sourceVersion.formDefinition as Prisma.InputJsonValue,
        workflowDefinition: sourceVersion.workflowDefinition as Prisma.InputJsonValue,
        boardDefinition: sourceVersion.boardDefinition as Prisma.InputJsonValue,
        brandRules: sourceVersion.brandRules as Prisma.InputJsonValue,
        exportRules: sourceVersion.exportRules as Prisma.InputJsonValue,
      },
      {
        templateId: template.id,
        version: 2,
        formDefinition: sourceVersion.formDefinition as Prisma.InputJsonValue,
        workflowDefinition: {
          ...(sourceVersion.workflowDefinition as Prisma.JsonObject),
          versionRequirement: "团队版",
        },
        boardDefinition: versionTwoBoards as Prisma.InputJsonValue,
        brandRules: sourceVersion.brandRules as Prisma.InputJsonValue,
        exportRules: sourceVersion.exportRules as Prisma.InputJsonValue,
      },
      {
        templateId: template.id,
        version: 3,
        formDefinition: sourceVersion.formDefinition as Prisma.InputJsonValue,
        workflowDefinition: sourceVersion.workflowDefinition as Prisma.InputJsonValue,
        boardDefinition: boards.slice(0, 4) as Prisma.InputJsonValue,
        brandRules: sourceVersion.brandRules as Prisma.InputJsonValue,
        exportRules: sourceVersion.exportRules as Prisma.InputJsonValue,
      },
    ],
    skipDuplicates: true,
  });

  const [versionOne, versionTwo, invalidVersion] = await Promise.all(
    [1, 2, 3].map((version) =>
      prisma.templateVersion.findUniqueOrThrow({
        where: { templateId_version: { templateId: template.id, version } },
      }),
    ),
  );
  versionOneId = versionOne.id;
  versionTwoId = versionTwo.id;
  invalidVersionId = invalidVersion.id;
});

beforeEach(async () => {
  await prisma.template.update({
    where: { id: fixtureTemplateId },
    data: { status: "PUBLISHED", publishedVersionId: versionOneId },
  });
});

afterEach(async () => {
  await prisma.template.update({
    where: { id: fixtureTemplateId },
    data: { publishedVersionId: versionOneId },
  });
});

test("keeps prepared v2 hidden until the published pointer switches to it", async () => {
  const beforeDetail = await getPublishedTemplate(fixtureSlug);
  const beforeSummary = (await listPublishedTemplates()).find(({ slug }) => slug === fixtureSlug);
  expect(beforeDetail?.templateVersionId).toBe(versionOneId);
  expect(beforeSummary?.templateVersionId).toBe(versionOneId);

  await prisma.template.update({
    where: { id: fixtureTemplateId },
    data: { publishedVersionId: versionTwoId },
  });

  const afterDetail = await getPublishedTemplate(fixtureSlug);
  const afterSummary = (await listPublishedTemplates()).find(({ slug }) => slug === fixtureSlug);
  expect(afterDetail?.templateVersionId).toBe(versionTwoId);
  expect(afterDetail?.boards[0]?.name).toContain("V2");
  expect(afterSummary?.templateVersionId).toBe(versionTwoId);
});

test("rejects project creation from stale v1 after publishing v2", async () => {
  await prisma.template.update({
    where: { id: fixtureTemplateId },
    data: { publishedVersionId: versionTwoId },
  });

  await expect(
    createProject({ ...validInput, templateVersionId: versionOneId }),
  ).rejects.toBeInstanceOf(TemplateVersionUnavailableError);
});

test("hides and rejects an active version whose stored definition is invalid", async () => {
  await prisma.template.update({
    where: { id: fixtureTemplateId },
    data: { publishedVersionId: invalidVersionId },
  });

  expect(await getPublishedTemplate(fixtureSlug)).toBeNull();
  expect((await listPublishedTemplates()).some(({ slug }) => slug === fixtureSlug)).toBe(false);
  await expect(
    createProject({ ...validInput, templateVersionId: invalidVersionId }),
  ).rejects.toBeInstanceOf(TemplateVersionUnavailableError);
});
