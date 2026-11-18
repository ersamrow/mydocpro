import Head from "next/head";
import { siteOrigin } from "../src/seo.js";

export default function SeoHead({ meta, homepage = false }) {
  return (
    <Head>
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1, viewport-fit=cover"
      />
      <title>{meta.title}</title>
      {homepage && (
        <meta name="msvalidate.01" content="4334342A88314D32DC60BD48D38750D5" />
      )}
      <meta name="description" content={meta.description} />
      <meta name="robots" content={meta.robots} />
      <link rel="canonical" href={meta.url} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="MyDocPro" />
      <meta property="og:title" content={meta.title} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:url" content={meta.url} />
      <meta
        property="og:image"
        content={siteOrigin + "/brand/mydocpro-1024.png"}
      />
      <meta property="og:image:alt" content="MyDocPro image and PDF tools" />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={meta.title} />
      <meta name="twitter:description" content={meta.description} />
      <meta
        name="twitter:image"
        content={siteOrigin + "/brand/mydocpro-1024.png"}
      />
      {meta.known && (
        <script
          id="site-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(meta.schema).replaceAll("<", "\\u003c"),
          }}
        />
      )}
    </Head>
  );
}
