import { fail } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/server/supabase';
import type { Actions, PageServerLoad } from './$types';

const SEED_FALLBACK_CLIENTS = [
	{
		id: '11111111-1111-1111-1111-111111111111',
		code: 'ACME',
		name: 'Acme Corp',
		seat_quota: 10,
		created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
		projects: [
			{ id: 'p1', client_id: '11111111-1111-1111-1111-111111111111', code: 'MBANK', name: 'Acme Mobile Banking', created_at: new Date(Date.now() - 28 * 86400000).toISOString() },
			{ id: 'p2', client_id: '11111111-1111-1111-1111-111111111111', code: 'POS', name: 'Acme Point of Sale', created_at: new Date(Date.now() - 25 * 86400000).toISOString() },
			{ id: 'p3', client_id: '11111111-1111-1111-1111-111111111111', code: 'CRM', name: 'Acme CRM', created_at: new Date(Date.now() - 20 * 86400000).toISOString() },
			{ id: 'p4', client_id: '11111111-1111-1111-1111-111111111111', code: 'WEB', name: 'Acme Website', created_at: new Date(Date.now() - 15 * 86400000).toISOString() }
		],
		members: [
			{ id: 'u1', email: 'admin@acme-client.com', full_name: 'Acme Admin', role: 'client_admin', client_id: '11111111-1111-1111-1111-111111111111', created_at: new Date(Date.now() - 28 * 86400000).toISOString() },
			{ id: 'u2', email: 'raiser@acme-client.com', full_name: 'Acme Raiser', role: 'client_raiser', client_id: '11111111-1111-1111-1111-111111111111', created_at: new Date(Date.now() - 27 * 86400000).toISOString() },
			{ id: 'u3', email: 'viewer@acme-client.com', full_name: 'Acme Viewer', role: 'client_viewer', client_id: '11111111-1111-1111-1111-111111111111', created_at: new Date(Date.now() - 26 * 86400000).toISOString() }
		],
		tickets: [
			{ id: 't1', title: 'Login button unresponsive on iOS', description: 'Tapping login does nothing on iOS 18.', category: 'bug', status: 'raised', project_id: 'p1', estimated_hours: null, actual_hours: null, created_at: new Date(Date.now() - 1 * 86400000).toISOString() },
			{ id: 't2', title: 'Balance shows stale value after transfer', description: 'Balance not refreshing post-transfer.', category: 'bug', status: 'poc_triage', project_id: 'p1', estimated_hours: null, actual_hours: null, created_at: new Date(Date.now() - 3 * 86400000).toISOString() },
			{ id: 't3', title: 'Add biometric login', description: 'Support Face ID / fingerprint login.', category: 'enhancement', status: 'requirement_estimation', project_id: 'p1', estimated_hours: null, actual_hours: null, created_at: new Date(Date.now() - 6 * 86400000).toISOString() },
			{ id: 't4', title: 'Add spending analytics widget', description: 'Monthly spend breakdown chart on dashboard.', category: 'enhancement', status: 'client_approval', project_id: 'p1', estimated_hours: 16, actual_hours: null, created_at: new Date(Date.now() - 9 * 86400000).toISOString() },
			{ id: 't5', title: 'Crash on opening statements tab', description: 'App crashes when opening PDF statement.', category: 'bug', status: 'development', project_id: 'p1', estimated_hours: 8, actual_hours: null, created_at: new Date(Date.now() - 12 * 86400000).toISOString() },
			{ id: 't6', title: 'KT: New payments module', description: 'Knowledge transfer session for payments rewrite.', category: 'kt', status: 'delivery', project_id: 'p1', estimated_hours: 24, actual_hours: 22, created_at: new Date(Date.now() - 15 * 86400000).toISOString() },
			{ id: 't7', title: 'Training: Admin console walkthrough', description: 'Recorded walkthrough for client admins.', category: 'training', status: 'closed', project_id: 'p1', estimated_hours: 4, actual_hours: 5, created_at: new Date(Date.now() - 20 * 86400000).toISOString() }
		]
	},
	{
		id: '22222222-2222-2222-2222-222222222222',
		code: 'GLOB',
		name: 'Globex Inc',
		seat_quota: 10,
		created_at: new Date(Date.now() - 45 * 86400000).toISOString(),
		projects: [
			{ id: 'p5', client_id: '22222222-2222-2222-2222-222222222222', code: 'ERP', name: 'Globex ERP', created_at: new Date(Date.now() - 40 * 86400000).toISOString() },
			{ id: 'p6', client_id: '22222222-2222-2222-2222-222222222222', code: 'HR', name: 'Globex HR Portal', created_at: new Date(Date.now() - 38 * 86400000).toISOString() },
			{ id: 'p7', client_id: '22222222-2222-2222-2222-222222222222', code: 'LOG', name: 'Globex Logistics', created_at: new Date(Date.now() - 35 * 86400000).toISOString() }
		],
		members: [
			{ id: 'u4', email: 'it-lead@globex.com', full_name: 'Marcus Vance', role: 'client_admin', client_id: '22222222-2222-2222-2222-222222222222', created_at: new Date(Date.now() - 40 * 86400000).toISOString() },
			{ id: 'u5', email: 'operations@globex.com', full_name: 'Elena Rostova', role: 'client_raiser', client_id: '22222222-2222-2222-2222-222222222222', created_at: new Date(Date.now() - 35 * 86400000).toISOString() }
		],
		tickets: [
			{ id: 't8', title: 'Inventory count mismatch on sync', description: 'Logistics sync delayed by 2 hours.', category: 'bug', status: 'development', project_id: 'p7', estimated_hours: 12, actual_hours: null, created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
			{ id: 't9', title: 'HR Annual leave calculation update', description: 'Support carry-over cap logic.', category: 'enhancement', status: 'requirement_estimation', project_id: 'p6', estimated_hours: null, actual_hours: null, created_at: new Date(Date.now() - 5 * 86400000).toISOString() }
		]
	},
	{
		id: '33333333-3333-3333-3333-333333333333',
		code: 'TECHCO',
		name: 'TechCo Ltd',
		seat_quota: 10,
		created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
		projects: [
			{ id: 'p8', client_id: '33333333-3333-3333-3333-333333333333', code: 'APP', name: 'TechCo Mobile App', created_at: new Date(Date.now() - 55 * 86400000).toISOString() },
			{ id: 'p9', client_id: '33333333-3333-3333-3333-333333333333', code: 'API', name: 'TechCo Public API', created_at: new Date(Date.now() - 50 * 86400000).toISOString() },
			{ id: 'p10', client_id: '33333333-3333-3333-3333-333333333333', code: 'INFRA', name: 'TechCo Infrastructure', created_at: new Date(Date.now() - 45 * 86400000).toISOString() }
		],
		members: [
			{ id: 'u6', email: 'devops@techco.io', full_name: 'David Chen', role: 'client_admin', client_id: '33333333-3333-3333-3333-333333333333', created_at: new Date(Date.now() - 55 * 86400000).toISOString() }
		],
		tickets: [
			{ id: 't10', title: 'API Rate limiter returning 429 prematurely', description: 'Spike in error rate on public gateway.', category: 'bug', status: 'poc_triage', project_id: 'p9', estimated_hours: null, actual_hours: null, created_at: new Date(Date.now() - 1 * 86400000).toISOString() },
			{ id: 't11', title: 'OAuth2 refresh token rotation upgrade', description: 'Implement RFC 6749 refresh rotation.', category: 'enhancement', status: 'closed', project_id: 'p9', estimated_hours: 20, actual_hours: 18, created_at: new Date(Date.now() - 14 * 86400000).toISOString() }
		]
	}
];

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	try {
		// Fetch clients from Supabase
		const { data: dbClients, error: clientsError } = await supabase
			.from('clients')
			.select('id, code, name, seat_quota, created_at, updated_at')
			.order('name');

		if (clientsError || !dbClients || dbClients.length === 0) {
			return { clients: SEED_FALLBACK_CLIENTS };
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
				projects: clientProjects.length > 0 ? clientProjects : (SEED_FALLBACK_CLIENTS.find(c => c.id === client.id)?.projects || []),
				members: clientMembers.length > 0 ? clientMembers : (SEED_FALLBACK_CLIENTS.find(c => c.id === client.id)?.members || []),
				tickets: clientTickets.length > 0 ? clientTickets : (SEED_FALLBACK_CLIENTS.find(c => c.id === client.id)?.tickets || [])
			};
		});

		return { clients };
	} catch {
		return { clients: SEED_FALLBACK_CLIENTS };
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

		// Optionally insert initial project if specified
		if (projectName && projectCode) {
			const { error: projectError } = await supabase.from('projects').insert({
				client_id: newClient.id,
				name: projectName,
				code: projectCode
			});

			if (projectError) {
				console.error('Failed to create initial project for client:', projectError);
			}
		}

		return { success: true, createdClientId: newClient.id };
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
		const clientId = clientIdRaw && role.startsWith('client_') ? clientIdRaw : null;
		const projectIds = formData.getAll('project_ids').map(String).filter(Boolean);

		if (!fullName || !email) {
			return fail(400, { error: 'Full name and email address are required.', fullName, email });
		}

		if (role.startsWith('client_') && !clientId) {
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

