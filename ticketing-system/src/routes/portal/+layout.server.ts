import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

const CLIENT_ROLES = ['client_admin', 'client_raiser', 'client_viewer'];

export const load: LayoutServerLoad = async ({ locals: { supabase, safeGetSession }, url }) => {
	const { session, user } = await safeGetSession();
	if (!session || !user) {
		throw redirect(303, `/login?redirectTo=${encodeURIComponent(url.pathname)}`);
	}

	const { data: profile } = await supabase
		.from('profiles')
		.select('id, full_name, email, role, client_id, clients(name)')
		.eq('id', user.id)
		.single();

	if (!profile || !CLIENT_ROLES.includes(profile.role)) {
		throw redirect(303, '/login');
	}

	return { profile };
};
