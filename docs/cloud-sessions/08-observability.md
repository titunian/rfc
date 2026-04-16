# Monitoring and Observability

A session platform cannot be operated by intuition. The request volume is too high, the concurrency too great, and the failure modes too subtle. Operators must see, almost in real time, what the platform is doing, and they must be able to trace any given request backward through every service that touched it. This document describes the observability architecture used by the reference implementation and the practices that make it useful rather than merely voluminous.

## Three pillars, revisited

The canonical observability pillars are metrics, logs, and traces. The reference implementation treats each pillar as necessary but insufficient on its own, and deliberately connects them so that one can navigate between them.

Metrics summarize behavior. Each service emits a core set of counters, gauges, and histograms describing request volume, latency, error rate, and resource utilization. Metrics are aggregated on a short cadence and stored in a time-series database optimized for high-cardinality tags. Operators rely on metrics for dashboards, for most alerting, and for capacity planning. A healthy set of metrics allows operators to notice anomalies within seconds of onset.

Logs record events. The platform uses structured logs, meaning every log line is a key-value document parseable by machines as well as humans. Structured logs preserve the specific detail that metrics summarize away: the exact principal that made a request, the exact image digest a session pulled, the exact error code returned by a downstream service. Logs are stored in a full-text indexed store that supports both field lookups and free-text search.

Traces connect the hops a single request took across services. Each request entering the management plane is assigned a trace identifier, and every downstream call propagates that identifier. The trace backend reconstructs the causal graph and displays it as a flame chart, making it straightforward to see which hop contributed the majority of a request's latency or which hop returned the failure.

## Consistent tagging

Observability data is only useful if it can be correlated. The reference implementation enforces a small set of mandatory tags across metrics, logs, and traces: tenant identifier, session identifier when applicable, workload name, request type, region, and service name. Because every observability artifact carries these tags, an operator can move from a spike on a dashboard to the specific logs from the affected tenant to the specific traces from the slowest requests without manual stitching.

Cardinality discipline keeps tagging sustainable. Tags whose values have high cardinality, such as raw user input, are rejected at ingestion to protect storage from explosion. Tags whose values are predictable, such as enumerated status codes, are encouraged. The enforcement layer catches attempts to introduce high-cardinality tags during code review rather than after they reach production.

## The golden signals

Dashboards for every service prominently display four golden signals: traffic, error rate, latency, and saturation. Traffic is the request rate. Error rate is the fraction of requests returning an error classified as the service's fault. Latency is expressed as p50, p95, and p99 percentiles, because averages hide tail behavior that users notice. Saturation is resource utilization relative to capacity, often displayed as CPU, memory, and queue depth.

Operators can read the golden signals at a glance. A spike in traffic with stable error rate is usually benign load; a stable traffic with rising error rate is usually a backend problem; stable everything except latency is usually a slow dependency; and rising saturation with stable traffic is usually a resource leak. Good intuition about the four signals, built through repeated dashboard review, greatly accelerates incident triage.

## Alerting policy

Alerting transforms observability into operator action. Too few alerts and problems go unnoticed. Too many and operators tune them out. The reference implementation follows a symptom-based alerting policy: alerts fire on user-visible symptoms, not on internal causes. A single alert saying "session creation success rate has fallen below the threshold for ten minutes" is preferred over a dozen alerts about individual queue depths or retry counts, because the first alert represents something the user cares about while the others represent intermediate conditions that may not.

Every alert has a runbook. The runbook is a short document linked from the alert that explains what the alert means, what diagnostic queries to run, and what remediation to attempt. Runbooks reduce the cognitive load on paged engineers, especially those who are not primary owners of the alerting service, and they accumulate institutional knowledge that survives team changes.

Alert fatigue is tracked explicitly. Teams review the ratio of actionable to non-actionable alerts monthly, and any alert that is primarily non-actionable is either tuned, suppressed, or removed. Keeping the signal-to-noise ratio high is a continuous effort that pays dividends in responder morale.

## Tracing the long tail

Flame charts are at their most useful for understanding the long tail of latency. Most requests are fast, but a small fraction are not, and the slow ones often reveal root causes invisible in aggregate metrics. The platform retains a sample of traces biased toward slow requests, so that a p99 latency regression can be investigated by reading specific, representative traces rather than guessing.

Sampling decisions are made at the edge based on latency, error status, and tenant priority. Fast, successful requests are sampled at low rates, while slow or failed requests are retained in full. The result is a trace store whose contents skew toward the cases operators most want to investigate, without the storage cost of retaining every trace.

## User-facing observability

Tenants get their own observability surface. Each tenant can see their own session history, lifecycle events, artifact listings, and rate-limit counters. Tenants can also subscribe to a webhook that delivers a stream of events about their workloads, enabling them to integrate platform activity into their own monitoring stack. Exposing observability to tenants reduces support load and respects the principle that tenants should be able to verify claims the platform makes about their usage.

## Audit integration

Observability and security audit streams are related but distinct. Observability is optimized for operational debugging and is retained for a moderate window. Audit data is optimized for long-term compliance review and is retained for years, in a tamper-evident store. The reference implementation cross-references the two streams by trace identifier so that an auditor investigating a specific incident can see both the security-relevant actions and the corresponding operational context.

Observability is a discipline as much as a technology. Dashboards that nobody reads, alerts that nobody tunes, and runbooks that nobody updates rot quickly. The reference implementation treats observability hygiene as a first-class engineering responsibility, with on-call rotation requirements including time spent reviewing and improving the data itself, not just reacting to it.
