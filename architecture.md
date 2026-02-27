# Architecture
## 1. System Overview

This backend implements a fault-tolerant, database-driven job processing system for asynchronous AI-powered resume analysis.

The system is designed to:
1. Safely process jobs concurrently
2. Recover from worker crashes
3. Control retry behavior
4. Track LLM usage and performance
5. Remain simple and deployable without additional infrastructure

It intentionally avoids external queue systems to reduce operational complexity while preserving strong correctness guarantees.

## 2. High-Level Flow
```bash

   Client → API → analyses (status=queued)
   ↓
   Worker claims job
   ↓
   Resume extraction (cached)
   ↓
   LLM analysis
   ↓
   Validation + persistence
   ↓
   status = completed / failed
```


The `analyses` table functions as a durable job queue.

## 3. Core Architectural Pattern
### Database-Driven Queue with Row-Level Locking

Instead of using Redis or SQS, the system uses PostgreSQL row-level locking to coordinate workers.

The job claim function:

1. Selects one eligible job
2. Locks it using FOR UPDATE SKIP LOCKED
3. Updates its status to processing
4. Returns the claimed row
5. Executes atomically inside a transaction

This guarantees:
1. No double processing
2. Safe horizontal scaling
3. Deterministic concurrency control

## 4. Job Lifecycle

Each job transitions through explicit states:
```bash

queued → processing → completed
                    ↘
                    failed
```

#### Queued

New job awaiting processing.

#### Processing

Claimed by a worker.

#### Completed

Successfully analyzed and persisted.

#### Failed

Exceeded maximum retry attempts.

## 5. Concurrency Model

Multiple worker instances can run simultaneously. 
Concurrency safety is achieved through:
1. FOR UPDATE SKIP LOCKED 
2. Single-transaction job claiming
3. Idempotent status transitions

This ensures that:
1. Two workers cannot process the same job 
2. Stuck jobs can be reclaimed 
3. Race conditions are prevented at the database level

## 6. Crash Recovery

If a worker crashes mid-processing:

1. The job remains in processing
2. The claim function allows reclaiming jobs where: started_at is older than 5 minutes

This prevents permanent job starvation.

## 7. Retry Strategy

Failures are handled explicitly:

1. `retry_count` is incremented
2. Job is re-queued
3. Once retry_count >= max_retries
   1. Job is marked failed 
   2. No further processing occurs

Retry prioritization ensures older retries are not starved by new traffic.

## 8. LLM Integration Layer

LLM interaction is isolated in llmClient.ts.

It is responsible for:

1. Model invocation 
2. Structured output parsing 
3. Usage tracking:
   1. input_tokens 
   2. output_tokens 
   3. model 
   4. duration_ms 
   5. prompt_version 

This separation allows:

1. Easy provider swapping
2. Clear abstraction boundaries
3. Testability of orchestration logic

## 9. Resume Processing Strategy

Resume text extraction:

1. Downloads PDF from storage 
2. Extracts text 
3. Normalizes whitespace 
4. Caches extracted text in the database

This avoids repeated PDF parsing on retries and reduces I/O overhead.

## 10. Data Integrity Controls

The system includes multiple defensive layers:
1. Validation of LLM output before persistence 
2. Strict TypeScript typing across boundaries 
3. Controlled state transitions 
4. Explicit retry caps 
5. Structured logging

Malformed or incomplete LLM responses are rejected before storage.

## 11. Scalability Considerations

Current system supports:

1. Horizontal worker scaling 
2. Concurrent processing 
3. Safe retry under load

Database indexing ensures efficient job claiming:

1. `(status, started_at, retry_count, created_at)`

### Why Not Redis / SQS?

Tradeoffs considered:

|Option |               Pros               |                                        Cons |
|:---|:--------------------------------:|--------------------------------------------:|
|Postgres queue | Strong consistency, simple infra |                 Moderate throughput ceiling |
|Redis |         High throughput          | Extra infra + eventual consistency concerns |
|SQS|         Managed scaling          |              More complex local development |

For this system’s scale and purpose, Postgres provides the best simplicity-to-reliability ratio.

## 12. Observability

Logging is structured JSON and includes:
1. Job lifecycle events
2. Retry attempts
3. LLM metadata
4. Completion metrics

This enables easy ingestion into log aggregators.

Future improvements could include:

1. Metrics aggregation
2. Distributed tracing
3. Dead-letter queue
4. Alerting

These were intentionally excluded to preserve architectural simplicity.

## 13. Failure Modes Considered

1. Worker crash during processing 
2. LLM timeout 
3. Invalid model response 
4. PDF extraction failure 
5. Database write failure 
6. Transient API errors

Each failure path results in deterministic state transitions.

## 14. Design Philosophy

This system prioritizes:

1. Correctness over complexity 
2. Explicit state transitions 
3. Strong transactional guarantees 
4. Clear separation of responsibilities 
5. Minimal infrastructure footprint

It demonstrates production-oriented thinking without premature optimization.

## 15. Summary

This backend is a fault-tolerant background processing system built using:

1. PostgreSQL row-level locking
2. Supabase as persistence layer
3. Node.js worker orchestration
4. Structured LLM integration

It balances simplicity, reliability, and scalability while remaining easy to deploy and reason about.