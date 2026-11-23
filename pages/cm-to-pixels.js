import CmToPixels from "../components/CmToPixels.js";
import SeoHead from "../components/SeoHead.js";
import { pageSeo } from "../src/seo.js";
import { examLinks } from "../src/routes.js";
export default function CalculatorPage() {
  return (
    <>
      <SeoHead meta={pageSeo("cm-to-pixels")} />
      <CmToPixels />
    </>
  );
}
export function getStaticProps() {
  return { props: { id: "cm-to-pixels", examLinks } };
}
