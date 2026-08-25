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
  latestVersion: {
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
      }),
    )
    .refine((fields) => fields.some((field) => field.required)),
});

const workflowDefinitionSchema = z.object({
  steps: z
    .array(
      z.object({
        key: z.string().min(1),
        name: z.string().min(1),
      }),
    )
    .min(1),
  estimatedMinutes: z.number().int().positive(),
  versionRequirement: z.string().min(1),
});

const boardDefinitionSchema = z
  .array(
    z.object({
      kind: z.enum(["HERO_WHITE", "SCENE", "BENEFITS", "PROMOTION", "SOCIAL_SQUARE"]),
      name: z.string().min(1),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
      positionX: z.number().int(),
      positionY: z.number().int(),
      layers: z.array(z.unknown()),
    }),
  )
  .length(5)
  .refine((boards) => new Set(boards.map((board) => board.kind)).size === boards.length);

const templateVersionSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  formDefinition: formDefinitionSchema,
  workflowDefinition: workflowDefinitionSchema,
  boardDefinition: boardDefinitionSchema,
});

type ParsedTemplateVersion = {
  id: string;
  version: number;
  requiredInputs: RequiredInput[];
  workflowSteps: WorkflowStep[];
  boards: TemplateBoard[];
  estimatedMinutes: number;
  versionRequirement: string;
};

export function parseTemplateVersion(version: unknown): ParsedTemplateVersion | null {
  const result = templateVersionSchema.safeParse(version);
  if (!result.success) {
    return null;
  }

  const { id, version: versionNumber, formDefinition, workflowDefinition, boardDefinition } =
    result.data;

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
  };
}

export function mapTemplateSummary(row: TemplateSummaryRow): TemplateSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    coverUrl: row.coverUrl,
    boardCount: row.latestVersion.boardDefinition.length,
    templateVersionId: row.latestVersion.id,
  };
}

export async function listPublishedTemplates(): Promise<TemplateSummary[]> {
  const templates = await prisma.template.findMany({
    where: {
      status: "PUBLISHED",
      versions: { some: {} },
    },
    include: {
      versions: {
        orderBy: { version: "desc" },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  });

  return templates.flatMap((template) => {
    const latestVersion = parseTemplateVersion(template.versions[0]);
    if (!latestVersion) {
      return [];
    }

    return [
      mapTemplateSummary({
        ...template,
        latestVersion: {
          id: latestVersion.id,
          boardDefinition: latestVersion.boards,
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
      versions: {
        orderBy: { version: "desc" },
        take: 1,
      },
    },
  });

  const latestVersion = parseTemplateVersion(template?.versions[0]);
  if (!template || !latestVersion) {
    return null;
  }

  return {
    ...mapTemplateSummary({
      ...template,
      latestVersion: {
        id: latestVersion.id,
        boardDefinition: latestVersion.boards,
      },
    }),
    requiredInputs: latestVersion.requiredInputs,
    workflowSteps: latestVersion.workflowSteps,
    boards: latestVersion.boards,
    estimatedMinutes: latestVersion.estimatedMinutes,
    versionRequirement: latestVersion.versionRequirement,
  };
}
