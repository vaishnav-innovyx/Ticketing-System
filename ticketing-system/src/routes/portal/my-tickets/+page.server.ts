import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const { data: tickets } = await supabase
		.from('tickets')
		.select('id, token, title, description, status, category, priority, updated_at, projects(name)')
		.order('updated_at', { ascending: false });

	return { tickets: tickets ?? [] };
};
