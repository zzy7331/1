import { prisma } from "@/lib/db";

describe("seeded general product launch template", () => {
  it("persists one version with the five required board definitions", async () => {
    const template = await prisma.template.findUnique({
      where: { slug: "general-product-launch" },
      include: { versions: true },
    });

    expect(template).not.toBeNull();
    expect(template?.versions).toHaveLength(1);

    const boardDefinition = template?.versions[0]?.boardDefinition;
    expect(Array.isArray(boardDefinition)).toBe(true);
    if (!Array.isArray(boardDefinition)) {
      throw new Error("Expected the board definition to be an array");
    }
    expect(boardDefinition).toHaveLength(5);
  });
});
