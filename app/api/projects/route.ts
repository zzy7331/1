import { NextResponse } from "next/server";
import { createProject } from "@/lib/projects/create-project";
import { TemplateVersionUnavailableError } from "@/lib/projects/project-errors";
import { createProjectSchema } from "@/lib/validation/create-project-schema";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        code: "INVALID_INPUT",
        fieldErrors: { body: ["请求内容必须是有效的 JSON"] },
      },
      { status: 400 },
    );
  }

  const result = createProjectSchema.safeParse(body);
  if (!result.success) {
    const flattenedErrors = result.error.flatten();
    return NextResponse.json(
      {
        code: "INVALID_INPUT",
        fieldErrors: {
          body: flattenedErrors.formErrors,
          ...flattenedErrors.fieldErrors,
        },
      },
      { status: 400 },
    );
  }

  try {
    const project = await createProject(result.data);
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    if (error instanceof TemplateVersionUnavailableError) {
      return NextResponse.json({ code: "TEMPLATE_VERSION_UNAVAILABLE" }, { status: 404 });
    }

    return NextResponse.json({ code: "PROJECT_CREATE_FAILED" }, { status: 500 });
  }
}
