export type BoardKind =
  | "HERO_WHITE"
  | "SCENE"
  | "BENEFITS"
  | "PROMOTION"
  | "SOCIAL_SQUARE";

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
