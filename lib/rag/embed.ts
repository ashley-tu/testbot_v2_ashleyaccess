import { RAG_EMBEDDING_MODEL } from "./config";

export type InputType = "query" | "document";

const EMBED_REQUEST_TIMEOUT_MS = 15_000;
const EMBED_MAX_RETRIES = 2;

/**
 * Get embedding vector for a single string using Voyage AI.
 * Use inputType "query" for user questions and "document" when indexing content.
 * Retries up to EMBED_MAX_RETRIES on failure to handle transient slowness.
 */
export async function embed(
  input: string,
  inputType: InputType
): Promise<number[]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error("VOYAGE_API_KEY is not set");
  }

  let lastErr: Error | null = null;
  for (let attempt = 0; attempt <= EMBED_MAX_RETRIES; attempt++) {
    try {
      return await embedOnce(input, inputType, apiKey);
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      if (attempt < EMBED_MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }
  throw lastErr ?? new Error("Voyage embedding failed");
}

async function embedOnce(
  input: string,
  inputType: InputType,
  apiKey: string
): Promise<number[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    EMBED_REQUEST_TIMEOUT_MS
  );

  let res: Response;
  try {
    res = await fetch("https://api.voyageai.com/v1/embeddings", {
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
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(
        `Voyage embedding request timed out after ${EMBED_REQUEST_TIMEOUT_MS / 1000}s. Check VOYAGE_API_KEY, network, and region.`
      );
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as {
      detail?: string;
    };
    throw new Error(
      `Voyage embeddings failed: ${res.status} ${errBody.detail ?? res.statusText}`
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
