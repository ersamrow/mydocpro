import { tools } from "./tools.js";
import { sitePages } from "./site-content.js";
import { exams } from "./data/exams.js";
import { examSeo } from "./exam-seo.js";
import { pageSeo } from "./seo.js";
import { photoSizes } from "./photo-sizes.js";
import { photoSizeSeo } from "./photo-size-seo.js";

export const standardRouteIds = [
  "",
  ...tools.map((t) => t[0]),
  ...Object.keys(sitePages),
];
const documentLabels = {
  photo: "Photo",
  signature: "Signature",
  impressions: "Hand impressions",
  thumb: "Thumb impression",
  declaration: "Declaration",
  certificate: "Travel certificate",
};
export const examLinks = exams.map(({ slug, shortName, documents }) => ({
  slug,
  shortName,
  description: documents
    .map(({ type, label }) => documentLabels[type] || label)
    .join(" · "),
}));
export const routeIds = [
  ...standardRouteIds,
  ...examLinks.map(({ slug }) => "exam-photo/" + slug),
  ...photoSizes.map(({ slug }) => "resize-image/" + slug),
  "cm-to-pixels",
];

export function publicPageSeo(id) {
  const size = photoSizes.find(({ slug }) => id === "resize-image/" + slug);
  if (size) return photoSizeSeo(size);
  const exam = exams.find(({ slug }) => id === "exam-photo/" + slug);
  return exam ? examSeo(exam) : pageSeo(id);
}
