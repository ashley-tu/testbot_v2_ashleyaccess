/**
 * Step-by-step trace for RAG (vector search) when RAG_DEBUG=1.
 * elapsedMs = ms from start of RAG to this step; durationMs = ms spent on this step.
 */

export type RagTraceStep =
  | { step: "query"; query: string; elapsedMs?: number }
  | { step: "config"; message: string; elapsedMs?: number }
  | { step: "embedding"; dimensions: number; elapsedMs?: number; durationMs?: number }
  | { step: "embed_error"; message: string; elapsedMs?: number }
  | {
      step: "vector_search";
      numCandidates: number;
      limit: number;
      elapsedMs?: number;
    }
  | {
      step: "chunks";
      count: number;
      chunks: { preview: string; score?: number }[];
      elapsedMs?: number;
      durationMs?: number;
    }
  | { step: "vector_search_error"; message: string; elapsedMs?: number }
  | {
      step: "context";
      formattedLength: number;
      snippet: string;
      elapsedMs?: number;
    }
  | { step: "timeout"; message: string; elapsedMs: number }
  | { step: "timeout_diagnosis"; message: string };

export type RagTracePayload = { steps: RagTraceStep[] };
