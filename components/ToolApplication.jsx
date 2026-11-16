import Head from "next/head";
import dynamic from "next/dynamic";
import Link from "next/link";
import { pageSeo, siteOrigin } from "../src/seo.js";
import { tools } from "../src/tools.js";
import Home from "./Home.js";
const InformationPage = dynamic(() => import("./InformationPage.js"));
const Workspace = dynamic(() => import("./Workspace.jsx"));
const CombinedWorkspace = dynamic(() => import("./CombinedWorkspace.js"));
const ImageStudio = dynamic(() => import("./ImageStudio.js"));

export default function ToolApplication({ id }) {
  const m = pageSeo(id),
    tool = tools.find((t) => t[0] === id);
  return (
    <>
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <title>{m.title}</title>
        {id === "" && (
          <meta
            name="msvalidate.01"
            content="4334342A88314D32DC60BD48D38750D5"
          />
        )}
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
        <Home heading={m.name} />
      ) : tool ? (
        id === "image-editor" ? (
          <ImageStudio heading={m.name} />
        ) : id === "pdf-toolkit" ? (
          <CombinedWorkspace key={id} heading={m.name} />
        ) : (
          <Workspace key={id} tool={tool} />
        )
      ) : m.known ? (
        <InformationPage id={id} />
      ) : (
        <main className="workspace not-found-page">
          <span className="page-kicker">ERROR 404</span>
          <h1>Page not found</h1>
          <p>
            We couldn’t find that page. Check the address or choose a tool to
            get started.
          </p>
          <Link className="primary" href="/">
            Browse all tools <span aria-hidden="true">→</span>
          </Link>
        </main>
      )}
    </>
  );
}
