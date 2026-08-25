import { z } from "zod";

const requiredText = z
  .string({ required_error: "此项不能为空", invalid_type_error: "此项必须是文本" })
  .trim()
  .min(1, "此项不能为空");

const optionalText = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  },
  z.string({ invalid_type_error: "此项必须是文本" }).min(1).optional(),
);

const httpUrl = z
  .string({ invalid_type_error: "图片地址必须是文本" })
  .trim()
  .url("请输入有效的图片地址")
  .refine((value) => {
    try {
      const protocol = new URL(value).protocol;
      return protocol === "http:" || protocol === "https:";
    } catch {
      return false;
    }
  }, "图片地址必须使用 HTTP 或 HTTPS");

const benefitsSchema = z.tuple([requiredText, requiredText, requiredText], {
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

export const createProjectSchema = z.object({
  templateVersionId: requiredText,
  product: z.object({
    name: requiredText,
    category: requiredText,
    sourceImageUrl: httpUrl,
  }),
  marketing: z.object({
    benefits: benefitsSchema,
    price: optionalText,
    promotion: optionalText,
    brandName: optionalText,
  }),
  direction: z.object({
    style: styleSchema,
    scene: requiredText,
    primaryColor: z
      .string({ invalid_type_error: "主色必须是文本" })
      .regex(/^#[0-9A-Fa-f]{6}$/, "请输入六位十六进制颜色"),
    candidateCount: candidateCountSchema,
  }),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
