import type { FluffScoreResult } from "@tokenguard/shared";

interface Props {
  result: FluffScoreResult | null;
  threshold: number;
}

export function FluffScore({ result, threshold }: Props) {
  if (!result) {
    return (
      <div className="card">
        <div className="card-title">Fluff score</div>
        <p className="text-muted text-sm">
          Paste an LLM response on the left to score it.
        </p>
      </div>
    );
  }
  const color =
    result.score >= 50 ? "text-bad" : result.score >= 25 ? "text-warn" : "text-ok";
  const overThreshold = result.score >= threshold;

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="card-title">Fluff score</div>
        <span className="pill">
          threshold {threshold} · {overThreshold ? "over" : "under"}
        </span>
      </div>
      <div className="flex items-baseline gap-3">
        <span className={`stat-num ${color}`}>{result.score}</span>
        <span className="text-muted text-sm">
          {result.flags.length} / {result.totalSentences} sentences flagged
        </span>
      </div>

      {result.flags.length > 0 && (
        <ul className="mt-4 space-y-2">
          {result.flags.map((f, i) => (
            <li
              key={i}
              className="rounded-md border border-bad/20 bg-bad/5 p-2 text-sm"
            >
              <div className="text-[11px] uppercase tracking-wider text-muted mb-1">
                {f.category}
              </div>
              <div className="text-bad/90">{f.sentence}</div>
            </li>
          ))}
        </ul>
      )}

      {result.cleanedText && (
        <div className="mt-5">
          <div className="card-title">Cleaned</div>
          <div className="rounded-lg border border-white/5 bg-black/30 p-3 text-sm whitespace-pre-wrap">
            {result.cleanedText}
          </div>
        </div>
      )}
    </div>
  );
}
