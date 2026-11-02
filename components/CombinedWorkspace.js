import { useState } from "react";
import Link from "next/link";
import Workspace from "./Workspace.js";
import { tools } from "../src/tools.js";
import { multiTools, pdfTools } from "../src/tool-settings.js";

export default function CombinedWorkspace({ tool }) {
  const isImage = tool[0] === "image-editor";
  const operations = tools.filter(
    (item) =>
      !["image-editor", "pdf-toolkit"].includes(item[0]) &&
      (isImage ? item[3] !== "pdf" : item[3] === "pdf"),
  );
  const [selected, setSelected] = useState(
    isImage ? "crop-image" : "merge-pdf",
  );
  const [files, setFiles] = useState([]);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState("");
  function switchOperation(event) {
    const next = event.target.value;
    if (working || next === selected) return;
    const compatible = pdfTools.includes(next) === pdfTools.includes(selected);
    const retained = compatible
      ? multiTools.includes(next)
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
    <main className="workspace combined-workspace">
      <header className="tool-heading">
        <Link className="back" href="/">
          ← All tools
        </Link>
        <span className="eyebrow">ALL-IN-ONE WORKSPACE</span>
        <h1>{tool[1]}</h1>
        <p className="intro">{tool[2]} Files stay on your device.</p>
      </header>
      <section className="combined-start" aria-label="Start a task">
        <h2>Start a task</h2>
        <p>
          Choose an operation, upload{" "}
          {isImage
            ? "JPG, PNG or WebP images"
            : "PDFs (or images for Image to PDF)"}
          , adjust the settings, then download your result.
        </p>
        <label htmlFor="combined-operation">What would you like to do?</label>
        <select
          id="combined-operation"
          value={selected}
          onChange={switchOperation}
          disabled={working}
          aria-describedby="operation-help"
        >
          {operations.map((item) => (
            <option key={item[0]} value={item[0]}>
              {item[1]}
            </option>
          ))}
        </select>
        <p id="operation-help">
          Switching operations keeps compatible source files and resets settings
          and results. Download your result before switching; upload it again to
          apply another edit.
        </p>
        <p role="status">
          {working
            ? "Finish or cancel the current task before switching operations."
            : notice}
        </p>
      </section>
      <Workspace
        key={selected}
        tool={operations.find((item) => item[0] === selected)}
        embedded
        initialFiles={files}
        onFilesChange={setFiles}
        onWorkingChange={setWorking}
      />
    </main>
  );
}
