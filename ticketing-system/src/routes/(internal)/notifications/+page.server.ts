import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { user } = await safeGetSession();
	if (!user) return { notifications: [] };

	const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

	const query = supabase
		.from('email_notifications')
		.select('id, event, recipient_email, subject, body, sent_at, ticket:tickets(token, title)')
		.order('sent_at', { ascending: false })
		.limit(100);

	// super_admin sees everything (already true under RLS); everyone else sees
	// notifications addressed to them specifically, which RLS additionally scopes
	// to their own project memberships.
	if (profile?.role !== 'super_admin') {
		query.eq('recipient_email', user.email ?? '');
	}

	const { data } = await query;
	return { notifications: data ?? [] };
};
