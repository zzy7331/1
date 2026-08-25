import { notFound } from "next/navigation";
import { ProjectWorkspace } from "@/components/canvas/project-workspace";
import { prisma } from "@/lib/db";
import { mapProjectWorkspaceData } from "@/lib/projects/project-types";

export const dynamic = "force-dynamic";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      variables: { select: { key: true, value: true } },
      boards: {
        orderBy: { positionX: "asc" },
        select: {
          id: true,
          kind: true,
          name: true,
          width: true,
          height: true,
          positionX: true,
          positionY: true,
          layers: true,
        },
      },
    },
  });

  if (!project) {
    notFound();
  }

  return <ProjectWorkspace project={mapProjectWorkspaceData(project)} />;
}
