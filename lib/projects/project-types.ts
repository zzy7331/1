export type BoardKind =
  | "HERO_WHITE"
  | "SCENE"
  | "BENEFITS"
  | "PROMOTION"
  | "SOCIAL_SQUARE";

export type ProjectWorkspaceBoard = {
  id: string;
  kind: BoardKind;
  name: string;
  width: number;
  height: number;
  positionX: number;
  positionY: number;
  layers: unknown;
};

export type ProjectWorkspaceData = {
  id: string;
  name: string;
  templateVersionId: string;
  variables: Record<string, unknown>;
  boards: ProjectWorkspaceBoard[];
};

type ProjectWorkspaceRecord = Omit<ProjectWorkspaceData, "variables"> & {
  variables: Array<{ key: string; value: unknown }>;
};

export function mapProjectWorkspaceData(project: ProjectWorkspaceRecord): ProjectWorkspaceData {
  const variables = Object.fromEntries(
    project.variables.flatMap(({ key, value }) => (typeof value === "string" ? [[key, value]] : [])),
  );

  return {
    id: project.id,
    name: project.name,
    templateVersionId: project.templateVersionId,
    variables,
    boards: [...project.boards].sort((left, right) => left.positionX - right.positionX),
  };
}

export type CreatedProject = {
  id: string;
  name: string;
  templateVersionId: string;
  boards: Array<{
    id: string;
    kind: BoardKind;
    name: string;
    width: number;
    height: number;
    positionX: number;
    positionY: number;
  }>;
};
