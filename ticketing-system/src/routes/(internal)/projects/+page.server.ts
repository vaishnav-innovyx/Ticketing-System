import { fail } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/server/supabase';
import type { Actions, PageServerLoad } from './$types';

const INTERNAL_TEAM_ROLES = ['poc', 'specialist', 'delivery_lead'] as const;

// A default POC must be a valid internal staff member with role 'super_admin' or 'poc'.
async function validateDefaultPoc(defaultPocId: string | null): Promise<string | null> {
	if (!defaultPocId) return null;
	const { data: pocProfile } = await supabaseAdmin.from('profiles').select('role').eq('id', defaultPocId).single();
	if (!pocProfile) return null;
	return pocProfile.role === 'super_admin' || pocProfile.role === 'poc' ? defaultPocId : null;
}

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	try {
		const [{ data: dbClients }, { data: dbProjects }, { data: dbProfiles }] = await Promise.all([
			supabaseAdmin.from('clients').select('id, code, name').order('name'),
			supabaseAdmin
				.from('projects')
				.select(
					`id, client_id, code, name, default_poc_id, created_at,
					client:clients(id, code, name),
					tickets(id, status),
					members:project_members(id, user_id, profile:profiles(id, full_name, email, role))`
				)
				.order('created_at', { ascending: false }),
			supabaseAdmin.from('profiles').select('id, full_name, email, role').in('role', [...INTERNAL_TEAM_ROLES, 'super_admin'])
		]);

		const clients = dbClients || [];
		const internalStaff = dbProfiles || [];

		if (!dbProjects || dbProjects.length === 0) {
			return {
				projects: [],
				clients,
				internalStaff
			};
		}

		const one = <T>(v: T | T[] | null) => (Array.isArray(v) ? v[0] ?? null : v ?? null);

		const projects = dbProjects.map((p) => {
			const projectTickets = p.tickets ?? [];
			const projectMembers = p.members ?? [];
			const team = projectMembers
				.map((m) => one(m.profile))
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
				client: one(p.client) ?? { id: p.client_id, name: 'Unknown Client', code: 'UNK' },
				ticket_count: projectTickets.length,
				active_ticket_count: projectTickets.filter((t) => t.status !== 'closed').length,
				member_count: projectMembers.length,
				team
			};
		});

		return { projects, clients, internalStaff };
	} catch {
		return {
			projects: [],
			clients: [],
			internalStaff: []
		};
	}
};

export const actions: Actions = {
	createProject: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();
		if (!user) return fail(401, { error: 'Not authenticated.' });

		const { data: profile } = await supabase.from('profiles').select('role, client_id').eq('id', user.id).single();
		if (!profile || (profile.role !== 'super_admin' && profile.role !== 'client_admin' && profile.role !== 'specialist')) {
			return fail(403, { error: 'You do not have permission to create projects.' });
		}

		const formData = await request.formData();
		const clientId = String(formData.get('client_id') || profile.client_id || '').trim();
		const name = String(formData.get('name') || '').trim();
		const code = String(formData.get('code') || '').trim().toUpperCase();
		const teamMemberIds = formData.getAll('team_member_ids').map(String).filter(Boolean);
		const defaultPocId = await validateDefaultPoc(String(formData.get('default_poc_id') || '').trim() || null);

		// If a default POC is specified and is internal staff (not super_admin), ensure they are in project_members
		const finalTeamMemberIds = [...teamMemberIds];
		if (defaultPocId && !finalTeamMemberIds.includes(defaultPocId)) {
			const { data: pocProfile } = await supabaseAdmin.from('profiles').select('role').eq('id', defaultPocId).single();
			if (pocProfile && pocProfile.role !== 'super_admin') {
				finalTeamMemberIds.push(defaultPocId);
			}
		}

		// If creator is a specialist, ensure they are also part of the project team
		if (profile.role === 'specialist' && !finalTeamMemberIds.includes(user.id)) {
			finalTeamMemberIds.push(user.id);
		}

		if (!clientId || !name || !code) {
			return fail(400, { error: 'Client, project name, and project code are required.', clientId, name, code });
		}

		const { data: newProject, error: projectError } = await supabaseAdmin
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

		if (finalTeamMemberIds.length > 0) {
			await supabaseAdmin
				.from('project_members')
				.insert(finalTeamMemberIds.map((userId) => ({ project_id: newProject.id, user_id: userId })));
		}

		return { success: true, createdProjectId: newProject.id };
	},

	updateProject: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();
		if (!user) return fail(401, { error: 'Not authenticated.' });

		const { data: profile } = await supabase.from('profiles').select('role, client_id').eq('id', user.id).single();
		if (!profile || (profile.role !== 'super_admin' && profile.role !== 'client_admin' && profile.role !== 'specialist')) {
			return fail(403, { error: 'You do not have permission to edit projects.' });
		}

		const formData = await request.formData();
		const projectId = String(formData.get('project_id') || '').trim();
		const name = String(formData.get('name') || '').trim();
		const teamMemberIds = formData.getAll('team_member_ids').map(String).filter(Boolean);
		const defaultPocId = await validateDefaultPoc(String(formData.get('default_poc_id') || '').trim() || null);

		const finalTeamMemberIds = [...teamMemberIds];
		if (defaultPocId && !finalTeamMemberIds.includes(defaultPocId)) {
			const { data: pocProfile } = await supabaseAdmin.from('profiles').select('role').eq('id', defaultPocId).single();
			if (pocProfile && pocProfile.role !== 'super_admin') {
				finalTeamMemberIds.push(defaultPocId);
			}
		}

		if (!projectId || !name) {
			return fail(400, { error: 'Project and project name are required.' });
		}

		if (profile.role === 'client_admin') {
			const { data: targetProject } = await supabaseAdmin.from('projects').select('client_id').eq('id', projectId).single();
			if (!targetProject || targetProject.client_id !== profile.client_id) {
				return fail(403, { error: 'You can only edit projects within your own organization.' });
			}
		}

		const { error: updateError } = await supabaseAdmin
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
		if (finalTeamMemberIds.length > 0) {
			await supabaseAdmin
				.from('project_members')
				.insert(finalTeamMemberIds.map((userId) => ({ project_id: projectId, user_id: userId })));
		}

		return { success: true, updatedProjectId: projectId };
	}
};
