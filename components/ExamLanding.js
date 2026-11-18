import { Fragment } from "react";
import { examSeo } from "../src/exam-seo.js";
import {
  formatExamDimensions,
  formatExamFileRange,
} from "../src/exam-requirements.js";
import ExamDocumentTool from "./ExamDocumentTool.js";
import SeoHead from "./SeoHead.js";
import TrustBadges from "./TrustBadges.js";
import WhatsAppChannel from "./WhatsAppChannel.js";
import styles from "./ExamLanding.module.css";

const relatedTools = [
  ["/compress-image", "Compress an image"],
  ["/signature", "Clean up a signature"],
  ["/white-background", "Whiten a light photo background"],
  ["/name-date", "Add a name and date"],
];

const checkedMonth = new Intl.DateTimeFormat("en-IN", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function Requirements({ exam }) {
  return (
    <section aria-labelledby="requirements-title">
      <h2 id="requirements-title">{exam.shortName} document requirements</h2>
      <div className={styles.tableFrame}>
        <table className={styles.table} aria-labelledby="requirements-title">
          <thead>
            <tr>
              {[
                "Document",
                "Format",
                "File size",
                "Dimensions",
                "Key rules",
              ].map((label) => (
                <th key={label} scope="col">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {exam.documents.map((doc) => (
              <tr key={doc.type}>
                <th scope="row">{doc.label}</th>
                <td>
                  <span className={styles.cellLabel} aria-hidden="true">
                    Format
                  </span>
                  {doc.format}
                </td>
                <td>
                  <span className={styles.cellLabel} aria-hidden="true">
                    File size
                  </span>
                  <div>
                    {formatExamFileRange(doc)}
                    {doc.rangeNote && <div>{doc.rangeNote}</div>}
                  </div>
                </td>
                <td>
                  <span className={styles.cellLabel} aria-hidden="true">
                    Dimensions
                  </span>
                  <div>
                    {formatExamDimensions(doc).map((line) => (
                      <div key={line}>{line}</div>
                    ))}
                  </div>
                </td>
                <td>
                  <span className={styles.cellLabel} aria-hidden="true">
                    Key rules
                  </span>
                  <ul>
                    {doc.rules.map((rule) => (
                      <li key={rule}>{rule}</li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {exam.notes?.map((note) => (
        <p key={note}>{note}</p>
      ))}
    </section>
  );
}

export default function ExamLanding({ exam, relatedExams }) {
  const meta = examSeo(exam);
  const { shortName, livePhoto } = exam;
  return (
    <>
      <SeoHead meta={meta} />
      <main className={`workspace tool-workspace ${styles.page}`}>
        <div className="tool-heading">
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            {meta.breadcrumbs.map(({ name, path }, i) => (
              <Fragment key={path}>
                {i > 0 && <span aria-hidden="true">›</span>}
                {i === meta.breadcrumbs.length - 1 ? (
                  <span aria-current="page">{name}</span>
                ) : (
                  <a href={path}>{name}</a>
                )}
              </Fragment>
            ))}
          </nav>
          <h1>{exam.h1}</h1>
          <p className="intro">{exam.intro}</p>
          <TrustBadges toolId="exam-photo" />
        </div>

        <ExamDocumentTool key={exam.slug} exam={exam} />

        <article className={styles.guide}>
          <section className={styles.live} aria-labelledby="live-photo-title">
            <h2 id="live-photo-title">
              {livePhoto.required
                ? `Photo is captured live in the ${shortName} portal`
                : `${shortName} photo capture`}
            </h2>
            <p>{livePhoto.note}</p>
            {livePhoto.tips?.length > 0 && (
              <ul>
                {livePhoto.tips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            )}
          </section>

          <Requirements exam={exam} />
          <WhatsAppChannel />

          <section>
            <h2>How to resize for {shortName}</h2>
            <ol>
              {exam.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>
          <section>
            <h2>Common rejection reasons</h2>
            <ul>
              {exam.rejectionReasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </section>
          <section id="faq" className={styles.faq}>
            <h2>Frequently asked questions</h2>
            <dl>
              {exam.faqs.map(({ question, answer }) => (
                <Fragment key={question}>
                  <dt>{question}</dt>
                  <dd>{answer}</dd>
                </Fragment>
              ))}
            </dl>
          </section>
          <section className={styles.sources} aria-labelledby="sources-title">
            <h2 id="sources-title">Official requirements</h2>
            <p>
              Requirements last checked:{" "}
              <time dateTime={exam.lastVerified}>
                {checkedMonth.format(
                  new Date(exam.lastVerified + "-01T00:00:00Z"),
                )}
              </time>
              . Always confirm with the official notification on{" "}
              <a href={exam.officialSite} rel="nofollow noopener">
                {new URL(exam.officialSite).hostname}
              </a>
              .
            </p>
            {exam.sources?.length > 0 && (
              <ul>
                {exam.sources.map(({ label, url }) => (
                  <li key={url}>
                    <a href={url} rel="nofollow noopener">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className={styles.related} aria-labelledby="related-title">
            <h2 id="related-title">Related exams and tools</h2>
            <ul>
              {relatedExams.map(({ slug, shortName: name }) => (
                <li key={slug}>
                  <a href={`/exam-photo/${slug}`}>{name}</a>
                </li>
              ))}
            </ul>
            <ul>
              {relatedTools.map(([href, name]) => (
                <li key={href}>
                  <a href={href}>{name}</a>
                </li>
              ))}
            </ul>
          </section>
        </article>
      </main>
    </>
  );
}
