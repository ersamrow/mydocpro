import ExamLanding from "../../components/ExamLanding.js";
import { exams } from "../../src/data/exams.js";
import { examLinks } from "../../src/routes.js";

export default function ExamPage({ exam, examLinks }) {
  return (
    <ExamLanding
      key={exam.slug}
      exam={exam}
      relatedExams={examLinks.filter(({ slug }) => slug !== exam.slug)}
    />
  );
}

export function getStaticPaths() {
  return {
    paths: exams.map(({ slug }) => ({ params: { slug } })),
    fallback: false,
  };
}

export function getStaticProps({ params }) {
  const exam = exams.find(({ slug }) => slug === params.slug);
  if (!exam) return { notFound: true };
  return { props: { id: "exam-photo/" + exam.slug, exam, examLinks } };
}
