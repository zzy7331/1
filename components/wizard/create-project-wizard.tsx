"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { ZodIssue } from "zod";
import { DirectionStep } from "@/components/wizard/direction-step";
import { MarketingStep } from "@/components/wizard/marketing-step";
import { ProductStep } from "@/components/wizard/product-step";
import {
  createProjectSchema,
  type CreateProjectInput,
} from "@/lib/validation/create-project-schema";

type WizardState = {
  product: CreateProjectInput["product"];
  marketing: {
    benefits: [string, string, string];
    price: string;
    promotion: string;
    brandName: string;
  };
  direction: CreateProjectInput["direction"];
};

type CreateProjectWizardProps = {
  templateVersionId: string;
};

const initialState: WizardState = {
  product: { name: "", category: "", sourceImageUrl: "" },
  marketing: {
    benefits: ["", "", ""],
    price: "",
    promotion: "",
    brandName: "",
  },
  direction: {
    style: "MINIMAL",
    scene: "",
    primaryColor: "#18181b",
    candidateCount: 1,
  },
};

function mapIssues(issues: ZodIssue[]): Record<string, string> {
  return Object.fromEntries(issues.map((issue) => [issue.path.join("."), issue.message]));
}

function hasProjectId(value: unknown): value is { project: { id: string } } {
  if (typeof value !== "object" || value === null || !("project" in value)) {
    return false;
  }

  const project = value.project;
  return (
    typeof project === "object" &&
    project !== null &&
    "id" in project &&
    typeof project.id === "string" &&
    project.id.trim() !== ""
  );
}

export function CreateProjectWizard({ templateVersionId }: CreateProjectWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [value, setValue] = useState<WizardState>(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function advance() {
    const schema = step === 1 ? createProjectSchema.shape.product : createProjectSchema.shape.marketing;
    const currentValue = step === 1 ? value.product : value.marketing;
    const result = schema.safeParse(currentValue);

    if (!result.success) {
      setErrors(mapIssues(result.error.issues));
      return;
    }

    setErrors({});
    setSubmitError(null);
    setStep((step + 1) as 2 | 3);
  }

  function goBack() {
    setErrors({});
    setSubmitError(null);
    setStep((step - 1) as 1 | 2);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const directionResult = createProjectSchema.shape.direction.safeParse(value.direction);
    if (!directionResult.success) {
      setErrors(mapIssues(directionResult.error.issues));
      return;
    }

    const inputResult = createProjectSchema.safeParse({ templateVersionId, ...value });
    if (!inputResult.success) {
      setSubmitError("请检查填写内容后重试。");
      return;
    }

    setErrors({});
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inputResult.data),
      });

      if (!response.ok) {
        throw new Error("request failed");
      }

      const body: unknown = await response.json();
      if (!hasProjectId(body)) {
        throw new Error("invalid response");
      }

      router.push(`/projects/${body.project.id}`);
    } catch {
      setSubmitError("创建项目失败，请稍后重试。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <p aria-live="polite" className="text-sm font-medium text-zinc-500">
        第 {step} 步，共 3 步
      </p>

      <div className="mt-4">
        {step === 1 ? (
          <ProductStep
            value={value.product}
            errors={errors}
            onChange={(field, nextValue) =>
              setValue((current) => ({
                ...current,
                product: { ...current.product, [field]: nextValue },
              }))
            }
          />
        ) : null}

        {step === 2 ? (
          <MarketingStep
            value={value.marketing}
            errors={errors}
            onBenefitChange={(index, nextValue) =>
              setValue((current) => {
                const benefits = [...current.marketing.benefits] as [string, string, string];
                benefits[index] = nextValue;
                return {
                  ...current,
                  marketing: { ...current.marketing, benefits },
                };
              })
            }
            onChange={(field, nextValue) =>
              setValue((current) => ({
                ...current,
                marketing: { ...current.marketing, [field]: nextValue },
              }))
            }
          />
        ) : null}

        {step === 3 ? (
          <DirectionStep
            value={value.direction}
            errors={errors}
            onChange={(field, nextValue) =>
              setValue((current) => ({
                ...current,
                direction: { ...current.direction, [field]: nextValue },
              }))
            }
          />
        ) : null}
      </div>

      {submitError ? (
        <p role="alert" className="mt-5 text-sm font-medium text-red-600">
          {submitError}
        </p>
      ) : null}

      <div className="mt-6 flex items-center gap-3">
        {step > 1 ? (
          <button
            type="button"
            onClick={goBack}
            disabled={isSubmitting}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 disabled:opacity-50"
          >
            上一步
          </button>
        ) : null}

        {step < 3 ? (
          <button
            type="button"
            onClick={advance}
            className="rounded-md bg-zinc-900 px-5 py-2 text-sm font-medium text-white"
          >
            下一步
          </button>
        ) : (
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-zinc-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {isSubmitting ? "正在生成…" : "生成整套素材"}
          </button>
        )}
      </div>

      {isSubmitting ? (
        <p role="status" className="sr-only">
          正在创建项目
        </p>
      ) : null}
    </form>
  );
}
