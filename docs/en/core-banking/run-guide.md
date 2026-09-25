# Running & Testing

> **[Implemented]** — the steps below are summarized from real runs recorded in [Devlog — Phase 1](/en/devlog/phase-1-core-banking). Commands run from the root of the Core Banking code repository.

## 1. Infrastructure (docker-compose)

Host ports were moved away from the defaults to avoid clashes with other containers on the dev machine:

| Service | Image | Host port |
| :--- | :--- | :--- |
| PostgreSQL | `postgres:15` | `5434` |
| Oracle | `gvenzl/oracle-free:23-slim-faststart` | `1522` |
| Redis | `redis:7-alpine` | `6380` |
| Kafka | — | `9092` (processes on the host), `9094` (from containers/Pods via `host.docker.internal`) |

```bash
docker compose up -d
```

::: tip
Oracle starts noticeably slower than the other services, even the `slim-faststart` image — wait until the container is healthy before running tests with the `oracle` profile.
:::

## 2. Running the application

```bash
# Default profile — PostgreSQL
./mvnw spring-boot:run

# Oracle profile
./mvnw spring-boot:run -Dspring-boot.run.arguments=--spring.profiles.active=oracle
```

Flyway runs the migrations for the active profile: `db/migration/postgresql/` or `db/migration/oracle/`.

### REST API

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/accounts` | Create an account |
| `GET` | `/accounts/{id}/balance` | Get the balance (via Redis cache) |
| `POST` | `/accounts/{id}/deposit` | Deposit |
| `POST` | `/accounts/{id}/withdraw` | Withdraw (pessimistic lock; insufficient funds → HTTP 409) |

## 3. Running the tests

```bash
# PostgreSQL
./mvnw test

# Oracle — same test suite, no profile-specific changes
./mvnw test -Dspring.profiles.active=oracle
```

Current result: **45/45 tests pass on both databases**. Kafka and Redis in integration tests run through Testcontainers, so Docker must be running.

### Notable tests

| Test | Verifies |
| :--- | :--- |
| `withdraw_shouldPreventOverdraft_whenConcurrentRequests` | 2 threads withdraw 80.00 from an account holding 100.00 — exactly 1 succeeds |
| `TransactionTest` | Debit = Credit invariant, symmetric `reverse()`, `createdBy` always set |
| `MoneyTest` | Currency mixing is blocked, fixed scale |
| `TransactionToComplianceEndToEndTest` | Transaction → Outbox → real Kafka → `compliance_records` |
| `AccountBalanceCacheIntegrationTest` | Balance is never stale after a new transaction (real Redis) |

## 4. Deploying to Kubernetes

Uses Docker Desktop Kubernetes (shares the image cache with `docker build`, hence `imagePullPolicy: Never`). The data layer keeps running in docker-compose outside the cluster.

```bash
docker build -t core-banking-system:local .
kubectl apply -f k8s/          # namespace core-banking, 3 replicas
kubectl -n core-banking get pods
```

The `NodePort` Service is reachable at `http://localhost:30080`. To see which Pod handled which request:

```bash
kubectl -n core-banking logs -l <app-label> --prefix
```

Verification scenario that was run: 5 concurrent `withdraw` requests with funds for exactly 1 → 1 success, 4 rejected with HTTP 409, requests spread across all 3 Pods. Details: [ADR-013](/en/adr/ADR-013-kubernetes-deployment).
