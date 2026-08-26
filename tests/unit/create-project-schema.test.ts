import { createProjectSchema } from "@/lib/validation/create-project-schema";

const validInput = {
  templateVersionId: " version-1 ",
  product: {
    name: " 保温杯 ",
    category: " 家居用品 ",
    sourceImageUrl: "https://cdn.example.com/product.png",
  },
  marketing: {
    benefits: [" 轻巧便携 ", " 12 小时保温 ", " 食品级不锈钢 "] as const,
    price: " 199 元 ",
    promotion: " 限时九折 ",
    brandName: " 山岚 ",
  },
  direction: {
    style: "PREMIUM" as const,
    scene: " 通勤办公桌 ",
    primaryColor: "#112233",
    candidateCount: 4 as const,
  },
};

function urlWithLength(length: number) {
  const prefix = "https://example.com/";
  return `${prefix}${"a".repeat(length - prefix.length)}`;
}

type LimitCase = {
  label: string;
  max: number;
  path: string;
  build: (length: number) => unknown;
};

const limitCases: LimitCase[] = [
  {
    label: "templateVersionId",
    max: 128,
    path: "templateVersionId",
    build: (length) => ({ ...validInput, templateVersionId: "版".repeat(length) }),
  },
  {
    label: "product.name",
    max: 100,
    path: "product.name",
    build: (length) => ({
      ...validInput,
      product: { ...validInput.product, name: "商".repeat(length) },
    }),
  },
  {
    label: "product.category",
    max: 50,
    path: "product.category",
    build: (length) => ({
      ...validInput,
      product: { ...validInput.product, category: "类".repeat(length) },
    }),
  },
  {
    label: "product.sourceImageUrl",
    max: 2048,
    path: "product.sourceImageUrl",
    build: (length) => ({
      ...validInput,
      product: { ...validInput.product, sourceImageUrl: urlWithLength(length) },
    }),
  },
  {
    label: "marketing.benefits item",
    max: 200,
    path: "marketing.benefits.0",
    build: (length) => ({
      ...validInput,
      marketing: {
        ...validInput.marketing,
        benefits: ["卖".repeat(length), "保温", "耐用"],
      },
    }),
  },
  {
    label: "marketing.price",
    max: 50,
    path: "marketing.price",
    build: (length) => ({
      ...validInput,
      marketing: { ...validInput.marketing, price: "价".repeat(length) },
    }),
  },
  {
    label: "marketing.promotion",
    max: 200,
    path: "marketing.promotion",
    build: (length) => ({
      ...validInput,
      marketing: { ...validInput.marketing, promotion: "促".repeat(length) },
    }),
  },
  {
    label: "marketing.brandName",
    max: 100,
    path: "marketing.brandName",
    build: (length) => ({
      ...validInput,
      marketing: { ...validInput.marketing, brandName: "牌".repeat(length) },
    }),
  },
  {
    label: "direction.scene",
    max: 200,
    path: "direction.scene",
    build: (length) => ({
      ...validInput,
      direction: { ...validInput.direction, scene: "景".repeat(length) },
    }),
  },
];

test("rejects an invalid image URL and a benefits list that is not exactly three items", () => {
  const result = createProjectSchema.safeParse({
    ...validInput,
    product: { ...validInput.product, sourceImageUrl: "not-a-url" },
    marketing: { ...validInput.marketing, benefits: ["轻巧", "保温"] },
  });

  expect(result.success).toBe(false);
});

test.each<[unknown, string]>([
  [["轻巧", "保温"], "请填写恰好三个卖点"],
  ["轻巧、保温、耐用", "三个卖点必须使用列表格式"],
])("returns a Chinese error for invalid benefits %j", (benefits, expectedMessage) => {
  const result = createProjectSchema.safeParse({
    ...validInput,
    marketing: { ...validInput.marketing, benefits },
  });

  expect(result.success).toBe(false);
  if (!result.success) {
    expect(
      result.error.issues.find((issue) => issue.path.join(".") === "marketing.benefits")?.message,
    ).toBe(expectedMessage);
  }
});

test("accepts complete input, trims required text, and preserves the three-item benefits tuple", () => {
  const result = createProjectSchema.parse(validInput);

  expect(result).toEqual({
    templateVersionId: "version-1",
    product: {
      name: "保温杯",
      category: "家居用品",
      sourceImageUrl: "https://cdn.example.com/product.png",
    },
    marketing: {
      benefits: ["轻巧便携", "12 小时保温", "食品级不锈钢"],
      price: "199 元",
      promotion: "限时九折",
      brandName: "山岚",
    },
    direction: {
      style: "PREMIUM",
      scene: "通勤办公桌",
      primaryColor: "#112233",
      candidateCount: 4,
    },
  });
  expect(result.marketing.benefits).toHaveLength(3);
});

test.each(["ftp://example.com/image.png", "data:image/png;base64,abc", "javascript:alert(1)", "/image.png"])(
  "rejects non-HTTP image URL %s",
  (sourceImageUrl) => {
    expect(
      createProjectSchema.safeParse({
        ...validInput,
        product: { ...validInput.product, sourceImageUrl },
      }).success,
    ).toBe(false);
  },
);

test("rejects an invalid six-digit color", () => {
  expect(
    createProjectSchema.safeParse({
      ...validInput,
      direction: { ...validInput.direction, primaryColor: "#123" },
    }).success,
  ).toBe(false);
});

test.each([0, 3, 5])("rejects unsupported candidate count %s", (candidateCount) => {
  expect(
    createProjectSchema.safeParse({
      ...validInput,
      direction: { ...validInput.direction, candidateCount },
    }).success,
  ).toBe(false);
});

test.each<[string, Record<string, unknown>, string]>([
  ["direction.style", { style: "EDITORIAL" }, "请选择简约、生活方式或高端质感风格"],
  ["direction.candidateCount", { candidateCount: 3 }, "候选数量必须为 1、2 或 4"],
])("returns a Chinese error for invalid %s", (path, directionOverride, expectedMessage) => {
  const result = createProjectSchema.safeParse({
    ...validInput,
    direction: { ...validInput.direction, ...directionOverride },
  });

  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.issues.find((issue) => issue.path.join(".") === path)?.message).toBe(
      expectedMessage,
    );
  }
});

test("normalizes empty optional marketing fields to undefined", () => {
  const result = createProjectSchema.parse({
    ...validInput,
    marketing: {
      ...validInput.marketing,
      price: "  ",
      promotion: "",
      brandName: "   ",
    },
  });

  expect(result.marketing).toEqual({
    benefits: ["轻巧便携", "12 小时保温", "食品级不锈钢"],
    price: undefined,
    promotion: undefined,
    brandName: undefined,
  });
});

test("rejects required text that becomes empty after trimming", () => {
  expect(
    createProjectSchema.safeParse({
      ...validInput,
      direction: { ...validInput.direction, scene: "   " },
    }).success,
  ).toBe(false);
});

test.each(limitCases)("accepts $label at its limit and rejects max + 1", ({ max, path, build }) => {
  expect(createProjectSchema.safeParse(build(max)).success).toBe(true);

  const result = createProjectSchema.safeParse(build(max + 1));

  expect(result.success).toBe(false);
  if (!result.success) {
    const issue = result.error.issues.find((candidate) => candidate.path.join(".") === path);
    expect(issue?.message).toContain(String(max));
    expect(issue?.message).toMatch(/[\u3400-\u9fff]/);
  }
});

test.each([
  ["product.sourceImageUrl", { product: { ...validInput.product, sourceImageUrl: undefined } }, "请填写商品图片地址"],
  ["direction.primaryColor", { direction: { ...validInput.direction, primaryColor: undefined } }, "请选择主色"],
] as const)("returns a Chinese required error for %s", (path, override, expectedMessage) => {
  const result = createProjectSchema.safeParse({ ...validInput, ...override });

  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.issues.find((issue) => issue.path.join(".") === path)?.message).toBe(
      expectedMessage,
    );
  }
});

test.each(["#112233 ", " #112233", "112233", "#GG2233", "#11223344"])(
  "requires primaryColor to match the exact #RRGGBB format: %s",
  (primaryColor) => {
    expect(
      createProjectSchema.safeParse({
        ...validInput,
        direction: { ...validInput.direction, primaryColor },
      }).success,
    ).toBe(false);
  },
);
