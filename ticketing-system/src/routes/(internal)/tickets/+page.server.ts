import { fail } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/server/supabase';
import type { Actions, PageServerLoad } from './$types';

const SEED_FALLBACK_TICKETS = [
	{
		id: 't1',
		token: 'ACME-MBANK-TK-0001',
		title: 'Biometric fingerprint login fails after OS update',
		description: 'Users on latest Android 15 report fingerprint verification loop without error code.',
		category: 'bug' as const,
		priority: 'critical' as const,
		status: 'development' as const,
		estimated_hours: 12,
		actual_hours: 6,
		client_id: '11111111-1111-1111-1111-111111111111',
		project_id: 'p1',
		client: { id: '11111111-1111-1111-1111-111111111111', name: 'Acme Corp', code: 'ACME' },
		project: { id: 'p1', name: 'Acme Mobile Banking', code: 'MBANK' },
		specialist_id: 'u-spec',
		poc_id: 'u-poc',
		delivery_lead_id: 'u-del',
		created_at: new Date(Date.now() - 4 * 86400000).toISOString()
	},
	{
		id: 't2',
		token: 'ACME-MBANK-TK-0002',
		title: 'Dark mode contrast accessibility enhancements',
		description: 'Ensure all primary cards and buttons meet WCAG 2.1 AA 4.5:1 color contrast requirements.',
		category: 'enhancement' as const,
		priority: 'medium' as const,
		status: 'requirement_estimation' as const,
		estimated_hours: 8,
		actual_hours: 0,
		client_id: '11111111-1111-1111-1111-111111111111',
		project_id: 'p1',
		client: { id: '11111111-1111-1111-1111-111111111111', name: 'Acme Corp', code: 'ACME' },
		project: { id: 'p1', name: 'Acme Mobile Banking', code: 'MBANK' },
		poc_id: 'u-poc',
		created_at: new Date(Date.now() - 2 * 86400000).toISOString()
	},
	{
		id: 't3',
		token: 'GLOB-ERP-TK-0001',
		title: 'Monthly financial ledger export timeout on large datasets',
		description: 'Generating PDF reports with > 50,000 journal entries causes 504 gateway timeout.',
		category: 'bug' as const,
		priority: 'high' as const,
		status: 'poc_triage' as const,
		estimated_hours: null,
		actual_hours: null,
		client_id: '22222222-2222-2222-2222-222222222222',
		project_id: 'p5',
		client: { id: '22222222-2222-2222-2222-222222222222', name: 'Globex Inc', code: 'GLOB' },
		project: { id: 'p5', name: 'Globex ERP', code: 'ERP' },
		poc_id: 'u-poc',
		created_at: new Date(Date.now() - 1 * 86400000).toISOString()
	},
	{
		id: 't4',
		token: 'GLOB-LOG-TK-0001',
		title: 'Warehouse barcode scanner API integration KT workshop',
		description: 'Knowledge transfer session for warehouse leads regarding Zebra TC26 Android scanner integration.',
		category: 'kt' as const,
		priority: 'low' as const,
		status: 'client_approval' as const,
		estimated_hours: 4,
		actual_hours: 0,
		client_id: '22222222-2222-2222-2222-222222222222',
		project_id: 'p7',
		client: { id: '22222222-2222-2222-2222-222222222222', name: 'Globex Inc', code: 'GLOB' },
		project: { id: 'p7', name: 'Globex Logistics', code: 'LOG' },
		specialist_id: 'u-spec',
		created_at: new Date(Date.now() - 3 * 86400000).toISOString()
	},
	{
		id: 't5',
		token: 'TECHCO-APP-TK-0001',
		title: 'Push notification delivery failure in background mode',
		description: 'FCM tokens fail to trigger wakeup notifications when app is deeply backgrounded.',
		category: 'bug' as const,
		priority: 'high' as const,
		status: 'delivery' as const,
		estimated_hours: 16,
		actual_hours: 14.5,
		client_id: '33333333-3333-3333-3333-333333333333',
		project_id: 'p8',
		client: { id: '33333333-3333-3333-3333-333333333333', name: 'TechCo Ltd', code: 'TECHCO' },
		project: { id: 'p8', name: 'TechCo Mobile App', code: 'APP' },
		specialist_id: 'u-spec',
		delivery_lead_id: 'u-del',
		created_at: new Date(Date.now() - 6 * 86400000).toISOString()
	},
	{
		id: 't6',
		token: 'TECHCO-API-TK-0001',
		title: 'Rate limiting middleware on public OAuth token endpoint',
		description: 'Prevent credential stuffing by throttling IP requests to 60 requests per minute.',
		category: 'enhancement' as const,
		priority: 'medium' as const,
		status: 'closed' as const,
		estimated_hours: 6,
		actual_hours: 5.5,
		client_id: '33333333-3333-3333-3333-333333333333',
		project_id: 'p9',
		client: { id: '33333333-3333-3333-3333-333333333333', name: 'TechCo Ltd', code: 'TECHCO' },
		project: { id: 'p9', name: 'TechCo Public API', code: 'API' },
		specialist_id: 'u-spec',
		delivery_lead_id: 'u-del',
		created_at: new Date(Date.now() - 10 * 86400000).toISOString()
	}
];

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	try {
		const [
			{ data: dbTickets },
			{ data: dbClients },
			{ data: dbProjects },
			{ data: dbProfiles },
			{ data: dbEvents }
		] = await Promise.all([
			supabase
				.from('tickets')
				.select('*, client:clients(id, name, code), project:projects(id, name, code)')
				.order('created_at', { ascending: false }),
			supabase.from('clients').select('id, code, name').order('name'),
			supabase.from('projects').select('id, code, name, client_id').order('code'),
			supabase.from('profiles').select('id, full_name, email, role'),
			supabase.from('ticket_events').select('*, actor:profiles(full_name, email)').order('created_at', { ascending: true })
		]);

		const clients = dbClients || [];
		const projects = dbProjects || [];
		const profiles = dbProfiles || [];
		const events = dbEvents || [];

		if (!dbTickets || dbTickets.length === 0) {
			return {
				tickets: SEED_FALLBACK_TICKETS,
				clients: clients.length > 0 ? clients : [
					{ id: '11111111-1111-1111-1111-111111111111', code: 'ACME', name: 'Acme Corp' },
					{ id: '22222222-2222-2222-2222-222222222222', code: 'GLOB', name: 'Globex Inc' },
					{ id: '33333333-3333-3333-3333-333333333333', code: 'TECHCO', name: 'TechCo Ltd' }
				],
				projects,
				internalStaff: profiles.filter((p) => !['client_admin', 'client_raiser', 'client_viewer'].includes(p.role))
			};
		}

		const tickets = dbTickets.map((t) => {
			const ticketEvents = events.filter((e) => e.ticket_id === t.id);
			const clientInfo = Array.isArray(t.client) ? t.client[0] : t.client;
			const projectInfo = Array.isArray(t.project) ? t.project[0] : t.project;

			return {
				...t,
				client: clientInfo ?? null,
				project: projectInfo ?? null,
				raised_by_profile: profiles.find((p) => p.id === t.raised_by) ?? null,
				poc_profile: profiles.find((p) => p.id === t.poc_id) ?? null,
				specialist_profile: profiles.find((p) => p.id === t.specialist_id) ?? null,
				delivery_lead_profile: profiles.find((p) => p.id === t.delivery_lead_id) ?? null,
				events: ticketEvents
			};
		});

		const internalStaff = profiles.filter((p) =>
			['super_admin', 'poc', 'specialist', 'delivery_lead'].includes(p.role)
		);

		return { tickets, clients, projects, internalStaff };
	} catch {
		return {
			tickets: SEED_FALLBACK_TICKETS,
			clients: [
				{ id: '11111111-1111-1111-1111-111111111111', code: 'ACME', name: 'Acme Corp' },
				{ id: '22222222-2222-2222-2222-222222222222', code: 'GLOB', name: 'Globex Inc' },
				{ id: '33333333-3333-3333-3333-333333333333', code: 'TECHCO', name: 'TechCo Ltd' }
			],
			projects: [],
			internalStaff: []
		};
	}
};

export const actions: Actions = {
	createTicket: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();
		if (!user) return fail(401, { error: 'Not authenticated.' });

		const formData = await request.formData();
		const clientId = String(formData.get('client_id') || '').trim();
		const projectId = String(formData.get('project_id') || '').trim();
		const title = String(formData.get('title') || '').trim();
		const description = String(formData.get('description') || '').trim();
		const category = String(formData.get('category') || 'bug');
		const priority = String(formData.get('priority') || 'medium');
		const targetDate = String(formData.get('target_date') || '').trim() || null;

		if (!clientId || !projectId || !title) {
			return fail(400, { error: 'Client, project, and title are required.', title });
		}

		// Look up client and project codes to build token
		const [{ data: clientRow }, { data: projectRow }] = await Promise.all([
			supabase.from('clients').select('code').eq('id', clientId).single(),
			supabase.from('projects').select('code').eq('id', projectId).single()
		]);

		const clientCode = clientRow?.code || 'CLIENT';
		const projectCode = projectRow?.code || 'PROJ';

		// Generate token with count
		const { count } = await supabase
			.from('tickets')
			.select('id', { count: 'exact', head: true })
			.eq('project_id', projectId);

		const seq = String((count || 0) + 1).padStart(4, '0');
		const token = `${clientCode}-${projectCode}-TK-${seq}`;

		const { data: newTicket, error: ticketError } = await supabase
			.from('tickets')
			.insert({
				token,
				client_id: clientId,
				project_id: projectId,
				raised_by: user.id,
				title,
				description: description || null,
				category: category as never,
				priority: priority as never,
				status: 'raised' as never,
				target_date: targetDate || undefined
			} as never)
			.select('id, token')
			.single();

		if (ticketError) {
			return fail(500, { error: ticketError.message });
		}

		// Log initial event
		await supabase.from('ticket_events').insert({
			ticket_id: newTicket.id,
			actor_id: user.id,
			from_status: null,
			to_status: 'raised',
			notes: 'Ticket initially raised.'
		});

		return { success: true, createdTicketId: newTicket.id };
	},

	updateStatus: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();
		if (!user) return fail(401, { error: 'Not authenticated.' });

		const formData = await request.formData();
		const ticketId = String(formData.get('ticket_id') || '').trim();
		const targetStatus = String(formData.get('target_status') || '').trim();

		if (!ticketId || !targetStatus) {
			return fail(400, { error: 'Ticket ID and target status are required.' });
		}

		const { data: currentTicket } = await supabase.from('tickets').select('status').eq('id', ticketId).single();
		const fromStatus = currentTicket?.status || null;

		const updatePayload: Record<string, unknown> = {
			status: targetStatus,
			updated_at: new Date().toISOString()
		};

		// Set lifecycle timestamp flags
		const now = new Date().toISOString();
		if (targetStatus === 'poc_triage') updatePayload.poc_responded_at = now;
		if (targetStatus === 'requirement_estimation') updatePayload.requirement_completed_at = now;
		if (targetStatus === 'client_approval') updatePayload.client_approved_at = now;
		if (targetStatus === 'development') updatePayload.development_completed_at = now;
		if (targetStatus === 'delivery') updatePayload.delivered_at = now;
		if (targetStatus === 'closed') updatePayload.closed_at = now;

		const { error } = await supabaseAdmin.from('tickets').update(updatePayload as never).eq('id', ticketId);

		if (error) {
			return fail(500, { error: error.message });
		}

		// Log event
		await supabaseAdmin.from('ticket_events').insert({
			ticket_id: ticketId,
			actor_id: user.id,
			from_status: fromStatus as never,
			to_status: targetStatus as never,
			notes: `Status changed to ${targetStatus}`
		});

		return { success: true };
	},

	updateHours: async ({ request, locals: { safeGetSession } }) => {
		const { user } = await safeGetSession();
		if (!user) return fail(401, { error: 'Not authenticated.' });

		const formData = await request.formData();
		const ticketId = String(formData.get('ticket_id') || '').trim();
		const estHoursRaw = formData.get('estimated_hours');
		const actHoursRaw = formData.get('actual_hours');

		const estimatedHours = estHoursRaw !== null && estHoursRaw !== '' ? Number(estHoursRaw) : null;
		const actualHours = actHoursRaw !== null && actHoursRaw !== '' ? Number(actHoursRaw) : null;

		const { error } = await supabaseAdmin
			.from('tickets')
			.update({
				estimated_hours: estimatedHours,
				actual_hours: actualHours
			})
			.eq('id', ticketId);

		if (error) {
			return fail(500, { error: error.message });
		}

		return { success: true };
	},

	assignStaff: async ({ request, locals: { safeGetSession } }) => {
		const { user } = await safeGetSession();
		if (!user) return fail(401, { error: 'Not authenticated.' });

		const formData = await request.formData();
		const ticketId = String(formData.get('ticket_id') || '').trim();
		const specialistId = String(formData.get('specialist_id') || '').trim() || null;
		const pocId = String(formData.get('poc_id') || '').trim() || null;
		const deliveryLeadId = String(formData.get('delivery_lead_id') || '').trim() || null;

		const updateData: Record<string, string | null> = {};
		if (formData.has('specialist_id')) updateData.specialist_id = specialistId;
		if (formData.has('poc_id')) updateData.poc_id = pocId;
		if (formData.has('delivery_lead_id')) updateData.delivery_lead_id = deliveryLeadId;

		const { error } = await supabaseAdmin.from('tickets').update(updateData as never).eq('id', ticketId);

		if (error) {
			return fail(500, { error: error.message });
		}

		return { success: true };
	}
};
