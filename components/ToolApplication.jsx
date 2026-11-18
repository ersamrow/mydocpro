import SeoHead from "./SeoHead.js";
import dynamic from "next/dynamic";
import Link from "next/link";
import { pageSeo } from "../src/seo.js";
import { tools } from "../src/tools.js";
import Home from "./Home.js";
import { Button, ToolLayout } from "./ui.js";
const InformationPage = dynamic(() => import("./InformationPage.js"));
const Workspace = dynamic(() => import("./Workspace.jsx"));
const CombinedWorkspace = dynamic(() => import("./CombinedWorkspace.js"));
const ImageStudio = dynamic(() => import("./ImageStudio.js"));

export default function ToolApplication({ id, cards, examLinks }) {
  const m = pageSeo(id),
    tool = tools.find((t) => t[0] === id);
  return (
    <>
      <SeoHead meta={m} homepage={id === ""} />
      {id === "" ? (
        <Home heading={m.name} cards={cards} examLinks={examLinks} />
      ) : tool ? (
        id === "image-editor" ? (
          <ImageStudio heading={m.name} />
        ) : id === "pdf-toolkit" ? (
          <CombinedWorkspace key={id} heading={m.name} />
        ) : (
          <Workspace key={id} tool={tool} examLinks={examLinks} />
        )
      ) : m.known ? (
        <InformationPage id={id} />
      ) : (
        <ToolLayout className="workspace not-found-page">
          <span className="page-kicker">ERROR 404</span>
          <h1>Page not found</h1>
          <p>
            We couldn’t find that page. Check the address or choose a tool to
            get started.
          </p>
          <Button as={Link} variant="primary" href="/">
            Browse all tools <span aria-hidden="true">→</span>
          </Button>
        </ToolLayout>
      )}
    </>
  );
}
