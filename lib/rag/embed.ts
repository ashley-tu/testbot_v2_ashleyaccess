import { RAG_EMBEDDING_MODEL } from "./config";

export type InputType = "query" | "document";

/**
 * Get embedding vector for a single string using Voyage AI.
 * Use inputType "query" for user questions and "document" when indexing content.
 */
export async function embed(
  input: string,
  inputType: InputType
): Promise<number[]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error("VOYAGE_API_KEY is not set");
  }

  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input,
      model: RAG_EMBEDDING_MODEL,
      input_type: inputType,
    }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(
      `Voyage embeddings failed: ${res.status} ${err.detail ?? res.statusText}`
    );
  }

  const data = (await res.json()) as {
    data?: Array<{ embedding?: number[] }>;
  };
  const embedding = data.data?.[0]?.embedding;
  if (!Array.isArray(embedding)) {
    throw new Error("Voyage API returned no embedding");
  }
  return embedding;
}
