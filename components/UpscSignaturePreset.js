import { exams } from "../src/data/exams.js";
import ExamDocumentTool from "./ExamDocumentTool.js";

const upsc = exams.find((exam) => exam.slug === "upsc");
const signaturePreset = {
  slug: upsc.slug,
  shortName: upsc.shortName,
  documents: upsc.documents.filter((doc) => doc.type === "signature"),
};

export default function UpscSignaturePreset({ initialFile, onFileChange }) {
  return (
    <ExamDocumentTool
      exam={signaturePreset}
      initialFile={initialFile}
      onFileChange={onFileChange}
    />
  );
}
