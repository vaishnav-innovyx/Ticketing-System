import { fail } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/server/supabase';
import type { Actions, PageServerLoad } from './$types';

const INTERNAL_TEAM_ROLES = ['poc', 'specialist', 'delivery_lead'] as const;

// A default POC must be someone who can actually see the project's tickets:
// a super_admin (unrestricted), or a POC included in the submitted team.
async function validateDefaultPoc(defaultPocId: string | null, teamMemberIds: string[]): Promise<string | null> {
	if (!defaultPocId) return null;
	if (teamMemberIds.includes(defaultPocId)) return defaultPocId;
	const { data: pocProfile } = await supabaseAdmin.from('profiles').select('role').eq('id', defaultPocId).single();
	return pocProfile?.role === 'super_admin' ? defaultPocId : null;
}

const SEED_FALLBACK_PROJECTS = [
	{ id: 'p1', client_id: '11111111-1111-1111-1111-111111111111', code: 'MBANK', name: 'Acme Mobile Banking', created_at: new Date(Date.now() - 28 * 86400000).toISOString(), client: { id: '11111111-1111-1111-1111-111111111111', name: 'Acme Corp', code: 'ACME' }, ticket_count: 7, active_ticket_count: 5, member_count: 3 },
	{ id: 'p2', client_id: '11111111-1111-1111-1111-111111111111', code: 'POS', name: 'Acme Point of Sale', created_at: new Date(Date.now() - 25 * 86400000).toISOString(), client: { id: '11111111-1111-1111-1111-111111111111', name: 'Acme Corp', code: 'ACME' }, ticket_count: 2, active_ticket_count: 1, member_count: 2 },
	{ id: 'p3', client_id: '11111111-1111-1111-1111-111111111111', code: 'CRM', name: 'Acme CRM', created_at: new Date(Date.now() - 20 * 86400000).toISOString(), client: { id: '11111111-1111-1111-1111-111111111111', name: 'Acme Corp', code: 'ACME' }, ticket_count: 1, active_ticket_count: 1, member_count: 1 },
	{ id: 'p4', client_id: '11111111-1111-1111-1111-111111111111', code: 'WEB', name: 'Acme Website', created_at: new Date(Date.now() - 15 * 86400000).toISOString(), client: { id: '11111111-1111-1111-1111-111111111111', name: 'Acme Corp', code: 'ACME' }, ticket_count: 3, active_ticket_count: 2, member_count: 2 },
	{ id: 'p5', client_id: '22222222-2222-2222-2222-222222222222', code: 'ERP', name: 'Globex ERP', created_at: new Date(Date.now() - 40 * 86400000).toISOString(), client: { id: '22222222-2222-2222-2222-222222222222', name: 'Globex Inc', code: 'GLOB' }, ticket_count: 4, active_ticket_count: 2, member_count: 2 },
	{ id: 'p6', client_id: '22222222-2222-2222-2222-222222222222', code: 'HR', name: 'Globex HR Portal', created_at: new Date(Date.now() - 38 * 86400000).toISOString(), client: { id: '22222222-2222-2222-2222-222222222222', name: 'Globex Inc', code: 'GLOB' }, ticket_count: 1, active_ticket_count: 1, member_count: 1 },
	{ id: 'p7', client_id: '22222222-2222-2222-2222-222222222222', code: 'LOG', name: 'Globex Logistics', created_at: new Date(Date.now() - 35 * 86400000).toISOString(), client: { id: '22222222-2222-2222-2222-222222222222', name: 'Globex Inc', code: 'GLOB' }, ticket_count: 2, active_ticket_count: 1, member_count: 2 },
	{ id: 'p8', client_id: '33333333-3333-3333-3333-333333333333', code: 'APP', name: 'TechCo Mobile App', created_at: new Date(Date.now() - 55 * 86400000).toISOString(), client: { id: '33333333-3333-3333-3333-333333333333', name: 'TechCo Ltd', code: 'TECHCO' }, ticket_count: 2, active_ticket_count: 1, member_count: 1 },
	{ id: 'p9', client_id: '33333333-3333-3333-3333-333333333333', code: 'API', name: 'TechCo Public API', created_at: new Date(Date.now() - 50 * 86400000).toISOString(), client: { id: '33333333-3333-3333-3333-333333333333', name: 'TechCo Ltd', code: 'TECHCO' }, ticket_count: 3, active_ticket_count: 1, member_count: 1 },
	{ id: 'p10', client_id: '33333333-3333-3333-3333-333333333333', code: 'INFRA', name: 'TechCo Infrastructure', created_at: new Date(Date.now() - 45 * 86400000).toISOString(), client: { id: '33333333-3333-3333-3333-333333333333', name: 'TechCo Ltd', code: 'TECHCO' }, ticket_count: 0, active_ticket_count: 0, member_count: 1 }
];

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	try {
		const [{ data: dbClients }, { data: dbProjects }, { data: dbTickets }, { data: dbMembers }, { data: dbProfiles }] = await Promise.all([
			supabase.from('clients').select('id, code, name').order('name'),
			supabase.from('projects').select('id, client_id, code, name, default_poc_id, created_at, clients(id, code, name)').order('created_at', { ascending: false }),
			supabase.from('tickets').select('id, project_id, status'),
			supabase.from('project_members').select('id, project_id, user_id'),
			supabase.from('profiles').select('id, full_name, email, role').in('role', [...INTERNAL_TEAM_ROLES, 'super_admin'])
		]);

		const clients = dbClients || [];
		const internalStaff = dbProfiles || [];
		const profilesById = new Map(internalStaff.map((p) => [p.id, p]));

		if (!dbProjects || dbProjects.length === 0) {
			return {
				projects: SEED_FALLBACK_PROJECTS,
				clients: clients.length > 0 ? clients : [
					{ id: '11111111-1111-1111-1111-111111111111', code: 'ACME', name: 'Acme Corp' },
					{ id: '22222222-2222-2222-2222-222222222222', code: 'GLOB', name: 'Globex Inc' },
					{ id: '33333333-3333-3333-3333-333333333333', code: 'TECHCO', name: 'TechCo Ltd' }
				],
				internalStaff
			};
		}

		const projects = dbProjects.map((p) => {
			const projectTickets = (dbTickets || []).filter((t) => t.project_id === p.id);
			const projectMembers = (dbMembers || []).filter((m) => m.project_id === p.id);
			const clientInfo = Array.isArray(p.clients) ? p.clients[0] : p.clients;
			const team = projectMembers
				.map((m) => profilesById.get(m.user_id))
				.filter(
					(profile): profile is NonNullable<typeof profile> =>
						!!profile && (INTERNAL_TEAM_ROLES as readonly string[]).includes(profile.role)
				);

			return {
				id: p.id,
				client_id: p.client_id,
				code: p.code,
				name: p.name,
				default_poc_id: p.default_poc_id,
				created_at: p.created_at,
				client: clientInfo ?? { id: p.client_id, name: 'Unknown Client', code: 'UNK' },
				ticket_count: projectTickets.length,
				active_ticket_count: projectTickets.filter((t) => t.status !== 'closed').length,
				member_count: projectMembers.length,
				team
			};
		});

		return { projects, clients, internalStaff };
	} catch {
		return {
			projects: SEED_FALLBACK_PROJECTS,
			clients: [
				{ id: '11111111-1111-1111-1111-111111111111', code: 'ACME', name: 'Acme Corp' },
				{ id: '22222222-2222-2222-2222-222222222222', code: 'GLOB', name: 'Globex Inc' },
				{ id: '33333333-3333-3333-3333-333333333333', code: 'TECHCO', name: 'TechCo Ltd' }
			],
			internalStaff: []
		};
	}
};

export const actions: Actions = {
	createProject: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();
		if (!user) return fail(401, { error: 'Not authenticated.' });

		const { data: profile } = await supabase.from('profiles').select('role, client_id').eq('id', user.id).single();
		if (!profile || (profile.role !== 'super_admin' && profile.role !== 'client_admin')) {
			return fail(403, { error: 'You do not have permission to create projects.' });
		}

		const formData = await request.formData();
		const clientId = String(formData.get('client_id') || profile.client_id || '').trim();
		const name = String(formData.get('name') || '').trim();
		const code = String(formData.get('code') || '').trim().toUpperCase();
		const teamMemberIds = formData.getAll('team_member_ids').map(String).filter(Boolean);
		const defaultPocId = await validateDefaultPoc(String(formData.get('default_poc_id') || '').trim() || null, teamMemberIds);

		if (!clientId || !name || !code) {
			return fail(400, { error: 'Client, project name, and project code are required.', clientId, name, code });
		}

		const { data: newProject, error: projectError } = await supabase
			.from('projects')
			.insert({
				client_id: clientId,
				name,
				code,
				default_poc_id: defaultPocId
			})
			.select('id, code, name, client_id, created_at')
			.single();

		if (projectError) {
			if (projectError.code === '23505' || projectError.message.includes('unique')) {
				return fail(400, {
					error: `Project code "${code}" is already in use for this client. Please choose a unique code.`,
					clientId,
					name,
					code
				});
			}
			return fail(500, { error: projectError.message, clientId, name, code });
		}

		if (teamMemberIds.length > 0) {
			await supabaseAdmin
				.from('project_members')
				.insert(teamMemberIds.map((userId) => ({ project_id: newProject.id, user_id: userId })));
		}

		return { success: true, createdProjectId: newProject.id };
	},

	updateProject: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();
		if (!user) return fail(401, { error: 'Not authenticated.' });

		const { data: profile } = await supabase.from('profiles').select('role, client_id').eq('id', user.id).single();
		if (!profile || (profile.role !== 'super_admin' && profile.role !== 'client_admin')) {
			return fail(403, { error: 'You do not have permission to edit projects.' });
		}

		const formData = await request.formData();
		const projectId = String(formData.get('project_id') || '').trim();
		const name = String(formData.get('name') || '').trim();
		const teamMemberIds = formData.getAll('team_member_ids').map(String).filter(Boolean);
		const defaultPocId = await validateDefaultPoc(String(formData.get('default_poc_id') || '').trim() || null, teamMemberIds);

		if (!projectId || !name) {
			return fail(400, { error: 'Project and project name are required.' });
		}

		if (profile.role === 'client_admin') {
			const { data: targetProject } = await supabaseAdmin.from('projects').select('client_id').eq('id', projectId).single();
			if (!targetProject || targetProject.client_id !== profile.client_id) {
				return fail(403, { error: 'You can only edit projects within your own organization.' });
			}
		}

		const { error: updateError } = await supabase
			.from('projects')
			.update({ name, default_poc_id: defaultPocId })
			.eq('id', projectId);
		if (updateError) return fail(500, { error: updateError.message });

		// Re-sync internal-staff project membership without disturbing client-role
		// members of the same project (they're managed separately, via Team/portal).
		const { data: existingMembers } = await supabaseAdmin
			.from('project_members')
			.select('id, user_id, profiles(role)')
			.eq('project_id', projectId);

		const existingInternalMemberIds = (existingMembers ?? [])
			.filter((m) => {
				const role = Array.isArray(m.profiles) ? m.profiles[0]?.role : m.profiles?.role;
				return role && (INTERNAL_TEAM_ROLES as readonly string[]).includes(role);
			})
			.map((m) => m.id);

		if (existingInternalMemberIds.length > 0) {
			await supabaseAdmin.from('project_members').delete().in('id', existingInternalMemberIds);
		}
		if (teamMemberIds.length > 0) {
			await supabaseAdmin
				.from('project_members')
				.insert(teamMemberIds.map((userId) => ({ project_id: projectId, user_id: userId })));
		}

		return { success: true, updatedProjectId: projectId };
	}
};
