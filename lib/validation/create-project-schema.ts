import { z } from "zod";

function requiredText(maxLength: number, label: string) {
  return z
    .string({ required_error: `${label}不能为空`, invalid_type_error: `${label}必须是文本` })
    .trim()
    .min(1, `${label}不能为空`)
    .max(maxLength, `${label}不能超过 ${maxLength} 个字符`);
}

function optionalText(maxLength: number, label: string) {
  return z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return value;
      }

      const trimmed = value.trim();
      return trimmed === "" ? undefined : trimmed;
    },
    z
      .string({ invalid_type_error: `${label}必须是文本` })
      .min(1)
      .max(maxLength, `${label}不能超过 ${maxLength} 个字符`)
      .optional(),
  );
}

const httpUrl = z
  .string({
    required_error: "请填写商品图片地址",
    invalid_type_error: "图片地址必须是文本",
  })
  .trim()
  .max(2048, "图片地址不能超过 2048 个字符")
  .url("请输入有效的图片地址")
  .refine((value) => {
    try {
      const protocol = new URL(value).protocol;
      return protocol === "http:" || protocol === "https:";
    } catch {
      return false;
    }
  }, "图片地址必须使用 HTTP 或 HTTPS");

const benefitText = requiredText(200, "每个卖点");

const benefitsSchema = z.tuple([benefitText, benefitText, benefitText], {
  errorMap: (issue) => ({
    message:
      issue.code === z.ZodIssueCode.invalid_type
        ? "三个卖点必须使用列表格式"
        : "请填写恰好三个卖点",
  }),
});

const styleSchema = z.enum(["MINIMAL", "LIFESTYLE", "PREMIUM"], {
  errorMap: () => ({ message: "请选择简约、生活方式或高端质感风格" }),
});

const candidateCountSchema = z.union([z.literal(1), z.literal(2), z.literal(4)], {
  errorMap: () => ({ message: "候选数量必须为 1、2 或 4" }),
});

export const createProjectSchema = z.object(
  {
    templateVersionId: requiredText(128, "模板版本标识"),
    product: z.object(
      {
        name: requiredText(100, "商品名称"),
        category: requiredText(50, "商品类目"),
        sourceImageUrl: httpUrl,
      },
      {
        required_error: "请填写商品信息",
        invalid_type_error: "商品信息必须是对象",
      },
    ),
    marketing: z.object(
      {
        benefits: benefitsSchema,
        price: optionalText(50, "价格"),
        promotion: optionalText(200, "促销信息"),
        brandName: optionalText(100, "品牌名称"),
      },
      {
        required_error: "请填写营销信息",
        invalid_type_error: "营销信息必须是对象",
      },
    ),
    direction: z.object(
      {
        style: styleSchema,
        scene: requiredText(200, "使用场景"),
        primaryColor: z
          .string({ required_error: "请选择主色", invalid_type_error: "主色必须是文本" })
          .regex(/^#[0-9A-Fa-f]{6}$/, "请输入六位十六进制颜色"),
        candidateCount: candidateCountSchema,
      },
      {
        required_error: "请选择视觉方向",
        invalid_type_error: "视觉方向必须是对象",
      },
    ),
  },
  {
    required_error: "请求内容不能为空",
    invalid_type_error: "请求内容必须是对象",
  },
);

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
