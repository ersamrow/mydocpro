import { useEffect, useRef, useState } from "react";
import { Card } from "./ui.js";
import Dropzone from "./Dropzone.js";
import {
  formatExamDimensions,
  formatExamFileRange,
} from "../src/exam-requirements.js";
import {
  checkDocument,
  inspectForExam,
  verdict,
} from "../src/exam-validation.js";

const icons = { pass: "✓", warn: "!", fail: "✕" };
const words = { pass: "Ready", warn: "Check", fail: "Needs fixing" };

function Row({ doc, result, onResult }) {
  const [busy, setBusy] = useState(false),
    [problem, setProblem] = useState("");
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  async function choose([file]) {
    if (!file) return;
    setBusy(true);
    setProblem("");
    try {
      if (file.size > 100 * 1048576) throw Error("Please use a file under 100 MB.");
      const info = await inspectForExam(file);
      if (!alive.current) return;
      const checks = checkDocument(doc, info);
      onResult(doc.type, { name: file.name, checks, verdict: verdict(checks) });
    } catch (error) {
      if (!alive.current) return;
      onResult(doc.type, null);
      setProblem(error.message || "This file could not be checked.");
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  const spec = [
    doc.format,
    formatExamFileRange(doc),
    ...formatExamDimensions(doc).filter((line) => line !== "See official notice"),
  ].join(" · ");
  return (
    <li className={`ec-row ec-${result?.verdict || "idle"}`}>
      <div className="ec-head">
        <span className="ec-badge" aria-hidden="true">
          {result ? icons[result.verdict] : "–"}
        </span>
        <div>
          <h3>{doc.label}</h3>
          <p className="ec-spec">{spec}</p>
        </div>
        <span className="ec-state">
          {result ? words[result.verdict] : "Not checked"}
        </span>
      </div>
      <Dropzone
        accept={doc.format === "PDF" ? "application/pdf,.pdf" : "image/*"}
        onFiles={choose}
        disabled={busy}
        title={result ? `Check another file for ${doc.label}` : `Drop your ${doc.label.toLowerCase()} file here`}
        buttonLabel={`Choose ${doc.label.toLowerCase()} file`}
        className="ec-drop"
      />
      <div role="status" aria-live="polite">
        {busy && <p className="ec-note">Checking…</p>}
        {problem && <p className="ec-problem">{problem}</p>}
        {result && (
          <>
            <p className="ec-file">{result.name}</p>
            <ul className="ec-checks">
              {result.checks.map((check) => (
                <li key={check.id} className={`ec-${check.status}`}>
                  <span aria-hidden="true">{icons[check.status]}</span>
                  <span>
                    <strong>{check.label}: </strong>
                    {check.detail}
                  </span>
                </li>
              ))}
            </ul>
            {result.verdict === "fail" && (
              <p className="ec-fix">
                <a href="#exam-prepare">
                  Fix it with the {doc.label.toLowerCase()} preset above
                </a>
              </p>
            )}
          </>
        )}
      </div>
    </li>
  );
}

export default function ExamChecker({ exam }) {
  const [results, setResults] = useState({});
  const onResult = (type, value) =>
    setResults((all) => ({ ...all, [type]: value }));
  const checked = exam.documents.filter((doc) => results[doc.type]);
  const ready = checked.filter((doc) => results[doc.type].verdict !== "fail");
  return (
    <Card as="section" className="ec-card" aria-labelledby="ec-title">
      <h2 id="ec-title">Check your {exam.shortName} files</h2>
      <p>
        Already have files? Add each one to see whether it meets the{" "}
        {exam.shortName} requirements. Files are checked in your browser and are
        not uploaded.
      </p>
      <p className="ec-summary" role="status">
        {checked.length
          ? `${ready.length} of ${exam.documents.length} documents ready` +
            (checked.length < exam.documents.length
              ? ` · ${exam.documents.length - checked.length} not checked yet`
              : "")
          : `${exam.documents.length} documents to check`}
      </p>
      <ul className="ec-list">
        {exam.documents.map((doc) => (
          <Row
            key={doc.type}
            doc={doc}
            result={results[doc.type]}
            onResult={onResult}
          />
        ))}
      </ul>
      <p className="ec-disclaimer">
        This compares files with the requirements MyDocPro last verified. Always
        confirm the current notice on the official site before submitting.
      </p>
    </Card>
  );
}
