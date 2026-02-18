"use client";

import type { RagTraceStep } from "@/lib/rag/trace";
import { useDataStream } from "./data-stream-provider";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";

function TimingBadge({
  elapsedMs,
  durationMs,
}: {
  elapsedMs?: number;
  durationMs?: number;
}) {
  if (elapsedMs == null && durationMs == null) return null;
  return (
    <span className="text-muted-foreground ml-2 font-mono text-xs">
      {elapsedMs != null && <span title="Cumulative ms from start">{elapsedMs} ms</span>}
      {elapsedMs != null && durationMs != null && " · "}
      {durationMs != null && (
        <span title="Time spent on this step">
          {durationMs} ms this step
        </span>
      )}
    </span>
  );
}

function StepContent({ step }: { step: RagTraceStep }) {
  switch (step.step) {
    case "query":
      return (
        <div className="rounded bg-muted/60 p-2 font-mono text-sm">
          &quot;{step.query}&quot;
        </div>
      );
    case "config":
    case "embed_error":
    case "vector_search_error":
      return (
        <p className="text-destructive text-sm">{step.message}</p>
      );
    case "embedding":
      return (
        <p className="text-muted-foreground text-sm">
          {step.dimensions} dimensions
        </p>
      );
    case "vector_search":
      return (
        <p className="text-muted-foreground text-sm">
          numCandidates={step.numCandidates}, limit={step.limit}
        </p>
      );
    case "chunks":
      return (
        <div className="space-y-2">
          <p className="text-muted-foreground text-sm">
            {step.count} chunk{step.count !== 1 ? "s" : ""} retrieved
          </p>
          <ol className="list-decimal space-y-1 pl-4">
            {step.chunks.map((c, i) => (
              <li key={i} className="text-sm">
                <span className="text-muted-foreground">
                  {c.score != null ? `score ${c.score.toFixed(4)} — ` : ""}
                </span>
                <span className="font-mono">{c.preview}</span>
              </li>
            ))}
          </ol>
        </div>
      );
    case "context":
      return (
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm">
            {step.formattedLength} chars sent to model
          </p>
          <pre className="max-h-32 overflow-auto rounded bg-muted/60 p-2 font-mono text-xs whitespace-pre-wrap break-words">
            {step.snippet}
          </pre>
        </div>
      );
    case "timeout":
      return (
        <p className="text-destructive text-sm">{step.message}</p>
      );
    case "timeout_diagnosis":
      return (
        <p className="text-muted-foreground text-sm">{step.message}</p>
      );
    default:
      return null;
  }
}

function stepLabel(step: RagTraceStep): string {
  switch (step.step) {
    case "query":
      return "1. Query";
    case "config":
      return "Config";
    case "embedding":
      return "2. Embedding";
    case "embed_error":
      return "Embedding error";
    case "vector_search":
      return "3. Vector search";
    case "chunks":
      return "4. Retrieved chunks";
    case "vector_search_error":
      return "Vector search error";
    case "context":
      return "5. Context for model";
    case "timeout":
      return "Timeout";
    case "timeout_diagnosis":
      return "Timeout during embedding?";
    default:
      return "Step";
  }
}

function getStepTiming(step: RagTraceStep): {
  elapsedMs?: number;
  durationMs?: number;
} {
  if ("elapsedMs" in step && typeof step.elapsedMs === "number") {
    const durationMs =
      "durationMs" in step && typeof step.durationMs === "number"
        ? step.durationMs
        : undefined;
    return { elapsedMs: step.elapsedMs, durationMs };
  }
  return {};
}

export function RagTracePanel() {
  const { ragTrace, setRagTrace } = useDataStream();

  if (!ragTrace?.steps?.length) {
    return null;
  }

  return (
    <Collapsible defaultOpen className="mx-auto w-full max-w-4xl px-2 md:px-4">
      <div className="flex items-center justify-between gap-2 border-y border-border/60 bg-muted/30 py-2">
        <CollapsibleTrigger className="flex items-center gap-2 font-medium text-sm hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 rounded">
          Vector search trace ({ragTrace.steps.length} steps)
        </CollapsibleTrigger>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground text-xs underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 rounded"
          onClick={() => setRagTrace(null)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setRagTrace(null);
            }
          }}
        >
          Dismiss
        </button>
      </div>
      <CollapsibleContent>
        <ol className="list-none space-y-3 border-t border-border/60 bg-muted/20 px-2 py-3 md:px-4">
          {ragTrace.steps.map((step, i) => {
            const timing = getStepTiming(step);
            return (
              <li key={i} className="space-y-1">
                <span className="font-medium text-sm">{stepLabel(step)}</span>
                <TimingBadge
                  elapsedMs={timing.elapsedMs}
                  durationMs={timing.durationMs}
                />
                <StepContent step={step} />
              </li>
            );
          })}
        </ol>
      </CollapsibleContent>
    </Collapsible>
  );
}
