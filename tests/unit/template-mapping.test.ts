import { mapTemplateSummary } from "@/lib/templates/get-template";

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
