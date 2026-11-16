import ToolApplication from "../components/ToolApplication.jsx";
import { renderToStaticMarkup } from "react-dom/server";
import { ToolCard } from "../components/ToolCards.js";
import { tools } from "../src/tools.js";
import { routeIds } from "../src/routes.js";
export default ToolApplication;
export function getStaticPaths() {
  return {
    paths: routeIds.map((id) => ({ params: { slug: id ? [id] : [] } })),
    fallback: false,
  };
}
export function getStaticProps({ params }) {
  const id = (params.slug || []).join("/");
  if (id) return { props: { id } };
  const cards = Object.fromEntries(
    tools.map((tool) => [
      tool[0],
      renderToStaticMarkup(<ToolCard tool={tool} />),
    ]),
  );
  return { props: { id, cards } };
}
