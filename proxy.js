import { NextResponse } from "next/server";

function quality(ranges, type) {
  for (const candidate of [type, "text/*", "*/*"]) {
    if (ranges.has(candidate)) return ranges.get(candidate);
  }
  return 0;
}

export function proxy(request) {
  const ranges = new Map();
  for (const item of (request.headers.get("accept") || "")
    .toLowerCase()
    .split(",")) {
    const [type, ...params] = item.trim().split(/\s*;\s*/);
    const q = params.find((param) => param.startsWith("q="));
    ranges.set(type, q ? Number(q.slice(2)) : 1);
  }
  const markdown = ranges.get("text/markdown");
  const response =
    markdown > 0 && markdown >= quality(ranges, "text/html")
      ? NextResponse.rewrite(new URL("/index.md", request.url))
      : NextResponse.next();
  response.headers.set("Vary", "Accept");
  response.headers.set(
    "Link",
    '</index.md>; rel="alternate"; type="text/markdown", </llms.txt>; rel="describedby"; type="text/plain"',
  );
  return response;
}

export const config = { matcher: "/" };
