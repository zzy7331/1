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

test("rejects an invalid image URL and a benefits list that is not exactly three items", () => {
  const result = createProjectSchema.safeParse({
    ...validInput,
    product: { ...validInput.product, sourceImageUrl: "not-a-url" },
    marketing: { ...validInput.marketing, benefits: ["轻巧", "保温"] },
  });

  expect(result.success).toBe(false);
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
