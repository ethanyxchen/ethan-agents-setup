---
name: clickstack-dashboard-api
description: Read and modify ClickStack Cloud dashboards, tiles, groups, filters, and dashboard SQL through the native ClickStack MCP.
---

# ClickStack Dashboard MCP

Use the native ClickStack MCP for dashboard work.

For dashboard discovery, use `clickstack_search_dashboards` or `clickstack_get_dashboard`. Before creating a SQL tile, call `clickstack_list_sources` to obtain the source and connection IDs; use `clickstack_describe_source` when the column shape is not already established by an adjacent tile.

For a requested write:

1. Re-fetch the dashboard immediately before the mutation.
2. Make only the requested change. Preserve the existing source ID, connection ID, container ID, tab ID, filter behavior, naming conventions, and layout where applicable.
3. Add a new tile with `clickstack_save_dashboard`, supplying the existing dashboard ID and all existing tiles alongside the new tile. The MCP assigns the tile ID.
4. Re-read the dashboard and verify the expected tile or edit is present, every pre-existing tile remains, and the tile count changed only as intended.
5. Run `clickstack_query_tile` for the saved tile. If the user supplied a dashboard URL with `from` and `to` timestamps, use those exact bounds for validation; otherwise use an appropriate recent interval.

Dashboard writes are external state changes. Make them only when the user explicitly asks to create, edit, or delete a dashboard resource. If the user is asking for analysis or a proposed query, do not mutate the dashboard.

For dashboard SQL, retain the dashboard time and filter macros used by adjacent tiles. Use `$__timeFilter(Timestamp)` where the existing convention supports it, or the matching `$__fromTime_ms` / `$__toTime_ms` bounds where lifecycle queries require it; retain `$__filters` in either case. State whether a calculated rate is per event, attempt, user, or terminal outcome; do not label one as another.
