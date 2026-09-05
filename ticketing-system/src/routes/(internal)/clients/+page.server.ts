import { fail } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/server/supabase';
import { generateApiToken } from '$lib/server/apiAuth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	try {
		// Fetch clients from Supabase
		const { data: dbClients, error: clientsError } = await supabase
			.from('clients')
			.select('id, code, name, seat_quota, created_at, updated_at')
			.order('name');

		if (clientsError || !dbClients || dbClients.length === 0) {
			return { clients: [] };
		}

		// Fetch projects, profiles, and tickets in parallel
		const [projectsRes, profilesRes, ticketsRes] = await Promise.all([
			supabase.from('projects').select('id, client_id, code, name, created_at').order('code'),
			supabase.from('profiles').select('id, email, full_name, role, client_id, created_at'),
			supabase.from('tickets').select('id, title, description, category, status, client_id, project_id, raised_by, estimated_hours, actual_hours, created_at').order('created_at', { ascending: false })
		]);

		const projects = projectsRes.data || [];
		const profiles = profilesRes.data || [];
		const tickets = ticketsRes.data || [];

		// Assemble client data tree
		const clients = dbClients.map((client) => {
			const clientProjects = projects.filter((p) => p.client_id === client.id);
			const clientMembers = profiles.filter((m) => m.client_id === client.id);
			const clientTickets = tickets.filter((t) => t.client_id === client.id);

			return {
				...client,
				projects: clientProjects,
				members: clientMembers,
				tickets: clientTickets
			};
		});

		return { clients };
	} catch {
		return { clients: [] };
	}
};

export const actions: Actions = {
	createClient: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();
		if (!user) return fail(401, { error: 'Not authenticated.' });

		// Verify super_admin role
		const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
		if (profile?.role !== 'super_admin') {
			return fail(403, { error: 'Only Super Admins are authorized to create new clients.' });
		}

		const formData = await request.formData();
		const name = String(formData.get('name') || '').trim();
		const code = String(formData.get('code') || '').trim().toUpperCase();
		const isUnlimited = formData.get('is_unlimited') === 'true';
		
		let seatQuota: number | null = null;
		if (!isUnlimited) {
			const seatQuotaRaw = Number(formData.get('seat_quota') || 5);
			seatQuota = isNaN(seatQuotaRaw) || seatQuotaRaw < 1 ? 5 : Math.floor(seatQuotaRaw);
		}

		const projectName = String(formData.get('project_name') || '').trim();
		const projectCode = String(formData.get('project_code') || '').trim().toUpperCase();

		if (!name || !code) {
			return fail(400, { error: 'Client name and organization code are required.', name, code, seatQuota });
		}

		// Insert new client
		const { data: newClient, error: clientError } = await supabase
			.from('clients')
			.insert({
				name,
				code,
				seat_quota: seatQuota
			})
			.select('id, code, name, seat_quota, created_at')
			.single();

		if (clientError) {
			if (clientError.code === '23505' || clientError.message.includes('unique')) {
				return fail(400, {
					error: `Organization code "${code}" is already in use. Please choose a unique code.`,
					name,
					code,
					seatQuota
				});
			}
			return fail(500, { error: clientError.message, name, code, seatQuota });
		}

		// Auto-create initial project and API ingestion token for the client
		const effectiveProjectName = projectName || `${name} Task Dashboard`;
		const effectiveProjectCode = projectCode || `${code.slice(0, 4)}TASK`.slice(0, 8);

		const { data: newProject, error: projectError } = await supabase
			.from('projects')
			.insert({
				client_id: newClient.id,
				name: effectiveProjectName,
				code: effectiveProjectCode
			})
			.select('id, code, name')
			.single();

		if (!projectError && newProject) {
			try {
				const { rawToken, tokenHash, tokenPrefix } = generateApiToken(newClient.code);
				const tokenName = `${name} Default API Key`;

				const { error: tokenError } = await supabaseAdmin.from('api_tokens').insert({
					client_id: newClient.id,
					project_id: newProject.id,
					name: tokenName,
					token_hash: tokenHash,
					token_prefix: tokenPrefix,
					created_by: user.id
				});

				if (!tokenError) {
					return {
						success: true,
						createdClientId: newClient.id,
						rawToken,
						tokenName,
						clientName: name,
						clientCode: newClient.code
					};
				}
			} catch (err) {
				console.error('Failed to auto-generate API token for new client:', err);
			}
		}

		return { success: true, createdClientId: newClient.id };
	},

	deleteClient: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();
		if (!user) return fail(401, { error: 'Not authenticated.' });

		// Verify super_admin role
		const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
		if (profile?.role !== 'super_admin') {
			return fail(403, { error: 'Only Super Admins are authorized to delete client organizations.' });
		}

		const formData = await request.formData();
		const clientId = String(formData.get('client_id') || '').trim();

		if (!clientId) {
			return fail(400, { error: 'Client ID is required.' });
		}

		const { error: deleteError } = await supabase
			.from('clients')
			.delete()
			.eq('id', clientId);

		if (deleteError) {
			return fail(500, { error: deleteError.message });
		}

		return { success: true, deletedClientId: clientId };
	},

	createProject: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();
		if (!user) return fail(401, { error: 'Not authenticated.' });

		// Verify super_admin or client_admin role
		const { data: profile } = await supabase.from('profiles').select('role, client_id').eq('id', user.id).single();
		if (!profile || (profile.role !== 'super_admin' && profile.role !== 'client_admin')) {
			return fail(403, { error: 'You do not have permission to create projects.' });
		}

		const formData = await request.formData();
		const clientId = String(formData.get('client_id') || profile.client_id || '').trim();
		const name = String(formData.get('name') || '').trim();
		const code = String(formData.get('code') || '').trim().toUpperCase();
		const teamMemberIds = formData.getAll('team_member_ids').map(String).filter(Boolean);
		const defaultPocIdRaw = String(formData.get('default_poc_id') || '').trim() || null;
		let defaultPocId: string | null = null;
		if (defaultPocIdRaw) {
			if (teamMemberIds.includes(defaultPocIdRaw)) {
				defaultPocId = defaultPocIdRaw;
			} else {
				const { data: pocProfile } = await supabaseAdmin.from('profiles').select('role').eq('id', defaultPocIdRaw).single();
				defaultPocId = pocProfile?.role === 'super_admin' ? defaultPocIdRaw : null;
			}
		}

		if (!clientId || !name || !code) {
			return fail(400, { error: 'Client, project name, and project code are required.', clientId, name, code });
		}

		// Insert project
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

	createUser: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();
		if (!user) return fail(401, { error: 'Not authenticated.' });

		// Verify super_admin or client_admin role
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

		// Create user in Supabase Auth via supabaseAdmin
		const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
			email,
			password: password || 'ChangeMe123!',
			email_confirm: true,
			user_metadata: { full_name: fullName }
		});

		if (authError || !authData.user) {
			return fail(400, {
				error: authError?.message || 'Failed to create authentication user account.',
				fullName,
				email
			});
		}

		const newUserId = authData.user.id;

		// Create or update profiles row
		const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
			id: newUserId,
			email,
			full_name: fullName,
			role: role as never,
			client_id: clientId
		});

		if (profileError) {
			console.error('Error creating profile for user:', profileError);
			return fail(500, { error: profileError.message });
		}

		// Assign project memberships
		if (projectIds.length > 0) {
			const memberInserts = projectIds.map((projectId) => ({
				project_id: projectId,
				user_id: newUserId
			}));
			await supabaseAdmin.from('project_members').insert(memberInserts);
		}

		return { success: true, createdUserId: newUserId };
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
		const clientId = clientIdRaw && (role.startsWith('client_') || role === 'project_admin') ? clientIdRaw : null;
		const projectIds = formData.getAll('project_ids').map(String).filter(Boolean);

		if (!targetUserId || !fullName) {
			return fail(400, { error: 'User ID and full name are required.' });
		}

		if ((role.startsWith('client_') || role === 'project_admin') && !clientId) {
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

		// Update user metadata and email in auth
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
	}
};

