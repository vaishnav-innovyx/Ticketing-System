import { fail, redirect } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/server/supabase';
import type { Actions, PageServerLoad } from './$types';

const SSO_ERRORS: Record<string, string> = {
	unregistered_user:
		"Your Microsoft account is authenticated, but you are not registered for Resolv Service Desk. Please contact your organization's Resolv administrator.",
	account_suspended: 'Your Resolv account has been suspended. Please contact your system administrator.',
	account_disabled: 'Your Resolv account has been disabled. Please contact your system administrator.',
	account_pending: 'Your account is pending administrator activation. Please contact your administrator.',
	org_suspended: 'Your organization access to Resolv is currently suspended. Please contact your account manager.',
	tenant_mismatch: 'Your Microsoft organizational tenant does not match your registered Resolv company profile.',
	missing_auth_code: 'Authentication code was missing from Microsoft callback. Please try again.',
	auth_failed: 'Microsoft authentication was interrupted or failed. Please try again.',
	profile_creation_failed: 'Failed to initialize your profile during first-login binding. Please contact support.'
};

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession }, url }) => {
	const { session, user } = await safeGetSession();
	if (session && user) {
		const redirectTo = url.searchParams.get('redirectTo');
		if (redirectTo) throw redirect(303, redirectTo);

		const { data: profile } = await supabase.from('profiles').select('role, status').eq('id', user.id).maybeSingle();
		if (profile && profile.status === 'ACTIVE') {
			if (['super_admin', 'poc', 'specialist', 'delivery_lead'].includes(profile.role)) {
				throw redirect(303, '/');
			}
			throw redirect(303, '/portal');
		}
	}

	const errorCode = url.searchParams.get('error');
	const ssoError = errorCode ? SSO_ERRORS[errorCode] || 'Authentication error encountered. Please try again.' : null;

	const { count } = await supabaseAdmin
		.from('profiles')
		.select('*', { count: 'exact', head: true })
		.eq('role', 'super_admin');

	const hasSuperAdmin = (count ?? 0) > 0;

	return {
		hasSuperAdmin,
		ssoError
	};
};

export const actions: Actions = {
	signInWithMicrosoft: async ({ locals: { supabase }, url }) => {
		const redirectTo = url.searchParams.get('redirectTo') || '';
		const callbackUrl = `${url.origin}/auth/callback${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}`;

		const { data, error } = await supabase.auth.signInWithOAuth({
			provider: 'azure',
			options: {
				scopes: 'email openid profile User.Read',
				redirectTo: callbackUrl
			}
		});

		if (error || !data?.url) {
			return fail(500, { error: error?.message || 'Failed to initialize Microsoft SSO.' });
		}

		throw redirect(303, data.url);
	},

	signInWithPassword: async ({ request, locals: { supabase }, url }) => {
		const formData = await request.formData();
		const email = String(formData.get('email') || '').trim();
		const password = String(formData.get('password') || '');

		const { data, error } = await supabase.auth.signInWithPassword({ email, password });
		if (error || !data.user) {
			return fail(400, { error: 'Invalid email or password.', email });
		}

		// Check status
		const { data: profile } = await supabase.from('profiles').select('role, status, client_id').eq('id', data.user.id).maybeSingle();
		if (profile) {
			if (profile.status !== 'ACTIVE') {
				await supabase.auth.signOut();
				return fail(403, { error: `Your account is ${profile.status.toLowerCase()}. Access denied.`, email });
			}
			if (profile.client_id) {
				const { data: clientOrg } = await supabaseAdmin.from('clients').select('status').eq('id', profile.client_id).maybeSingle();
				if (clientOrg && clientOrg.status !== 'ACTIVE') {
					await supabase.auth.signOut();
					return fail(403, { error: 'Your client organization is suspended.', email });
				}
			}
		}

		const redirectTo = url.searchParams.get('redirectTo');
		if (redirectTo) throw redirect(303, redirectTo);

		if (profile && ['super_admin', 'poc', 'specialist', 'delivery_lead'].includes(profile.role)) {
			throw redirect(303, '/');
		}

		throw redirect(303, '/portal');
	}
};
