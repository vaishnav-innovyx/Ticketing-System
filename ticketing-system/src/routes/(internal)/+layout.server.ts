import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

const INTERNAL_ROLES = ['super_admin', 'poc', 'specialist', 'delivery_lead'];

export const load: LayoutServerLoad = async ({ locals: { supabase, safeGetSession }, url }) => {
	const { session, user } = await safeGetSession();
	if (!session || !user) {
		throw redirect(303, `/login?redirectTo=${encodeURIComponent(url.pathname)}`);
	}

	const { data: profile } = await supabase
		.from('profiles')
		.select('id, full_name, email, role')
		.eq('id', user.id)
		.single();

	if (!profile || !INTERNAL_ROLES.includes(profile.role)) {
		// If user has a client role, redirect to client portal; otherwise back to login
		if (profile?.role?.startsWith('client_')) {
			throw redirect(303, '/portal');
		}
		throw redirect(303, '/login');
	}

	return { profile };
};
