import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const { data: tickets, error: ticketsError } = await supabase
		.from('tickets')
		.select(
			'id, token, title, description, status, category, priority, updated_at, requires_admin_approval, admin_approved_at, admin_rejected_at, client_approved_at, projects(name)'
		)
		.order('updated_at', { ascending: false });

	if (ticketsError) throw error(500, `Failed to load tickets: ${ticketsError.message}`);

	return { tickets: tickets ?? [] };
};
