# Architecture Overview

A cloud session platform must reconcile competing demands: strong tenant isolation, sub-second provisioning, elastic capacity, simple developer interfaces, and predictable operator economics. No single component can satisfy all of these demands, so every production platform we have examined resolves to a layered architecture in which each layer addresses a narrow set of concerns. This document describes the canonical layering used by the reference implementation and explains how each layer interacts with its neighbors.

## The four planes

We model a session platform as four cooperating planes: the management plane, the control plane, the data plane, and the storage plane. This terminology borrows from network equipment design, where separating forwarding decisions from forwarding execution made devices easier to reason about. The same principle applies here.

The management plane is the outermost layer. It hosts the public APIs, authentication endpoints, dashboards, quota configuration, billing integrations, and any tools that human operators or external automation use to administer the platform. Requests that arrive at the management plane are coarse-grained and infrequent relative to the data plane's request rate. Management plane services are typically implemented as stateless HTTP handlers sitting in front of a relational database.

The control plane accepts session lifecycle requests from the management plane and converts them into placement decisions, resource reservations, and workload dispatches. Control plane services include the scheduler, the reconciliation loop, the credential broker, the telemetry aggregator, and the cleanup coordinator. Control plane components communicate with each other through an internal event bus and a shared, highly consistent metadata store. Latency sensitivity is higher than the management plane but still measured in tens to hundreds of milliseconds per operation.

The data plane is the layer where tenant workloads execute. Each host in the data plane runs an agent that accepts workload dispatches from the control plane, provisions the requested sandbox, mounts filesystems, attaches networks, and streams logs and metrics back to the aggregator. The agent is responsible for enforcing the isolation promises made by the platform and for reporting lifecycle transitions accurately. The data plane experiences the highest request rate and tightest latency requirements in the system.

The storage plane holds durable state that outlives any single session. This includes object storage for artifacts, block storage for persistent volumes, and a content-addressed layer cache for workload images. The storage plane is accessed by both the control plane and the data plane through scoped credentials that prevent cross-tenant access.

## Request flow

Consider the lifecycle of a typical session request. A client issues an HTTPS call to the management plane requesting a new session tied to a named workload. The management plane authenticates the caller, validates the requested workload against the tenant's policy, checks quotas, and emits a CreateSession event to the control plane's event bus.

The scheduler consumes the event, selects a host from a candidate pool based on hardware class, current utilization, and affinity hints, and writes a reservation record into the metadata store. The credential broker mints short-lived credentials scoped to the session's tenant and workload. The scheduler dispatches the reservation and credentials to the chosen host's agent.

The agent on the data plane host pulls any required layer content from the storage plane, provisions a microVM or container using the workload definition, applies the scoped credentials, attaches networking, and emits a Running event once the sandbox is healthy. The control plane updates the session record and replies to the original request with an endpoint URL and an authentication token.

From the client's perspective, the entire sequence typically completes in well under a second when the host has a warm image cache, and in a few seconds during cold starts. Every stage is recorded as a discrete event, which enables both live status reporting and after-the-fact auditing.

## Warm pools and placement

A naive scheduler would allocate sessions to hosts based purely on current utilization. In practice, such a scheduler produces high tail latency because it ignores the cost of pulling images, initializing networking, and warming caches. Production platforms therefore maintain warm pools: groups of hosts pre-loaded with commonly requested workload images and ready to accept sessions with minimal setup.

Warm pool sizing is a classic queueing problem. Too few warm hosts and new requests pay cold-start latency; too many and the platform wastes money on idle capacity. The reference implementation sizes pools using a forecast derived from recent request rates and a target hit ratio, and rebalances pools across hardware classes on a short cadence. Warm pool membership is not pinned; a host may drift in and out of a pool as its cache contents change.

Placement also considers security affinity. Sessions belonging to the same tenant may be colocated to improve cache hit rates, while sessions from different tenants may be explicitly separated to reduce the blast radius of any isolation failure. The scheduler accepts placement hints from the management plane, allowing operators to enforce compliance requirements such as keeping certain tenants on dedicated hardware.

## Failure domains

Each plane has distinct failure domains, and the architecture exploits that separation to keep the platform available under partial outages. A control plane outage prevents new sessions from starting but does not terminate existing sessions, because the data plane continues to service traffic using previously delivered credentials. A storage plane outage may prevent new workload images from being pulled but does not affect sessions whose images are already cached locally.

The data plane is intentionally dumb: agents do not make scheduling decisions, and a host that loses contact with the control plane does not start new sessions. Instead, it runs existing sessions to completion and refuses further dispatches until reconnected. This design trades a small reduction in throughput under partition for a much simpler consistency story.

## Extensibility

Every real deployment grows features that the original designers did not anticipate. The reference architecture supports extensibility through two mechanisms: typed events on the control plane's bus, and pluggable agents on the data plane. New features typically begin by emitting a new event type and subscribing a new consumer, without touching the scheduler or agent core. When a feature genuinely requires host-level support, operators can deploy a sidecar agent that cooperates with the primary agent through a well-defined local interface. Both mechanisms avoid the long compatibility tail that comes from modifying core services whenever a new workflow appears.

Together, these choices produce a platform that is easy to reason about, resilient to partial failures, and amenable to incremental evolution. The remaining documents in this series walk through specific subsystems in more detail.
