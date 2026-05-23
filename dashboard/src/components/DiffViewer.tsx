import { useMemo } from "react";
import { diffWordsWithSpace } from "diff";

interface Props {
  before: string;
  after: string;
  /** If provided, used instead of computing client-side. */
  className?: string;
}

/**
 * Word-level diff renderer. Uses the `diff` npm package so the colored
 * output matches what users will see in their git tools.
 */
export function DiffViewer({ before, after, className = "" }: Props) {
  const parts = useMemo(() => diffWordsWithSpace(before, after), [before, after]);
  return (
    <div
      className={`rounded-lg border border-white/5 bg-black/30 p-3 font-mono text-[13px] leading-relaxed whitespace-pre-wrap break-words ${className}`}
    >
      {parts.map((p, i) => {
        if (p.added) {
          return (
            <span
              key={i}
              className="rounded bg-ok/20 px-0.5 text-ok"
            >
              {p.value}
            </span>
          );
        }
        if (p.removed) {
          return (
            <span
              key={i}
              className="rounded bg-bad/20 px-0.5 text-bad line-through"
            >
              {p.value}
            </span>
          );
        }
        return <span key={i}>{p.value}</span>;
      })}
    </div>
  );
}
