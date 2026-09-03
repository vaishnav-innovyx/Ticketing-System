import { computeTicketMetrics } from '$lib/portal/ticketDisplay';
import type { PageServerLoad } from './$types';

const SEED_FALLBACK_CLIENTS = [
	{ id: '11111111-1111-1111-1111-111111111111', code: 'ACME', name: 'Acme Corp' },
	{ id: '22222222-2222-2222-2222-222222222222', code: 'GLOB', name: 'Globex Inc' },
	{ id: '33333333-3333-3333-3333-333333333333', code: 'TECHCO', name: 'TechCo Ltd' }
];

const SEED_FALLBACK_PROJECTS = [
	{ id: 'p1', client_id: '11111111-1111-1111-1111-111111111111', code: 'MBANK', name: 'Acme Mobile Banking' },
	{ id: 'p5', client_id: '22222222-2222-2222-2222-222222222222', code: 'ERP', name: 'Globex ERP' },
	{ id: 'p7', client_id: '22222222-2222-2222-2222-222222222222', code: 'LOG', name: 'Globex Logistics' },
	{ id: 'p8', client_id: '33333333-3333-3333-3333-333333333333', code: 'APP', name: 'TechCo Mobile App' },
	{ id: 'p9', client_id: '33333333-3333-3333-3333-333333333333', code: 'API', name: 'TechCo Public API' }
];

const now = Date.now();
const daysAgo = (n: number) => new Date(now - n * 86400000).toISOString();

const SEED_FALLBACK_TICKETS = [
	{
		id: 't1', token: 'ACME-MBANK-TK-0001', title: 'Biometric fingerprint login fails after OS update',
		category: 'bug' as const, priority: 'critical' as const, status: 'development' as const,
		client_id: '11111111-1111-1111-1111-111111111111', project_id: 'p1',
		estimated_hours: 12, actual_hours: 6,
		raised_at: daysAgo(4), poc_responded_at: daysAgo(3.8), requirement_completed_at: daysAgo(3.5),
		client_approved_at: daysAgo(3), closed_at: null, target_date: daysAgo(-2), created_at: daysAgo(4), admin_rejected_at: null
	},
	{
		id: 't2', token: 'ACME-MBANK-TK-0002', title: 'Dark mode contrast accessibility enhancements',
		category: 'enhancement' as const, priority: 'medium' as const, status: 'requirement_estimation' as const,
		client_id: '11111111-1111-1111-1111-111111111111', project_id: 'p1',
		estimated_hours: 8, actual_hours: null,
		raised_at: daysAgo(2), poc_responded_at: daysAgo(1.8), requirement_completed_at: null,
		client_approved_at: null, closed_at: null, target_date: daysAgo(-5), created_at: daysAgo(2), admin_rejected_at: null
	},
	{
		id: 't3', token: 'GLOB-ERP-TK-0001', title: 'Monthly financial ledger export timeout on large datasets',
		category: 'bug' as const, priority: 'high' as const, status: 'poc_triage' as const,
		client_id: '22222222-2222-2222-2222-222222222222', project_id: 'p5',
		estimated_hours: null, actual_hours: null,
		raised_at: daysAgo(1), poc_responded_at: null, requirement_completed_at: null,
		client_approved_at: null, closed_at: null, target_date: daysAgo(-6), created_at: daysAgo(1), admin_rejected_at: daysAgo(0.5)
	},
	{
		id: 't4', token: 'GLOB-LOG-TK-0001', title: 'Warehouse barcode scanner API integration KT workshop',
		category: 'kt' as const, priority: 'low' as const, status: 'client_approval' as const,
		client_id: '22222222-2222-2222-2222-222222222222', project_id: 'p7',
		estimated_hours: 4, actual_hours: null,
		raised_at: daysAgo(3), poc_responded_at: daysAgo(2.9), requirement_completed_at: daysAgo(2.5),
		client_approved_at: null, closed_at: null, target_date: daysAgo(-1), created_at: daysAgo(3), admin_rejected_at: null
	},
	{
		id: 't5', token: 'TECHCO-APP-TK-0001', title: 'Push notification delivery failure in background mode',
		category: 'bug' as const, priority: 'high' as const, status: 'delivery' as const,
		client_id: '33333333-3333-3333-3333-333333333333', project_id: 'p8',
		estimated_hours: 16, actual_hours: 14.5,
		raised_at: daysAgo(6), poc_responded_at: daysAgo(5.8), requirement_completed_at: daysAgo(5),
		client_approved_at: daysAgo(4.5), closed_at: null, target_date: daysAgo(0), created_at: daysAgo(6), admin_rejected_at: null
	},
	{
		id: 't6', token: 'TECHCO-API-TK-0001', title: 'Rate limiting middleware on public OAuth token endpoint',
		category: 'enhancement' as const, priority: 'medium' as const, status: 'closed' as const,
		client_id: '33333333-3333-3333-3333-333333333333', project_id: 'p9',
		estimated_hours: 6, actual_hours: 5.5,
		raised_at: daysAgo(10), poc_responded_at: daysAgo(9.8), requirement_completed_at: daysAgo(9.5),
		client_approved_at: daysAgo(9), closed_at: daysAgo(7), target_date: daysAgo(7.5), created_at: daysAgo(10), admin_rejected_at: null
	},
	{
		id: 't7', token: 'ACME-MBANK-TK-0003', title: 'KT session: new payments module for support desk',
		category: 'kt' as const, priority: 'low' as const, status: 'closed' as const,
		client_id: '11111111-1111-1111-1111-111111111111', project_id: 'p1',
		estimated_hours: 24, actual_hours: 22,
		raised_at: daysAgo(20), poc_responded_at: daysAgo(19.5), requirement_completed_at: daysAgo(18),
		client_approved_at: daysAgo(17), closed_at: daysAgo(15), target_date: daysAgo(16), created_at: daysAgo(20), admin_rejected_at: null
	},
	{
		id: 't8', token: 'GLOB-ERP-TK-0002', title: 'Training: admin console walkthrough for finance team',
		category: 'training' as const, priority: 'low' as const, status: 'closed' as const,
		client_id: '22222222-2222-2222-2222-222222222222', project_id: 'p5',
		estimated_hours: 4, actual_hours: 5,
		raised_at: daysAgo(25), poc_responded_at: daysAgo(24.8), requirement_completed_at: daysAgo(24),
		client_approved_at: daysAgo(23.5), closed_at: daysAgo(20), target_date: daysAgo(22), created_at: daysAgo(25), admin_rejected_at: null
	}
];

const TICKET_COLUMNS =
	'id, token, title, category, priority, status, client_id, project_id, estimated_hours, actual_hours, raised_at, poc_responded_at, requirement_completed_at, client_approved_at, closed_at, target_date, created_at, admin_rejected_at';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	try {
		const [{ data: dbClients }, { data: dbProjects }, { data: dbTickets, error: ticketsError }] = await Promise.all([
			supabase.from('clients').select('id, code, name').order('name'),
			supabase.from('projects').select('id, code, name, client_id').order('code'),
			supabase.from('tickets').select(TICKET_COLUMNS).order('raised_at', { ascending: false })
		]);

		if (ticketsError || !dbTickets || dbTickets.length === 0) {
			return {
				clients: SEED_FALLBACK_CLIENTS,
				projects: SEED_FALLBACK_PROJECTS,
				tickets: SEED_FALLBACK_TICKETS.map((t) => ({ ...t, ...computeTicketMetrics(t) }))
			};
		}

		const clients = dbClients && dbClients.length > 0 ? dbClients : SEED_FALLBACK_CLIENTS;
		const projects = dbProjects && dbProjects.length > 0 ? dbProjects : SEED_FALLBACK_PROJECTS;
		const tickets = dbTickets.map((t) => ({ ...t, ...computeTicketMetrics(t) }));

		return { clients, projects, tickets };
	} catch {
		return {
			clients: SEED_FALLBACK_CLIENTS,
			projects: SEED_FALLBACK_PROJECTS,
			tickets: SEED_FALLBACK_TICKETS.map((t) => ({ ...t, ...computeTicketMetrics(t) }))
		};
	}
};
