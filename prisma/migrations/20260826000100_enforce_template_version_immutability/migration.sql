-- PreventMutation
CREATE FUNCTION "public"."prevent_template_version_mutation"()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'TemplateVersion is immutable';
END;
$$ LANGUAGE plpgsql;

-- PreventMutation
CREATE TRIGGER "TemplateVersion_prevent_update"
BEFORE UPDATE ON "public"."TemplateVersion"
FOR EACH ROW EXECUTE FUNCTION "public"."prevent_template_version_mutation"();

-- PreventMutation
CREATE TRIGGER "TemplateVersion_prevent_delete"
BEFORE DELETE ON "public"."TemplateVersion"
FOR EACH ROW EXECUTE FUNCTION "public"."prevent_template_version_mutation"();
