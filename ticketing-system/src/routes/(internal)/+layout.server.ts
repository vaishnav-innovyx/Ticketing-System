import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

const INTERNAL_ROLES = ['super_admin', 'poc', 'specialist', 'delivery_lead'];

export const load: LayoutServerLoad = async ({ locals: { supabase, safeGetSession }, url }) => {
	const { session, user } = await safeGetSession();
	if (!session || !user) {
		throw redirect(303, `/login?redirectTo=${encodeURIComponent(url.pathname)}`);
	}

	const { data: profile } = await supabase
		.from('profiles')
		.select('id, full_name, email, role')
		.eq('id', user.id)
		.single();

	if (!profile || !INTERNAL_ROLES.includes(profile.role)) {
		// If user has a client role, redirect to client portal; otherwise back to login
		if (profile?.role?.startsWith('client_')) {
			throw redirect(303, '/portal');
		}
		throw redirect(303, '/login');
	}

	const [{ data: messages }, { data: reads }] = await Promise.all([
		supabase.from('ticket_messages').select('ticket_id, author_id, created_at').neq('author_id', user.id),
		supabase.from('ticket_message_reads').select('ticket_id, last_read_at').eq('user_id', user.id)
	]);

	const readMap = new Map((reads ?? []).map((r) => [r.ticket_id, r.last_read_at]));
	const unreadMessageCount = (messages ?? []).filter((m) => {
		const lastRead = readMap.get(m.ticket_id);
		return !lastRead || m.created_at > lastRead;
	}).length;

	return { profile, unreadMessageCount };
};
