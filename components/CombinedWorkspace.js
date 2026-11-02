import { useState } from "react";
import Link from "next/link";
import Workspace from "./Workspace.js";
import PdfWorkbench from "./PdfWorkbench.js";
import { Icon } from "./Shared.js";
import { tools } from "../src/tools.js";
import { multiTools, pdfTools } from "../src/tool-settings.js";

export default function CombinedWorkspace({ tool }) {
  const operations = [
    "merge-pdf",
    "split-pdf",
    "organize-pdf",
    "compress-pdf",
    "jpg-to-pdf",
    "pdf-to-image",
  ].map((id) => tools.find((t) => t[0] === id));
  const descriptions = {
    "merge-pdf": "Combine multiple PDFs",
    "split-pdf": "Extract selected pages",
    "organize-pdf": "Reorder, rotate or remove",
    "compress-pdf": "Reduce scanned file size",
    "jpg-to-pdf": "Create a PDF from photos",
    "pdf-to-image": "Save pages as images",
  };
  operations.unshift(["pdf-workbench", "Edit pages", "", "pdf", "layers"]);
  descriptions["pdf-workbench"] = "Select, move & rotate across PDFs";
  const [selected, setSelected] = useState("pdf-workbench");
  const [files, setFiles] = useState([]);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState("");
  function switchOperation(next) {
    if (working || next === selected) return;
    const acceptsPdf = (id) => id === "pdf-workbench" || pdfTools.includes(id);
    const compatible = acceptsPdf(next) === acceptsPdf(selected);
    const retained = compatible
      ? next === "pdf-workbench" || multiTools.includes(next)
        ? files
        : files.slice(0, 1)
      : [];
    setNotice(
      !compatible && files.length
        ? "This operation needs a different file type. Choose new files below."
        : retained.length < files.length
          ? "This operation uses one file. The first uploaded file has been kept."
          : files.length
            ? "Your source files have been kept. Settings and results reset when you switch operations."
            : "",
    );
    setFiles(retained);
    setSelected(next);
  }
  return (
    <main className="workspace combined-workspace pdf-toolkit">
      <div className="tool-heading">
        <Link className="back" href="/">
          ← All tools
        </Link>

        <h1>{tool[1]}</h1>
        <p className="intro">
          Choose a task, add your files, and download the result. Your documents
          stay on your device.
        </p>
      </div>
      <section className="combined-start" aria-label="PDF tasks">
        <h2>What would you like to do?</h2>
        <div
          className="pdf-task-grid"
          role="group"
          aria-label="Choose a PDF task"
        >
          {operations.map((item) => (
            <button
              key={item[0]}
              type="button"
              aria-pressed={selected === item[0]}
              disabled={working}
              onClick={() => switchOperation(item[0])}
            >
              <Icon name={item[4]} />
              <span>
                <strong>{item[1]}</strong>
                <small>{descriptions[item[0]]}</small>
              </span>
              {selected === item[0] && (
                <span className="pdf-selected" aria-hidden="true">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="pdf-task-help">
          <span>
            {files.length
              ? `${files.length} source ${files.length === 1 ? "file" : "files"} ready`
              : "Start by choosing a task above."}
          </span>
          <details>
            <summary>Switching tasks</summary>
            <p>
              Compatible source files stay available. Single-file tasks keep the
              first file. Download results before switching: settings and
              results reset. To edit a result, upload the downloaded file.
            </p>
          </details>
        </div>
        <p role="status">
          {working
            ? "Processing your files. Task switching will be available when finished."
            : notice}
        </p>
      </section>
      {selected === "pdf-workbench" ? (
        <PdfWorkbench
          files={files}
          onFilesChange={setFiles}
          onWorkingChange={setWorking}
        />
      ) : (
        <Workspace
          key={selected}
          tool={operations.find((item) => item[0] === selected)}
          embedded
          initialFiles={files}
          onFilesChange={setFiles}
          onWorkingChange={setWorking}
        />
      )}
    </main>
  );
}
