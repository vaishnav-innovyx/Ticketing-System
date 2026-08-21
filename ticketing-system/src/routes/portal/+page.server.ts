import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { data: tickets } = await supabase
		.from('tickets')
		.select('id, token, title, status, updated_at, projects(name)')
		.order('updated_at', { ascending: false })
		.limit(4);

	const { user } = await safeGetSession();
	const { data: profile } = user
		? await supabase.from('profiles').select('role').eq('id', user.id).single()
		: { data: null };

	let pendingApprovalTickets: { token: string | null; title: string; raiser: { full_name: string | null } | null }[] = [];
	if (profile?.role === 'client_admin') {
		const { data: pending } = await supabase
			.from('tickets')
			.select('token, title, raiser:profiles!tickets_raised_by_fkey(full_name)')
			.eq('requires_admin_approval', true)
			.is('admin_approved_at', null)
			.is('admin_rejected_at', null)
			.order('raised_at', { ascending: true })
			.limit(5);
		pendingApprovalTickets = (pending ?? []).map((p) => ({
			token: p.token,
			title: p.title,
			raiser: Array.isArray(p.raiser) ? (p.raiser[0] ?? null) : p.raiser
		}));
	}

	return { tickets: tickets ?? [], pendingApprovalTickets };
};
