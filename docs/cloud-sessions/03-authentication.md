# Authentication and Authorization

Cloud sessions are, by definition, multi-tenant: a single platform concurrently hosts work for many principals who must not be allowed to observe or disturb one another. This requires a disciplined approach to identity. Every request into the platform must carry verifiable claims about who is calling, every dispatch to the data plane must carry verifiable claims about what the session is allowed to do, and every piece of telemetry emitted by the platform must carry verifiable claims about which principal owns it. This document walks through the authentication and authorization primitives used by the reference implementation and the trade-offs they embody.

## Identity sources

The platform does not maintain its own primary user database. Instead, it federates with upstream identity providers using OpenID Connect for interactive users and with short-lived workload identities for machine callers. Federation has two major benefits. First, operators avoid the risk and cost of running a bespoke password or credential store. Second, tenants can apply their existing identity lifecycle practices, such as provisioning, deprovisioning, and multi-factor requirements, without the platform needing to reinvent them.

Each tenant configures one or more identity providers, and the platform records the providers' public keys along with a mapping from provider-issued subject identifiers to internal principal records. Internal principals are the objects against which authorization policies are written. A principal can be a human user, a service account, or an automated agent, and it may be annotated with attributes such as team membership, role assignments, and compliance tags. Attributes flow from the identity provider's claims into the internal record on each login, with any transformations performed by a configurable mapping layer.

For programmatic access, the platform issues short-lived API tokens signed with the platform's own key. Tokens encode the principal, the tenant, a set of scopes, and an expiry. They are issued by the management plane in exchange for a valid OIDC token or an equivalent workload credential. Tokens are deliberately short-lived, typically measured in minutes, to limit the window during which a leaked token can be abused.

## The authorization model

The authorization model is attribute-based. Every request carries a principal, the principal carries attributes, and every resource the platform exposes has its own attributes. A policy engine evaluates a small decision function against the combination of principal attributes, resource attributes, requested action, and request context. This approach, sometimes called ABAC, is flexible enough to express both role-based patterns and more granular rules such as time-of-day restrictions or geofencing.

Policies are stored as declarative documents versioned alongside tenant configuration. Each document lists the actions it governs, the attributes it consults, and the result it produces. The policy engine compiles these documents into an internal representation optimized for evaluation. Compiled policies are cached close to the services that need them, so the hot path of request evaluation stays short.

Audit logs record every policy decision, including the input attributes, the matched rules, and the final allow or deny. Audit data is shipped to tenant-accessible object storage in near real time, so tenants can integrate it into their own security information and event management pipelines. The platform also retains audit data in its own storage to support cross-tenant investigations initiated by platform operators.

## Session credentials

A session does not simply inherit its caller's credentials. Doing so would give the session more authority than it needs, would complicate revocation, and would allow long-lived sessions to outlive the caller's original token. Instead, when a session is created, the credential broker mints a dedicated session credential. This credential encodes the session's identity, the tenant boundary, the authorized scope derived from the caller's policy evaluation, and an expiry usually aligned with the session's configured maximum lifetime.

Session credentials are delivered to the data plane agent over an authenticated channel and injected into the sandbox as environment variables, mounted secrets, or short-lived files depending on the workload's conventions. Inside the sandbox, the credential is used whenever the workload calls back into platform services such as storage, messaging, or inference. Calls carry the credential, the services verify it against the platform's public key, and the policy engine evaluates the requested action against the credential's encoded scope.

Because session credentials are separate from user credentials, revoking a user does not require tracking down every session they ever created. Revocation instead targets session credentials directly: a revoked credential is added to a short-lived deny list consulted during verification, and the session terminates at its next lifecycle checkpoint. Operators can also mass-revoke credentials by rotating the signing key, which invalidates all outstanding credentials at once.

## Step-up authentication

Certain operations warrant stronger authentication than a normal API call. Examples include modifying policy documents, promoting a session to privileged execution, or exporting audit data. For these operations the platform supports step-up authentication: the caller must present a fresh proof-of-presence, typically a WebAuthn assertion or a second factor, within a narrow window preceding the request. Step-up requirements are declared in policy documents, so tenants can tune which operations require additional proof based on their own risk tolerance.

Step-up is implemented by issuing a short-lived amplified token that encodes the proof and is accepted only for the specific sensitive operation. Amplified tokens are single-use when possible, which prevents replay even within the already narrow validity window.

## Trust boundaries

The authentication and authorization layer draws several trust boundaries that must be defended carefully. The boundary between the management plane and the outside world is defended by mutual TLS and request signing. The boundary between the control plane and the data plane is defended by signed dispatches. The boundary between a session and the platform's own services is defended by the session credential. Finally, the boundary between two sessions is defended by the isolation guarantees discussed elsewhere in this documentation.

Every boundary has an associated key, and every key has a rotation policy. The platform's own signing keys rotate on a short cadence, with overlapping validity windows to avoid downtime. Tenant-supplied keys rotate according to the tenant's policy, with the platform providing tooling to help tenants track upcoming rotations. Neglecting rotation is the most common way that otherwise well-designed authentication systems fail in production.

By combining federated identity, attribute-based policy, dedicated session credentials, and disciplined key rotation, the platform supports multi-tenant workloads without exposing tenants to one another or to unnecessary administrative complexity.
