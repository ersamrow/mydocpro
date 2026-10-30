import ToolApplication from "../components/ToolApplication.js";
import { routeIds } from "../src/routes.js";
export default ToolApplication;
export function getStaticPaths() {
  return {
    paths: routeIds.map((id) => ({ params: { slug: id ? [id] : [] } })),
    fallback: false,
  };
}
export function getStaticProps({ params }) {
  return { props: { id: (params.slug || []).join("/") } };
}
