# Security Best Practices

A session platform is, from a security perspective, a target-rich environment. It concentrates user credentials, executes arbitrary code, handles tenant data, and bridges trust boundaries dozens of times per second. Any carelessness produces not just a local vulnerability but a systemic one. This document summarizes the security practices used in the reference implementation, written at a level that lets reviewers and implementers adopt them in their own deployments. It is not a complete threat model, and every operator is encouraged to perform one appropriate to their specific deployment.

## Defense in depth

The platform assumes any single security control will eventually fail. The goal is that failure of one control does not lead to compromise; the next control must catch it. This principle shapes every design choice that follows.

Network boundaries are enforced at multiple layers: cloud provider security groups, host-level firewalls, per-sandbox network namespaces, and application-level mutual TLS. A workload that escapes its sandbox still faces host firewalls; a compromised host still faces cloud-level security groups; a compromised security group still faces application authentication. No single breach reveals the whole system.

Credentials are scoped as narrowly as the platform can arrange. Session credentials carry only the permissions needed for the declared workload. Agent credentials can dispatch workloads but cannot modify tenant data directly. Operator credentials that can touch tenant data require two-person approval for sensitive operations. A stolen credential grants the attacker only a narrow slice of the system.

Monitoring watches every layer. Even if all preventive controls fail, detective controls are expected to notice the anomaly quickly and raise an alert. The platform invests heavily in logs, metrics, and anomaly detection precisely because prevention alone is insufficient.

## Sandbox isolation

The sandboxing layer is the most critical security component: it is the boundary between untrusted tenant code and the platform's shared infrastructure. The reference implementation uses microVMs for workloads that require strong isolation and hardened containers for workloads that do not. Microsecond-order startup, combined with per-sandbox kernels, keeps isolation strong without sacrificing latency.

Each sandbox runs with the minimum capabilities required. Linux capabilities not required by the workload are dropped. Seccomp filters restrict the syscall surface, with per-workload profiles tuned against behavior observed during testing. The sandbox filesystem is mounted read-only where possible, with writes restricted to the scratch surface and declared output paths.

Network access from a sandbox is mediated by an egress proxy. The proxy enforces domain allowlists, applies rate limits, and logs requests. Workloads that legitimately need internet access opt in explicitly, and their allowlists are reviewed during onboarding. The default is no egress, because it is easier to grant than to revoke.

## Supply chain integrity

Workload images are pulled from the platform's registry, which itself pulls from upstream sources. Images are verified by content hash on every pull, and signatures from trusted publishers are verified against a pinned set of public keys. Any image without a valid signature is refused unless the tenant has explicitly allowed unsigned images for their workloads.

Platform binaries are built reproducibly and signed by a hardware security module. Agents on the data plane verify binary signatures on every start and refuse to run unsigned code. Operators cannot ship new binaries to production without the signing ceremony, which involves two-person integrity review and logging of every signature request.

Third-party dependencies are vetted through a software bill of materials process. Every dependency is tracked, every version change is reviewed, and known vulnerabilities are assessed for impact within a short window. Dependencies flagged as compromised are removed or pinned to known-good versions until a trusted update is available.

## Secrets management

Secrets never touch the filesystem of the build environment. They are injected at runtime from a dedicated secrets service that enforces access policy and rotates credentials on a short cadence. Secrets fetched at session start are delivered through memory-only channels where possible, and any short-lived on-disk representation is encrypted with a per-session key that is discarded at termination.

The platform's own secrets, including signing keys and database passwords, are stored in a hardware-backed vault. Access to the vault requires a combination of role assignment, step-up authentication, and a short-lived session. Every access is logged and subject to audit.

## Auditing and incident response

Every privileged action is logged in a tamper-evident store. The store is append-only, signed by the writer, and replicated across regions. Any attempt to modify historical entries is detected by the next signature check. Tamper-evident logs are the foundation of both routine audits and incident investigations.

When an incident occurs, responders follow a documented playbook. The playbook covers triage, containment, eradication, recovery, and postmortem. Each step has owners, expected durations, and escalation criteria. Incident commanders rotate on a weekly schedule, and every responder practices by participating in tabletop exercises at least quarterly.

Tenant communication is planned in advance. Incidents that touch tenant data trigger notifications within timelines required by applicable regulation and tenant contracts. Incident postmortems that affect tenants are shared in summary form so tenants can update their own risk assessments.

## Secure defaults

Configuration choices shape security more than any single feature. The platform defaults to the more secure option wherever users are unlikely to notice: egress off, logging on, signing required, encryption enabled, retention conservative, quotas tight. Opting into less secure configurations is possible but always explicit, always logged, and often gated by additional policy review.

Secure defaults matter because the overwhelming majority of users do not change defaults, and defaults therefore determine the security of the overwhelming majority of deployments. Investing in good defaults is one of the highest-leverage activities a security team can perform.

## Regular review

Security posture drifts without deliberate maintenance. The reference implementation runs a quarterly security review that revisits threat models, compares them against recent incidents, updates mitigations, and retires obsolete controls. External penetration testing runs at least yearly, with scope negotiated to cover both new features and longstanding infrastructure. Findings feed back into the engineering backlog with priority proportional to severity and exploitability.

Security is never finished, but disciplined practice keeps a platform's risk within acceptable bounds. The techniques above, applied consistently and measured honestly, give operators and tenants grounded confidence that the platform they depend on is worth depending on.
