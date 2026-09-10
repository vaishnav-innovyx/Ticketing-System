import { computeTicketMetrics, STATUS_LABEL, PRIORITY_LABEL, type TicketStatus, type TicketDbPriority } from '$lib/portal/ticketDisplay';
import type { PageServerLoad } from './$types';

function average(values: (number | null)[]): number | null {
	const nums = values.filter((v): v is number => v !== null);
	if (nums.length === 0) return null;
	return nums.reduce((sum, v) => sum + v, 0) / nums.length;
}

function escapeHtml(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function timeAgo(iso: string): string {
	const diffMs = Date.now() - new Date(iso).getTime();
	const minutes = Math.floor(diffMs / 60000);
	if (minutes < 1) return 'Just now';
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days === 1) return 'Yesterday';
	if (days < 7) return `${days}d ago`;
	return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface Bucket {
	start: Date;
	end: Date;
	label: string;
}

function buildMonthlyBuckets(monthsBack: number): Bucket[] {
	const now = new Date();
	return Array.from({ length: monthsBack }, (_, idx) => {
		const offset = monthsBack - 1 - idx;
		const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
		const end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 1);
		return { start, end, label: start.toLocaleDateString('en-US', { month: 'short' }) };
	});
}

function buildWeeklyBuckets(weeksBack: number): Bucket[] {
	const now = new Date();
	const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
	return Array.from({ length: weeksBack }, (_, idx) => {
		const offset = weeksBack - 1 - idx;
		const end = new Date(endOfToday.getTime() - offset * 7 * 86400000);
		const start = new Date(end.getTime() - 7 * 86400000);
		return { start, end, label: `Week ${idx + 1}` };
	});
}

function buildQuarterBuckets(): Bucket[] {
	const year = new Date().getFullYear();
	return [0, 1, 2, 3].map((q) => ({
		start: new Date(year, q * 3, 1),
		end: new Date(year, q * 3 + 3, 1),
		label: `Q${q + 1}`
	}));
}

function countInBuckets(buckets: Bucket[], dates: (string | null)[]): number[] {
	return buckets.map(
		(b) => dates.filter((iso) => iso && new Date(iso) >= b.start && new Date(iso) < b.end).length
	);
}

const STAGE_META: Record<TicketStatus, { icon: string; iconBg: string; iconColor: string; donutColor: string }> = {
	raised: { icon: 'flag', iconBg: 'bg-blue-50', iconColor: 'text-blue-700', donutColor: 'var(--color-primary-container)' },
	poc_triage: { icon: 'assignment', iconBg: 'bg-purple-50', iconColor: 'text-purple-700', donutColor: 'var(--color-tertiary-container)' },
	requirement_estimation: { icon: 'schedule', iconBg: 'bg-amber-50', iconColor: 'text-amber-700', donutColor: 'var(--color-tertiary)' },
	client_approval: { icon: 'thumb_up', iconBg: 'bg-indigo-50', iconColor: 'text-indigo-700', donutColor: 'var(--color-secondary-container)' },
	development: { icon: 'code', iconBg: 'bg-cyan-50', iconColor: 'text-cyan-700', donutColor: 'var(--color-secondary)' },
	delivery: { icon: 'local_shipping', iconBg: 'bg-orange-50', iconColor: 'text-orange-700', donutColor: 'var(--color-primary)' },
	closed: { icon: 'check_circle', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-700', donutColor: 'var(--color-outline-variant)' }
};

const PRIORITY_COLOR: Record<TicketDbPriority, string> = {
	critical: 'var(--color-error)',
	high: 'var(--color-primary-container)',
	medium: 'var(--color-primary-fixed-dim)',
	low: 'var(--color-surface-container-highest)'
};

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const [{ data: tickets }, { data: events }] = await Promise.all([
		supabase
			.from('tickets')
			.select(
				'id, token, title, status, priority, category, raised_at, poc_responded_at, requirement_completed_at, client_approved_at, closed_at, estimated_hours, actual_hours'
			)
			.order('raised_at', { ascending: false }),
		supabase
			.from('ticket_events')
			.select('id, ticket_id, from_status, to_status, created_at, actor:profiles(full_name, email)')
			.order('created_at', { ascending: false })
			.limit(10)
	]);

	const ticketList = tickets ?? [];
	const ticketById = new Map(ticketList.map((t) => [t.id, t]));

	// Dynamic KPI Calculations
	const openTickets = ticketList.filter((t) => t.status !== 'closed');
	const awaitingClient = ticketList.filter((t) => t.status === 'client_approval' || t.status === 'requirement_estimation');
	const inDevelopment = ticketList.filter((t) => t.status === 'development');

	const now = new Date();
	const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
	const resolvedThisMonth = ticketList.filter((t) => t.closed_at && t.closed_at >= firstDayOfMonth);

	const stats = {
		openTicketsCount: openTickets.length,
		awaitingClientCount: awaitingClient.length,
		inDevelopmentCount: inDevelopment.length,
		resolvedThisMonthCount: resolvedThisMonth.length
	};

	const rows = ticketList.map((t) => ({
		id: t.id,
		token: t.token,
		title: t.title,
		status: t.status,
		...computeTicketMetrics(t)
	}));

	const countWhere = (key: 'pocTatHours' | 'reqDurationHours' | 'approvalDelayHours' | 'effortVariancePct' | 'cycleTimeHours') =>
		rows.filter((r) => r[key] !== null).length;

	const deliveryMetrics = {
		pocTat: { avgHours: average(rows.map((r) => r.pocTatHours)), count: countWhere('pocTatHours') },
		reqDuration: { avgHours: average(rows.map((r) => r.reqDurationHours)), count: countWhere('reqDurationHours') },
		approvalDelay: { avgHours: average(rows.map((r) => r.approvalDelayHours)), count: countWhere('approvalDelayHours') },
		effortVariance: { avgPct: average(rows.map((r) => r.effortVariancePct)), count: countWhere('effortVariancePct') },
		cycleTime: { avgHours: average(rows.map((r) => r.cycleTimeHours)), count: countWhere('cycleTimeHours') }
	};

	const ticketMetricsRows = rows
		.filter((r) => r.pocTatHours !== null || r.cycleTimeHours !== null)
		.slice(0, 12);

	// Ticket Activity Chart: new vs. resolved counts bucketed per range
	const raisedDates = ticketList.map((t) => t.raised_at);
	const closedDates = ticketList.map((t) => t.closed_at);
	const toSeries = (buckets: Bucket[]) => ({
		labels: buckets.map((b) => b.label),
		newTickets: countInBuckets(buckets, raisedDates),
		resolvedTickets: countInBuckets(buckets, closedDates)
	});
	const chartData = {
		'Last 6 Months': toSeries(buildMonthlyBuckets(6)),
		'Last 30 Days': toSeries(buildWeeklyBuckets(4)),
		'This Year': toSeries(buildQuarterBuckets())
	};

	// Ticket Status Donut: open-ticket breakdown across the lifecycle
	const OPEN_STAGES: TicketStatus[] = ['raised', 'poc_triage', 'requirement_estimation', 'client_approval', 'development', 'delivery'];
	const segments = OPEN_STAGES.map((status) => ({
		label: STATUS_LABEL[status],
		count: openTickets.filter((t) => t.status === status).length,
		color: STAGE_META[status].donutColor
	}));

	// Ticket Priority Bars: open-ticket breakdown by priority
	const PRIORITY_ORDER: TicketDbPriority[] = ['critical', 'high', 'medium', 'low'];
	const priorityCounts = PRIORITY_ORDER.map((p) => openTickets.filter((t) => t.priority === p).length);
	const maxPriorityCount = Math.max(...priorityCounts, 0);
	const priorities = PRIORITY_ORDER.map((p, idx) => ({
		label: PRIORITY_LABEL[p],
		count: priorityCounts[idx],
		colorVar: PRIORITY_COLOR[p],
		percentage: maxPriorityCount > 0 ? (priorityCounts[idx] / maxPriorityCount) * 100 : 0
	}));

	// Recent Activity: real ticket_events (creation + status transitions)
	const activities = (events ?? []).map((e) => {
		const ticket = ticketById.get(e.ticket_id);
		const meta = STAGE_META[e.to_status] ?? STAGE_META.raised;
		const actorName = escapeHtml(e.actor?.full_name || e.actor?.email || 'Someone');
		const tokenLabel = escapeHtml(ticket?.token ?? 'a ticket');
		const titleLabel = escapeHtml(ticket?.title ?? '');
		const tokenHtml = `<span class="font-mono text-[var(--color-primary)] font-semibold">${tokenLabel}</span>`;
		const titleHtml =
			e.from_status === null
				? `<strong>${actorName}</strong> raised ${tokenHtml} — ${titleLabel}`
				: `<strong>${actorName}</strong> moved ${tokenHtml} to <strong>${escapeHtml(STATUS_LABEL[e.to_status])}</strong>`;

		return {
			id: e.id,
			icon: meta.icon,
			iconBg: meta.iconBg,
			iconColor: meta.iconColor,
			titleHtml,
			timestamp: timeAgo(e.created_at)
		};
	});

	return { stats, deliveryMetrics, ticketMetricsRows, chartData, segments, priorities, activities };
};
