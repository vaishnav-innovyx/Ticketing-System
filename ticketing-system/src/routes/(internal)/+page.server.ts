import { computeTicketMetrics } from '$lib/portal/ticketDisplay';
import type { PageServerLoad } from './$types';

function average(values: (number | null)[]): number | null {
	const nums = values.filter((v): v is number => v !== null);
	if (nums.length === 0) return null;
	return nums.reduce((sum, v) => sum + v, 0) / nums.length;
}

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const { data: tickets } = await supabase
		.from('tickets')
		.select(
			'id, token, title, status, priority, category, raised_at, poc_responded_at, requirement_completed_at, client_approved_at, closed_at, estimated_hours, actual_hours'
		)
		.order('raised_at', { ascending: false });

	const ticketList = tickets ?? [];

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

	return { stats, deliveryMetrics, ticketMetricsRows };
};
