# Data Persistence Patterns

Cloud sessions are ephemeral by design, but the work performed inside them is usually not. A notebook session that produces a report, a build session that generates an artifact, a debugging session that captures a stack trace, and an agent session that drafts a document all produce data that must outlive the session itself. The platform must therefore offer persistence primitives that are easy to reason about, respectful of tenant boundaries, and compatible with the short-lived, stateless-by-default nature of sandboxes. This document surveys the persistence patterns supported by the reference implementation and discusses how to choose among them.

## Storage surfaces

The platform exposes four storage surfaces, each suited to a different kind of data. Understanding the intended use of each surface is the first step to designing a persistent workload.

The scratch surface is a local filesystem scoped to a single session. It is fast, private to the session, and discarded when the session terminates. Scratch storage is appropriate for intermediate files that the workload does not need after termination: compiler outputs, temporary databases, extracted archives, and the like. The platform does not back up the scratch surface and does not guarantee that its contents survive any failure.

The artifact surface is an object store scoped to a tenant, with paths organized by session. When a session declares one or more output paths, the agent uploads the contents of those paths to the artifact surface during graceful shutdown. Artifacts are immutable once uploaded, addressed by both human-readable keys and content hashes, and retained according to the tenant's configured retention policy. Artifacts are the primary way workloads publish results beyond the session boundary.

The volume surface provides persistent block storage that can be attached to a session at creation time. Volumes preserve filesystem contents across sessions and can be mounted into successive sessions to provide continuity. Volumes are scoped to a tenant, are encrypted with tenant-managed keys, and can be snapshotted for backup or cloning. Volume attachments are exclusive: two sessions cannot mount the same volume simultaneously, because doing so would invite filesystem corruption.

The keyvalue surface is a small, strongly consistent key-value store scoped to a tenant. It is designed for session metadata, small configuration blobs, and coordination primitives. The keyvalue surface is not intended to be a general-purpose database; it exists to handle the cases where a tenant needs slightly more than local state but much less than a full durable store. Size limits, request-rate limits, and latency targets are documented alongside the API.

## Choosing a surface

A useful rule of thumb is to pick the least durable surface that still satisfies the workload's requirements. Less durable surfaces are faster, cheaper, and have fewer failure modes. Durable surfaces are slower, costlier, and introduce coordination concerns. Matching durability to need keeps workloads responsive and bills predictable.

Intermediate computation should use scratch. Final outputs that clients will retrieve later should use artifacts. Data that must be available to the next session in a series, such as a cached dependency tree or an accumulating project directory, should use volumes. Small pieces of cross-session coordination state should use the keyvalue surface.

Workloads that stretch a less durable surface to cover a more durable need run into trouble quickly. For example, a workload that writes final outputs only to scratch loses those outputs the moment the session terminates. A workload that stores large data sets in the keyvalue surface hits rate limits and experiences unpredictable latency. Early architectural clarity on which surface carries which data prevents these problems.

## Consistency and atomicity

Each surface provides different consistency guarantees. The scratch surface is a local filesystem and behaves like one: posix semantics within a single session, no sharing, no distributed concerns. Artifacts are eventually consistent across read replicas but strongly consistent with respect to the originating session's termination event; in practice, clients that wait for a terminated event before reading artifacts observe read-your-writes behavior. Volumes provide full filesystem semantics, including fsync durability, but only while mounted. The keyvalue surface provides linearizable reads and compare-and-swap writes.

Atomicity across surfaces is not provided. A workload that wants to publish both an artifact and a keyvalue update atomically must design its own protocol, typically by writing the artifact first, then performing a compare-and-swap on a keyvalue entry that points to the artifact's content hash. Clients reading the keyvalue entry can treat the presence of a hash as proof that the artifact exists.

## Encryption

All persistent surfaces are encrypted at rest. Artifacts, volumes, and keyvalue entries are encrypted with tenant-scoped keys managed through a hosted key management service, with tenants able to bring their own keys if required by compliance policy. Scratch storage on the host is encrypted with a host-scoped key that rotates on every boot, so any failure to wipe the disk still yields inaccessible ciphertext.

In transit, every call to a persistent surface uses TLS with certificate pinning to the platform's own certificate authority. The agent inside a session can therefore be confident it is talking to the correct storage service, and the storage service can be confident it is serving the correct agent. Internal audits verify these invariants periodically.

## Tenant isolation

Persistent data is the most sensitive part of the platform; a cross-tenant data leak is a catastrophic failure mode. The platform defends against it at multiple layers. Access to a persistent surface requires a session credential that encodes the tenant. The storage service verifies the credential on every request and additionally verifies that the path being accessed falls within the tenant's prefix. Background jobs that traverse data, such as retention enforcement, run with credentials scoped to a single tenant and are audited for any attempted access outside that scope.

Tenant isolation is tested continuously. The platform includes a chaos suite that attempts to access each tenant's data using another tenant's credentials and fails the build if any such attempt succeeds. Live production traffic is sampled for cross-tenant anomalies, and any anomaly triggers an immediate incident review.

## Retention and deletion

Tenants control retention. The platform's defaults err on the side of keeping data, because recovering from accidental deletion is much harder than extending retention. However, tenants can configure aggressive retention to meet compliance requirements, and they can issue explicit deletion requests to remove specific data immediately. Deletion is propagated across all replicas and verified by a reconciliation sweep. The platform produces a cryptographic attestation for each deletion request, so tenants can prove to their auditors that the data is gone.

By combining four storage surfaces with clear intended uses, rigorous encryption, and disciplined tenant isolation, the platform offers persistence primitives that are powerful enough for real workloads yet simple enough for developers to adopt confidently.
