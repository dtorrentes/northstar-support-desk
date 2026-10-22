import { randomUUID } from "node:crypto";
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  isNull,
  or,
} from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  CreateTicketBody,
  CreateTicketResponse,
  CreateTicketUpdateBody,
  CreateTicketUpdateParams,
  CreateTicketUpdateResponse,
  GetTicketParams,
  GetTicketResponse,
  GetTicketSummaryResponse,
  ListTicketsQueryParams,
  ListTicketsResponse,
  UpdateTicketBody,
  UpdateTicketParams,
  UpdateTicketResponse,
} from "@workspace/api-zod";
import {
  db,
  ticketActivityTable,
  ticketsTable,
  type TicketUpdateKind,
} from "@workspace/db";
import { ensureDemoTickets } from "../lib/demo-tickets";

const router: IRouter = Router();

function validationMessage(issues: Array<{ path: PropertyKey[]; message: string }>) {
  return issues
    .map(({ path, message }) => `${path.length ? path.join(".") : "request"}: ${message}`)
    .join("; ");
}

async function findTicketDetail(ticketId: number) {
  const [ticket] = await db
    .select()
    .from(ticketsTable)
    .where(eq(ticketsTable.id, ticketId));

  if (!ticket) return undefined;

  const activity = await db
    .select()
    .from(ticketActivityTable)
    .where(eq(ticketActivityTable.ticketId, ticketId))
    .orderBy(asc(ticketActivityTable.createdAt), asc(ticketActivityTable.id));

  return { ...ticket, activity };
}

router.get("/tickets", async (req, res): Promise<void> => {
  await ensureDemoTickets();
  const parsed = ListTicketsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: validationMessage(parsed.error.issues) });
    return;
  }

  const { status, severity, productArea, owner, search } = parsed.data;
  const filters = [];
  if (status) filters.push(eq(ticketsTable.status, status));
  if (severity) filters.push(eq(ticketsTable.severity, severity));
  if (productArea) filters.push(eq(ticketsTable.productArea, productArea));
  if (owner === "unassigned") {
    filters.push(isNull(ticketsTable.owner));
  } else if (owner) {
    filters.push(eq(ticketsTable.owner, owner));
  }
  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    filters.push(
      or(
        ilike(ticketsTable.title, term),
        ilike(ticketsTable.ticketNumber, term),
        ilike(ticketsTable.description, term),
      )!,
    );
  }

  const tickets = await db
    .select()
    .from(ticketsTable)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(ticketsTable.updatedAt), desc(ticketsTable.id));

  res.json(ListTicketsResponse.parse(tickets));
});

router.get("/tickets/summary", async (_req, res): Promise<void> => {
  await ensureDemoTickets();
  const rows = await db
    .select({
      status: ticketsTable.status,
      severity: ticketsTable.severity,
      total: count(),
    })
    .from(ticketsTable)
    .groupBy(ticketsTable.status, ticketsTable.severity);

  const summary = rows.reduce(
    (result, row) => {
      const rowCount = Number(row.total);
      result.total += rowCount;
      if (row.status !== "Resolved" && row.status !== "Closed") {
        result.open += rowCount;
        if (row.severity === "Critical") result.critical += rowCount;
      } else {
        result.resolved += rowCount;
      }
      return result;
    },
    { total: 0, open: 0, critical: 0, resolved: 0 },
  );

  res.json(GetTicketSummaryResponse.parse(summary));
});

router.post("/tickets", async (req, res): Promise<void> => {
  const parsed = CreateTicketBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: validationMessage(parsed.error.issues) });
    return;
  }

  const [ticket] = await db
    .insert(ticketsTable)
    .values({
      ...parsed.data,
      ticketNumber: `SD-${randomUUID().slice(0, 8).toUpperCase()}`,
      errorMessage: parsed.data.errorMessage ?? null,
      sanitizedLogs: parsed.data.sanitizedLogs ?? null,
      status: "New",
      owner: null,
      resolution: null,
    })
    .returning();

  res.status(201).json(CreateTicketResponse.parse(ticket));
});

router.get("/tickets/:ticketId", async (req, res): Promise<void> => {
  const params = GetTicketParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: validationMessage(params.error.issues) });
    return;
  }

  await ensureDemoTickets();
  const detail = await findTicketDetail(params.data.ticketId);
  if (!detail) {
    res.status(404).json({ error: "Ticket not found." });
    return;
  }

  res.json(GetTicketResponse.parse(detail));
});

router.patch("/tickets/:ticketId", async (req, res): Promise<void> => {
  const params = UpdateTicketParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: validationMessage(params.error.issues) });
    return;
  }

  const parsed = UpdateTicketBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: validationMessage(parsed.error.issues) });
    return;
  }
  if (Object.keys(parsed.data).length === 0) {
    res.status(400).json({ error: "Provide at least one ticket field to update." });
    return;
  }

  const [ticket] = await db
    .update(ticketsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(ticketsTable.id, params.data.ticketId))
    .returning();

  if (!ticket) {
    res.status(404).json({ error: "Ticket not found." });
    return;
  }

  res.json(UpdateTicketResponse.parse(ticket));
});

router.post(
  "/tickets/:ticketId/updates",
  async (req, res): Promise<void> => {
    const params = CreateTicketUpdateParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: validationMessage(params.error.issues) });
      return;
    }

    const parsed = CreateTicketUpdateBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: validationMessage(parsed.error.issues) });
      return;
    }

    const detail = await db.transaction(async (tx) => {
      const [ticket] = await tx
        .select()
        .from(ticketsTable)
        .where(eq(ticketsTable.id, params.data.ticketId));
      if (!ticket) return undefined;

      const { kind, body, author } = parsed.data;
      await tx.insert(ticketActivityTable).values({
        ticketId: ticket.id,
        kind,
        body,
        author: author ?? "Support team",
      });

      if (kind === "resolution") {
        await tx
          .update(ticketsTable)
          .set({ resolution: body, status: "Resolved", updatedAt: new Date() })
          .where(eq(ticketsTable.id, ticket.id));
      } else {
        await tx
          .update(ticketsTable)
          .set({ updatedAt: new Date() })
          .where(eq(ticketsTable.id, ticket.id));
      }

      const [updatedTicket] = await tx
        .select()
        .from(ticketsTable)
        .where(eq(ticketsTable.id, ticket.id));
      const activity = await tx
        .select()
        .from(ticketActivityTable)
        .where(eq(ticketActivityTable.ticketId, ticket.id))
        .orderBy(asc(ticketActivityTable.createdAt), asc(ticketActivityTable.id));

      return updatedTicket ? { ...updatedTicket, activity } : undefined;
    });

    if (!detail) {
      res.status(404).json({ error: "Ticket not found." });
      return;
    }

    res.status(201).json(CreateTicketUpdateResponse.parse(detail));
  },
);

export default router;
