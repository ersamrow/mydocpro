// One FAQ look everywhere: each question is a row that expands to its answer.
// Answers stay in the HTML (collapsed with <details>) for search engines and
// assistive technology, while readers scan the questions without scrolling.
export function FaqItem({ question, level = 3, open = false, children }) {
  const Heading = `h${level}`;
  return (
    <details className="faq-item" open={open || undefined}>
      <summary>
        <Heading className="faq-question">{question}</Heading>
      </summary>
      <div className="faq-answer">{children}</div>
    </details>
  );
}

// items: [[question, answer], ...]
export default function FaqList({ items, level = 3, openFirst = false }) {
  return (
    <div className="faq-list">
      {items.map(([question, answer], index) => (
        <FaqItem
          key={question}
          question={question}
          level={level}
          open={openFirst && index === 0}
        >
          <p>{answer}</p>
        </FaqItem>
      ))}
    </div>
  );
}
