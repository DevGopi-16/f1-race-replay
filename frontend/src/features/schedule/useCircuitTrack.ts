import { useEffect, useState } from "react";

export interface CircuitTrack {
  viewBox: string;
  path: string;
  width: number;
}

const cache = new Map<string, CircuitTrack | null>();

export function useCircuitTrack(url: string | null): {
  track: CircuitTrack | null;
  failed: boolean;
} {
  const [track, setTrack] = useState<CircuitTrack | null>(
    url ? cache.get(url) ?? null : null,
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!url) {
      setTrack(null);
      setFailed(false);
      return;
    }

    if (cache.has(url)) {
      const cached = cache.get(url) ?? null;
      setTrack(cached);
      setFailed(cached === null);
      return;
    }

    let cancelled = false;
    setFailed(false);

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.text();
      })
      .then((text) => {
        const doc = new DOMParser().parseFromString(text, "image/svg+xml");
        const parseError = doc.querySelector("parsererror");
        const svgEl = doc.querySelector("svg");
        const pathEl = doc.querySelector("path");

        if (parseError || !svgEl || !pathEl) {
          throw new Error("SVG has no <path> to trace");
        }

        const viewBox =
          svgEl.getAttribute("viewBox") ??
          `0 0 ${svgEl.getAttribute("width") ?? 1000} ${
            svgEl.getAttribute("height") ?? 1000
          }`;
        const width = Number(viewBox.split(/\s+/)[2]) || 1000;
        const d = pathEl.getAttribute("d") ?? "";

        const result: CircuitTrack = { viewBox, path: d, width };
        cache.set(url, result);
        if (!cancelled) {
          setTrack(result);
          setFailed(false);
        }
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.warn(`[circuit-track] failed to load "${url}":`, err);
        cache.set(url, null);
        if (!cancelled) {
          setTrack(null);
          setFailed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return { track, failed };
}