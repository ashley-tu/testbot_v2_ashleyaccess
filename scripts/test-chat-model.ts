/**
 * Test script to verify the AI Gateway and chat model respond.
 * Run: pnpm exec tsx scripts/test-chat-model.ts
 * Requires: .env.local with AI_GATEWAY_API_KEY (or deploy on Vercel for OIDC).
 *
 * Use this to see if "loading forever" is due to the gateway/model or the app (auth, DB, RAG, streaming).
 */

import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });
config(); // fallback to .env
import { gateway } from "@ai-sdk/gateway";
import { streamText } from "ai";

const MODEL_ID = process.env.CHAT_TEST_MODEL ?? "google/gemini-2.5-flash-lite";
const TIMEOUT_MS = 30_000;

async function main() {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey?.trim()) {
    process.stderr.write(
      "Missing AI_GATEWAY_API_KEY. Set it in .env.local or pass it when running.\n"
    );
    process.stderr.write(
      "  Example: AI_GATEWAY_API_KEY=your_key pnpm exec tsx scripts/test-chat-model.ts\n"
    );
    process.exit(1);
  }

  process.stderr.write(`Using model: ${MODEL_ID}\n`);
  process.stderr.write("Calling gateway (waiting for first token)...\n");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, TIMEOUT_MS);

  try {
    const result = streamText({
      model: gateway.languageModel(MODEL_ID),
      prompt: "Reply with exactly: OK",
      abortSignal: controller.signal,
    });

    let firstChunk = true;
    for await (const chunk of result.textStream) {
      if (firstChunk) {
        clearTimeout(timeoutId);
        process.stderr.write("First token received.\n");
        firstChunk = false;
      }
      process.stdout.write(chunk);
    }
    process.stdout.write("\n");
    process.stderr.write("Done. Gateway and model are working.\n");
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        process.stderr.write(
          `Timeout after ${TIMEOUT_MS / 1000}s. Gateway/model did not respond.\n`
        );
      } else {
        process.stderr.write(`Error: ${error.message}\n`);
      }
    }
    process.exit(1);
  }
}

main();
