# ADR-005: Spring Batch Chunk-Oriented Processing for EOD Settlement

## 1. Problem

At the end of the day, the system must reconcile and settle every transaction of the day. Loading all data into memory in a single Tasklet makes RAM usage proportional to the day's transaction count — unstable, with a risk of `OutOfMemoryError` as volume grows.

## 2. Choice

Use Spring Batch with a **chunk-oriented step** (Reader → Processor → Writer) instead of one Tasklet that processes everything at once.

## 3. Rationale

- Processing in small chunks keeps memory usage stable regardless of the total number of records.
- Spring Batch checkpoints after every chunk — if the job is interrupted (crash, lost DB connection), it can restart from where it stopped instead of from the beginning.
- `faultTolerant()` with skip/retry lets locally broken records (e.g. corrupted reconciliation data) be handled without failing the whole job.

## 4. Trade-offs

- More complex than a simple Tasklet: separate Reader/Processor/Writer and per-chunk transaction boundaries must be designed.
- The chunk size must be chosen carefully — too small increases transaction overhead, too large loses the memory benefit; the exact value will be measured and tuned with real data.
