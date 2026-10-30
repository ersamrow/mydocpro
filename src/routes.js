import { tools } from "./tools.js";
import { sitePages } from "./site-content.js";
export const routeIds = [
  "",
  ...tools.map((t) => t[0]),
  ...Object.keys(sitePages),
];
