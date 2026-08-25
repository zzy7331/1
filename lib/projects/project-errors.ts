export class TemplateVersionUnavailableError extends Error {
  constructor() {
    super("Template version is unavailable");
    this.name = "TemplateVersionUnavailableError";
  }
}
