import { MongoClient } from "mongodb";
import { embed } from "./embed";
import {
  RAG_COLLECTION,
  RAG_INDEX_NAME,
  RAG_TEXT_FIELD,
  RAG_TOP_K,
  RAG_VECTOR_FIELD,
} from "./config";

export type RagChunk = { text: string; score?: number };

/**
 * Run vector search in MongoDB Atlas and return top-k text chunks.
 * Returns [] if MONGODB_URI or VOYAGE_API_KEY is missing or on errors (no throw).
 */
export async function searchRag(query: string): Promise<RagChunk[]> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return [];
  }

  let queryVector: number[];
  try {
    queryVector = await embed(query, "query");
  } catch (_) {
    return [];
  }

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
          numCandidates: Math.max(RAG_TOP_K * 20, 100),
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

    const cursor = coll.aggregate<{ [RAG_TEXT_FIELD]: string; score?: number }>(
      pipeline
    );
    const docs = await cursor.toArray();
    return docs.map((d) => ({
      text: d[RAG_TEXT_FIELD] ?? "",
      score: d.score,
    }));
  } catch (_) {
    return [];
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
