import { useEffect } from "react";

const DEFAULT_TITLE = "GPSC Track — Previous Year Questions in Gujarati";
const SUFFIX = " · GPSC Track";

/**
 * Sets document.title for the current route. Restores default on unmount.
 *
 * Usage:
 *   usePageTitle("Practice");
 *   usePageTitle("Question 5", { suffix: false });
 */
export default function usePageTitle(title, opts = {}) {
  useEffect(() => {
    if (!title) {
      document.title = DEFAULT_TITLE;
      return;
    }
    document.title = opts.suffix === false ? title : `${title}${SUFFIX}`;
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [title, opts.suffix]);
}
