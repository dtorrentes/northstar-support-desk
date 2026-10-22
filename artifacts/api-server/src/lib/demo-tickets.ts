import { count } from "drizzle-orm";
import {
  db,
  ticketActivityTable,
  ticketsTable,
  type TicketUpdateKind,
} from "@workspace/db";

type DemoTicket = {
  ticket: typeof ticketsTable.$inferInsert;
  activity: Array<{
    kind: TicketUpdateKind;
    body: string;
    hoursAgo: number;
  }>;
};

const demoTickets: DemoTicket[] = [
  {
    ticket: {
      ticketNumber: "SD-1042",
      title: "Sign-in returns to the welcome screen after verification",
      productArea: "Authentication",
      environment: "Production",
      description:
        "A synthetic workspace member completes the verification step, but the app returns to the welcome screen instead of opening the workspace.",
      expectedBehavior: "After verification, the workspace should open.",
      actualBehavior:
        "The welcome screen appears again and the member remains signed out.",
      reproductionSteps:
        "1. Start a fresh browser session. 2. Complete the verification flow. 3. Follow the return link.",
      errorMessage: "Session handoff did not complete",
      sanitizedLogs:
        "event=auth_callback result=handoff_timeout request_id=req_demo_1042",
      customerImpact:
        "Some demo workspaces cannot complete sign-in in a fresh browser session.",
      severity: "Critical",
      status: "Investigating",
      owner: "Avery Chen",
      resolution: null,
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 20 * 60 * 1000),
    },
    activity: [
      {
        kind: "investigation",
        body: "Reproduced in a fresh browser session; checking the return-flow handoff.",
        hoursAgo: 2.5,
      },
      {
        kind: "troubleshooting",
        body: "Compared the verification callback and workspace redirect sequence.",
        hoursAgo: 0.5,
      },
    ],
  },
  {
    ticket: {
      ticketNumber: "SD-1043",
      title: "CSV export stops before the final rows",
      productArea: "Data Export",
      environment: "Production",
      description:
        "A generated CSV contains the first portion of a large synthetic report but ends before all matching rows are included.",
      expectedBehavior: "The export should include every row in the report.",
      actualBehavior: "The downloaded file ends early without a completion notice.",
      reproductionSteps:
        "1. Open the sample reporting workspace. 2. Export the large activity report as CSV. 3. Compare its row count with the on-screen total.",
      errorMessage: null,
      sanitizedLogs:
        "event=export_complete rows_written=10000 expected_rows=12840 request_id=req_demo_1043",
      customerImpact:
        "Teams relying on the full report may make decisions from an incomplete export.",
      severity: "High",
      status: "New",
      owner: null,
      resolution: null,
      createdAt: new Date(Date.now() - 7 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 7 * 60 * 60 * 1000),
    },
    activity: [],
  },
  {
    ticket: {
      ticketNumber: "SD-1044",
      title: "Repeated test webhook deliveries show as duplicates",
      productArea: "Integrations",
      environment: "Staging",
      description:
        "The integration activity view marks a retried synthetic webhook as a duplicate even though the first delivery timed out.",
      expectedBehavior:
        "A retry after a timed-out delivery should be processed once and shown accurately.",
      actualBehavior:
        "The activity view marks the retry as a duplicate and skips the follow-up action.",
      reproductionSteps:
        "1. Send the sample order-created webhook. 2. Simulate a timeout on the first attempt. 3. Retry using the same sample event identifier.",
      errorMessage: "Delivery skipped: duplicate event",
      sanitizedLogs:
        "event=webhook_retry attempt=2 outcome=duplicate request_id=req_demo_1044",
      customerImpact:
        "A test integration may miss follow-up work when a delivery is retried.",
      severity: "High",
      status: "Escalated",
      owner: "Morgan Rivera",
      resolution: null,
      createdAt: new Date(Date.now() - 22 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 90 * 60 * 1000),
    },
    activity: [
      {
        kind: "investigation",
        body: "Confirmed the duplicate label appears after a simulated first-attempt timeout.",
        hoursAgo: 20,
      },
      {
        kind: "customer_update",
        body: "Shared the current findings and requested a second sample delivery trace.",
        hoursAgo: 3,
      },
    ],
  },
  {
    ticket: {
      ticketNumber: "SD-1045",
      title: "Dashboard totals lag behind recent activity",
      productArea: "Dashboard",
      environment: "Production",
      description:
        "The overview totals remain unchanged for several minutes after new synthetic activity appears in the event list.",
      expectedBehavior:
        "Overview totals should refresh shortly after activity is recorded.",
      actualBehavior:
        "The event list updates, while the summary totals continue to show older values.",
      reproductionSteps:
        "1. Open the demo dashboard. 2. Add sample activity. 3. Compare the event list and the overview totals after refreshing.",
      errorMessage: null,
      sanitizedLogs:
        "event=summary_refresh cache_age_seconds=420 request_id=req_demo_1045",
      customerImpact:
        "Operators may make decisions from outdated dashboard totals.",
      severity: "Medium",
      status: "Investigating",
      owner: "Jordan Kim",
      resolution: null,
      createdAt: new Date(Date.now() - 28 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    activity: [
      {
        kind: "investigation",
        body: "The event list and totals appear to use different refresh timing.",
        hoursAgo: 24,
      },
      {
        kind: "troubleshooting",
        body: "Refreshing the page updates the event list but not the overview totals.",
        hoursAgo: 2.2,
      },
    ],
  },
  {
    ticket: {
      ticketNumber: "SD-1046",
      title: "Selected activity filter clears when moving to page two",
      productArea: "Dashboard",
      environment: "Staging",
      description:
        "A selected activity type filter disappears after moving to the next page of the dashboard event list.",
      expectedBehavior:
        "The selected filter should remain active while navigating between result pages.",
      actualBehavior:
        "The next page loads without the chosen activity filter.",
      reproductionSteps:
        "1. Open the staging activity list. 2. Select a type with multiple pages of results. 3. Move to page two.",
      errorMessage: null,
      sanitizedLogs:
        "event=activity_page_change filter_count=0 request_id=req_demo_1046",
      customerImpact:
        "Agents need to reapply filters and may review unrelated activity.",
      severity: "Medium",
      status: "Waiting for Customer",
      owner: "Sam Patel",
      resolution: null,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    },
    activity: [
      {
        kind: "troubleshooting",
        body: "Unable to reproduce with the default sample list; requested the selected filter and page size.",
        hoursAgo: 8,
      },
      {
        kind: "customer_update",
        body: "Asked for the exact filter and page size used in the affected view.",
        hoursAgo: 4,
      },
    ],
  },
  {
    ticket: {
      ticketNumber: "SD-1047",
      title: "Retry response is missing the rate-limit reset header",
      productArea: "API",
      environment: "Production",
      description:
        "A retried API response includes the current request limit but omits the reset timing header returned on the initial request.",
      expectedBehavior:
        "Retry responses should include the same rate-limit timing headers as other responses.",
      actualBehavior:
        "The reset timing header is absent on the retry response.",
      reproductionSteps:
        "1. Send the documented sample request near its test limit. 2. Trigger the retry path. 3. Inspect response headers.",
      errorMessage: null,
      sanitizedLogs:
        "event=api_retry header=rate_limit_reset result=missing request_id=req_demo_1047",
      customerImpact:
        "Integrators may not know when to safely retry a request.",
      severity: "Low",
      status: "New",
      owner: null,
      resolution: null,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
    activity: [],
  },
  {
    ticket: {
      ticketNumber: "SD-1048",
      title: "Scheduled report preview opens with an empty chart",
      productArea: "Reporting",
      environment: "Production",
      description:
        "The scheduled report preview shows its title and date range but renders an empty chart for a populated synthetic data set.",
      expectedBehavior:
        "The preview should render the chart using the selected date range.",
      actualBehavior: "The chart area is empty while the report table has rows.",
      reproductionSteps:
        "1. Open the sample weekly report. 2. Choose the last seven days. 3. Open the preview before sending.",
      errorMessage: "Chart series returned no points",
      sanitizedLogs:
        "event=report_preview series_count=0 table_rows=36 request_id=req_demo_1048",
      customerImpact:
        "Reviewers cannot verify the report chart before its scheduled delivery.",
      severity: "Critical",
      status: "Escalated",
      owner: "Avery Chen",
      resolution: null,
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    },
    activity: [
      {
        kind: "investigation",
        body: "Confirmed the report table has rows while the chart preview has no series.",
        hoursAgo: 72,
      },
      {
        kind: "troubleshooting",
        body: "Checked a shorter date range; the chart remains empty in the preview.",
        hoursAgo: 8,
      },
    ],
  },
  {
    ticket: {
      ticketNumber: "SD-1049",
      title: "Browser notifications arrive after the related task is complete",
      productArea: "Notifications",
      environment: "Staging",
      description:
        "A browser notification for a synthetic task arrives several minutes after the task has already been marked complete.",
      expectedBehavior:
        "The notification should arrive promptly or be suppressed if the task is already complete.",
      actualBehavior:
        "The notification is delayed and appears after the task is completed.",
      reproductionSteps:
        "1. Create a sample task. 2. Complete it immediately. 3. Observe the browser notification stream.",
      errorMessage: null,
      sanitizedLogs:
        "event=notification_delivery delay_seconds=360 state=complete request_id=req_demo_1049",
      customerImpact:
        "People may receive confusing notifications about work that is already finished.",
      severity: "Low",
      status: "Resolved",
      owner: "Morgan Rivera",
      resolution:
        "The staging notification worker was using an outdated schedule. The sample queue now processes promptly and completed tasks are suppressed.",
      createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 20 * 60 * 60 * 1000),
    },
    activity: [
      {
        kind: "investigation",
        body: "Reproduced a delayed delivery in the staging notification queue.",
        hoursAgo: 96,
      },
      {
        kind: "troubleshooting",
        body: "Adjusted the demo queue schedule and verified completed tasks are suppressed.",
        hoursAgo: 22,
      },
      {
        kind: "resolution",
        body: "The staging notification worker was using an outdated schedule. The sample queue now processes promptly and completed tasks are suppressed.",
        hoursAgo: 20,
      },
    ],
  },
];

let seedPromise: Promise<void> | null = null;

export function ensureDemoTickets(): Promise<void> {
  if (!seedPromise) {
    seedPromise = (async () => {
      const [result] = await db
        .select({ total: count() })
        .from(ticketsTable);

      if (Number(result?.total ?? 0) > 0) {
        return;
      }

      const inserted = await db
        .insert(ticketsTable)
        .values(demoTickets.map(({ ticket }) => ticket))
        .onConflictDoNothing({ target: ticketsTable.ticketNumber })
        .returning({ id: ticketsTable.id, ticketNumber: ticketsTable.ticketNumber });
      const insertedIds = new Map(
        inserted.map(({ id, ticketNumber }) => [ticketNumber, id]),
      );

      const activity = demoTickets.flatMap(({ ticket, activity: entries }) => {
        const ticketId = insertedIds.get(ticket.ticketNumber);
        if (!ticketId) return [];

        return entries.map((entry) => ({
          ticketId,
          kind: entry.kind,
          body: entry.body,
          author: "Support team",
          createdAt: new Date(Date.now() - entry.hoursAgo * 60 * 60 * 1000),
        }));
      });

      if (activity.length > 0) {
        await db.insert(ticketActivityTable).values(activity);
      }
    })().catch((error: unknown) => {
      seedPromise = null;
      throw error;
    });
  }

  return seedPromise;
}
