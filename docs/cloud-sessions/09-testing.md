# Testing Strategies

Testing a cloud session platform is challenging because the system combines distributed state, latency-sensitive scheduling, security-critical isolation, and a public API that evolves continuously. No single test type catches every regression, and relying on any one approach produces blind spots that eventually reach production. This document describes the layered testing strategy used by the reference implementation and explains how each layer earns its cost.

## A layered pyramid

The testing pyramid begins with fast, narrow unit tests at the base and widens upward through integration tests, system tests, and end-to-end tests at the top. The pyramid shape reflects cost: unit tests are the cheapest to write and run, and end-to-end tests are the most expensive. A healthy codebase has many more tests at the base than at the top, because narrow tests give sharp signals while broad tests give diffuse ones.

Unit tests validate individual functions and classes in isolation. They run in milliseconds, produce clear failure messages when they break, and are the first line of defense against regressions. The reference implementation expects every non-trivial function to carry unit tests that cover normal operation, error paths, and edge cases.

Integration tests validate pairs and small groups of components talking to each other. Examples include the scheduler calling into the metadata store, the credential broker calling into the key management service, and the agent calling into a local sandbox runtime. Integration tests run in seconds, not milliseconds, and they require fixtures that mirror production interfaces closely enough to catch real mismatches.

System tests exercise the platform as a whole, typically with real data plane agents running against real control plane services, but with synthetic workloads and synthetic traffic. System tests run in minutes and serve primarily to validate that the components integrate correctly end to end. They catch issues such as protocol drift between services, configuration mismatches, and unexpected ordering effects.

End-to-end tests drive the platform through its public API exactly as a customer would. They are slow, brittle, and expensive, so they focus on the most important user journeys rather than covering every code path. A well-chosen set of end-to-end tests catches the subset of regressions that unit, integration, and system tests miss, while staying small enough to run frequently.

## Property-based testing

Several components of the platform have behaviors that are hard to describe in individual cases but easy to describe as properties. The session lifecycle state machine, for example, has the property that transitions are monotonic and that certain events are idempotent. Property-based tests generate random input sequences and verify that properties hold, often finding edge cases that example-based tests miss.

The reference implementation uses property-based tests for the scheduler's placement algorithm, the credential broker's scope derivation, the metadata store's consistency invariants, and the reaper's idempotence. Each property test is seeded deterministically so failures are reproducible, and the framework shrinks failing inputs to minimal cases that are easy to debug.

## Load and soak

Correctness is necessary but not sufficient. A platform that works under light load can still fail at scale because capacity, concurrency, and timing produce bugs invisible at small sizes. The reference implementation runs load tests that replay anonymized production traces against a dedicated performance environment, with throughput scaled up to stress expected peak conditions plus a safety margin.

Soak tests run continuously for hours or days, exercising the platform steadily to reveal resource leaks, scheduling biases, and degradation under sustained load. Soak tests have caught issues such as a slowly-growing metadata cache, a scheduler that favored certain hosts over time, and a memory leak in the log shipper that only manifested after days. None of these would have been visible in a short test run.

## Chaos engineering

A distributed system is always partially broken; the question is only whether the breakage is severe enough to be noticed. Chaos engineering injects faults deliberately so that the platform's response can be measured and improved before real faults occur. The reference implementation practices chaos engineering at multiple levels.

At the infrastructure level, chaos tests terminate random hosts, partition network segments, and degrade disk IO. The platform is expected to detect the fault, isolate it, and continue serving unaffected sessions with minimal disruption. Metrics and alerts during chaos tests are reviewed alongside the platform's behavior.

At the service level, chaos tests slow down specific endpoints, inject errors into specific responses, and delay message delivery on specific partitions. The goal is to verify that timeouts are configured correctly, that retries do not cascade into outages, and that bulkheads isolate failures to a single subsystem.

At the tenant level, chaos tests attempt to access data across tenant boundaries using forged credentials, malformed tokens, and replayed requests. The platform is expected to refuse every attempt, and any successful cross-tenant access fails the test immediately and triggers a security incident.

## Canary deployments

Pre-production testing cannot catch every issue; some regressions only appear under the exact traffic mix that production carries. The reference implementation deploys changes through a canary process that exposes new code to a small fraction of traffic, compares its observable behavior to the previous version, and only promotes the change if the comparison is favorable.

Canary comparison uses both headline metrics, such as error rate and latency, and deeper signals, such as distributional shifts in response bodies and changes in downstream call patterns. A regression in any dimension halts promotion automatically and routes the change back to the engineering team for investigation.

Canary deployments are particularly important for changes that interact with scheduling, placement, or caching. These areas are difficult to exercise fully in pre-production because their behavior depends on traffic patterns that are hard to replicate. Gradual exposure in production, with fast rollback, catches the regressions that test environments miss.

## Test data management

Every test layer depends on test data, and test data quality shapes test outcomes more than any other factor. The reference implementation manages test data with a few disciplines. Unit tests use small, handcrafted fixtures that exercise specific conditions. Integration and system tests use synthesized data drawn from a shared generator that produces realistic shapes at controlled scale. End-to-end tests use replayed anonymized production traces.

Anonymization is performed at capture time, not at test time, so that test environments never touch raw customer data. Anonymization pipelines preserve structural properties, such as the distribution of session durations, while replacing sensitive values with synthetic equivalents. Periodic audits verify that anonymization is effective.

## Regression discipline

Every bug that reaches production results in a regression test. This practice ensures that the same bug never returns, and it gradually expands the test suite toward the shapes of failures that have actually occurred. Regression tests are tagged with the incident they correspond to, so future engineers reading the test know both what it checks and why it exists.

The test suite is not a museum; tests that no longer provide value are retired. A test whose failure mode can never recur, because the underlying code has been removed, is deleted rather than maintained forever. Disciplined curation keeps the suite fast and relevant, which keeps engineers willing to run it frequently.

Testing is most successful when it is part of ordinary engineering rhythm rather than a separate activity owned by a separate team. The layered strategy described here distributes testing across unit, integration, system, end-to-end, property, load, soak, chaos, and canary layers precisely so that every engineer, at every stage of the development process, has a test layer appropriate to their immediate question.
