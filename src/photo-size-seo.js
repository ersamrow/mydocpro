import { pageSeo, siteOrigin } from "./seo.js";
import { sizePixels, sizeFaqs, faqSchema } from "./photo-sizes.js";
export function photoSizeSeo(size) {
  const base = pageSeo("resize-image");
  const pixels = sizePixels(size).join(" × ");
  const name = `Resize Photo to ${size.label} (${pixels} px) – Free`;
  const url = `${siteOrigin}/resize-image/${size.slug}`;
  const description = `Resize a photo to ${size.label}: ${pixels} pixels at 300 DPI. Centre-crop, preview, set an optional KB limit and download for free. Files stay on your device.`;
  const graph = base.schema["@graph"]
    .map((item) => {
      if (item["@type"] === "WebPage")
        return {
          ...item,
          "@id": url + "#webpage",
          url,
          name,
          description,
          breadcrumb: { "@id": url + "#breadcrumb" },
        };
      if (item["@type"] === "WebApplication") return { ...item, url, name };
      if (item["@type"] === "BreadcrumbList")
        return {
          ...item,
          "@id": url + "#breadcrumb",
          itemListElement: [
            ...item.itemListElement,
            { "@type": "ListItem", position: 3, name: size.label, item: url },
          ],
        };
      return item;
    })
    .filter((item) => item["@type"] !== "FAQPage");
  return {
    ...base,
    name,
    title: name + " | MyDocPro",
    description,
    url,
    schema: { ...base.schema, "@graph": [...graph, faqSchema(sizeFaqs(size))] },
  };
}
