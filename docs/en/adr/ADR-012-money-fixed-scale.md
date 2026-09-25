# ADR-012: Money — Fixed Scale of 2, Not Strict ISO 4217

## Context

While running the tests on Oracle ([ADR-011](/en/adr/ADR-011-oracle-dual-profile-support)), it turned out that Oracle `NUMBER` does not preserve a fixed scale on read (unlike PostgreSQL `NUMERIC`, which keeps the declared scale) — this is standard Oracle behaviour, not a database bug.

Trying to fix it with `Currency.getDefaultFractionDigits()` (the ISO 4217 standard) revealed a deeper conflict: under ISO 4217, VND has 0 decimal places, but the whole domain model of the project (from the Audit Trail to Redis) had implicitly assumed VND has 2 decimal places throughout.

## Options Considered

### Option A — Use `Currency.getDefaultFractionDigits()` (exact ISO 4217)

- Correct per the international standard, but it would throw for VND values with a fractional part (e.g. the 999.99 VND test case) — requiring changes to all existing tests/data from the 4 previous features (Ledger, Transaction Aggregate, Outbox/Kafka, Redis cache).

### Option B (chosen) — Fix `scale = 2` for EVERY currency, not following ISO 4217

- No change in behaviour/data for the features already built.

## Decision

Choose **Option B**. Reason: many real core banking systems keep decimal precision in intermediate calculations (interest, percentage fees) regardless of a currency's native fraction digits — rounding only happens at the presentation layer. This is a deliberate simplifying assumption, not an oversight.

`Money.java` changed: `setScale(2, RoundingMode.UNNECESSARY)` is enforced in a dedicated constructor (`private Money(BigDecimal, Currency)`) — every way of creating `Money` (`of`, `zero`, `add`, `subtract`) goes through it and is normalized to scale=2 automatically; `RoundingMode.UNNECESSARY` means any place that creates `Money` with a value that is not exact at scale=2 throws right there instead of silently rounding incorrectly.

## Consequences

**Positive:**

- 45/45 tests pass on both databases, and the value object's invariant is now self-enforced (no longer "correct by luck because Postgres `NUMERIC` kept the scale for us").

**Recorded risk:**

- If real multi-currency support with different native fraction digits is needed later (e.g. JPY = 0, BHD = 3), this decision must be revisited — a fixed scale of 2 would no longer be correct for those currencies.

**Lesson:**

- Running the same domain model on several databases can reveal hidden assumptions that a single environment conceals — here, `Money` had never normalized its scale and was only "accidentally correct" because Postgres `NUMERIC(19,2)` always returned exactly 2 decimal places on read.

### Related

- [ADR-011](/en/adr/ADR-011-oracle-dual-profile-support) — running the tests on Oracle is where this problem was found.
