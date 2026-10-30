import Head from "next/head";
import Link from "next/link";
import { pageSeo, siteOrigin } from "../src/seo.js";
import { sitePages } from "../src/site-content.js";
import { tools } from "../src/tools.js";
import { pageBodies } from "./ContentPages.js";
import { Breadcrumb } from "./Shared.js";
import Home from "./Home.js";
import Workspace from "./Workspace.js";
export default function ToolApplication({ id }) {
  const m = pageSeo(id),
    tool = tools.find((t) => t[0] === id),
    Content = pageBodies[id];
  return (
    <>
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <title>{m.title}</title>
        <meta name="description" content={m.description} />
        <meta name="robots" content={m.robots} />
        <link rel="canonical" href={m.url} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="MyDocPro" />
        <meta property="og:title" content={m.title} />
        <meta property="og:description" content={m.description} />
        <meta property="og:url" content={m.url} />
        <meta
          property="og:image"
          content={siteOrigin + "/brand/mydocpro-1024.png"}
        />
        <meta property="og:image:alt" content="MyDocPro image and PDF tools" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={m.title} />
        <meta name="twitter:description" content={m.description} />
        <meta
          name="twitter:image"
          content={siteOrigin + "/brand/mydocpro-1024.png"}
        />
        {m.known && (
          <script
            id="site-schema"
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(m.schema).replaceAll("<", "\\u003c"),
            }}
          />
        )}
      </Head>
      {id === "" ? (
        <Home />
      ) : tool ? (
        <Workspace key={id} tool={tool} />
      ) : Content ? (
        <main className="workspace privacy-page">
          <Breadcrumb title={sitePages[id].title} />
          <h1>{sitePages[id].title}</h1>
          <Content />
        </main>
      ) : (
        <main className="workspace">
          <h1>Page not found</h1>
          <p>
            Check the address or <Link href="/">browse all tools</Link>.
          </p>
        </main>
      )}
    </>
  );
}
