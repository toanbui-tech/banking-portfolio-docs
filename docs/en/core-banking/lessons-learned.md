# Technical Challenges & Lessons Learned

> Collected from real problems met while building [Phase 1](/en/devlog/phase-1-core-banking). Each item: symptom → root cause → fix → lesson.

## 1. A "silently wrong" bug: JPA calls `merge()` instead of `persist()`

- **Symptom:** `Transaction` was saved, but its child `LedgerEntry` rows were not saved correctly. No exception.
- **Root cause:** `Transaction.id` is assigned in the constructor (in the DDD spirit — an aggregate creates itself in a valid state). Spring Data JPA sees a non-`null` ID, assumes the entity already exists and calls `merge()`, so the `PERSIST` cascade does not fire.
- **Fix:** `Transaction` implements `Persistable<UUID>` and manages `isNew()` with a `@Transient` flag reset in `@PostLoad`/`@PostPersist`.
- **Lesson:** understanding persist vs. merge matters more than knowing annotation syntax. The most dangerous bugs are the ones that throw nothing, so tests must check the actual stored data. Details: [ADR-008](/en/adr/ADR-008-transaction-aggregate-root).

## 2. A second database exposed a domain-model bug

- **Symptom:** tests passed on Postgres but failed on Oracle when comparing amounts.
- **Root cause:** Oracle `NUMBER` does not preserve a fixed scale on read (Postgres `NUMERIC` does). `Money` never normalized its scale, so it had only been correct by luck.
- **Fix:** tried following ISO 4217 (VND = 0 decimal places), but that would break existing data; chose a fixed `scale = 2` in the `Money` constructor for every currency.
- **Lesson:** portability across databases is a useful test in itself. The bug was not in Oracle but in a hidden assumption in the code. Details: [ADR-012](/en/adr/ADR-012-money-fixed-scale).

## 3. A cache can defeat a lock

- **Risk:** if `withdraw()` read the balance from Redis, the pessimistic lock on `Account` would be meaningless — a stale cached balance could allow an overdraft.
- **Fix:** separate `getBalance()` (cached) from `computeBalanceFromDb()` (used only in `withdraw()`); evict the cache `AFTER_COMMIT` rather than before commit.
- **Lesson:** before adding an optimization layer, identify which path carries the invariant and keep that path out of the optimization. Details: [ADR-010](/en/adr/ADR-010-redis-cache-account-balance).

## 4. A bug hidden by the test configuration itself

- **Symptom:** the `KafkaTemplate` bean was never created, yet every test stayed green for a while.
- **Root cause:** `spring-kafka` alone is not enough; Spring Boot 4 needs `spring-boot-starter-kafka`. The problem was hidden because `OutboxEventPublisher` was always disabled in tests (`outbox.publisher.enabled=false`).
- **Fix:** add the starter; write an end-to-end test against real Kafka via Testcontainers, no mocks.
- **Lesson:** every feature flag disabled in tests is a blind spot. At least one end-to-end test must run with the production configuration. Details: [ADR-009](/en/adr/ADR-009-outbox-pattern-kafka-event-publishing).

## 5. `application-test.properties` overrides instead of merging

- **Root cause:** a same-named test configuration file replaced the whole main DB/Flyway configuration instead of merging with it.
- **Fix:** declare test properties inline with `@SpringBootTest(properties = ...)`.

## 6. Proving a distributed lock needs two layers of evidence

- **Challenge:** "1 success, 4 rejected" alone is not enough — Kubernetes might just have routed every request to the same Pod.
- **Fix:** log the Pod name (`HOSTNAME`) in `AccountController` and use `kubectl logs --prefix` to confirm requests were spread across all 3 Pods.
- **Lesson:** an experiment is only worth something once alternative explanations are ruled out. Details: [ADR-013](/en/adr/ADR-013-kubernetes-deployment).

## 7. Networking inside containers

- `localhost` inside a container is the container itself. Kafka needed a second listener (`PLAINTEXT_HOST` via `host.docker.internal:9094`) so Pods could connect, while keeping `9092` for tests running on the host.

## 8. Environment setup

Seven initial setup issues (Java version, corrupted Maven cache, Docker port clashes, Flyway on Spring Boot 4, a Postgres volume keeping an old password, the `Asia/Saigon` timezone...) are fully recorded in [Devlog — Environment setup](/en/devlog/phase-1-core-banking#environment-setup). Common thread: Spring Boot 4 and Testcontainers 2.x renamed many modules/artifacts, so release notes had to be read instead of relying on older guides.

---

## Known limitations

- `OutboxEventPublisher` has no distributed lock: with several Pods, the 3 PoC consumers may log duplicates (Audit/Compliance is unaffected because it is idempotent).
- `Money` with a fixed `scale = 2` must be revisited for currencies such as JPY (0) or BHD (3).
- Maintaining two migration sets (Postgres/Oracle): every schema change has to be written twice.
