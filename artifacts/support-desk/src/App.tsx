import { type FormEvent, type ReactNode, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle, ArrowLeft, ArrowRight, Check, ChevronDown, Clock3,
  Command, FilePlus2, Filter, LifeBuoy, ListFilter, MessageSquareText, RefreshCw,
  Search, ShieldAlert, SlidersHorizontal, X,
} from 'lucide-react';
import {
  getGetTicketQueryKey, getGetTicketSummaryQueryKey, getListTicketsQueryKey,
  useCreateTicket, useCreateTicketUpdate, useGetTicket, useGetTicketSummary,
  useListTickets, useUpdateTicket,
} from '@workspace/api-client-react';
import type { ListTicketsParams, TicketInput, TicketStatus, TicketSeverity, TicketUpdateInput } from '@workspace/api-client-react';
import { Link, Route, Router as WouterRouter, Switch, useLocation, useRoute } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import './index.css';

const queryClient = new QueryClient();
const statuses: TicketStatus[] = ['New', 'Investigating', 'Waiting for Customer', 'Escalated', 'Resolved', 'Closed'];
const severities: TicketSeverity[] = ['Critical', 'High', 'Medium', 'Low'];
const activityKinds = ['investigation', 'troubleshooting', 'customer_update', 'resolution'] as const;

function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <div className="app-frame">
    <aside className="sidebar">
      <Link href="/" className="brand-lockup" data-testid="link-home">
        <span className="brand-mark"><LifeBuoy size={20} strokeWidth={2.1} /></span>
        <span><b>Northstar</b><small>SUPPORT DESK</small></span>
      </Link>
      <div className="workspace-label">WORKSPACE</div>
      <Link href="/" className={`side-link ${location === '/' ? 'selected' : ''}`} data-testid="link-ticket-queue">
        <ListFilter size={17} /><span>Ticket queue</span><span className="nav-count">01</span>
      </Link>
      <div className="sidebar-footer">
        <div className="online-indicator"><i /> Support workspace</div>
        <div className="agent-profile"><span className="agent-avatar">ST</span><span><b>Support team</b><small>Internal workspace</small></span><ChevronDown size={15} /></div>
      </div>
    </aside>
    <main className="main-shell">
      <header className="topbar">
        <div className="crumb"><span>Support</span><span className="crumb-slash">/</span><b>{location === '/tickets/new' ? 'New ticket' : location.startsWith('/tickets/') ? 'Ticket details' : 'Queue'}</b></div>
        <div className="top-actions"><span className="shift-status"><i /> Internal</span><div className="top-divider" /><span className="keyboard-hint"><Command size={13} /> K</span><button className="icon-button" title="Search queue" aria-label="Search queue" onClick={() => document.querySelector<HTMLInputElement>('#queue-search')?.focus()}><Search size={17} /></button></div>
      </header>
      <div className="page-content">{children}</div>
    </main>
  </div>;
}

function StatusPill({ status }: { status: string }) {
  return <span className={`status-pill status-${status.toLowerCase().replaceAll(' ', '-')}`}><i />{status}</span>;
}
function SeverityTag({ severity }: { severity: string }) {
  return <span className={`severity-tag severity-${severity.toLowerCase()}`}><span className="severity-dot" />{severity}</span>;
}
function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: ReactNode }) {
  return <label className="field"><span className="field-label">{label}{required && <em>Required</em>}</span>{children}{hint && <small className="field-hint">{hint}</small>}</label>;
}
function Select({ value, onChange, options, testId, placeholder }: { value: string; onChange: (value: string) => void; options: readonly string[]; testId: string; placeholder?: string }) {
  return <select value={value} onChange={event => onChange(event.target.value)} data-testid={testId}>
    {placeholder && <option value="">{placeholder}</option>}
    {options.map(option => <option key={option} value={option}>{option}</option>)}
  </select>;
}
function LoadError({ message, retry }: { message: string; retry: () => void }) {
  return <div className="error-panel"><span className="error-icon"><AlertCircle size={20} /></span><div><b>{message}</b><p>Check your connection and try again.</p><button className="button button-secondary button-small" onClick={retry} data-testid="button-retry"><RefreshCw size={14} /> Retry</button></div></div>;
}
function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = error.data;
    if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
      return data.error;
    }
  }
  return error instanceof Error && error.message ? error.message : fallback;
}
function SkeletonRows() {
  return <div className="skeleton-list" aria-label="Loading tickets">{[1, 2, 3, 4, 5].map(row => <div className="skeleton-row" key={row}><i /><div><b /><span /></div><i /><i /><i /></div>)}</div>;
}
function EmptyQueue({ clear }: { clear: () => void }) {
  return <div className="empty-state"><div className="empty-art"><span /><span /><span /><Filter size={21} /></div><h3>No tickets match these filters</h3><p>Try broadening your search or clearing the filters to see the full queue.</p><button className="button button-secondary" onClick={clear} data-testid="button-clear-filters"><X size={15} /> Clear filters</button></div>;
}

function QueuePage() {
  const [filters, setFilters] = useState<ListTicketsParams>({});
  const [search, setSearch] = useState('');
  const params: ListTicketsParams = { ...filters, ...(search.trim() ? { search: search.trim() } : {}) };
  const { data: tickets, isLoading, isError, refetch } = useListTickets(params);
  const { data: allTickets } = useListTickets({});
  const { data: summary, isLoading: summaryLoading, isError: summaryError, refetch: refetchSummary } = useGetTicketSummary();
  const ticketsList = tickets ?? [];
  const filterOptions = allTickets ?? ticketsList;
  const areas = [...new Set(filterOptions.map(ticket => ticket.productArea))].sort();
  const owners = [...new Set(filterOptions.map(ticket => ticket.owner).filter((owner): owner is string => !!owner))].sort();
  const changeFilter = (key: keyof ListTicketsParams, value: string) => setFilters(previous => ({ ...previous, [key]: value || undefined }));
  const reset = () => { setFilters({}); setSearch(''); };
  return <Shell><section className="queue-page">
    <div className="page-heading">
      <div><div className="eyebrow"><span className="eyebrow-line" /> OPERATIONS / CUSTOMER SUPPORT</div><h1>Ticket queue<span className="heading-period">.</span></h1><p className="heading-subtitle">The place to get customer issues moving.</p></div>
      <Link href="/tickets/new" className="button button-primary" data-testid="link-create-ticket"><FilePlus2 size={16} /> Create ticket <ArrowRight size={15} /></Link>
    </div>
    <div className="metric-strip">
      <div className="metric-card"><div className="metric-label">All tickets <span>LIVE QUEUE</span></div>{summaryLoading ? <div className="metric-skeleton" /> : summaryError ? <button className="metric-retry" onClick={() => refetchSummary()}>Retry summary</button> : <div className="metric-value">{summary?.total ?? 0}<small>total reported</small></div>}</div>
      <div className="metric-card metric-open"><div className="metric-label">Open <span>NEEDS ATTENTION</span></div>{summaryLoading ? <div className="metric-skeleton" /> : <div className="metric-value">{summary?.open ?? '—'}<small>active tickets</small></div>}</div>
      <div className="metric-card metric-critical"><div className="metric-label">Critical <span>PRIORITY</span></div>{summaryLoading ? <div className="metric-skeleton" /> : <div className="metric-value">{summary?.critical ?? '—'}<small>customer-impacting</small></div>}</div>
      <div className="metric-card metric-resolved"><div className="metric-label">Resolved <span>THIS QUEUE</span></div>{summaryLoading ? <div className="metric-skeleton" /> : <div className="metric-value">{summary?.resolved ?? '—'}<small>closed loop</small></div>}</div>
    </div>
    <section className="queue-panel">
      <div className="queue-toolbar">
        <div><h2>Tickets <span>{isLoading ? '…' : ticketsList.length}</span></h2><p>Sort by urgency. Open a ticket to take action.</p></div>
        <div className="queue-tools"><label className="search-field"><Search size={16} /><input id="queue-search" placeholder="Search tickets" value={search} onChange={event => setSearch(event.target.value)} data-testid="input-queue-search" /><kbd>/</kbd></label><span className="filter-caption"><SlidersHorizontal size={15} /> Filters</span></div>
      </div>
      <div className="filter-row">
        <label className="filter-select"><span>Severity</span><Select value={filters.severity ?? ''} onChange={value => changeFilter('severity', value)} options={severities} placeholder="All severities" testId="filter-severity" /></label>
        <label className="filter-select"><span>Status</span><Select value={filters.status ?? ''} onChange={value => changeFilter('status', value)} options={statuses} placeholder="All statuses" testId="filter-status" /></label>
        <label className="filter-select"><span>Product area</span><select value={filters.productArea ?? ''} onChange={event => changeFilter('productArea', event.target.value)} data-testid="filter-product-area"><option value="">All product areas</option>{areas.map(area => <option key={area}>{area}</option>)}</select></label>
        <label className="filter-select"><span>Owner</span><select value={filters.owner ?? ''} onChange={event => changeFilter('owner', event.target.value)} data-testid="filter-owner"><option value="">Anyone</option><option value="unassigned">Unassigned</option>{owners.map(owner => <option key={owner}>{owner}</option>)}</select></label>
        {(Object.values(filters).some(Boolean) || search) && <button className="clear-inline" onClick={reset} data-testid="button-reset-filters">Reset <X size={13} /></button>}
      </div>
       <div className="table-head"><span>Ticket</span><span>Product area</span><span>Severity</span><span>Status</span><span>Owner</span><span>Age</span></div>
      {isLoading ? <SkeletonRows /> : isError ? <LoadError message="Could not load the ticket queue" retry={() => refetch()} /> : ticketsList.length === 0 ? <EmptyQueue clear={reset} /> :
        <div className="ticket-list">{ticketsList.map((ticket, index) => <Link href={`/tickets/${ticket.id}`} className="ticket-row" key={ticket.id} data-testid={`row-ticket-${ticket.id}`} style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}>
          <div className="ticket-main"><span className={`ticket-priority-mark priority-${ticket.severity.toLowerCase()}`} /><div><span className="ticket-id">{ticket.ticketNumber}</span><b>{ticket.title}</b><small>{ticket.environment}</small></div></div>
          <span className="ticket-area">{ticket.productArea}</span><span><SeverityTag severity={ticket.severity} /></span><span><StatusPill status={ticket.status} /></span>
          <span className="ticket-owner">{ticket.owner ? <><span className="owner-initial">{ticket.owner.slice(0, 1).toUpperCase()}</span>{ticket.owner}</> : <span className="unassigned">Unassigned</span>}</span>
          <span className="ticket-updated" title={`Opened ${formatDate(ticket.createdAt)}`}><Clock3 size={13} />{formatAge(ticket.createdAt)}</span>
        </Link>)}</div>}
      <div className="queue-foot"><span><span className="live-dot" /> Queue updates when you refresh</span><span>Showing {ticketsList.length} ticket{ticketsList.length === 1 ? '' : 's'}</span></div>
    </section>
    <div className="queue-footer-note"><ShieldAlert size={15} /><span>Customer data is sensitive. Share only sanitized logs and reproduction details.</span></div>
  </section></Shell>;
}

const initialTicket: TicketInput = {
  title: '', productArea: '', environment: '', description: '', expectedBehavior: '',
  actualBehavior: '', reproductionSteps: '', customerImpact: '', severity: 'Medium',
  errorMessage: '', sanitizedLogs: '',
};

function NewTicketPage() {
  const [form, setForm] = useState<TicketInput>(initialTicket);
  const [submitError, setSubmitError] = useState('');
  const createTicket = useCreateTicket();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const updateField = (key: keyof TicketInput, value: string) => setForm(previous => ({ ...previous, [key]: value }));
    const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError('');
    createTicket.mutate({ data: form }, {
      onSuccess: ticket => {
        queryClient.invalidateQueries({ queryKey: getListTicketsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTicketSummaryQueryKey() });
        navigate(`/tickets/${ticket.id}`);
      },
      onError: error => setSubmitError(getErrorMessage(error, 'Ticket could not be submitted. Review the details and try again.')),
    });
  };
  return <Shell><section className="form-page">
    <Link href="/" className="back-link" data-testid="link-back-queue"><ArrowLeft size={15} /> Back to queue</Link>
    <div className="page-heading form-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> CUSTOMER SUPPORT / INTAKE</div><h1>Report an issue<span className="heading-period">.</span></h1><p className="heading-subtitle">Capture the symptom clearly so the right person can reproduce it.</p></div><div className="form-step"><span>01</span><div><b>New ticket</b><small>Intake details</small></div></div></div>
    <form className="ticket-form" onSubmit={submit} data-testid="form-new-ticket">
      {submitError && <div className="inline-error"><AlertCircle size={17} />{submitError}</div>}
      <div className="form-section"><div className="section-index">01</div><div className="section-content"><h2>Issue overview</h2><p>Start with what the customer is experiencing.</p>
        <Field label="Title" required hint="Use a short, specific summary (4–180 characters)."><input required minLength={4} maxLength={180} value={form.title} onChange={e => updateField('title', e.target.value)} placeholder="e.g. Export stalls at 82% for larger workspaces" data-testid="input-title" /></Field>
        <div className="field-grid"><Field label="Product area" required><input required maxLength={80} value={form.productArea} onChange={e => updateField('productArea', e.target.value)} placeholder="e.g. Data exports" data-testid="input-product-area" /></Field><Field label="Environment" required><input required maxLength={80} value={form.environment} onChange={e => updateField('environment', e.target.value)} placeholder="e.g. Web app · Chrome 124 · macOS" data-testid="input-environment" /></Field></div>
        <Field label="Description" required hint="What happened, and when did it start?"><textarea required minLength={10} maxLength={5000} rows={4} value={form.description} onChange={e => updateField('description', e.target.value)} placeholder="Describe the issue in the customer's words where possible." data-testid="input-description" /></Field>
      </div></div>
      <div className="form-section"><div className="section-index">02</div><div className="section-content"><h2>Expected vs. actual</h2><p>The contrast helps narrow down the root cause.</p>
        <Field label="Expected behavior" required><textarea required minLength={3} maxLength={2000} rows={3} value={form.expectedBehavior} onChange={e => updateField('expectedBehavior', e.target.value)} placeholder="What should happen?" data-testid="input-expected-behavior" /></Field>
        <Field label="Actual behavior" required><textarea required minLength={3} maxLength={2000} rows={3} value={form.actualBehavior} onChange={e => updateField('actualBehavior', e.target.value)} placeholder="What happens instead?" data-testid="input-actual-behavior" /></Field>
        <Field label="Reproduction steps" required hint="Numbered steps are easiest to follow."><textarea required minLength={3} maxLength={5000} rows={4} value={form.reproductionSteps} onChange={e => updateField('reproductionSteps', e.target.value)} placeholder={'1. Open…\n2. Choose…\n3. Observe…'} data-testid="input-reproduction-steps" /></Field>
      </div></div>
      <div className="form-section"><div className="section-index">03</div><div className="section-content"><h2>Impact & evidence</h2><p>Help us understand urgency. Do not include secrets or personal data.</p>
        <Field label="Customer impact" required><textarea required minLength={3} maxLength={2000} rows={3} value={form.customerImpact} onChange={e => updateField('customerImpact', e.target.value)} placeholder="Who is affected, and what is blocked?" data-testid="input-customer-impact" /></Field>
        <div className="field-grid"><Field label="Severity" required><Select value={form.severity} onChange={value => updateField('severity', value)} options={severities} testId="input-severity" /></Field><Field label="Error message" hint="Optional · remove customer-identifying data"><input maxLength={2000} value={form.errorMessage ?? ''} onChange={e => updateField('errorMessage', e.target.value)} placeholder="Paste the sanitized error text" data-testid="input-error-message" /></Field></div>
        <Field label="Sanitized logs" hint="Optional · max 10,000 characters"><textarea maxLength={10000} rows={5} value={form.sanitizedLogs ?? ''} onChange={e => updateField('sanitizedLogs', e.target.value)} placeholder="Paste relevant logs after removing secrets and personal data." data-testid="input-sanitized-logs" /></Field>
      </div></div>
      <div className="form-actions"><span><span className="required-star">*</span> Required fields must be complete</span><div><Link href="/" className="button button-secondary" data-testid="button-cancel-ticket">Cancel</Link><button type="submit" className="button button-primary" disabled={createTicket.isPending} data-testid="button-submit-ticket">{createTicket.isPending ? <><span className="button-loader" /> Submitting…</> : <>Submit ticket <ArrowRight size={15} /></>}</button></div></div>
    </form>
  </section></Shell>;
}

function TicketDetailPage() {
  const [, params] = useRoute('/tickets/:ticketId');
  const [, navigate] = useLocation();
  const ticketId = Number(params?.ticketId);
  const validId = Number.isInteger(ticketId) && ticketId > 0;
  const { data: ticket, isLoading, isError, refetch } = useGetTicket(validId ? ticketId : 0, { query: { enabled: validId, queryKey: getGetTicketQueryKey(validId ? ticketId : 0) } });
  const queryClient = useQueryClient();
  const updateTicket = useUpdateTicket();
  const createUpdate = useCreateTicketUpdate();
  const [owner, setOwner] = useState<string | null>(null);
  const [status, setStatus] = useState<TicketStatus>('New');
  const [resolution, setResolution] = useState('');
  const [noteKind, setNoteKind] = useState<(typeof activityKinds)[number]>('investigation');
  const [noteBody, setNoteBody] = useState('');
  const [noteAuthor, setNoteAuthor] = useState('');
  const [error, setError] = useState('');
  const [initializedId, setInitializedId] = useState<number | null>(null);
  useEffect(() => {
    if (ticket && initializedId !== ticket.id) {
      setOwner(ticket.owner);
      setStatus(ticket.status);
      setResolution(ticket.resolution ?? '');
      setInitializedId(ticket.id);
    }
  }, [ticket, initializedId]);
  const refreshRelated = () => {
    queryClient.invalidateQueries({ queryKey: getGetTicketQueryKey(ticketId) });
    queryClient.invalidateQueries({ queryKey: getListTicketsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetTicketSummaryQueryKey() });
  };
  const saveChanges = (event: FormEvent) => {
    event.preventDefault();
    setError('');
    updateTicket.mutate({ ticketId, data: { status, owner: owner?.trim() || null, resolution: resolution.trim() || null } }, {
      onSuccess: () => refreshRelated(), onError: error => setError(getErrorMessage(error, 'Ticket changes could not be saved. Please retry.')),
    });
  };
  const addNote = (event: FormEvent) => {
    event.preventDefault();
    setError('');
    const data: TicketUpdateInput = { kind: noteKind, body: noteBody.trim(), author: noteAuthor.trim() || undefined };
    createUpdate.mutate({ ticketId, data }, {
      onSuccess: () => { setNoteBody(''); refreshRelated(); },
      onError: error => setError(getErrorMessage(error, 'Activity note could not be added. Please retry.')),
    });
  };
  if (!validId) return <Shell><LoadError message="This ticket number is not valid" retry={() => navigate('/')} /></Shell>;
  if (isLoading) return <Shell><div className="detail-loading"><div className="skeleton-title" /><div className="skeleton-block" /><div className="skeleton-block short" /></div></Shell>;
  if (isError || !ticket) return <Shell><LoadError message="Could not load this ticket" retry={() => refetch()} /></Shell>;
  return <Shell><section className="detail-page">
    <Link href="/" className="back-link" data-testid="link-back-queue"><ArrowLeft size={15} /> Back to queue</Link>
    <div className="detail-heading">
      <div><div className="eyebrow"><span className="eyebrow-line" /> {ticket.productArea.toUpperCase()} / {ticket.environment.toUpperCase()}</div><div className="detail-title-row"><h1>{ticket.title}</h1><StatusPill status={ticket.status} /></div><div className="detail-meta"><span className="ticket-id">{ticket.ticketNumber}</span><span className="meta-dot" /> Opened {formatDate(ticket.createdAt)}<span className="meta-dot" /> Updated {formatDate(ticket.updatedAt)}</div></div>
      <div className="detail-priority"><span>PRIORITY</span><SeverityTag severity={ticket.severity} /></div>
    </div>
    {error && <div className="inline-error"><AlertCircle size={17} />{error}</div>}
    <div className="detail-layout">
      <div className="detail-main-column">
        <section className="detail-card issue-card"><div className="card-title"><div><span className="card-kicker">CUSTOMER REPORT</span><h2>Issue details</h2></div><MessageSquareText size={18} /></div>
          <div className="detail-field"><b>Description</b><p>{ticket.description}</p></div>
          <div className="behavior-grid"><div className="behavior-box expected"><span>EXPECTED BEHAVIOR</span><p>{ticket.expectedBehavior}</p></div><div className="behavior-box actual"><span>ACTUAL BEHAVIOR</span><p>{ticket.actualBehavior}</p></div></div>
          <div className="detail-field"><b>Reproduction steps</b><p className="preserve-lines">{ticket.reproductionSteps}</p></div>
          <div className="detail-field"><b>Customer impact</b><p>{ticket.customerImpact}</p></div>
          {ticket.errorMessage && <div className="detail-field"><b>Error message</b><pre className="code-block">{ticket.errorMessage}</pre></div>}
          {ticket.sanitizedLogs && <div className="detail-field"><b>Sanitized logs</b><pre className="code-block log-block">{ticket.sanitizedLogs}</pre></div>}
        </section>
        <section className="detail-card activity-card"><div className="card-title"><div><span className="card-kicker">WORK LOG</span><h2>Activity <span className="activity-count">{ticket.activity.length}</span></h2></div><Clock3 size={18} /></div>
          {ticket.activity.length === 0 ? <div className="activity-empty"><span><MessageSquareText size={17} /></span><div><b>No activity yet</b><p>Record what you've checked or share a customer update.</p></div></div> :
            <div className="activity-list">{[...ticket.activity].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(item => <article className="activity-item" key={item.id} data-testid={`activity-item-${item.id}`}><span className={`activity-marker marker-${item.kind}`}><i /></span><div className="activity-copy"><div className="activity-meta"><b>{item.author}</b><span className="activity-kind">{item.kind.replaceAll('_', ' ')}</span><time>{formatDate(item.createdAt)}</time></div><p>{item.body}</p></div></article>)}</div>}
          <form className="note-composer" onSubmit={addNote} data-testid="form-add-activity">
            <div className="note-topline"><b>Add activity note</b><span>VISIBLE TO SUPPORT TEAM</span></div>
            <div className="note-controls"><Select value={noteKind} onChange={value => setNoteKind(value as (typeof activityKinds)[number])} options={activityKinds} testId="input-activity-kind" /><input value={noteAuthor} onChange={e => setNoteAuthor(e.target.value)} maxLength={120} placeholder="Author (optional)" aria-label="Author" data-testid="input-activity-author" /></div>
            <textarea required minLength={3} maxLength={5000} rows={3} value={noteBody} onChange={e => setNoteBody(e.target.value)} placeholder="Add what you've learned, tried, or told the customer…" data-testid="input-activity-body" />
            <div className="note-submit-row"><span>Keep customer-facing details clear and concise.</span><button type="submit" className="button button-primary button-small" disabled={createUpdate.isPending} data-testid="button-add-activity">{createUpdate.isPending ? 'Adding…' : <>Add note <ArrowRight size={14} /></>}</button></div>
          </form>
        </section>
      </div>
      <aside className="detail-side-column">
        <form className="detail-card manage-card" onSubmit={saveChanges} data-testid="form-manage-ticket"><div className="card-title"><div><span className="card-kicker">TICKET CONTROL</span><h2>Manage</h2></div><SlidersHorizontal size={17} /></div>
          <Field label="Status"><Select value={status} onChange={value => setStatus(value as TicketStatus)} options={statuses} testId="input-ticket-status" /></Field>
          <Field label="Owner" hint="Enter the support agent responsible."><input maxLength={120} value={owner ?? ''} onChange={event => setOwner(event.target.value || null)} placeholder="Unassigned" data-testid="input-ticket-owner" /></Field>
          <Field label="Resolution" hint="Optional · add the outcome when resolved"><textarea maxLength={5000} rows={4} value={resolution} onChange={event => setResolution(event.target.value)} placeholder="Document the resolution…" data-testid="input-ticket-resolution" /></Field>
          <button type="submit" className="button button-primary save-button" disabled={updateTicket.isPending} data-testid="button-save-ticket">{updateTicket.isPending ? 'Saving…' : <><Check size={15} /> Save changes</>}</button>
        </form>
        <section className="detail-card context-card"><div className="card-kicker">AT A GLANCE</div><div className="context-row"><span>Product area</span><b>{ticket.productArea}</b></div><div className="context-row"><span>Environment</span><b>{ticket.environment}</b></div><div className="context-row"><span>Owner</span><b>{ticket.owner ?? 'Unassigned'}</b></div><div className="context-row"><span>Last updated</span><b>{formatDate(ticket.updatedAt)}</b></div><div className="context-status"><span className="live-dot" /> Ticket #{ticket.ticketNumber}</div></section>
        <div className="handling-note"><ShieldAlert size={15} /><p><b>Handle with care</b>Sanitized logs only. Never add passwords, tokens, or customer personal data to activity notes.</p></div>
      </aside>
    </div>
  </section></Shell>;
}

function formatDate(value: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}
function formatAge(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 60) return `${Math.max(1, minutes)}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}
function Router() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><Switch>
    <Route path="/" component={QueuePage} />
    <Route path="/tickets/new" component={NewTicketPage} />
    <Route path="/tickets/:ticketId" component={TicketDetailPage} />
    <Route component={NotFound} />
  </Switch></ErrorBoundary>;
}
function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}
export default App;
