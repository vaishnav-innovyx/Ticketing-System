import { fail } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/server/supabase';
import type { Actions, PageServerLoad } from './$types';

const SEED_FALLBACK_MEMBERS = [
	{ id: 'u0', email: 'admin@companyx.com', full_name: 'Super Admin', role: 'super_admin', client_id: null, client: null, assigned_projects: [{ id: 'p1', code: 'MBANK', name: 'Acme Mobile Banking' }, { id: 'p5', code: 'ERP', name: 'Globex ERP' }, { id: 'p8', code: 'APP', name: 'TechCo Mobile App' }], created_at: new Date(Date.now() - 60 * 86400000).toISOString() },
	{ id: 'u-poc', email: 'poc@companyx.com', full_name: 'PoC User', role: 'poc', client_id: null, client: null, assigned_projects: [{ id: 'p1', code: 'MBANK', name: 'Acme Mobile Banking' }, { id: 'p2', code: 'POS', name: 'Acme Point of Sale' }], created_at: new Date(Date.now() - 45 * 86400000).toISOString() },
	{ id: 'u-spec', email: 'specialist@companyx.com', full_name: 'Tech Specialist', role: 'specialist', client_id: null, client: null, assigned_projects: [{ id: 'p1', code: 'MBANK', name: 'Acme Mobile Banking' }, { id: 'p3', code: 'CRM', name: 'Acme CRM' }], created_at: new Date(Date.now() - 45 * 86400000).toISOString() },
	{ id: 'u-del', email: 'delivery@companyx.com', full_name: 'Delivery Lead', role: 'delivery_lead', client_id: null, client: null, assigned_projects: [{ id: 'p1', code: 'MBANK', name: 'Acme Mobile Banking' }, { id: 'p4', code: 'WEB', name: 'Acme Website' }], created_at: new Date(Date.now() - 45 * 86400000).toISOString() },
	{ id: 'u1', email: 'admin@acme-client.com', full_name: 'Acme Admin', role: 'client_admin', client_id: '11111111-1111-1111-1111-111111111111', client: { id: '11111111-1111-1111-1111-111111111111', name: 'Acme Corp', code: 'ACME' }, assigned_projects: [{ id: 'p1', code: 'MBANK', name: 'Acme Mobile Banking' }, { id: 'p2', code: 'POS', name: 'Acme Point of Sale' }, { id: 'p3', code: 'CRM', name: 'Acme CRM' }, { id: 'p4', code: 'WEB', name: 'Acme Website' }], created_at: new Date(Date.now() - 28 * 86400000).toISOString() },
	{ id: 'u2', email: 'raiser@acme-client.com', full_name: 'Acme Raiser', role: 'client_raiser', client_id: '11111111-1111-1111-1111-111111111111', client: { id: '11111111-1111-1111-1111-111111111111', name: 'Acme Corp', code: 'ACME' }, assigned_projects: [{ id: 'p1', code: 'MBANK', name: 'Acme Mobile Banking' }, { id: 'p2', code: 'POS', name: 'Acme Point of Sale' }], created_at: new Date(Date.now() - 27 * 86400000).toISOString() },
	{ id: 'u3', email: 'viewer@acme-client.com', full_name: 'Acme Viewer', role: 'client_viewer', client_id: '11111111-1111-1111-1111-111111111111', client: { id: '11111111-1111-1111-1111-111111111111', name: 'Acme Corp', code: 'ACME' }, assigned_projects: [{ id: 'p1', code: 'MBANK', name: 'Acme Mobile Banking' }], created_at: new Date(Date.now() - 26 * 86400000).toISOString() },
	{ id: 'u4', email: 'it-lead@globex.com', full_name: 'Marcus Vance', role: 'client_admin', client_id: '22222222-2222-2222-2222-222222222222', client: { id: '22222222-2222-2222-2222-222222222222', name: 'Globex Inc', code: 'GLOB' }, assigned_projects: [{ id: 'p5', code: 'ERP', name: 'Globex ERP' }, { id: 'p6', code: 'HR', name: 'Globex HR Portal' }, { id: 'p7', code: 'LOG', name: 'Globex Logistics' }], created_at: new Date(Date.now() - 40 * 86400000).toISOString() },
	{ id: 'u5', email: 'operations@globex.com', full_name: 'Elena Rostova', role: 'client_raiser', client_id: '22222222-2222-2222-2222-222222222222', client: { id: '22222222-2222-2222-2222-222222222222', name: 'Globex Inc', code: 'GLOB' }, assigned_projects: [{ id: 'p5', code: 'ERP', name: 'Globex ERP' }, { id: 'p7', code: 'LOG', name: 'Globex Logistics' }], created_at: new Date(Date.now() - 35 * 86400000).toISOString() },
	{ id: 'u6', email: 'devops@techco.io', full_name: 'David Chen', role: 'client_admin', client_id: '33333333-3333-3333-3333-333333333333', client: { id: '33333333-3333-3333-3333-333333333333', name: 'TechCo Ltd', code: 'TECHCO' }, assigned_projects: [{ id: 'p8', code: 'APP', name: 'TechCo Mobile App' }, { id: 'p9', code: 'API', name: 'TechCo Public API' }, { id: 'p10', code: 'INFRA', name: 'TechCo Infrastructure' }], created_at: new Date(Date.now() - 55 * 86400000).toISOString() }
];

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	try {
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
				members: SEED_FALLBACK_MEMBERS,
				clients: clients.length > 0 ? clients : [
					{ id: '11111111-1111-1111-1111-111111111111', code: 'ACME', name: 'Acme Corp' },
					{ id: '22222222-2222-2222-2222-222222222222', code: 'GLOB', name: 'Globex Inc' },
					{ id: '33333333-3333-3333-3333-333333333333', code: 'TECHCO', name: 'TechCo Ltd' }
				],
				projects
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

		return { members, clients, projects };
	} catch {
		return {
			members: SEED_FALLBACK_MEMBERS,
			clients: [
				{ id: '11111111-1111-1111-1111-111111111111', code: 'ACME', name: 'Acme Corp' },
				{ id: '22222222-2222-2222-2222-222222222222', code: 'GLOB', name: 'Globex Inc' },
				{ id: '33333333-3333-3333-3333-333333333333', code: 'TECHCO', name: 'TechCo Ltd' }
			],
			projects: []
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

		// Create user in Supabase Auth
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

		// Upsert into profiles
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
		const role = String(formData.get('role') || 'client_raiser');
		const clientIdRaw = String(formData.get('client_id') || '').trim();
		const clientId = clientIdRaw && role.startsWith('client_') ? clientIdRaw : null;
		const projectIds = formData.getAll('project_ids').map(String).filter(Boolean);

		if (!targetUserId || !fullName) {
			return fail(400, { error: 'User ID and full name are required.' });
		}

		if (role.startsWith('client_') && !clientId) {
			return fail(400, { error: 'Client organization is required for client roles.' });
		}

		if (callerProfile.role === 'client_admin') {
			const { data: targetProfile } = await supabaseAdmin.from('profiles').select('client_id').eq('id', targetUserId).single();
			if (!targetProfile || targetProfile.client_id !== callerProfile.client_id || clientId !== callerProfile.client_id) {
				return fail(403, { error: 'Client Admins can only edit users within their own organization.' });
			}
		}

		// Update profile
		const { error: profileError } = await supabaseAdmin
			.from('profiles')
			.update({
				full_name: fullName,
				role: role as never,
				client_id: clientId
			})
			.eq('id', targetUserId);

		if (profileError) {
			return fail(500, { error: profileError.message });
		}

		// Update user metadata in auth
		try {
			await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
				user_metadata: { full_name: fullName }
			});
		} catch (err) {
			console.error('Error updating auth metadata:', err);
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
