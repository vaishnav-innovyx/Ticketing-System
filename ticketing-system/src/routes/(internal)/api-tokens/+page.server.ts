import { fail, redirect } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/server/supabase';
import { generateApiToken } from '$lib/server/apiAuth';
import type { Actions, PageServerLoad } from './$types';

async function requireSuperAdmin(supabase: App.Locals['supabase'], userId: string) {
	const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();
	if (!profile || profile.role !== 'super_admin') {
		throw redirect(303, '/');
	}
}

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { user } = await safeGetSession();
	if (!user) throw redirect(303, '/login');
	await requireSuperAdmin(supabase, user.id);

	const [{ data: tokens }, { data: clients }, { data: projects }] = await Promise.all([
		supabaseAdmin
			.from('api_tokens')
			.select('id, name, token_prefix, client_id, project_id, is_active, last_used_at, created_at, revoked_at, clients(name, code), projects(name, code)')
			.order('created_at', { ascending: false }),
		supabaseAdmin.from('clients').select('id, code, name').order('name'),
		supabaseAdmin.from('projects').select('id, client_id, code, name').order('name')
	]);

	return {
		tokens: tokens ?? [],
		clients: clients ?? [],
		projects: projects ?? []
	};
};

export const actions: Actions = {
	create: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();
		if (!user) return fail(401, { error: 'Not authenticated.' });

		const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
		if (!profile || profile.role !== 'super_admin') {
			return fail(403, { error: 'Only super admins can manage API tokens.' });
		}

		const formData = await request.formData();
		const name = String(formData.get('name') || '').trim();
		const clientId = String(formData.get('client_id') || '').trim();
		const projectId = String(formData.get('project_id') || '').trim();

		if (!name || !clientId || !projectId) {
			return fail(400, { error: 'Name, client, and project are all required.' });
		}

		const { data: clientRow } = await supabaseAdmin.from('clients').select('code').eq('id', clientId).single();
		if (!clientRow) {
			return fail(400, { error: 'Unknown client.' });
		}

		const { rawToken, tokenHash, tokenPrefix } = generateApiToken(clientRow.code);

		const { error: insertError } = await supabaseAdmin.from('api_tokens').insert({
			client_id: clientId,
			project_id: projectId,
			name,
			token_hash: tokenHash,
			token_prefix: tokenPrefix,
			created_by: user.id
		});

		if (insertError) {
			return fail(500, { error: insertError.message });
		}

		// Raw token is shown exactly once, here, and never stored or logged.
		return { success: true, rawToken };
	},

	revoke: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();
		if (!user) return fail(401, { error: 'Not authenticated.' });

		const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
		if (!profile || profile.role !== 'super_admin') {
			return fail(403, { error: 'Only super admins can manage API tokens.' });
		}

		const formData = await request.formData();
		const tokenId = String(formData.get('token_id') || '').trim();
		if (!tokenId) return fail(400, { error: 'Missing token id.' });

		const { error: updateError } = await supabaseAdmin
			.from('api_tokens')
			.update({ is_active: false, revoked_at: new Date().toISOString() })
			.eq('id', tokenId);

		if (updateError) return fail(500, { error: updateError.message });

		return { success: true };
	}
};
