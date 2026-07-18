import { useEffect } from "react";

/** Sets `document.title` for the active route (SPA SEO). */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
