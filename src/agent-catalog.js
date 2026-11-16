import { tools } from "./tools.js";
import { siteOrigin } from "./seo.js";

export const catalogTool = {
  name: "list_document_tools",
  description: "List MyDocPro image and PDF tools with descriptions and links.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
};

export function listDocumentTools() {
  return tools.map(([id, name, description]) => ({
    name,
    description,
    url: siteOrigin + "/" + id,
  }));
}
