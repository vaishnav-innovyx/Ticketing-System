import { fail } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/server/supabase';
import { ASSIGNABLE_ROLES, isClientRole, provisionUser } from '$lib/server/users';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	try {
		const { user } = await safeGetSession();
		const [{ data: dbProfiles }, { data: dbClients }, { data: dbProjects }, { data: dbMemberships }] = await Promise.all([
			supabase.from('profiles').select('id, email, full_name, role, client_id, created_at, clients(id, name, code)').order('created_at', { ascending: false }),
			supabase.from('clients').select('id, code, name').order('name'),
			supabase.from('projects').select('id, code, name, client_id').order('code'),
			supabase.from('project_members').select('id, user_id, project_id')
		]);

		const clients = dbClients || [];
		const projects = dbProjects || [];
		const memberships = dbMemberships || [];

		if (!dbProfiles || dbProfiles.length === 0) {
			return {
				members: [],
				clients,
				projects,
				currentUserId: user?.id ?? null
			};
		}

		const members = dbProfiles.map((p) => {
			const userMemberships = memberships.filter((m) => m.user_id === p.id);
			const userProjects = userMemberships
				.map((m) => projects.find((proj) => proj.id === m.project_id))
				.filter((proj): proj is { id: string; code: string; name: string; client_id: string } => !!proj);

			const clientInfo = Array.isArray(p.clients) ? p.clients[0] : p.clients;

			return {
				id: p.id,
				email: p.email,
				full_name: p.full_name,
				role: p.role,
				client_id: p.client_id,
				client: clientInfo ?? null,
				assigned_projects: userProjects,
				created_at: p.created_at
			};
		});

		return { members, clients, projects, currentUserId: user?.id ?? null };
	} catch {
		return {
			members: [],
			clients: [],
			projects: [],
			currentUserId: null
		};
	}
};

export const actions: Actions = {
	createUser: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();
		if (!user) return fail(401, { error: 'Not authenticated.' });

		const { data: callerProfile } = await supabase.from('profiles').select('role, client_id').eq('id', user.id).single();
		if (!callerProfile || (callerProfile.role !== 'super_admin' && callerProfile.role !== 'client_admin')) {
			return fail(403, { error: 'You do not have permission to create user accounts.' });
		}

		const formData = await request.formData();
		const fullName = String(formData.get('full_name') || '').trim();
		const email = String(formData.get('email') || '').trim().toLowerCase();
		const password = String(formData.get('password') || 'ChangeMe123!').trim();
		const role = String(formData.get('role') || 'client_raiser');
		const clientIdRaw = String(formData.get('client_id') || '').trim();
		const isClientScopedRole = role.startsWith('client_') || role === 'project_admin';
		const clientId = clientIdRaw && isClientScopedRole ? clientIdRaw : null;
		const projectIds = formData.getAll('project_ids').map(String).filter(Boolean);

		if (!fullName || !email) {
			return fail(400, { error: 'Full name and email address are required.', fullName, email });
		}

		if (isClientScopedRole && !clientId) {
			return fail(400, { error: 'Client organization is required for client roles.', fullName, email });
		}

		if (callerProfile.role === 'client_admin' && clientId !== callerProfile.client_id) {
			return fail(403, { error: 'Client Admins can only add users to their own organization.' });
		}

		const result = await provisionUser({ fullName, email, password, role, clientId, projectIds });
		if ('error' in result) {
			return fail(400, { error: result.error, fullName, email });
		}

		return { success: true, createdUserId: result.userId };
	},

	bulkCreateUsers: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();
		if (!user) return fail(401, { error: 'Not authenticated.' });

		const { data: callerProfile } = await supabase
			.from('profiles')
			.select('role, client_id')
			.eq('id', user.id)
			.single();
		if (!callerProfile || (callerProfile.role !== 'super_admin' && callerProfile.role !== 'client_admin')) {
			return fail(403, { error: 'You do not have permission to create user accounts.' });
		}

		const formData = await request.formData();
		let rows: Array<Record<string, string>>;
		try {
			rows = JSON.parse(String(formData.get('rows') || '[]'));
		} catch {
			return fail(400, { error: 'Malformed upload payload.' });
		}
		if (!Array.isArray(rows) || rows.length === 0) {
			return fail(400, { error: 'No rows to import.' });
		}

		const [{ data: dbClients }, { data: dbProjects }] = await Promise.all([
			supabaseAdmin.from('clients').select('id, code'),
			supabaseAdmin.from('projects').select('id, code, client_id')
		]);

		const clientByCode = new Map((dbClients || []).map((c) => [c.code.toUpperCase(), c.id]));
		const projects = dbProjects || [];

		const results: Array<{ row: number; email: string; status: 'created' | 'failed'; error?: string }> = [];

		for (let i = 0; i < rows.length; i++) {
			const raw = rows[i];
			const rowNum = i + 2; // +1 header, +1 to 1-index
			const fullName = String(raw.full_name || '').trim();
			const email = String(raw.email || '').trim().toLowerCase();
			const password = String(raw.password || '').trim();
			const role = String(raw.role || '').trim();
			const clientCode = String(raw.client_code || '').trim().toUpperCase();
			const projectCodes = String(raw.project_codes || '')
				.split(/[,;|]/)
				.map((s) => s.trim().toUpperCase())
				.filter(Boolean);

			const push = (status: 'created' | 'failed', error?: string) =>
				results.push({ row: rowNum, email, status, error });

			if (!fullName || !email) {
				push('failed', 'Full name and email are required.');
				continue;
			}
			if (!ASSIGNABLE_ROLES.includes(role as never)) {
				push('failed', `Unknown role "${role}".`);
				continue;
			}

			let clientId: string | null = null;
			if (isClientRole(role)) {
				clientId = clientByCode.get(clientCode) ?? null;
				if (!clientId) {
					push('failed', `Unknown client code "${raw.client_code}".`);
					continue;
				}
			}

			if (callerProfile.role === 'client_admin') {
				if (!isClientRole(role) || clientId !== callerProfile.client_id) {
					push('failed', 'Outside your organization.');
					continue;
				}
			}

			const projectIds = projects
				.filter((p) => projectCodes.includes(p.code.toUpperCase()) && (!clientId || p.client_id === clientId))
				.map((p) => p.id);

			const outcome = await provisionUser({ fullName, email, password, role, clientId, projectIds });
			if ('error' in outcome) push('failed', outcome.error);
			else push('created');
		}

		const created = results.filter((r) => r.status === 'created').length;
		return { success: true, created, failed: results.length - created, results };
	},

	updateUser: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();
		if (!user) return fail(401, { error: 'Not authenticated.' });

		const { data: callerProfile } = await supabase.from('profiles').select('role, client_id').eq('id', user.id).single();
		if (!callerProfile || (callerProfile.role !== 'super_admin' && callerProfile.role !== 'client_admin')) {
			return fail(403, { error: 'You do not have permission to edit user accounts.' });
		}

		const formData = await request.formData();
		const targetUserId = String(formData.get('user_id') || '').trim();
		const fullName = String(formData.get('full_name') || '').trim();
		const email = String(formData.get('email') || '').trim().toLowerCase();
		const role = String(formData.get('role') || 'client_raiser');
		const clientIdRaw = String(formData.get('client_id') || '').trim();
		const clientId = clientIdRaw && isClientRole(role) ? clientIdRaw : null;
		const projectIds = formData.getAll('project_ids').map(String).filter(Boolean);

		if (!targetUserId || !fullName) {
			return fail(400, { error: 'User ID and full name are required.' });
		}

		if (isClientRole(role) && !clientId) {
			return fail(400, { error: 'Client organization is required for client roles.' });
		}

		const { data: targetProfile } = await supabaseAdmin.from('profiles').select('client_id, email').eq('id', targetUserId).single();

		if (callerProfile.role === 'client_admin') {
			if (!targetProfile || targetProfile.client_id !== callerProfile.client_id || clientId !== callerProfile.client_id) {
				return fail(403, { error: 'Client Admins can only edit users within their own organization.' });
			}
		}

		// Update profile
		const profileUpdateData: { full_name: string; role: never; client_id: string | null; email?: string } = {
			full_name: fullName,
			role: role as never,
			client_id: clientId
		};
		if (email) {
			profileUpdateData.email = email;
		}

		const { error: profileError } = await supabaseAdmin
			.from('profiles')
			.update(profileUpdateData)
			.eq('id', targetUserId);

		if (profileError) {
			return fail(500, { error: profileError.message });
		}

		// Update auth user (email + metadata)
		const authUpdatePayload: { email?: string; email_confirm?: boolean; user_metadata: { full_name: string } } = {
			user_metadata: { full_name: fullName }
		};
		if (email && targetProfile && email !== targetProfile.email) {
			authUpdatePayload.email = email;
			authUpdatePayload.email_confirm = true;
		}

		try {
			await supabaseAdmin.auth.admin.updateUserById(targetUserId, authUpdatePayload);
		} catch (err) {
			console.error('Error updating auth metadata/email:', err);
		}

		// Sync project memberships: remove existing, insert selected
		await supabaseAdmin.from('project_members').delete().eq('user_id', targetUserId);
		if (projectIds.length > 0) {
			const inserts = projectIds.map((projectId) => ({
				project_id: projectId,
				user_id: targetUserId
			}));
			await supabaseAdmin.from('project_members').insert(inserts);
		}

		return { success: true, updatedUserId: targetUserId };
	},

	deleteUser: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();
		if (!user) return fail(401, { error: 'Not authenticated.' });

		const { data: callerProfile } = await supabase.from('profiles').select('role, client_id').eq('id', user.id).single();
		if (!callerProfile || (callerProfile.role !== 'super_admin' && callerProfile.role !== 'client_admin')) {
			return fail(403, { error: 'You do not have permission to delete user accounts.' });
		}

		const formData = await request.formData();
		const targetUserId = String(formData.get('user_id') || '').trim();

		if (!targetUserId) {
			return fail(400, { error: 'User ID is required.' });
		}

		if (targetUserId === user.id) {
			return fail(400, { error: 'You cannot delete your own account.' });
		}

		const { data: targetProfile } = await supabaseAdmin.from('profiles').select('client_id').eq('id', targetUserId).single();
		if (!targetProfile) {
			return fail(404, { error: 'User profile not found.' });
		}

		if (callerProfile.role === 'client_admin' && targetProfile.client_id !== callerProfile.client_id) {
			return fail(403, { error: 'Client Admins can only delete users within their own organization.' });
		}

		// Disassociate/nullify foreign key references in dependent tables before deleting profile
		await Promise.all([
			supabaseAdmin.from('ticket_events').update({ actor_id: null }).eq('actor_id', targetUserId),
			supabaseAdmin.from('tickets').update({ raised_by: null }).eq('raised_by', targetUserId),
			supabaseAdmin.from('tickets').update({ poc_id: null }).eq('poc_id', targetUserId),
			supabaseAdmin.from('ticket_dependencies').update({ created_by: null }).eq('created_by', targetUserId),
			supabaseAdmin.from('project_members').delete().eq('user_id', targetUserId)
		]);

		const { error: profileDeleteError } = await supabaseAdmin.from('profiles').delete().eq('id', targetUserId);
		if (profileDeleteError) {
			console.error('Error deleting profile:', profileDeleteError);
			return fail(500, { error: profileDeleteError.message || 'Failed to delete user profile.' });
		}

		const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
		if (authDeleteError) {
			console.error('Error deleting auth user:', authDeleteError);
		}

		return { success: true, deletedUserId: targetUserId };
	}
};
