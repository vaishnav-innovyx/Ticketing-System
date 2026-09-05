import { fail, redirect } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/server/supabase';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { session, user } = await safeGetSession();
	if (session && user) {
		throw redirect(303, '/');
	}

	// Check if any Super Admin already exists in profiles table
	const { count } = await supabase
		.from('profiles')
		.select('*', { count: 'exact', head: true })
		.eq('role', 'super_admin');

	if ((count ?? 0) > 0) {
		throw redirect(303, '/login');
	}
};

export const actions: Actions = {
	default: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const fullName = String(formData.get('fullName') || '').trim();
		const email = String(formData.get('email') || '').trim().toLowerCase();
		const password = String(formData.get('password') || '');
		const confirmPassword = String(formData.get('confirmPassword') || '');

		// Double check if super_admin exists
		const { count } = await supabase
			.from('profiles')
			.select('*', { count: 'exact', head: true })
			.eq('role', 'super_admin');

		if ((count ?? 0) > 0) {
			return fail(403, { error: 'Registration closed. A Super Admin already exists.', fullName, email });
		}

		if (!fullName || !email || !password) {
			return fail(400, { error: 'Please fill in all required fields.', fullName, email });
		}

		if (password !== confirmPassword) {
			return fail(400, { error: 'Passwords do not match.', fullName, email });
		}

		if (password.length < 8) {
			return fail(400, { error: 'Password must be at least 8 characters long.', fullName, email });
		}

		// Create user via Admin API (bypasses email confirmation rate limits)
		const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
			email,
			password,
			email_confirm: true,
			user_metadata: {
				full_name: fullName
			}
		});

		if (createError || !createData.user) {
			return fail(400, { error: createError?.message || 'Failed to create user account.', fullName, email });
		}

		// Upsert user into profiles with super_admin role
		const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
			id: createData.user.id,
			email: email,
			full_name: fullName,
			role: 'super_admin',
			client_id: null
		});

		if (profileError) {
			return fail(400, { error: `Failed to create super admin profile: ${profileError.message}`, fullName, email });
		}

		// Auto login the new super admin
		const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
		if (signInError) {
			throw redirect(303, '/login');
		}

		throw redirect(303, '/');
	}
};

