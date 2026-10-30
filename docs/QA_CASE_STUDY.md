# Case study: investigating a reported filter-reset issue

**Project:** Northstar Support Desk  
**Investigation date:** October 22, 2026  
**Outcome:** Unable to reproduce in the controlled development session  
**Production code changed:** None  
**Method:** Operator-directed browser checks and runtime inspection assisted by Replit Agent

## Context

The app began with eight synthetic tickets. A ninth, marked `[TEST]`, was created to exercise intake, assignment, activity logging, persistence, and closure. The initial sample report described the queue remaining empty after the Critical severity filter was cleared. That report was a test scenario; its initial “3 of 3” wording was not independent proof of a confirmed defect.

The subsequent controlled browser investigation is the evidence summarized here. Seeded incident descriptions and sample logs are demonstration content, not production customer incidents or telemetry.

## Question and expected behavior

After selecting Severity → Critical, only `SD-1042` and `SD-1048` should appear. Clearing Severity should immediately restore every ticket that matches the remaining filters and search. It should not require refreshing the browser or remounting the queue.

## Investigative approach

1. Inspect the queue component, generated query client, URL construction, and server filtering.
2. Revisit the proposed cause: retaining a `severity: undefined` property after clearing the control.
3. Observe filter state, query key, request URL, response status/count, and rendered ticket count during a live browser run.
4. Check individual filters, combinations, search preservation, Reset, and Unassigned-owner behavior.
5. Document the observed outcome and make a code change only if the failure and its cause are established.

## Runtime evidence

| Observation | Critical selected | Severity cleared |
| --- | --- | --- |
| Client severity | `Critical` | Unset (`undefined`); blank select value |
| Request | `GET /api/tickets?severity=Critical` | `GET /api/tickets` |
| Response | HTTP 200, 2 records | HTTP 200, 9 records |
| Display | `SD-1042`, `SD-1048` | All 9 current tickets immediately |
| Unfiltered query key | — | `["/api/tickets", {}]` |
| Refresh or remount needed | No | No |

The installed TanStack Query version treated an undefined property in the query-key object equivalently to an absent property, and the URL builder omitted the undefined filter. The API applied no severity predicate when the parameter was absent. This evidence did not support the proposed cache-key explanation.

## Browser regression results

| Scenario | Observed result on October 22 |
| --- | --- |
| Select Critical | Only `SD-1042` and `SD-1048` returned |
| Clear Severity | All 9 current records returned immediately |
| Clear Status, Product area, or Owner individually | Full queue restored when no other constraints remained |
| Clear Severity while Status and search remain active | Both constraints preserved; matching results changed from 1 to 2 |
| Reset with four filters and search active | All filter selections and search cleared |
| Select Unassigned | Sent `owner=unassigned`; returned 2 tickets |

Separately, the manual ticket lifecycle exercise ended with 9 total, 7 open, 2 active critical, and 2 resolved tickets. Owner assignment, activity notes, and the resolved status were checked through the UI and refreshes.

## Closure and follow-through

The issue was closed as **unable to reproduce after controlled testing**. No root cause was confirmed and no production code was changed. A future recurrence should be reopened with a timestamp, browser/version, exact filter and search state, reproduction steps, and corresponding request/response evidence.

The useful result was a more precise diagnosis: separating a reported symptom from an observed defect, challenging an incorrect hypothesis, and documenting why a speculative fix was unnecessary.

## Repeatable manual check list

Use an isolated development database containing synthetic tickets:

1. Record the starting ticket count; do not assume every environment has 9 records.
2. Select Critical and compare the list against the current data.
3. Clear Severity and verify that all otherwise-matching tickets return immediately.
4. Repeat for each remaining filter.
5. Combine Severity, Status, and a search term. Clear only Severity and verify that the other constraints remain applied.
6. Activate every filter and search, then use Reset. Verify every control and the list reset.
7. Select Unassigned and verify that only tickets without an owner appear.
8. Create a `[TEST]` ticket, assign it, add an investigation note, refresh, resolve it, refresh again, and compare the summary counts.
9. Record actual results, failed steps, and relevant sanitized network/console evidence.

## Testing limits

There was no test framework, automated test file, or `test` script in the project during this investigation. No new framework was added. These results document one development session; they do not establish automated regression coverage, load capacity, accessibility certification, or production reliability.

An automated queue-interaction test for selecting and clearing Severity is the first planned addition once a test framework is selected.

[Back to project overview](../README.md)
