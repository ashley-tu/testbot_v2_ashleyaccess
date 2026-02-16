/**
 * RAG (Retrieval Augmented Generation) config for MongoDB Vector Search + Voyage AI.
 * Must match your Atlas vector search index (field name, dimensions, index name).
 */

export const RAG_EMBEDDING_MODEL = "voyage-finance-2";
/** voyage-finance-2 outputs 1024 dimensions; must match your Atlas vector index */
export const RAG_EMBEDDING_DIMENSIONS = 1024;
export const RAG_COLLECTION = "documents";
export const RAG_INDEX_NAME = "vector_index";
/** Field in each document that holds the embedding vector */
export const RAG_VECTOR_FIELD = "embedding";
/** Field that holds the text shown to the LLM (e.g. "text" or "content") */
export const RAG_TEXT_FIELD = "text";
export const RAG_TOP_K = 5;
