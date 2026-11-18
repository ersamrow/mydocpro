export default function ExamLinks({ exams, footer = false }) {
  if (!exams?.length) return null;
  const heading = footer
    ? "Exam photo and signature tools"
    : "Choose your exam";
  return (
    <nav
      className={
        footer ? "exam-links exam-links-footer" : "exam-links exam-links-grid"
      }
      aria-label={heading}
    >
      <h2>{heading}</h2>
      <ul>
        {exams.map(({ slug, shortName, description }) => (
          <li key={slug}>
            <a href={"/exam-photo/" + slug}>
              {footer ? (
                shortName
              ) : (
                <>
                  <span className="exam-link-content">
                    <strong>{shortName}</strong>
                    <span>{description}</span>
                  </span>
                  <span className="exam-link-arrow" aria-hidden="true">
                    →
                  </span>
                </>
              )}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
