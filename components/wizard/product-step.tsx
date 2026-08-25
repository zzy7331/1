import type { CreateProjectInput } from "@/lib/validation/create-project-schema";

type ProductStepProps = {
  value: CreateProjectInput["product"];
  errors: Record<string, string>;
  onChange: (field: keyof CreateProjectInput["product"], value: string) => void;
};

export function ProductStep({ value, errors, onChange }: ProductStepProps) {
  return (
    <section aria-labelledby="product-step-title" className="space-y-5">
      <h2 id="product-step-title" className="text-xl font-semibold text-zinc-900">
        商品信息
      </h2>

      <label className="block text-sm font-medium text-zinc-800">
        商品名称
        <input
          value={value.name}
          onChange={(event) => onChange("name", event.target.value)}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "product-name-error" : undefined}
          className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2"
        />
        {errors.name ? (
          <span id="product-name-error" className="mt-1 block text-sm text-red-600">
            {errors.name}
          </span>
        ) : null}
      </label>

      <label className="block text-sm font-medium text-zinc-800">
        商品类目
        <input
          value={value.category}
          onChange={(event) => onChange("category", event.target.value)}
          aria-invalid={Boolean(errors.category)}
          aria-describedby={errors.category ? "product-category-error" : undefined}
          className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2"
        />
        {errors.category ? (
          <span id="product-category-error" className="mt-1 block text-sm text-red-600">
            {errors.category}
          </span>
        ) : null}
      </label>

      <label className="block text-sm font-medium text-zinc-800">
        商品图片地址
        <input
          type="url"
          value={value.sourceImageUrl}
          onChange={(event) => onChange("sourceImageUrl", event.target.value)}
          aria-invalid={Boolean(errors.sourceImageUrl)}
          aria-describedby={errors.sourceImageUrl ? "product-image-error" : undefined}
          className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2"
          placeholder="https://example.com/product.jpg"
        />
        {errors.sourceImageUrl ? (
          <span id="product-image-error" className="mt-1 block text-sm text-red-600">
            {errors.sourceImageUrl}
          </span>
        ) : null}
      </label>
    </section>
  );
}
