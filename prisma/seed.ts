import { PrismaClient, TemplateStatus } from "@prisma/client";

const prisma = new PrismaClient();

const formDefinition = {
  title: "通用商品上新素材",
  fields: [
    { key: "product.name", label: "商品名称", type: "text", required: true },
    { key: "product.category", label: "商品类目", type: "text", required: true },
    { key: "product.sourceImageUrl", label: "商品图片", type: "url", required: true },
  ],
};

const workflowDefinition = {
  steps: [
    { key: "product", name: "商品信息" },
    { key: "marketing", name: "营销卖点" },
    { key: "direction", name: "视觉方向" },
  ],
};

const boardDefinition = [
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

const brandRules = {
  protectedAttributes: ["商品轮廓", "品牌标识", "包装文字", "主色", "结构细节"],
};

const exportRules = {
  formats: ["png", "jpg"],
  quality: "high",
};

async function main() {
  const template = await prisma.template.upsert({
    where: { slug: "general-product-launch" },
    update: {
      name: "通用商品上新套装",
      description: "一次生成五张营销素材",
      coverUrl: "/templates/general-product-launch.webp",
      status: TemplateStatus.PUBLISHED,
    },
    create: {
      slug: "general-product-launch",
      name: "通用商品上新套装",
      description: "一次生成五张营销素材",
      coverUrl: "/templates/general-product-launch.webp",
      status: TemplateStatus.PUBLISHED,
    },
  });

  await prisma.templateVersion.upsert({
    where: {
      templateId_version: {
        templateId: template.id,
        version: 1,
      },
    },
    update: {},
    create: {
      templateId: template.id,
      version: 1,
      formDefinition,
      workflowDefinition,
      boardDefinition,
      brandRules,
      exportRules,
    },
  });
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
