# Session Lifecycle Management

Every cloud session follows a well-defined lifecycle from creation through termination, and every participant in the platform depends on that lifecycle being accurate, observable, and consistent. Schedulers rely on lifecycle transitions to reclaim capacity. Billing relies on them to meter usage. Clients rely on them to know when a session is ready to accept work. Tenants rely on them to prove that their data has been destroyed. A platform that mismanages lifecycle, even occasionally, quickly loses the confidence of its users. This document describes the state machine used by the reference implementation, the events emitted at each transition, and the operational practices that keep the machine correct.

## States

A session progresses through seven primary states: requested, scheduled, provisioning, running, idle, terminating, and terminated. Each state carries precise semantics.

A session enters the requested state when the management plane accepts a valid creation request. Requested means that the caller has been authenticated, the request has been logged, and the request is now the responsibility of the control plane. No resources have been allocated yet.

A session moves to scheduled when the scheduler selects a host and writes a reservation record. Scheduled is the first state at which resource capacity is committed. A scheduled session has an identified host but has not yet begun provisioning.

Provisioning covers the interval during which the data plane agent is pulling images, creating sandboxes, attaching networks, and performing any required initialization. Provisioning is the most failure-prone phase because it touches the most moving parts. The agent reports granular progress events so that operators can distinguish failures caused by image pulls from those caused by networking.

A session becomes running once the agent reports a healthy sandbox and an addressable endpoint. Running is the state in which the workload accepts tenant traffic. Most of a session's wall-clock time is typically spent in this state.

Idle is an optional substate of running reserved for sessions that have not received traffic for a configured interval. Idle sessions may be eligible for suspension or early termination depending on workload policy. Clients see idle sessions as still running; the state exists primarily to support capacity reclamation.

Terminating begins when any actor, including the tenant, the platform, or an automated policy, requests that the session stop. During termination the agent executes any configured graceful shutdown, persists declared artifacts to the storage plane, and releases resources. Terminating is intentionally a distinct state so that observers can distinguish orderly shutdown from abrupt failure.

Terminated is the terminal state. A terminated session no longer consumes resources and cannot be revived. Its metadata is retained for a bounded window to support auditing and billing reconciliation, then either archived or deleted according to tenant policy.

## Transitions and invariants

Transitions between states are driven by events, never by polling. The control plane's event bus is the authoritative record of what has happened to a session. Every state change produces an event that carries the session identifier, the new state, a timestamp, the causing actor, and any relevant error detail.

The state machine enforces several invariants. A session cannot skip states; every transition must be explicit. A session cannot return to an earlier state; the progression is monotonic. A session can only enter terminating from requested, scheduled, provisioning, running, or idle, and it can only enter terminated from terminating. These invariants simplify downstream consumers: a billing service that sees a terminated event can be confident that no further running events are possible for that session.

When the state machine receives an event that would violate an invariant, it logs the anomaly, drops the event, and raises a monitoring alert. Dropping rather than applying the event keeps the authoritative record consistent even if upstream producers misbehave.

## Timeouts and automatic termination

Every session has at least three time-related bounds. The provisioning timeout caps how long the platform will wait for a healthy sandbox before giving up and transitioning to terminating. The maximum lifetime caps how long a session can remain running regardless of activity. The idle timeout caps how long a session can remain idle before the platform terminates it to reclaim capacity.

Defaults for each bound are set by the platform, but tenants can override them within policy-defined ranges. Aggressive bounds reduce cost and limit blast radius; generous bounds are necessary for workloads with long initialization or slow-flowing user interaction. Clients can also extend a session's maximum lifetime programmatically, subject to authorization, to support workloads whose duration cannot be predicted in advance.

Timeouts are enforced by a dedicated reaper service that reads the metadata store, identifies sessions eligible for termination, and emits terminate events. The reaper is idempotent: re-running it cannot produce incorrect behavior. This allows operators to replay the reaper after any partial outage without worrying about double-terminations.

## Graceful shutdown and artifact preservation

When a session enters terminating, the agent sends a configured shutdown signal to the workload and waits for it to exit within a grace period. A well-behaved workload uses this time to flush buffers, commit in-progress transactions, and write artifacts to a designated output directory. After the grace period elapses, the agent forcibly terminates any remaining processes.

Artifact preservation happens immediately after the workload exits. The agent reads declared output paths, computes content addresses, and writes the results to the tenant's storage plane bucket. Only after artifacts are durably stored does the agent report the terminated event. This ordering ensures that a terminated event always implies that the tenant's declared outputs are available.

## Client interfaces

Clients observe lifecycle transitions through two complementary interfaces. A polling endpoint returns the current state of a session, useful for simple scripts. A streaming endpoint delivers lifecycle events in real time over a long-lived connection, useful for dashboards and automated workflows. Both interfaces carry the same event payloads, and both enforce the same authorization checks against the requesting principal.

The streaming interface supports catch-up: clients can reconnect after a disconnect and request all events since a last-seen cursor. This allows clients to maintain accurate views even across transient network failures.

## Operational discipline

A lifecycle system is only as good as the operational practices that support it. The reference implementation depends on several practices: alert when any state transition takes longer than its historical 99th percentile, alert when the reaper backlog grows, alert when terminated events lag running events for too long, and periodically reconcile the metadata store against the actual state reported by data plane agents. These practices catch silent failures before they accumulate into visible outages.
