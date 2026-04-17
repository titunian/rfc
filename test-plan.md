# Unified Notification System
-----LALALALALAAL--------

## Summary

We need a centralized notification service that replaces the current fragmented approach where each microservice sends its own emails, Slack messages, and push notifications independently.

## Problem

- **Duplicate notifications**: Users sometimes receive the same alert via email and Slack within seconds, with slightly different wording.
- **No user preferences**: There's no way for users to opt out of specific notification channels.
- **Hard to debug**: When a notification fails, there's no centralized log to trace what happened.

## Proposed Solution

### Architecture

A new `notification-gateway` service that acts as the single entry point for all outbound notifications:

```
┌──────────────┐     ┌─────────────────────┐     ┌──────────┐
│ Order Service│────▶│ Notification Gateway │────▶│ Email    │
│ Auth Service │────▶│  - dedup logic       │────▶│ Slack    │
│ Billing Svc  │────▶│  - user prefs        │────▶│ Push     │
└──────────────┘     │  - retry queue       │     └──────────┘
                     └─────────────────────┘
```

### Key Design Decisions

1. **Queue-based delivery**: All notifications go through a Redis queue with at-least-once delivery.
2. **Template registry**: Notification templates live in a shared repo, versioned and reviewed.
3. **User preference store**: A new `notification_preferences` table lets users mute channels per event type.

## Migration Plan

| Phase | Timeline | Scope |
|-------|----------|-------|
| Phase 1 | Week 1-2 | Deploy gateway, migrate email notifications |
| Phase 2 | Week 3-4 | Add Slack integration, build preference UI |
| Phase 3 | Week 5 | Migrate push notifications, deprecate old senders |

## Open Questions

- Should we support batching (e.g., daily digest)?
- What's the SLA for notification delivery latency?
- Do we need an admin dashboard for monitoring delivery rates?

## Feedback Requested

Looking for input on:
1. The queue technology choice (Redis vs RabbitMQ vs SQS)
2. Whether the migration timeline is realistic
3. Any edge cases we're missing with the dedup logic
