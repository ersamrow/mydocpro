import { siteOrigin } from "./seo.js";

export function examSeo(exam) {
  const url = `${siteOrigin}/exam-photo/${exam.slug}`;
  const breadcrumbs = [
    { name: "Home", path: "/" },
    { name: "Exam Photo", path: "/exam-photo" },
    { name: exam.shortName, path: `/exam-photo/${exam.slug}` },
  ];
  return {
    name: exam.h1,
    title: exam.title,
    description: exam.metaDescription,
    robots: "index,follow,max-image-preview:large",
    known: true,
    url,
    breadcrumbs,
    schema: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebApplication",
          "@id": url + "#resizer",
          url,
          name: exam.h1,
          description: exam.metaDescription,
          applicationCategory: "MultimediaApplication",
          operatingSystem: "Any",
          isAccessibleForFree: true,
          offers: { "@type": "Offer", price: 0, priceCurrency: "INR" },
        },
        {
          "@type": "BreadcrumbList",
          "@id": url + "#breadcrumb",
          itemListElement: breadcrumbs.map(({ name, path }, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name,
            item: siteOrigin + path,
          })),
        },
        {
          "@type": "FAQPage",
          "@id": url + "#faq",
          url,
          about: { "@id": url + "#resizer" },
          breadcrumb: { "@id": url + "#breadcrumb" },
          mainEntity: exam.faqs.map(({ question, answer }) => ({
            "@type": "Question",
            name: question,
            acceptedAnswer: { "@type": "Answer", text: answer },
          })),
        },
      ],
    },
  };
}
