export type TemplateSummary = {
  id: string;
  slug: string;
  name: string;
  description: string;
  coverUrl: string;
  boardCount: number;
  templateVersionId: string;
};

export type RequiredInput = {
  key: string;
  label: string;
  type: string;
};

export type WorkflowStep = {
  key: string;
  name: string;
};

export type TemplateBoardKind =
  | "HERO_WHITE"
  | "SCENE"
  | "BENEFITS"
  | "PROMOTION"
  | "SOCIAL_SQUARE";

export type TemplateBoard = {
  kind: TemplateBoardKind;
  name: string;
  width: number;
  height: number;
  positionX: number;
  positionY: number;
};

export type TemplateDetail = TemplateSummary & {
  requiredInputs: RequiredInput[];
  workflowSteps: WorkflowStep[];
  boards: TemplateBoard[];
  estimatedMinutes: number;
  versionRequirement: string;
};
