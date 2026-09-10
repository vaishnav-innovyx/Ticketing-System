import { fail } from '@sveltejs/kit';
import { requireInternalRole } from '$lib/server/authz';
import type { Actions, PageServerLoad } from './$types';

const MESSAGE_FIELDS = 'id, ticket_id, content, created_at, author_id, author:profiles(full_name, role)';

export const load: PageServerLoad = async ({ url, locals: { supabase, safeGetSession } }) => {
	const { user } = await safeGetSession();
	if (!user) return { conversations: [], selectedTicket: null, messages: [] };

	const selectedTicketId = url.searchParams.get('ticket');

	const [{ data: dbTickets }, { data: reads }, { data: selectedTicketRow }] = await Promise.all([
		// !inner restricts to tickets that already have at least one message -- a
		// "conversation" list has nothing to show for a ticket that's never been messaged.
		supabase
			.from('tickets')
			.select(`id, token, title, status, client:clients(name), messages:ticket_messages!inner(${MESSAGE_FIELDS})`)
			.order('created_at', { ascending: false, referencedTable: 'messages' }),
		supabase.from('ticket_message_reads').select('ticket_id, last_read_at').eq('user_id', user.id),
		selectedTicketId
			? supabase
					.from('tickets')
					.select(`id, token, title, status, client:clients(name), messages:ticket_messages(${MESSAGE_FIELDS})`)
					.eq('id', selectedTicketId)
					.order('created_at', { ascending: true, referencedTable: 'messages' })
					.maybeSingle()
			: Promise.resolve({ data: null })
	]);

	const readMap = new Map((reads ?? []).map((r) => [r.ticket_id, r.last_read_at]));
	const one = <T>(v: T | T[] | null | undefined) => (Array.isArray(v) ? v[0] ?? null : v ?? null);

	const conversations = (dbTickets ?? [])
		.map((t) => {
			const msgs = t.messages ?? [];
			const lastMessage = msgs[0];
			if (!lastMessage) return null;
			const client = one(t.client);
			const author = one(lastMessage.author);
			const lastRead = readMap.get(t.id);
			const unreadCount = msgs.filter(
				(m) => m.author_id !== user.id && (!lastRead || m.created_at > lastRead)
			).length;

			return {
				ticketId: t.id,
				token: t.token,
				title: t.title,
				status: t.status,
				clientName: client?.name ?? '',
				lastMessagePreview: lastMessage.content,
				lastMessageAt: lastMessage.created_at,
				lastMessageAuthorName: author?.full_name ?? 'Unknown',
				unreadCount
			};
		})
		.filter((c): c is NonNullable<typeof c> => c !== null)
		.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

	let selectedTicket: { id: string; token: string | null; title: string; status: string; clientName: string } | null = null;
	let threadMessages: ReturnType<typeof one>[] = [];

	if (selectedTicketRow) {
		const client = one(selectedTicketRow.client);
		selectedTicket = {
			id: selectedTicketRow.id,
			token: selectedTicketRow.token,
			title: selectedTicketRow.title,
			status: selectedTicketRow.status,
			clientName: client?.name ?? ''
		};
		threadMessages = (selectedTicketRow.messages ?? []).map((m) => ({ ...m, author: one(m.author) }));

		// Viewing a thread marks it read for this user.
		await supabase
			.from('ticket_message_reads')
			.upsert({ user_id: user.id, ticket_id: selectedTicketRow.id, last_read_at: new Date().toISOString() }, { onConflict: 'user_id,ticket_id' });
	}

	return { conversations, selectedTicket, messages: threadMessages };
};

export const actions: Actions = {
	reply: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();
		if (!user) return fail(401, { error: 'Not authenticated.' });
		if (!(await requireInternalRole(supabase, user.id))) {
			return fail(403, { error: 'You do not have permission to post replies.' });
		}

		const formData = await request.formData();
		const ticketId = String(formData.get('ticket_id') || '').trim();
		const content = String(formData.get('content') || '').trim();
		if (!ticketId || !content) return fail(400, { error: 'Message is required.' });

		const { error: insertError } = await supabase
			.from('ticket_messages')
			.insert({ ticket_id: ticketId, author_id: user.id, content });
		if (insertError) return fail(500, { error: insertError.message });

		// Sending a reply implies you've read the thread up to now.
		await supabase
			.from('ticket_message_reads')
			.upsert({ user_id: user.id, ticket_id: ticketId, last_read_at: new Date().toISOString() }, { onConflict: 'user_id,ticket_id' });

		return { success: true };
	}
};
