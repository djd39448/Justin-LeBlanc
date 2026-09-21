# Cancelled Calendar records are partial records

Observed in contract verification on 2026-09-21. A morning scan that asks Google for deleted events cannot validate every result as a complete active event. Cancelled recurring exceptions may omit start/end and retain only instance identity; ordinary deleted records may retain only their ID. Google's [Events resource reference](https://developers.google.com/workspace/calendar/api/v3/reference/events#status) documents both cases.

The adapter now preserves a cancelled recurrence's original instance time when available, so it remains explicitly cancelled and cannot become billable. It skips time-less cancelled tombstones instead of inventing dates. Active events still require valid times. Tests cover both cancellation shapes, all-day events, recurrence expansion and identity. This prevents an unrelated deletion from aborting every eligible show's scan.

Keep provider boundary schemas distinct from canonical business schemas: sparse provider tombstones are legitimate, while a billable confirmed show still requires its customer, agreed quote, metadata and exact times. A fixture test demonstrates this boundary. Subsequent [live Calendar acceptance](../evidence/live-booking-acceptance.json) passed the synthetic booking lifecycle; the sparse cancellation shapes remain fixture-tested boundaries.
