import { MongoClient } from "mongodb";
import {
  RAG_COLLECTION,
  RAG_INDEX_NAME,
  RAG_TEXT_FIELD,
  RAG_TOP_K,
  RAG_VECTOR_FIELD,
} from "./config";
import type { RagTraceStep } from "./trace";
import { embed } from "./embed";

export type RagChunk = { text: string; score?: number };

const PREVIEW_LEN = 120;

/**
 * Run vector search in MongoDB Atlas and return top-k text chunks.
 * Returns [] if MONGODB_URI or VOYAGE_API_KEY is missing or on errors (no throw).
 */
export async function searchRag(query: string): Promise<RagChunk[]> {
  const result = await searchRagWithTrace(query);
  return result.chunks;
}

/**
 * Same as searchRag but returns a step-by-step trace for debugging (RAG_DEBUG=1).
 */
export async function searchRagWithTrace(query: string): Promise<{
  chunks: RagChunk[];
  trace: RagTraceStep[];
}> {
  const startMs = Date.now();
  const trace: RagTraceStep[] = [];
  trace.push({ step: "query", query, elapsedMs: 0 });

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    trace.push({
      step: "config",
      message: "MONGODB_URI is not set",
      elapsedMs: Date.now() - startMs,
    });
    return { chunks: [], trace };
  }

  let queryVector: number[];
  try {
    const embedStartMs = Date.now();
    queryVector = await embed(query, "query");
    const embedEndMs = Date.now();
    trace.push({
      step: "embedding",
      dimensions: queryVector.length,
      elapsedMs: embedEndMs - startMs,
      durationMs: embedEndMs - embedStartMs,
    });
  } catch (err) {
    trace.push({
      step: "embed_error",
      message: err instanceof Error ? err.message : String(err),
      elapsedMs: Date.now() - startMs,
    });
    return { chunks: [], trace };
  }

  const numCandidates = Math.max(RAG_TOP_K * 20, 100);
  trace.push({
    step: "vector_search",
    numCandidates,
    limit: RAG_TOP_K,
    elapsedMs: Date.now() - startMs,
  });

  const client = new MongoClient(uri);
  try {
    const db = client.db();
    const coll = db.collection(RAG_COLLECTION);
    const pipeline = [
      {
        $vectorSearch: {
          index: RAG_INDEX_NAME,
          path: RAG_VECTOR_FIELD,
          queryVector,
          numCandidates,
          limit: RAG_TOP_K,
        },
      },
      {
        $project: {
          [RAG_TEXT_FIELD]: 1,
          score: { $meta: "vectorSearchScore" },
        },
      },
    ];

    const mongoStartMs = Date.now();
    const cursor = coll.aggregate<{ [RAG_TEXT_FIELD]: string; score?: number }>(
      pipeline
    );
    const docs = await cursor.toArray();
    const mongoEndMs = Date.now();
    const chunks: RagChunk[] = docs.map((d) => ({
      text: d[RAG_TEXT_FIELD] ?? "",
      score: d.score,
    }));

    trace.push({
      step: "chunks",
      count: chunks.length,
      chunks: chunks.map((c) => ({
        preview:
          c.text.trim().slice(0, PREVIEW_LEN) +
          (c.text.length > PREVIEW_LEN ? "…" : ""),
        score: c.score,
      })),
      elapsedMs: mongoEndMs - startMs,
      durationMs: mongoEndMs - mongoStartMs,
    });

    return { chunks, trace };
  } catch (err) {
    trace.push({
      step: "vector_search_error",
      message: err instanceof Error ? err.message : String(err),
      elapsedMs: Date.now() - startMs,
    });
    return { chunks: [], trace };
  } finally {
    await client.close();
  }
}

/**
 * Format RAG chunks into a single context string for the system prompt.
 */
export function formatRagContext(chunks: RagChunk[]): string {
  if (chunks.length === 0) return "";
  const parts = chunks.map((c, i) => `[${i + 1}] ${c.text.trim()}`);
  return `Relevant context from the knowledge base (use this to answer accurately):\n\n${parts.join("\n\n")}`;
}
