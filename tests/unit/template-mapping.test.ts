import { mapTemplateSummary, parseTemplateVersion } from "@/lib/templates/get-template";

const validVersion = {
  id: "v1",
  version: 1,
  formDefinition: {
    fields: [{ key: "product.name", label: "商品名称", type: "text", required: true }],
  },
  workflowDefinition: {
    steps: [{ key: "product", name: "商品信息" }],
    estimatedMinutes: 5,
    versionRequirement: "专业版",
  },
  boardDefinition: [
    {
      kind: "HERO_WHITE",
      name: "白底主图",
      width: 1000,
      height: 1000,
      positionX: 0,
      positionY: 0,
      layers: [],
    },
    {
      kind: "SCENE",
      name: "场景图",
      width: 1000,
      height: 1000,
      positionX: 1120,
      positionY: 0,
      layers: [],
    },
    {
      kind: "BENEFITS",
      name: "三卖点图",
      width: 1000,
      height: 1200,
      positionX: 2240,
      positionY: 0,
      layers: [],
    },
    {
      kind: "PROMOTION",
      name: "促销海报",
      width: 1080,
      height: 1440,
      positionX: 3360,
      positionY: 0,
      layers: [],
    },
    {
      kind: "SOCIAL_SQUARE",
      name: "社媒方图",
      width: 1080,
      height: 1080,
      positionX: 4560,
      positionY: 0,
      layers: [],
    },
  ],
};

const invalidVersionOverrides: Array<[string, Record<string, unknown>]> = [
  ["invalid form JSON", { formDefinition: null }],
  [
    "no required inputs",
    {
      formDefinition: {
        fields: [{ key: "product.note", label: "补充说明", type: "text", required: false }],
      },
    },
  ],
  ["no workflow steps", { workflowDefinition: { ...validVersion.workflowDefinition, steps: [] } }],
  [
    "missing persisted estimate",
    {
      workflowDefinition: {
        steps: validVersion.workflowDefinition.steps,
        versionRequirement: "专业版",
      },
    },
  ],
  [
    "missing persisted version requirement",
    {
      workflowDefinition: {
        steps: validVersion.workflowDefinition.steps,
        estimatedMinutes: 5,
      },
    },
  ],
];

test("maps a published template to stable catalog data", () => {
  const result = mapTemplateSummary({
    id: "t1",
    slug: "general-product-launch",
    name: "通用商品上新套装",
    description: "一次生成五张营销素材",
    coverUrl: "/templates/general.webp",
    latestVersion: {
      id: "v1",
      boardDefinition: [{}, {}, {}, {}, {}],
    },
  });

  expect(result).toEqual({
    id: "t1",
    slug: "general-product-launch",
    name: "通用商品上新套装",
    description: "一次生成五张营销素材",
    coverUrl: "/templates/general.webp",
    boardCount: 5,
    templateVersionId: "v1",
  });
});

test("parses a complete official template version", () => {
  expect(parseTemplateVersion(validVersion)).toMatchObject({
    id: "v1",
    version: 1,
    requiredInputs: [{ key: "product.name", label: "商品名称", type: "text" }],
    workflowSteps: [{ key: "product", name: "商品信息" }],
    estimatedMinutes: 5,
    versionRequirement: "专业版",
  });
});

test("rejects a missing template version", () => {
  expect(parseTemplateVersion(undefined)).toBeNull();
});

test.each(invalidVersionOverrides)("rejects %s", (_label, override) => {
  expect(parseTemplateVersion({ ...validVersion, ...override })).toBeNull();
});

test("rejects a template version without exactly five boards", () => {
  expect(
    parseTemplateVersion({
      ...validVersion,
      boardDefinition: validVersion.boardDefinition.slice(0, 4),
    }),
  ).toBeNull();
});

test("rejects an unsupported board kind", () => {
  expect(
    parseTemplateVersion({
      ...validVersion,
      boardDefinition: [
        { ...validVersion.boardDefinition[0], kind: "UNKNOWN" },
        ...validVersion.boardDefinition.slice(1),
      ],
    }),
  ).toBeNull();
});

test("rejects duplicate board kinds", () => {
  expect(
    parseTemplateVersion({
      ...validVersion,
      boardDefinition: [
        validVersion.boardDefinition[0],
        { ...validVersion.boardDefinition[1], kind: "HERO_WHITE" },
        ...validVersion.boardDefinition.slice(2),
      ],
    }),
  ).toBeNull();
});
