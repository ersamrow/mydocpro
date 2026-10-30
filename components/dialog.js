import { useEffect, useRef } from "react";

// Native dialogs report clicks on both the backdrop and their own padding.
export function isBackdropClick(event) {
  if (event.target !== event.currentTarget) return false;
  const rect = event.currentTarget.getBoundingClientRect();
  return (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  );
}

// Conditionally rendered dialogs are removed before native focus restoration.
export function useDialogFocus(ref) {
  const opener = useRef(null);
  useEffect(() => {
    if (!opener.current) opener.current = document.activeElement;
    const dialog = ref.current;
    return () => {
      requestAnimationFrame(() => {
        if (!dialog?.isConnected && opener.current?.isConnected)
          opener.current.focus({ preventScroll: true });
      });
    };
  }, [ref]);
}
