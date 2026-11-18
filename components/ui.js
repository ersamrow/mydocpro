import { forwardRef } from "react";

const classes = (...values) => values.filter(Boolean).join(" ");

// Native elements stay native: links keep href/download and buttons keep type,
// disabled, keyboard behavior and form semantics.
export const Button = forwardRef(function Button(
  { as: Element = "button", variant, className = "", type, ...props },
  ref,
) {
  const appearance =
    variant ||
    (/(^|\s)(primary|merge-bar-download)(\s|$)/.test(className)
      ? "primary"
      : "secondary");
  return (
    <Element
      ref={ref}
      type={Element === "button" ? type || "button" : undefined}
      className={classes(
        "ui-button",
        `ui-button--${appearance}`,
        appearance === "primary" ? "primary" : "secondary",
        className,
      )}
      {...props}
    />
  );
});

export const Card = forwardRef(function Card(
  { as: Element = "section", variant, className, ...props },
  ref,
) {
  return (
    <Element
      ref={ref}
      className={classes(
        "ui-card",
        variant && `ui-card--${variant}`,
        className,
      )}
      {...props}
    />
  );
});

export const ToolLayout = forwardRef(function ToolLayout(
  { as: Element = "main", className, ...props },
  ref,
) {
  return (
    <Element
      ref={ref}
      className={classes("ui-tool-layout", className)}
      {...props}
    />
  );
});

export const ActionBar = forwardRef(function ActionBar(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={classes("ui-action-bar", "process-actions", className)}
      {...props}
    />
  );
});

export const FileRow = forwardRef(function FileRow(
  { as: Element = "li", className, ...props },
  ref,
) {
  return (
    <Element
      ref={ref}
      className={classes("ui-file-row", className)}
      {...props}
    />
  );
});
