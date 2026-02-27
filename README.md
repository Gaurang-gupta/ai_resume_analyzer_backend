# Resume Analysis Backend

Production-ready backend worker for asynchronous AI-powered resume analysis.

This service processes resume analysis jobs from Supabase, extracts resume text from PDF files, sends structured prompts to an LLM, validates responses, and persists results — with full retry, timeout recovery, and concurrency-safe job claiming.

## Overview

This backend is built around a `database-driven` job queue pattern using Supabase and PostgreSQL row-level locking.

### Key characteristics:

1. Atomic job claiming using `FOR UPDATE SKIP LOCKED`
2. Crash recovery via timed-out job reclamation
3. Controlled retry system with max retries
4. LLM usage tracking (tokens, model, duration)
5. Structured logging
6. Resume text caching to avoid repeated PDF parsing
7. Strict validation of model responses

The worker runs continuously and processes jobs in a scalable, concurrency-safe manner.

### Architecture

High-level flow:

1. A new analysis record is inserted into the `analyses` table with `status = 'queued'`
2. Worker claims the job using a Postgres function
3. Resume text is retrieved (cached or extracted from storage)
4. LLM is invoked
5. Response is validated
6. Result is persisted
7. Job marked completed or retried / failed

The system is designed to be horizontally scalable — multiple workers can run safely without duplicate processing.

### Project Structure
```bash

backend/
│
├── index.ts          # Entry point – worker loop & job orchestration
│
├── analyzeResume.ts      # Business logic layer – prepares analysis request
├── llmClient.ts          # LLM interaction layer (API calls, usage tracking)
├── types.ts              # Centralized TypeScript type definitions
│
└── supabase/
└── claim_next_analysis_job.sql
```

### Responsibilities
`index.ts`

1. Main entry point
2. Claims jobs from database
3. Handles retries and failures
4. Extracts resume text
5. Coordinates analysis flow
6. Updates job status

`analyzeResume.ts`
1. Builds structured input
2. Calls `llmClient`
3. Returns validated output + metadata

`llmClient.ts`
1. Handles LLM API interaction
2. Returns:
   1. Structured result 
   2. Token usage 
   3. Model name 
   4. Prompt version 
   5. Duration (ms)

`types.ts`
1. Central source of truth for:
   1. Analysis input/output types 
   2. Database row types 
   3. LLM response types

### Database Design
`analyses` Table (Key Fields)
1. `status` (queued | processing | completed | failed)
2. `retry_count`
3. `max_retries`
4. `started_at`
5. `completed_at`
6. `failed_at`
7. `result` (JSONB)
8. `input_tokens`
9. `output_tokens`
10. `model`
11. `prompt_version`
12. `duration_ms`

### Job Claiming Function

Uses:
1. FOR UPDATE SKIP LOCKED
2. Timeout-based job reclamation
3. Ordered processing with retry awareness
4. Single atomic transaction

This ensures:
1. No double-processing
2. No race conditions
3. Safe horizontal scaling

### Reliability Features
#### Concurrency Safety

Jobs are claimed using row-level locks inside a Postgres function.

#### Crash Recovery

Jobs stuck in processing for more than 5 minutes are automatically reclaimable.

#### Retry System

Failed jobs:
1. Increment retry_count
2. Re-queued until max_retries
3. Marked failed permanently afterward

#### Response Validation

LLM responses are validated before persistence to prevent malformed data storage.

#### Resume Text Caching

Extracted PDF text is stored in the resumes table to prevent repeated parsing.

### Running the Worker
#### 1. Install dependencies
   ```bash 
   
   npm install
   ```
#### 2. Configure environment variables
```bash

SUPABASE_URL=your_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_llm_key
```

#### 3. Start the worker
   ```bash 
   
   npm run dev
   ```

The worker runs continuously with exponential backoff when idle.

### Design Decisions
#### Why Database-Driven Queue Instead of Redis?
1. Fewer moving parts
2. Strong transactional guarantees
3. Simpler deployment model
4. Good fit for moderate throughput systems

For large-scale production systems, a dedicated queue (Redis/SQS) may be more appropriate.

#### Why Explicit Retry Instead of Automatic Requeue?
Explicit retry control allows:
1. Maximum retry limits
2. Failure visibility
3. Better operational transparency

#### Why Validate LLM Output?

LLM responses are non-deterministic.
Strict validation prevents corrupted or malformed records from entering the database.

### Scalability

This system supports:
1. Multiple worker instances
2. Safe horizontal scaling
3. Concurrent job processing
4. Recovery from worker crashes

With proper indexing on:
```bash

(status, started_at, retry_count, created_at)
```

Claiming remains efficient even as the table grows.

### Observability

Structured JSON logging includes:

1. Job lifecycle events
2. Retry attempts
3. LLM metadata
4. Completion metrics

This makes the system easy to monitor in production logs.

### Future Improvements (Intentionally Not Implemented)

1. Distributed tracing
2. Metrics aggregation
3. Dedicated message queue
4. Rate limiting layer
5. Dead-letter queue

These were intentionally excluded to maintain architectural simplicity while preserving production-level correctness.

### Why This Project Matters

This backend demonstrates:
1. Concurrency control with Postgres
2. Safe distributed worker design
3. LLM integration patterns
4. Resilient background processing
5. Production-oriented thinking

It is not a demo script — it is a deliberately designed, fault-tolerant background processing system.