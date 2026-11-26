// One accordion for guides, FAQs and long reference text. The content stays in
// the page (collapsed with <details>), so it is still readable by search
// engines and assistive technology while users scroll less.
export default function Disclosure({
  title,
  hint,
  open = false,
  id,
  className = "",
  children,
}) {
  return (
    <details
      id={id}
      className={`ds-disclosure ${className}`.trim()}
      open={open || undefined}
    >
      <summary>
        <h2 className="ds-disclosure-title">{title}</h2>
        {hint && <span className="ds-disclosure-hint">{hint}</span>}
      </summary>
      <div className="ds-disclosure-body">{children}</div>
    </details>
  );
}
