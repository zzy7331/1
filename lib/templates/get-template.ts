import { z } from "zod";
import { prisma } from "@/lib/db";
import type {
  RequiredInput,
  TemplateBoard,
  TemplateDetail,
  TemplateSummary,
  WorkflowStep,
} from "@/lib/templates/template-types";

type TemplateSummaryRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  coverUrl: string;
  publishedVersion: {
    id: string;
    boardDefinition: unknown[];
  };
};

const formDefinitionSchema = z.object({
  fields: z
    .array(
      z.object({
        key: z.string().min(1),
        label: z.string().min(1),
        type: z.string().min(1),
        required: z.boolean(),
      }).passthrough(),
    )
    .refine((fields) => fields.some((field) => field.required)),
}).passthrough();

const workflowDefinitionSchema = z.object({
  steps: z
    .array(
      z.object({
        key: z.string().min(1),
        name: z.string().min(1),
      }).passthrough(),
    )
    .min(1),
  estimatedMinutes: z.number().int().positive(),
  versionRequirement: z.string().min(1),
}).passthrough();

const boardDefinitionSchema = z
  .array(
    z
      .object({
        kind: z.enum(["HERO_WHITE", "SCENE", "BENEFITS", "PROMOTION", "SOCIAL_SQUARE"]),
        name: z.string().min(1),
        width: z.number().int().positive(),
        height: z.number().int().positive(),
        positionX: z.number().int(),
        positionY: z.number().int(),
        layers: z.array(z.unknown()),
      })
      .passthrough(),
  )
  .length(5)
  .refine((boards) => new Set(boards.map((board) => board.kind)).size === boards.length);

const nonEmptyDefinitionSchema = z
  .record(z.unknown())
  .refine((definition) => Object.keys(definition).length > 0);

const templateVersionSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  formDefinition: formDefinitionSchema,
  workflowDefinition: workflowDefinitionSchema,
  boardDefinition: boardDefinitionSchema,
  brandRules: nonEmptyDefinitionSchema,
  exportRules: nonEmptyDefinitionSchema,
});

export type ParsedTemplateVersion = {
  id: string;
  version: number;
  requiredInputs: RequiredInput[];
  workflowSteps: WorkflowStep[];
  boards: TemplateBoard[];
  estimatedMinutes: number;
  versionRequirement: string;
  formDefinition: z.infer<typeof formDefinitionSchema>;
  workflowDefinition: z.infer<typeof workflowDefinitionSchema>;
  boardDefinition: z.infer<typeof boardDefinitionSchema>;
  brandRules: z.infer<typeof nonEmptyDefinitionSchema>;
  exportRules: z.infer<typeof nonEmptyDefinitionSchema>;
};

export function parseTemplateVersion(version: unknown): ParsedTemplateVersion | null {
  const result = templateVersionSchema.safeParse(version);
  if (!result.success) {
    return null;
  }

  const {
    id,
    version: versionNumber,
    formDefinition,
    workflowDefinition,
    boardDefinition,
    brandRules,
    exportRules,
  } = result.data;

  return {
    id,
    version: versionNumber,
    requiredInputs: formDefinition.fields
      .filter((field) => field.required)
      .map(({ key, label, type }) => ({ key, label, type })),
    workflowSteps: workflowDefinition.steps.map(({ key, name }) => ({ key, name })),
    boards: boardDefinition.map(({ kind, name, width, height, positionX, positionY }) => ({
      kind,
      name,
      width,
      height,
      positionX,
      positionY,
    })),
    estimatedMinutes: workflowDefinition.estimatedMinutes,
    versionRequirement: workflowDefinition.versionRequirement,
    formDefinition,
    workflowDefinition,
    boardDefinition,
    brandRules,
    exportRules,
  };
}

export function mapTemplateSummary(row: TemplateSummaryRow): TemplateSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    coverUrl: row.coverUrl,
    boardCount: row.publishedVersion.boardDefinition.length,
    templateVersionId: row.publishedVersion.id,
  };
}

export async function listPublishedTemplates(): Promise<TemplateSummary[]> {
  const templates = await prisma.template.findMany({
    where: {
      status: "PUBLISHED",
      publishedVersionId: { not: null },
    },
    include: {
      publishedVersion: true,
    },
    orderBy: { name: "asc" },
  });

  return templates.flatMap((template) => {
    const publishedVersion = parseTemplateVersion(template.publishedVersion);
    if (!publishedVersion) {
      return [];
    }

    return [
      mapTemplateSummary({
        ...template,
        publishedVersion: {
          id: publishedVersion.id,
          boardDefinition: publishedVersion.boards,
        },
      }),
    ];
  });
}

export async function getPublishedTemplate(slug: string): Promise<TemplateDetail | null> {
  const template = await prisma.template.findFirst({
    where: {
      slug,
      status: "PUBLISHED",
    },
    include: {
      publishedVersion: true,
    },
  });

  const publishedVersion = parseTemplateVersion(template?.publishedVersion);
  if (!template || !publishedVersion) {
    return null;
  }

  return {
    ...mapTemplateSummary({
      ...template,
      publishedVersion: {
        id: publishedVersion.id,
        boardDefinition: publishedVersion.boards,
      },
    }),
    requiredInputs: publishedVersion.requiredInputs,
    workflowSteps: publishedVersion.workflowSteps,
    boards: publishedVersion.boards,
    estimatedMinutes: publishedVersion.estimatedMinutes,
    versionRequirement: publishedVersion.versionRequirement,
  };
}
