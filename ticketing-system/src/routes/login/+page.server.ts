import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession }, url }) => {
	const { session, user } = await safeGetSession();
	if (session && user) {
		const redirectTo = url.searchParams.get('redirectTo');
		if (redirectTo) throw redirect(303, redirectTo);

		const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
		if (profile && ['super_admin', 'poc', 'specialist', 'delivery_lead'].includes(profile.role)) {
			throw redirect(303, '/');
		}
		throw redirect(303, '/portal');
	}

	const { count } = await supabase
		.from('profiles')
		.select('*', { count: 'exact', head: true })
		.eq('role', 'super_admin');

	const hasSuperAdmin = (count ?? 0) > 0;

	return {
		hasSuperAdmin
	};
};

export const actions: Actions = {
	default: async ({ request, locals: { supabase }, url }) => {
		const formData = await request.formData();
		const email = String(formData.get('email') || '');
		const password = String(formData.get('password') || '');

		const { data, error } = await supabase.auth.signInWithPassword({ email, password });
		if (error || !data.user) {
			return fail(400, { error: 'Invalid email or password.', email });
		}

		const redirectTo = url.searchParams.get('redirectTo');
		if (redirectTo) throw redirect(303, redirectTo);

		const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
		if (profile && ['super_admin', 'poc', 'specialist', 'delivery_lead'].includes(profile.role)) {
			throw redirect(303, '/');
		}

		throw redirect(303, '/portal');
	}
};
