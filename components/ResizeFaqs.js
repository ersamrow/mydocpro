export default function ResizeFaqs({ faqs }) {
  return (
    <section aria-label="Frequently asked questions">
      <h2>Frequently asked questions</h2>
      {faqs.map(([question, answer]) => (
        <div key={question}>
          <h3>{question}</h3>
          <p>{answer}</p>
        </div>
      ))}
    </section>
  );
}
