# ADR-013: Kubernetes Deployment — Verifying Pessimistic Locking Across Pods

## Context

The project needs to prove it can be deployed on Kubernetes, and in particular verify that pessimistic locking (against overdraft, see [ADR-007](/en/adr/ADR-007-pessimistic-locking-withdraw)) works correctly when several application instances run in parallel (`replicas > 1`).

## Options Considered

### Deployment scope

- **Option A (chosen)** — deploy only the Java app to K8s; Postgres/Oracle/Kafka/Redis stay in `docker-compose`. Reason: most real systems (banks included) use managed services for the data layer rather than running complex StatefulSets themselves; every skill to demonstrate (deployment, probes, service, scaling, verifying distributed locking) is fully covered with just the app in K8s.
- **Option B** — StatefulSets for the whole stack (DB/Kafka/Redis included) in K8s. Not chosen because it adds operational complexity that this ADR's goal does not need.

### Local K8s tooling

- **Docker Desktop Kubernetes** (chosen) instead of minikube/kind — it shares the Docker engine/image cache with `docker build`, so there is no separate step to load images into the cluster.

## Decision

Deployment + Service + ConfigMap + Secret + Namespace for the Java app (namespace `core-banking`, 3 replicas, image `core-banking-system:local` with `imagePullPolicy: Never` because it is built locally without a registry).

Before deploying, a REST controller (`AccountController`) had to be added — the codebase previously had no HTTP endpoint at all, and `AccountService` was only called in-process from tests. There is no way to verify pessimistic locking across real Pods without an HTTP entry point (several Pods means several separate JVMs/processes, which cannot be called in-process like the existing tests).

Actuator (`spring-boot-starter-actuator`) was added for liveness/readiness probes. The `startupProbe` matters because the app needs time to start (connecting to DB/Kafka/Redis) before it can take traffic — it prevents the liveness probe from killing a Pod mid-startup.

## Real technical issues encountered

1. **Kafka advertised listener:** `localhost` is only correct when the app runs on the host, not inside a container/Pod (inside a container, `localhost` is the container itself, not the host). Fixed by adding a second listener (`PLAINTEXT_HOST`, advertised via `host.docker.internal`, separate port 9094) alongside the existing one (`PLAINTEXT`, port 9092, still used by processes running directly on the host such as `mvn spring-boot:run`/the test suite).
2. **The Dockerfile uses the official Maven image with a pinned version** instead of `./mvnw` — because `maven-wrapper.jar` is gitignored, avoiding a dependency on a file that is missing in a clean git clone.

## Experimental verification (the most important part of this ADR)

<svg class="diagram" viewBox="0 0 680 470" role="img" aria-labelledby="k8s-en-title k8s-en-desc">
<title id="k8s-en-title">Verifying pessimistic locking across 3 Kubernetes Pods</title>
<desc id="k8s-en-desc">5 concurrent withdraw requests go through a NodePort Service and are spread over 3 Pods. All Pods lock the same Account row in the database, so only 1 request succeeds and 4 are rejected with HTTP 409.</desc>
<defs><marker id="k8s-en-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="arrowhead" d="M2 1L8 5L2 9"/></marker></defs>
<rect class="box-muted" x="170" y="16" width="340" height="50" rx="10"/>
<text class="t" x="340.0" y="32.0" text-anchor="middle" dominant-baseline="central">5 concurrent withdraw requests</text>
<text class="s" x="340.0" y="50.0" text-anchor="middle" dominant-baseline="central">funds for exactly 1 request</text>
<path class="edge" d="M340 66 L340 90" marker-end="url(#k8s-en-arr)"/>
<rect class="box-muted" x="220" y="92" width="240" height="50" rx="10"/>
<text class="t" x="340.0" y="108.0" text-anchor="middle" dominant-baseline="central">Service</text>
<text class="s" x="340.0" y="126.0" text-anchor="middle" dominant-baseline="central">NodePort :30080</text>
<path class="edge" d="M340 142 L340 158 L130 158 L130 176" marker-end="url(#k8s-en-arr)"/>
<rect class="box" x="40" y="178" width="180" height="50" rx="10"/>
<text class="t" x="130.0" y="194.0" text-anchor="middle" dominant-baseline="central">Pod 1</text>
<text class="s" x="130.0" y="212.0" text-anchor="middle" dominant-baseline="central">AccountController</text>
<path class="edge" d="M130 228 L130 246 L340 246 L340 262" marker-end="url(#k8s-en-arr)"/>
<path class="edge" d="M340 142 L340 158 L340 158 L340 176" marker-end="url(#k8s-en-arr)"/>
<rect class="box" x="250" y="178" width="180" height="50" rx="10"/>
<text class="t" x="340.0" y="194.0" text-anchor="middle" dominant-baseline="central">Pod 2</text>
<text class="s" x="340.0" y="212.0" text-anchor="middle" dominant-baseline="central">AccountController</text>
<path class="edge" d="M340 228 L340 246 L340 246 L340 262" marker-end="url(#k8s-en-arr)"/>
<path class="edge" d="M340 142 L340 158 L550 158 L550 176" marker-end="url(#k8s-en-arr)"/>
<rect class="box" x="460" y="178" width="180" height="50" rx="10"/>
<text class="t" x="550.0" y="194.0" text-anchor="middle" dominant-baseline="central">Pod 3</text>
<text class="s" x="550.0" y="212.0" text-anchor="middle" dominant-baseline="central">AccountController</text>
<path class="edge" d="M550 228 L550 246 L340 246 L340 262" marker-end="url(#k8s-en-arr)"/>
<rect class="box-muted" x="140" y="264" width="400" height="68" rx="10"/>
<text class="t" x="340.0" y="280.0" text-anchor="middle" dominant-baseline="central">PostgreSQL</text>
<text class="s" x="340.0" y="298.0" text-anchor="middle" dominant-baseline="central">SELECT … FOR UPDATE on the same Account</text>
<text class="s" x="340.0" y="316.0" text-anchor="middle" dominant-baseline="central">→ requests serialized at the DB</text>
<path class="edge" d="M340 332 L340 356" marker-end="url(#k8s-en-arr)"/>
<rect class="box" x="190" y="358" width="300" height="68" rx="10"/>
<text class="t" x="340.0" y="374.0" text-anchor="middle" dominant-baseline="central">Result</text>
<text class="s" x="340.0" y="392.0" text-anchor="middle" dominant-baseline="central">1 × success · 4 × HTTP 409</text>
<text class="s" x="340.0" y="410.0" text-anchor="middle" dominant-baseline="central">final balance correct, never negative</text>
<text class="lbl mono" x="340" y="448" text-anchor="middle" dominant-baseline="central">kubectl logs --prefix confirms all 3 Pods served requests</text>
</svg>

Scale to 3 replicas and fire 5 concurrent `withdraw` requests (funds for exactly 1 to succeed) through the Service — verified with two separate layers of evidence:

- **(a) Correct business result:** 1 request succeeds, 4 are rejected with HTTP 409 (`IllegalStateException` → `CONFLICT`), the final balance is exact, never negative, never double-debited.
- **(b) Requests really spread across ALL 3 different Pods** — confirmed with `kubectl logs --prefix`, logs tagged with the specific Pod name (`AccountController` reads `HOSTNAME` — the environment variable K8s sets to the Pod name — to log clearly which Pod handled which request). This includes a case where one Pod received 2 requests at once and serialized them correctly. This is evidence that the lock lives in the DB (independent of which Pod/JVM calls it), not that K8s happened to route every request to one place.

## Consequences

**Positive:**

- Experimental evidence (not just theoretical reasoning) that the overdraft invariant holds at the scale of a distributed, multi-instance system.

**Known limitation (not a hidden bug):**

- `OutboxEventPublisher` has no distributed lock when several Pods run `@Scheduled` at the same time — the 3 PoC consumers (Notification/Fraud Detection/Reporting) may log duplicates if several Pods pick up the same unpublished `OutboxEvent`. `AuditComplianceConsumer` is unaffected because it is already idempotent via the `processed_events` table (see [ADR-009](/en/adr/ADR-009-outbox-pattern-kafka-event-publishing)).

### Related

- [ADR-007](/en/adr/ADR-007-pessimistic-locking-withdraw) — the pessimistic locking mechanism re-verified at multi-Pod scale in this ADR.
- [ADR-009](/en/adr/ADR-009-outbox-pattern-kafka-event-publishing) — `OutboxEventPublisher` and the idempotent consumer, related to the known limitation with several Pods.
