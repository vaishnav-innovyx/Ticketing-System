import { fail, redirect } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/server/supabase';
import { provisionUser } from '$lib/server/users';
import type { Actions, PageServerLoad } from './$types';

const CLIENT_MANAGEABLE_ROLES = ['client_admin', 'project_admin', 'client_raiser', 'client_viewer'];

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { user } = await safeGetSession();
	if (!user) throw redirect(303, '/login');

	const { data: profile } = await supabase.from('profiles').select('role, client_id').eq('id', user.id).single();
	if (!profile || profile.role !== 'client_admin' || !profile.client_id) {
		throw redirect(303, '/portal');
	}

	const [{ data: dbProfiles }, { data: dbProjects }, { data: dbMemberships }, { data: dbClient }] = await Promise.all([
		supabase
			.from('profiles')
			.select('id, email, full_name, role, created_at')
			.eq('client_id', profile.client_id)
			.order('created_at', { ascending: false }),
		supabase.from('projects').select('id, code, name, client_id').eq('client_id', profile.client_id).order('code'),
		supabase.from('project_members').select('id, user_id, project_id'),
		supabase.from('clients').select('id, code, name').eq('id', profile.client_id).single()
	]);

	const projects = dbProjects ?? [];
	const memberships = dbMemberships ?? [];

	const members = (dbProfiles ?? []).map((p) => {
		const userMemberships = memberships.filter((m) => m.user_id === p.id);
		const userProjects = userMemberships
			.map((m) => projects.find((proj) => proj.id === m.project_id))
			.filter((proj): proj is { id: string; code: string; name: string; client_id: string } => !!proj);

		return {
			id: p.id,
			email: p.email,
			full_name: p.full_name,
			role: p.role,
			assigned_projects: userProjects,
			created_at: p.created_at
		};
	});

	return {
		members,
		projects,
		clientId: profile.client_id,
		client: dbClient ?? { id: profile.client_id, code: '', name: '' },
		currentUserId: user.id
	};
};

export const actions: Actions = {
	createUser: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();
		if (!user) return fail(401, { error: 'Not authenticated.' });

		const { data: callerProfile } = await supabase.from('profiles').select('role, client_id').eq('id', user.id).single();
		if (!callerProfile || callerProfile.role !== 'client_admin' || !callerProfile.client_id) {
			return fail(403, { error: 'You do not have permission to add teammates.' });
		}

		const formData = await request.formData();
		const fullName = String(formData.get('full_name') || '').trim();
		const email = String(formData.get('email') || '').trim().toLowerCase();
		const password = String(formData.get('password') || 'ChangeMe123!').trim();
		const role = String(formData.get('role') || 'client_raiser');
		const projectIds = formData.getAll('project_ids').map(String).filter(Boolean);

		if (!fullName || !email) {
			return fail(400, { error: 'Full name and email address are required.', fullName, email });
		}
		if (!CLIENT_MANAGEABLE_ROLES.includes(role)) {
			return fail(400, { error: 'Invalid role for a client teammate.', fullName, email });
		}

		const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
			email,
			password: password || 'ChangeMe123!',
			email_confirm: true,
			user_metadata: { full_name: fullName }
		});

		if (authError || !authData.user) {
			return fail(400, { error: authError?.message || 'Failed to create account.', fullName, email });
		}

		const newUserId = authData.user.id;

		const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
			id: newUserId,
			email,
			full_name: fullName,
			role: role as never,
			client_id: callerProfile.client_id
		});
		if (profileError) return fail(500, { error: profileError.message });

		if (projectIds.length > 0) {
			await supabaseAdmin
				.from('project_members')
				.insert(projectIds.map((projectId) => ({ project_id: projectId, user_id: newUserId })));
		}

		return { success: true, createdUserId: newUserId };
	},

	bulkCreateUsers: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();
		if (!user) return fail(401, { error: 'Not authenticated.' });

		const { data: callerProfile } = await supabase.from('profiles').select('role, client_id').eq('id', user.id).single();
		if (!callerProfile || callerProfile.role !== 'client_admin' || !callerProfile.client_id) {
			return fail(403, { error: 'You do not have permission to add teammates.' });
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

		const { data: dbProjects } = await supabaseAdmin
			.from('projects')
			.select('id, code')
			.eq('client_id', callerProfile.client_id);
		const projects = dbProjects ?? [];

		const results: Array<{ row: number; email: string; status: 'created' | 'failed'; error?: string }> = [];

		for (let i = 0; i < rows.length; i++) {
			const raw = rows[i];
			const rowNum = i + 2; // +1 header, +1 to 1-index
			const fullName = String(raw.full_name || '').trim();
			const email = String(raw.email || '').trim().toLowerCase();
			const password = String(raw.password || '').trim();
			const role = String(raw.role || '').trim();
			const projectCodes = String(raw.project_codes || '')
				.split(/[,;|]/)
				.map((s) => s.trim().toUpperCase())
				.filter(Boolean);

			const push = (status: 'created' | 'failed', error?: string) => results.push({ row: rowNum, email, status, error });

			if (!fullName || !email) {
				push('failed', 'Full name and email are required.');
				continue;
			}
			if (!CLIENT_MANAGEABLE_ROLES.includes(role)) {
				push('failed', `Unknown role "${role}".`);
				continue;
			}

			const projectIds = projects.filter((p) => projectCodes.includes(p.code.toUpperCase())).map((p) => p.id);

			const outcome = await provisionUser({
				fullName,
				email,
				password,
				role,
				clientId: callerProfile.client_id,
				projectIds
			});
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
		if (!callerProfile || callerProfile.role !== 'client_admin' || !callerProfile.client_id) {
			return fail(403, { error: 'You do not have permission to edit teammates.' });
		}

		const formData = await request.formData();
		const targetUserId = String(formData.get('user_id') || '').trim();
		const fullName = String(formData.get('full_name') || '').trim();
		const email = String(formData.get('email') || '').trim().toLowerCase();
		const role = String(formData.get('role') || 'client_raiser');
		const projectIds = formData.getAll('project_ids').map(String).filter(Boolean);

		if (!targetUserId || !fullName || !email) {
			return fail(400, { error: 'User ID, full name, and email address are required.' });
		}
		if (!CLIENT_MANAGEABLE_ROLES.includes(role)) {
			return fail(400, { error: 'Invalid role for a client teammate.' });
		}

		const { data: targetProfile } = await supabaseAdmin.from('profiles').select('client_id, email').eq('id', targetUserId).single();
		if (!targetProfile || targetProfile.client_id !== callerProfile.client_id) {
			return fail(403, { error: 'You can only edit teammates within your own organization.' });
		}

		// Update profile table
		const { error: profileError } = await supabaseAdmin
			.from('profiles')
			.update({ full_name: fullName, email, role: role as never })
			.eq('id', targetUserId);
		if (profileError) return fail(500, { error: profileError.message });

		// Update Auth user (email + metadata)
		const authUpdatePayload: { email?: string; email_confirm?: boolean; user_metadata: { full_name: string } } = {
			user_metadata: { full_name: fullName }
		};
		if (email && email !== targetProfile.email) {
			authUpdatePayload.email = email;
			authUpdatePayload.email_confirm = true;
		}

		const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, authUpdatePayload);
		if (authError) {
			return fail(400, { error: authError.message });
		}

		await supabaseAdmin.from('project_members').delete().eq('user_id', targetUserId);
		if (projectIds.length > 0) {
			await supabaseAdmin
				.from('project_members')
				.insert(projectIds.map((projectId) => ({ project_id: projectId, user_id: targetUserId })));
		}

		return { success: true, updatedUserId: targetUserId };
	},

	deleteUser: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();
		if (!user) return fail(401, { error: 'Not authenticated.' });

		const { data: callerProfile } = await supabase.from('profiles').select('role, client_id').eq('id', user.id).single();
		if (!callerProfile || callerProfile.role !== 'client_admin' || !callerProfile.client_id) {
			return fail(403, { error: 'You do not have permission to delete teammates.' });
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
		if (!targetProfile || targetProfile.client_id !== callerProfile.client_id) {
			return fail(403, { error: 'You can only delete teammates within your own organization.' });
		}

		await supabaseAdmin.from('project_members').delete().eq('user_id', targetUserId);
		await supabaseAdmin.from('profiles').delete().eq('id', targetUserId);

		const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
		if (authDeleteError) {
			console.error('Error deleting auth user:', authDeleteError);
		}

		return { success: true, deletedUserId: targetUserId };
	}
};
