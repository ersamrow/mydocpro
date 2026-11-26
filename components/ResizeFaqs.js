export default function ResizeFaqs({ faqs, showHeading = true }) {
  return (
    <section aria-label="Frequently asked questions">
      {showHeading && <h2>Frequently asked questions</h2>}
      {faqs.map(([question, answer]) => (
        <div key={question}>
          <h3>{question}</h3>
          <p>{answer}</p>
        </div>
      ))}
    </section>
  );
}
