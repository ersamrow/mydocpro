import ToolApplication from "../components/ToolApplication.jsx";
import { examLinks } from "../src/routes.js";
export function getStaticProps() {
  return { props: { id: "404", examLinks } };
}
export default function NotFound() {
  return <ToolApplication id="404" />;
}
