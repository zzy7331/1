import { z } from "zod";

const requiredText = z.string().trim().min(1, "此项不能为空");

const optionalText = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  },
  z.string().min(1).optional(),
);

const httpUrl = z
  .string()
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

export const createProjectSchema = z.object({
  templateVersionId: requiredText,
  product: z.object({
    name: requiredText,
    category: requiredText,
    sourceImageUrl: httpUrl,
  }),
  marketing: z.object({
    benefits: z.tuple([requiredText, requiredText, requiredText]),
    price: optionalText,
    promotion: optionalText,
    brandName: optionalText,
  }),
  direction: z.object({
    style: z.enum(["MINIMAL", "LIFESTYLE", "PREMIUM"]),
    scene: requiredText,
    primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "请输入六位十六进制颜色"),
    candidateCount: z.union([z.literal(1), z.literal(2), z.literal(4)]),
  }),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
