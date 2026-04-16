# Scaling and Performance

A cloud session platform is simultaneously a batch system, an interactive system, and a control system. It schedules bounded pieces of work like a batch system, exposes live endpoints like an interactive system, and coordinates across thousands of moving parts like a control system. Each of those roles imposes its own performance requirements, and optimizing naively for one can make the others worse. This document collects the scaling properties, bottlenecks, and performance techniques that the reference implementation uses to keep each role healthy as traffic grows.

## The relevant dimensions

Performance conversations about session platforms become confused when participants fail to specify which metric they mean. At least six dimensions matter.

Startup latency is the time between a client issuing a create request and the returned session becoming usable. It is the most visible metric from a user perspective, because every interactive workflow begins with a wait. Startup latency combines scheduling time, image pull time, sandbox creation time, and workload initialization time.

Steady-state latency is the time between a client issuing a call to a running session and receiving a response. It depends on the workload's internal design much more than on the platform's, but the platform contributes a networking and authorization overhead that must be kept low.

Throughput is the number of requests per second the platform can sustain. For most deployments the interesting throughput is the creation rate, because running sessions do not consume control plane capacity in steady state. A platform that can start a thousand sessions per second must schedule, authorize, and dispatch at that rate without queueing.

Capacity is the total number of concurrent sessions the platform can host. It is bounded by data plane resources, but also by control plane metadata store size and by the aggregate policy evaluation rate.

Cost efficiency is the money spent per session-hour, dominated by compute amortization and storage. A fast but expensive platform may be uncompetitive against a slower rival; an efficient but slow platform may lose interactive customers.

Predictability is the variance of each of the above metrics. Users tolerate slow systems much better than they tolerate unpredictable ones, because the latter defeat scheduling and retry logic.

## Startup latency in detail

Startup latency is the dimension most worth optimizing aggressively, because every session pays it once, and interactive workflows are sensitive to it. The reference implementation attacks startup latency on several fronts.

Warm pools, described earlier, preload images and sometimes preprovision sandboxes so that a new session can attach to an already-warm host. A session that lands on a fully warm host can be usable in tens of milliseconds; a session that lands on a cold host may wait several seconds for image pulls.

Image layer deduplication ensures that shared base layers are pulled once per host and then reused across workloads. Deduplication pays dividends because most workloads on a given host are variants of a small number of base images.

Incremental snapshots allow a workload to capture its initialized state once and resume new sessions from that snapshot instead of rerunning initialization. Snapshots work particularly well for workloads with heavy startup costs, such as language runtimes that must parse large standard libraries.

Eager networking sets up the session's network namespace in parallel with image pulls, so that networking is not a serial item on the critical path. Eager credential delivery similarly hands the agent scoped credentials before the sandbox is ready, so credential verification is not a serial item either.

The combination of these techniques reduces p50 startup latency to a few hundred milliseconds and p99 to a few seconds on typical workloads. Further improvement is possible but requires cooperation from the workload itself, which the platform cannot dictate.

## Throughput and horizontal scaling

Throughput constraints usually appear first at the control plane. A single scheduler instance can place only so many sessions per second, bounded by metadata store write latency and policy evaluation cost. The reference implementation shards the scheduler by host pool and by tenant prefix, allowing operators to add instances as traffic grows. Each shard owns a disjoint set of hosts, so placement decisions are independent.

The metadata store itself is shared across shards and must handle the aggregate write rate. The reference implementation uses a replicated log fronting a materialized view: writes append to the log in O(1) time and are applied asynchronously to the view. This keeps write latency independent of view complexity. Queries read from the view, which can be scaled horizontally by adding read replicas.

The event bus used for lifecycle transitions is a partitioned log with consumer groups. Adding partitions increases throughput linearly, with the only constraint being that events for a single session must remain in a single partition to preserve ordering. Consumer groups allow new downstream services to subscribe without affecting existing consumers.

## Data plane scaling

The data plane scales by adding hosts. Each host runs a fixed number of agents, and each agent hosts a configurable number of sandboxes. Adding hosts is straightforward; the non-trivial part is keeping utilization high without bursting into resource contention.

Utilization is tracked per host and per resource class, including CPU, memory, disk IO, and network bandwidth. The scheduler avoids hosts that are near any threshold and prefers hosts whose current mix of sessions complements the incoming session's likely resource profile. Resource profiles are estimated from historical data for the requested workload and refined with observed behavior over time.

The platform also supports burst credits for workloads that occasionally exceed their nominal resource request. Burst credits accumulate during idle periods and are consumed during spikes, allowing bursty workloads to coexist with steadier ones without paying for peak capacity continuously.

## Performance testing

Scaling changes are difficult to validate without realistic load. The reference implementation includes a load generator that replays anonymized production traces against a dedicated performance environment. The generator is deterministic when seeded, which makes regression detection straightforward. Benchmarks run on every scheduler change, every agent change, and every metadata store migration. Any regression on a headline metric requires explicit acknowledgement before the change can merge.

Production also carries synthetic probes: small, short sessions issued by the platform itself at a steady rate, whose latency is a leading indicator of user-visible issues. Probes run in every region and against every major hardware class. Alerts fire when probe latency drifts outside expected ranges, often catching problems before user reports arrive.

## Graceful degradation

No platform stays healthy forever. When capacity runs low, the platform degrades gracefully rather than collapsing. Low-priority tenants see longer queue times first, free-tier workloads are shed before paid ones, and purely optional features such as deep telemetry are throttled before core scheduling is affected. These behaviors are documented in tenant-facing status pages so that users understand what to expect during incidents. Graceful degradation is not a substitute for adequate capacity, but it keeps the platform useful rather than unavailable during the minutes it takes to add more.
