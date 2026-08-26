import type { CreateProjectInput } from "@/lib/validation/create-project-schema";

type DirectionValue = CreateProjectInput["direction"];

type DirectionStepProps = {
  value: DirectionValue;
  errors: Record<string, string>;
  onChange: <Field extends keyof DirectionValue>(field: Field, value: DirectionValue[Field]) => void;
};

export function DirectionStep({ value, errors, onChange }: DirectionStepProps) {
  return (
    <section aria-labelledby="direction-step-title" className="space-y-5">
      <h2 id="direction-step-title" className="text-xl font-semibold text-zinc-900">
        视觉方向
      </h2>

      <div>
        <label htmlFor="direction-style" className="block text-sm font-medium text-zinc-800">
          视觉风格
        </label>
        <select
          id="direction-style"
          value={value.style}
          onChange={(event) =>
            onChange("style", event.target.value as CreateProjectInput["direction"]["style"])
          }
          aria-invalid={Boolean(errors.style)}
          aria-describedby={errors.style ? "direction-style-error" : undefined}
          className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2"
        >
          <option value="MINIMAL">简约</option>
          <option value="LIFESTYLE">生活方式</option>
          <option value="PREMIUM">高端质感</option>
        </select>
        {errors.style ? (
          <span id="direction-style-error" className="mt-1 block text-sm text-red-600">
            {errors.style}
          </span>
        ) : null}
      </div>

      <label className="block text-sm font-medium text-zinc-800">
        使用场景
        <input
          value={value.scene}
          onChange={(event) => onChange("scene", event.target.value)}
          aria-invalid={Boolean(errors.scene)}
          aria-describedby={errors.scene ? "direction-scene-error" : undefined}
          className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2"
        />
        {errors.scene ? (
          <span id="direction-scene-error" className="mt-1 block text-sm text-red-600">
            {errors.scene}
          </span>
        ) : null}
      </label>

      <label className="block text-sm font-medium text-zinc-800">
        主色
        <input
          type="color"
          value={value.primaryColor}
          onChange={(event) => onChange("primaryColor", event.target.value)}
          aria-invalid={Boolean(errors.primaryColor)}
          aria-describedby={errors.primaryColor ? "direction-color-error" : undefined}
          className="mt-2 block h-11 w-20 rounded-md border border-zinc-300 p-1"
        />
        {errors.primaryColor ? (
          <span id="direction-color-error" className="mt-1 block text-sm text-red-600">
            {errors.primaryColor}
          </span>
        ) : null}
      </label>

      <fieldset
        aria-invalid={Boolean(errors.candidateCount)}
        aria-describedby={errors.candidateCount ? "direction-candidate-count-error" : undefined}
      >
        <legend className="text-sm font-medium text-zinc-800">候选数量</legend>
        <div className="mt-2 flex flex-wrap gap-4">
          {([1, 2, 4] as const).map((count) => (
            <label key={count} className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="radio"
                name="candidateCount"
                value={count}
                checked={value.candidateCount === count}
                onChange={() => onChange("candidateCount", count)}
              />
              {count} 个候选
            </label>
          ))}
        </div>
        {errors.candidateCount ? (
          <p id="direction-candidate-count-error" className="mt-1 text-sm text-red-600">
            {errors.candidateCount}
          </p>
        ) : null}
      </fieldset>
    </section>
  );
}
