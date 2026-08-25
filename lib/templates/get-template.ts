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
  fields: z.array(
    z.object({
      key: z.string().min(1),
      label: z.string().min(1),
      type: z.string().min(1),
      required: z.boolean(),
    }),
  ),
});

const workflowDefinitionSchema = z.object({
  steps: z.array(
    z.object({
      key: z.string().min(1),
      name: z.string().min(1),
    }),
  ),
  estimatedMinutes: z.number().int().positive().optional(),
  versionRequirement: z.string().min(1).optional(),
});

const boardDefinitionSchema = z.array(
  z.object({
    kind: z.string().min(1),
    name: z.string().min(1),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    positionX: z.number().int(),
    positionY: z.number().int(),
    layers: z.array(z.unknown()),
  }),
);

type ParsedTemplateDefinition = {
  requiredInputs: RequiredInput[];
  workflowSteps: WorkflowStep[];
  boards: TemplateBoard[];
  estimatedMinutes: number;
  versionRequirement: string | undefined;
};

function parseTemplateDefinition(
  formDefinition: unknown,
  workflowDefinition: unknown,
  boardDefinition: unknown,
): ParsedTemplateDefinition | null {
  const form = formDefinitionSchema.safeParse(formDefinition);
  const workflow = workflowDefinitionSchema.safeParse(workflowDefinition);
  const boards = boardDefinitionSchema.safeParse(boardDefinition);

  if (!form.success || !workflow.success || !boards.success) {
    return null;
  }

  return {
    requiredInputs: form.data.fields
      .filter((field) => field.required)
      .map(({ key, label, type }) => ({ key, label, type })),
    workflowSteps: workflow.data.steps.map(({ key, name }) => ({ key, name })),
    boards: boards.data.map(({ kind, name, width, height, positionX, positionY }) => ({
      kind,
      name,
      width,
      height,
      positionX,
      positionY,
    })),
    estimatedMinutes: workflow.data.estimatedMinutes ?? 5,
    versionRequirement: workflow.data.versionRequirement,
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
    const latestVersion = template.versions[0];
    if (!latestVersion) {
      return [];
    }

    const definition = parseTemplateDefinition(
      latestVersion.formDefinition,
      latestVersion.workflowDefinition,
      latestVersion.boardDefinition,
    );
    if (!definition) {
      return [];
    }

    return [
      mapTemplateSummary({
        ...template,
        latestVersion: {
          id: latestVersion.id,
          boardDefinition: definition.boards,
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

  const latestVersion = template?.versions[0];
  if (!template || !latestVersion) {
    return null;
  }

  const definition = parseTemplateDefinition(
    latestVersion.formDefinition,
    latestVersion.workflowDefinition,
    latestVersion.boardDefinition,
  );
  if (!definition) {
    return null;
  }

  return {
    ...mapTemplateSummary({
      ...template,
      latestVersion: {
        id: latestVersion.id,
        boardDefinition: definition.boards,
      },
    }),
    ...definition,
    versionRequirement: definition.versionRequirement ?? `v${latestVersion.version}`,
  };
}
