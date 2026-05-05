# ADR-0006: Vector store

**Status:** Accepted
**Date:** 2026-05-04
**Supersedes:** —

## What we chose

We chose pgvector as the vector store for HelpME2C, integrated into our Neon Postgres instance.

## What we rejected

- **Pinecone** — purpose-built for vectors and scales well, but adds another service, another bill, and another sync story we don't need yet.
- **Weaviate** — similar to Pinecone, can be self-hosted, but introduces the same operational complexity and vendor lock-in.
- **Qdrant** — fast and open-source, but still requires a separate service and maintenance overhead.

## Why

HelpME2C needs vector storage for taste vectors and title embeddings in `packages/ml`, but Phase 1A's scale doesn't justify a dedicated vector database. pgvector provides vector similarity search directly in Postgres, keeping our data in one place with one backup and one operational story.

Since we chose Neon for Postgres in ADR-0005, pgvector is the natural fit. It handles millions of vectors efficiently on commodity hardware and aligns with our Phase 1A focus on rule-based scoring rather than complex ML inference. This keeps the architecture simple while leaving room for a dedicated vector DB in Phase 2 if needed.

## What would change our mind

- Vector queries become the performance bottleneck at scale.
- pgvector hits practical limits for our data volume or query complexity.

## Related

- ADR-0000 (depends on / influences)
- ADR-0005 (Postgres host)
- ADR-0008 (ML inference approach)
- CLAUDE.md §2 (pgvector requirement)
