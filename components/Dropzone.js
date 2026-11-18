import { useId, useState } from "react";
import { Upload } from "lucide-react";
import styles from "./Dropzone.module.css";

export default function Dropzone({
  id,
  inputRef,
  hidden = false,
  disabled = false,
  accept,
  multiple = false,
  onFiles,
  title = "Choose files or drop them here",
  hint,
  buttonLabel = "Choose files",
  className = "",
}) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const hintId = `${inputId}-hint`;
  const [dragging, setDragging] = useState(false);

  return (
    <label
      className={`shared-dropzone ${styles.zone} ${dragging ? styles.dragging : ""} ${className}`}
      htmlFor={inputId}
      hidden={hidden}
      aria-disabled={disabled}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (!disabled && event.dataTransfer.files.length) {
          onFiles(Array.from(event.dataTransfer.files));
        }
      }}
    >
      <Upload className={styles.icon} aria-hidden="true" />
      <span className={styles.copy}>
        <strong className="dropzone-desktop-title">{title}</strong>
        <strong className="dropzone-touch-title">
          {accept?.includes("image") ? "Choose images" : "Choose PDFs"}
        </strong>
        {hint && <span id={hintId}>{hint}</span>}
      </span>
      <input
        ref={inputRef}
        id={inputId}
        className={styles.input}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        aria-label={buttonLabel}
        aria-describedby={hint ? hintId : undefined}
        onChange={(event) => {
          const files = Array.from(event.target.files || []);
          event.target.value = "";
          if (!disabled && files.length) onFiles(files);
        }}
      />
      <span className={styles.button} aria-hidden="true">
        {buttonLabel} <span>＋</span>
      </span>
    </label>
  );
}
