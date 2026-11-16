import card from "../../public/.well-known/mcp/server-card.json";
import { catalogTool, listDocumentTools } from "../../src/agent-catalog.js";

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }
  if (
    req.headers.origin &&
    req.headers.origin !== "https://mydocpro.co.in" &&
    req.headers.origin !== "https://www.mydocpro.co.in"
  ) {
    return res.status(403).end();
  }
  const { id, jsonrpc, method, params } = req.body || {};
  const error = (code, message, status = 200) =>
    res
      .status(status)
      .json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
  if (jsonrpc !== "2.0" || typeof method !== "string")
    return error(-32600, "Invalid request", 400);
  if (id === undefined) return res.status(202).end();
  let result;
  switch (method) {
    case "initialize":
      result = {
        protocolVersion: card.protocolVersion,
        serverInfo: card.serverInfo,
        capabilities: card.capabilities,
      };
      break;
    case "ping":
      result = {};
      break;
    case "tools/list":
      result = { tools: [catalogTool] };
      break;
    case "tools/call":
      if (
        params?.name !== catalogTool.name ||
        Object.keys(params.arguments ?? {}).length
      )
        return error(-32602, "Unknown tool or invalid arguments");
      result = {
        content: [{ type: "text", text: JSON.stringify(listDocumentTools()) }],
      };
      break;
    default:
      return error(-32601, "Method not found");
  }
  return res.json({ jsonrpc: "2.0", id, result });
}
