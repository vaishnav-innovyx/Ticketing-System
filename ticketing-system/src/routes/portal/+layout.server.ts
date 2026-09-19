import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

const CLIENT_ROLES = ['client_admin', 'project_admin', 'client_raiser', 'client_viewer'];

export const load: LayoutServerLoad = async ({ locals: { supabase, safeGetSession }, url }) => {
	const { session, user } = await safeGetSession();
	if (!session || !user) {
		throw redirect(303, `/login?redirectTo=${encodeURIComponent(url.pathname)}`);
	}

	const { data: profile } = await supabase
		.from('profiles')
		.select('id, full_name, email, role, client_id, status, clients(name, status)')
		.eq('id', user.id)
		.single();

	if (!profile) {
		await supabase.auth.signOut();
		throw redirect(303, '/login');
	}

	if (profile.status !== 'ACTIVE') {
		await supabase.auth.signOut();
		throw redirect(303, `/login?error=account_${profile.status.toLowerCase()}`);
	}

	const clientInfo = Array.isArray(profile.clients) ? profile.clients[0] : profile.clients;
	if (clientInfo && clientInfo.status !== 'ACTIVE') {
		await supabase.auth.signOut();
		throw redirect(303, '/login?error=org_suspended');
	}

	if (!CLIENT_ROLES.includes(profile.role)) {
		throw redirect(303, '/login');
	}

	let pendingApprovalCount = 0;
	if (profile.role === 'project_admin') {
		const { count } = await supabase
			.from('tickets')
			.select('id', { count: 'exact', head: true })
			.eq('requires_admin_approval', true)
			.is('admin_approved_at', null)
			.is('admin_rejected_at', null);
		pendingApprovalCount = count ?? 0;
	}

	return { profile, pendingApprovalCount };
};
