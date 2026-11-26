import FaqList from "./FaqList.js";
export default function ResizeFaqs({ faqs, showHeading = true }) {
  return (
    <section aria-label="Frequently asked questions">
      {showHeading && <h2>Frequently asked questions</h2>}
      <FaqList items={faqs} />
    </section>
  );
}
