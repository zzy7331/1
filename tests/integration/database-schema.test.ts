import { prisma } from "@/lib/db";
import { seedOfficialTemplate } from "@/prisma/seed";

const expectedBoards = [
  { kind: "HERO_WHITE", name: "白底主图", width: 1000, height: 1000, positionX: 0, positionY: 0 },
  { kind: "SCENE", name: "场景图", width: 1000, height: 1000, positionX: 1120, positionY: 0 },
  { kind: "BENEFITS", name: "三卖点图", width: 1000, height: 1200, positionX: 2240, positionY: 0 },
  { kind: "PROMOTION", name: "促销海报", width: 1080, height: 1440, positionX: 3360, positionY: 0 },
  { kind: "SOCIAL_SQUARE", name: "社媒方图", width: 1080, height: 1080, positionX: 4560, positionY: 0 },
];

type BoardDefinition = Array<{
  kind: string;
  name: string;
  width: number;
  height: number;
  positionX: number;
  positionY: number;
  layers: unknown[];
}>;

function assertBoardDefinition(value: unknown): asserts value is BoardDefinition {
  if (!Array.isArray(value)) {
    throw new Error("Expected the board definition to be an array");
  }
}

function assertNonEmptyDefinition(value: unknown): asserts value is Record<string, unknown> {
  if (
    value === null ||
    Array.isArray(value) ||
    typeof value !== "object" ||
    Object.keys(value).length === 0
  ) {
    throw new Error("Expected a non-empty definition object");
  }
}

describe("seeded general product launch template", () => {
  beforeAll(async () => {
    await seedOfficialTemplate();
  });

  it("persists the five required Chinese-named boards with complete definitions", async () => {
    const template = await prisma.template.findUnique({
      where: { slug: "general-product-launch" },
      include: { versions: true },
    });

    expect(template?.versions).toHaveLength(1);
    const version = template?.versions[0];
    assertBoardDefinition(version?.boardDefinition);
    assertNonEmptyDefinition(version?.formDefinition);
    assertNonEmptyDefinition(version?.workflowDefinition);
    assertNonEmptyDefinition(version?.brandRules);
    assertNonEmptyDefinition(version?.exportRules);

    expect(version?.boardDefinition).toHaveLength(5);
    expect(
      version?.boardDefinition.map(({ kind, name, width, height, positionX, positionY }) => ({
        kind,
        name,
        width,
        height,
        positionX,
        positionY,
      })),
    ).toEqual(expectedBoards);
    expect(version?.boardDefinition.every((board) => board.layers.length > 0)).toBe(true);
  });

  it("leaves the immutable version unchanged when the seed runs again", async () => {
    const before = await prisma.templateVersion.findFirstOrThrow({
      where: { template: { slug: "general-product-launch" }, version: 1 },
    });

    await seedOfficialTemplate();

    const after = await prisma.templateVersion.findUniqueOrThrow({ where: { id: before.id } });
    expect(after).toEqual(before);
  });

  it("rejects updating or deleting an existing template version", async () => {
    const version = await prisma.templateVersion.findFirstOrThrow({
      where: { template: { slug: "general-product-launch" }, version: 1 },
    });

    await expect(
      prisma.templateVersion.update({
        where: { id: version.id },
        data: { formDefinition: { title: "不应被写入" } },
      }),
    ).rejects.toThrow("TemplateVersion is immutable");
    await expect(prisma.templateVersion.delete({ where: { id: version.id } })).rejects.toThrow(
      "TemplateVersion is immutable",
    );
  });
});
