import { useEffect } from "react";

/**
 * Warns the user before navigating away when there are unsaved changes.
 * Pass `isDirty = true` when the form has been modified.
 */
export function useBeforeUnload(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;

    function handler(e: BeforeUnloadEvent) {
      e.preventDefault();
    }

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);
}
