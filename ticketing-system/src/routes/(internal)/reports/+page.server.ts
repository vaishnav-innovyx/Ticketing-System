import { computeTicketMetrics } from '$lib/portal/ticketDisplay';
import type { PageServerLoad } from './$types';

const TICKET_COLUMNS =
	'id, token, title, category, priority, status, client_id, project_id, estimated_hours, actual_hours, raised_at, poc_responded_at, requirement_completed_at, client_approved_at, closed_at, target_date, created_at, admin_rejected_at';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	try {
		const [{ data: dbClients }, { data: dbProjects }, { data: dbTickets }] = await Promise.all([
			supabase.from('clients').select('id, code, name').order('name'),
			supabase.from('projects').select('id, code, name, client_id').order('code'),
			supabase.from('tickets').select(TICKET_COLUMNS).order('raised_at', { ascending: false })
		]);

		const clients = dbClients || [];
		const projects = dbProjects || [];
		const tickets = (dbTickets || []).map((t) => ({ ...t, ...computeTicketMetrics(t) }));

		return { clients, projects, tickets };
	} catch {
		return {
			clients: [],
			projects: [],
			tickets: []
		};
	}
};
