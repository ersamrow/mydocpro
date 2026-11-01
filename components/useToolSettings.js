import { useCallback, useEffect, useRef, useState } from "react";
import { defaults, fields } from "../src/tool-settings.js";
const prefix = "mydocpro:preferences:";
function safePreferences(id, raw) {
  const result = {};
  for (const f of fields(id)) {
    const v = raw?.[f.id];
    if (typeof v !== "string") continue;
    if (f.options?.some(([value]) => value === v)) result[f.id] = v;
    else if (
      ["number", "range"].includes(f.type) &&
      v.trim() &&
      Number.isFinite(+v) &&
      +v >= f.min &&
      +v <= f.max
    )
      result[f.id] = v;
  }
  return result;
}
export default function useToolSettings(id, onEdit) {
  const [values, setValuesState] = useState(() => defaults(id)),
    [remember, setRemember] = useState(false),
    [loaded, setLoaded] = useState(false),
    [canUndo, setCanUndo] = useState(false),
    [storageNote, setStorageNote] = useState("");
  const current = useRef(values),
    history = useRef([]),
    lastEdit = useRef(0),
    editRef = useRef(onEdit);
  editRef.current = onEdit;
  const setValues = useCallback((update) => {
    const next =
      typeof update === "function" ? update(current.current) : update;
    current.current = next;
    setValuesState(next);
  }, []);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(prefix + id) || "null");
      if (saved) {
        setValues((v) => ({ ...v, ...safePreferences(id, saved) }));
        setRemember(true);
      }
    } catch {
      setStorageNote("Saved preferences could not be loaded.");
    }
    setLoaded(true);
  }, [id, setValues]);
  useEffect(() => {
    if (!loaded) return;
    try {
      if (remember)
        localStorage.setItem(
          prefix + id,
          JSON.stringify(safePreferences(id, values)),
        );
      else localStorage.removeItem(prefix + id);
    } catch {
      setStorageNote(
        "Browser storage is unavailable; changes apply only to this session.",
      );
    }
  }, [id, values, remember, loaded]);
  const onValues = useCallback(
    (patch) => {
      const next = { ...current.current, ...patch };
      if (JSON.stringify(next) === JSON.stringify(current.current)) return;
      const now = Date.now();
      if (now - lastEdit.current > 600 || !history.current.length) {
        history.current.push(current.current);
        history.current = history.current.slice(-30);
      }
      lastEdit.current = now;
      setCanUndo(true);
      setValues(next);
      editRef.current();
    },
    [setValues],
  );
  const undo = () => {
    const previous = history.current.pop();
    if (previous) {
      setValues(previous);
      setCanUndo(history.current.length > 0);
      lastEdit.current = 0;
      editRef.current();
    }
  };
  const reset = () => {
    history.current.push(current.current);
    setCanUndo(true);
    lastEdit.current = 0;
    setValues({
      ...defaults(id),
      ...(id === "name-date"
        ? { date: new Date().toISOString().slice(0, 10) }
        : {}),
    });
    setRemember(false);
    editRef.current();
    setStorageNote(
      "Defaults restored; saved preferences for this tool cleared.",
    );
  };
  return {
    values,
    setValues,
    onValues,
    remember,
    setRemember,
    canUndo,
    undo,
    reset,
    storageNote,
  };
}
