import { json, error } from '@sveltejs/kit';
import { authenticateApiToken } from '$lib/server/apiAuth';
import { supabaseAdmin } from '$lib/server/supabase';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, url }) => {
	await authenticateApiToken(request);

	const email = (url.searchParams.get('email') || '').trim().toLowerCase();
	if (!email) {
		throw error(400, 'email query parameter is required.');
	}

	// Lookup user profile in Supabase
	const { data: existingProfile, error: profileError } = await supabaseAdmin
		.from('profiles')
		.select('id, role, client_id')
		.eq('email', email)
		.maybeSingle();

	if (profileError) {
		throw error(500, 'Database error while checking user profile.');
	}

	if (!existingProfile) {
		return json({
			registered: false,
			eligible: false
		});
	}

	// Any user whose profile exists in the Ticketing Application is recognized as registered and eligible
	return json({
		registered: true,
		eligible: true,
		role: existingProfile.role
	});
};
