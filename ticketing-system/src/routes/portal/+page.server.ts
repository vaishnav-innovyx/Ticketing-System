import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const { data: tickets } = await supabase
		.from('tickets')
		.select('id, token, title, status, updated_at, projects(name)')
		.order('updated_at', { ascending: false })
		.limit(4);

	return { tickets: tickets ?? [] };
};
