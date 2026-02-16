/**
 * Step-by-step trace for RAG (vector search) when RAG_DEBUG=1.
 * Used to show where data is retrieved and how context is built.
 */

export type RagTraceStep =
  | { step: "query"; query: string }
  | { step: "config"; message: string }
  | { step: "embedding"; dimensions: number }
  | { step: "embed_error"; message: string }
  | { step: "vector_search"; numCandidates: number; limit: number }
  | { step: "chunks"; count: number; chunks: { preview: string; score?: number }[] }
  | { step: "vector_search_error"; message: string }
  | { step: "context"; formattedLength: number; snippet: string };

export type RagTracePayload = { steps: RagTraceStep[] };
