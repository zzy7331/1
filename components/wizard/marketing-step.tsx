type MarketingValue = {
  benefits: [string, string, string];
  price: string;
  promotion: string;
  brandName: string;
};

type MarketingStepProps = {
  value: MarketingValue;
  errors: Record<string, string>;
  onBenefitChange: (index: 0 | 1 | 2, value: string) => void;
  onChange: (field: "price" | "promotion" | "brandName", value: string) => void;
};

export function MarketingStep({
  value,
  errors,
  onBenefitChange,
  onChange,
}: MarketingStepProps) {
  return (
    <section aria-labelledby="marketing-step-title" className="space-y-5">
      <h2 id="marketing-step-title" className="text-xl font-semibold text-zinc-900">
        营销信息
      </h2>

      {value.benefits.map((benefit, index) => {
        const error = errors[`benefits.${index}`];
        const errorId = `benefit-${index + 1}-error`;
        return (
          <label key={index} className="block text-sm font-medium text-zinc-800">
            卖点 {index + 1}
            <input
              value={benefit}
              onChange={(event) => onBenefitChange(index as 0 | 1 | 2, event.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
              className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2"
            />
            {error ? (
              <span id={errorId} className="mt-1 block text-sm text-red-600">
                {error}
              </span>
            ) : null}
          </label>
        );
      })}

      <label className="block text-sm font-medium text-zinc-800">
        价格
        <input
          value={value.price}
          onChange={(event) => onChange("price", event.target.value)}
          className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2"
        />
      </label>

      <label className="block text-sm font-medium text-zinc-800">
        促销信息
        <input
          value={value.promotion}
          onChange={(event) => onChange("promotion", event.target.value)}
          className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2"
        />
      </label>

      <label className="block text-sm font-medium text-zinc-800">
        品牌名称
        <input
          value={value.brandName}
          onChange={(event) => onChange("brandName", event.target.value)}
          className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2"
        />
      </label>
    </section>
  );
}
