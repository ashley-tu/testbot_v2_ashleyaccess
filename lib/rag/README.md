# RAG with MongoDB Vector Search

The chatbot uses **Retrieval Augmented Generation (RAG)**: it searches your MongoDB collection for relevant content and injects it into the system prompt so the LLM can answer from your data instead of only its training.

## Where things live

| What | Where |
|------|--------|
| **Vector search index** | **MongoDB Atlas** (create in Atlas UI or via API) |
| **Embeddings** | **Voyage AI** (called from this app via `lib/rag/embed.ts`) |
| **Search + prompt** | This app (`lib/rag/search.ts` → chat route) |

You **create the vector index in MongoDB Atlas**. The app only runs queries against it and uses Voyage to embed the user’s question.

### Seeing what the chatbot is doing (RAG trace)

To see step-by-step how vector search runs for each message, enable RAG debug in one of these ways:

- **Local:** Set `RAG_DEBUG=1` in `.env.local` and restart the dev server.
- **Vercel (production):** Set `RAG_DEBUG=1` in the project’s Environment Variables, then **redeploy** (env vars only apply to new deployments).
- **Live site without redeploy:** Set the cookie `rag_debug=1` in your browser (e.g. DevTools → Application → Cookies → add `rag_debug` with value `1` for your site). Send a message; the trace panel will appear for that request.

When debug is on, a **Vector search trace** panel appears above the input showing: (1) **Query** – text used for the search, (2) **Embedding** – dimensions from Voyage, (3) **Vector search** – numCandidates and limit, (4) **Retrieved chunks** – count, scores, and text previews, (5) **Context for model** – length and snippet injected into the system prompt.

---

## 1. Create the vector index in MongoDB Atlas

1. Open [MongoDB Atlas](https://cloud.mongodb.com) → your project → **Database** → **Browse Collections**.
2. Use the database from your `MONGODB_URI` (e.g. `rag`). Create a collection (e.g. `chunks`) if it doesn’t exist.
3. Go to the **Search** tab (Atlas Search / Vector Search) for that collection and **Create Index**.
4. Choose **Vector Search** and use an index definition like this (must match `lib/rag/config.ts`):

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1024,
      "similarity": "cosine"
    }
  ]
}
```

- **path**: field that stores the embedding array (default in this app: `embedding`).
- **numDimensions**: **1024** for `voyage-finance-2`. If you change the embedding model, set this to that model’s dimension.
- **similarity**: `cosine` (matches Voyage’s typical usage).

Name the index (e.g. `vector_index`) and create it. The name must match `RAG_INDEX_NAME` in `lib/rag/config.ts`.

---

## 2. Document shape in MongoDB

Each document in the RAG collection should have:

- **`embedding`**: array of 1024 numbers (from Voyage AI).
- **`text`**: string shown to the LLM as context (or use another field and set `RAG_TEXT_FIELD` in `lib/rag/config.ts`).

Example:

```json
{
  "_id": "...",
  "text": "Your knowledge base content here...",
  "embedding": [ -0.02, 0.03, ... ]
}
```

---

## 3. Ingesting content (embed + insert)

The app does **not** ingest documents. You need to:

1. Chunk your source content (e.g. by paragraph or section).
2. For each chunk, call Voyage with `input_type: "document"` to get an embedding.
3. Insert documents with `text` and `embedding` into the `chunks` collection.

You can do this with a one-off script using `lib/rag/embed.ts` and the MongoDB driver, or use Atlas’s automated embedding feature if you enable it. The config in `lib/rag/config.ts` (collection name, index name, vector/text field names) must match what you use there.

---

## 4. Env vars

- **`MONGODB_URI`**: Atlas connection string (with database name), e.g. `mongodb+srv://.../rag?retryWrites=true&w=majority`.
- **`VOYAGE_API_KEY`**: Used to embed the user query before vector search.

If either is missing, RAG is skipped and the chat runs without context from the database.

---

## 5. Flow summary

1. User sends a message.
2. App takes the message text → Voyage embeds it (`input_type: "query"`) → MongoDB `$vectorSearch` returns top-k docs.
3. App formats those docs into a single context string and passes it as `ragContext` into the system prompt.
4. The LLM answers using that context when relevant, making responses more accurate for your data than a generic LLM like ChatGPT alone.
