import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { user } = await safeGetSession();
	if (!user) return { notifications: [] };

	const { data } = await supabase
		.from('email_notifications')
		.select('id, event, subject, body, sent_at, ticket:tickets(token, title)')
		.eq('recipient_email', user.email ?? '')
		.order('sent_at', { ascending: false })
		.limit(100);

	return { notifications: data ?? [] };
};
