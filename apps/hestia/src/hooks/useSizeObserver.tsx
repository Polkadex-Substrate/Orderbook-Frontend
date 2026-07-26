import { useEffect, useState } from "react";

export function useSizeObserver<T extends HTMLElement = HTMLDivElement>(): [
  (node: T | null) => void,
  number,
] {
  const [ref, setRef] = useState<T | null>(null);
  const [height, setHeight] = useState<number>(0);

  useEffect(() => {
    if (!ref) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setHeight(entry.target.scrollHeight);
      }
    });
    // Always observe once the node exists. The old `if (ref?.offsetHeight)`
    // guard skipped observing when the element mounted at 0 height (e.g. the
    // footer before the ticker carousel has data) - the observer then never
    // attached, the measured height stayed 0 forever, and layouts that
    // reserve space from it (trading template's paddingBottom) let the fixed
    // footer paint over the buy/sell buttons.
    observer.observe(ref);
    setHeight(ref.scrollHeight);
    return () => observer.disconnect();
  }, [ref]);

  return [setRef, height];
}
