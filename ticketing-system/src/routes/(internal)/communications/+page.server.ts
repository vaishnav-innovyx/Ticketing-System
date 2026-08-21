import { fail } from '@sveltejs/kit';
import { requireInternalRole } from '$lib/server/authz';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals: { supabase, safeGetSession } }) => {
	const { user } = await safeGetSession();
	if (!user) return { conversations: [], selectedTicket: null, messages: [] };

	const [{ data: messages }, { data: tickets }, { data: reads }] = await Promise.all([
		supabase
			.from('ticket_messages')
			.select('id, ticket_id, content, created_at, author_id, author:profiles(full_name, role)')
			.order('created_at', { ascending: false }),
		supabase.from('tickets').select('id, token, title, status, client:clients(name)'),
		supabase.from('ticket_message_reads').select('ticket_id, last_read_at').eq('user_id', user.id)
	]);

	const readMap = new Map((reads ?? []).map((r) => [r.ticket_id, r.last_read_at]));
	const ticketsById = new Map((tickets ?? []).map((t) => [t.id, t]));
	const allMessages = messages ?? [];

	type MessageRow = (typeof allMessages)[number];
	const conversationMap = new Map<string, { lastMessage: MessageRow; unreadCount: number }>();

	for (const m of allMessages) {
		if (!ticketsById.has(m.ticket_id)) continue;
		if (!conversationMap.has(m.ticket_id)) {
			conversationMap.set(m.ticket_id, { lastMessage: m, unreadCount: 0 });
		}
		const lastRead = readMap.get(m.ticket_id);
		if (m.author_id !== user.id && (!lastRead || m.created_at > lastRead)) {
			conversationMap.get(m.ticket_id)!.unreadCount++;
		}
	}

	const conversations = [...conversationMap.entries()]
		.map(([ticketId, info]) => {
			const t = ticketsById.get(ticketId)!;
			const client = Array.isArray(t.client) ? t.client[0] : t.client;
			const author = Array.isArray(info.lastMessage.author) ? info.lastMessage.author[0] : info.lastMessage.author;
			return {
				ticketId,
				token: t.token,
				title: t.title,
				status: t.status,
				clientName: client?.name ?? '',
				lastMessagePreview: info.lastMessage.content,
				lastMessageAt: info.lastMessage.created_at,
				lastMessageAuthorName: author?.full_name ?? 'Unknown',
				unreadCount: info.unreadCount
			};
		})
		.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

	const selectedTicketId = url.searchParams.get('ticket');
	let selectedTicket: { id: string; token: string | null; title: string; status: string; clientName: string } | null = null;
	let threadMessages: MessageRow[] = [];

	if (selectedTicketId && ticketsById.has(selectedTicketId)) {
		const t = ticketsById.get(selectedTicketId)!;
		const client = Array.isArray(t.client) ? t.client[0] : t.client;
		selectedTicket = { id: t.id, token: t.token, title: t.title, status: t.status, clientName: client?.name ?? '' };
		threadMessages = allMessages.filter((m) => m.ticket_id === selectedTicketId).slice().reverse();

		// Viewing a thread marks it read for this user.
		await supabase
			.from('ticket_message_reads')
			.upsert({ user_id: user.id, ticket_id: selectedTicketId, last_read_at: new Date().toISOString() }, { onConflict: 'user_id,ticket_id' });
	}

	return {
		conversations,
		selectedTicket,
		messages: threadMessages.map((m) => ({
			...m,
			author: Array.isArray(m.author) ? m.author[0] : m.author
		}))
	};
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
