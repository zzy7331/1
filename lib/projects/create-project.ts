import {
  AssetKind,
  Prisma,
  ProjectStatus,
  TemplateStatus,
  VariableType,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { TemplateVersionUnavailableError } from "@/lib/projects/project-errors";
import type { CreatedProject } from "@/lib/projects/project-types";
import { parseTemplateVersion } from "@/lib/templates/get-template";
import type { CreateProjectInput } from "@/lib/validation/create-project-schema";

const protectionDefinition = {
  outline: true,
  logo: true,
  packagingText: true,
  color: true,
  structure: true,
};

function variable(
  key: string,
  type: VariableType,
  value: Prisma.InputJsonValue,
): Prisma.ProjectVariableCreateManyProjectInput {
  return { key, type, value };
}

function projectVariables(input: CreateProjectInput) {
  const variables = [
    variable("product.name", VariableType.STRING, input.product.name),
    variable("product.category", VariableType.STRING, input.product.category),
    ...input.marketing.benefits.map((benefit, index) =>
      variable(`marketing.benefit.${index + 1}`, VariableType.STRING, benefit),
    ),
    variable("direction.style", VariableType.STRING, input.direction.style),
    variable("direction.scene", VariableType.STRING, input.direction.scene),
    variable("direction.primaryColor", VariableType.STRING, input.direction.primaryColor),
    variable(
      "direction.candidateCount",
      VariableType.NUMBER,
      input.direction.candidateCount,
    ),
  ];

  const optionalMarketingVariables = [
    ["marketing.price", input.marketing.price],
    ["marketing.promotion", input.marketing.promotion],
    ["marketing.brandName", input.marketing.brandName],
  ] as const;

  for (const [key, value] of optionalMarketingVariables) {
    if (value !== undefined) {
      variables.push(variable(key, VariableType.STRING, value));
    }
  }

  return variables;
}

export async function createProject(input: CreateProjectInput): Promise<CreatedProject> {
  return prisma.$transaction(async (transaction) => {
    const templateVersion = await transaction.templateVersion.findUnique({
      where: { id: input.templateVersionId },
      include: { template: true },
    });

    if (
      !templateVersion ||
      templateVersion.template.status !== TemplateStatus.PUBLISHED ||
      templateVersion.template.publishedVersionId !== templateVersion.id
    ) {
      throw new TemplateVersionUnavailableError();
    }

    const parsedVersion = parseTemplateVersion(templateVersion);
    if (!parsedVersion) {
      throw new TemplateVersionUnavailableError();
    }

    const project = await transaction.project.create({
      data: {
        templateVersionId: templateVersion.id,
        name: `${input.product.name} 营销素材`,
        status: ProjectStatus.DRAFT,
        templateSnapshot: {
          templateId: templateVersion.template.id,
          templateSlug: templateVersion.template.slug,
          templateName: templateVersion.template.name,
          templateVersionId: templateVersion.id,
          version: templateVersion.version,
          formDefinition: parsedVersion.formDefinition,
          workflowDefinition: parsedVersion.workflowDefinition,
          boardDefinition: parsedVersion.boardDefinition,
          brandRules: parsedVersion.brandRules,
          exportRules: parsedVersion.exportRules,
        } as Prisma.InputJsonObject,
        variables: { createMany: { data: projectVariables(input) } },
        assets: {
          create: {
            kind: AssetKind.PRODUCT_IMAGE,
            sourceUrl: input.product.sourceImageUrl,
            protectionDefinition,
          },
        },
        boards: {
          create: parsedVersion.boardDefinition.map((board) => ({
            kind: board.kind,
            name: board.name,
            width: board.width,
            height: board.height,
            positionX: board.positionX,
            positionY: board.positionY,
            layers: board.layers as Prisma.InputJsonArray,
          })),
        },
      },
      include: {
        boards: { orderBy: { positionX: "asc" } },
      },
    });

    return {
      id: project.id,
      name: project.name,
      templateVersionId: project.templateVersionId,
      boards: project.boards,
    };
  });
}
