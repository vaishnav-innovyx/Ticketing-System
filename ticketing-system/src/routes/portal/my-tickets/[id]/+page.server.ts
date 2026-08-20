import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase } }) => {
	const { data: ticket, error: ticketError } = await supabase
		.from('tickets')
		.select(
			`*, projects(name),
			raised_by_profile:profiles!tickets_raised_by_fkey(full_name),
			poc:profiles!tickets_poc_id_fkey(full_name, role),
			specialist:profiles!tickets_specialist_id_fkey(full_name, role),
			delivery_lead:profiles!tickets_delivery_lead_id_fkey(full_name, role)`
		)
		.eq('token', params.id)
		.maybeSingle();

	if (ticketError) throw error(500, ticketError.message);
	if (!ticket) throw error(404, 'Ticket not found');

	const [{ data: messages }, { data: attachments }, { data: watchers }] = await Promise.all([
		supabase
			.from('ticket_messages')
			.select('id, content, created_at, author:profiles(full_name, role)')
			.eq('ticket_id', ticket.id)
			.order('created_at', { ascending: true }),
		supabase
			.from('ticket_attachments')
			.select('id, file_name, file_size_bytes, mime_type, message_id')
			.eq('ticket_id', ticket.id),
		supabase.from('ticket_watchers').select('email, full_name').eq('ticket_id', ticket.id)
	]);

	return {
		ticket,
		messages: messages ?? [],
		attachments: attachments ?? [],
		watchers: watchers ?? []
	};
};

export const actions: Actions = {
	reply: async ({ request, params, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();
		if (!user) return fail(401, { error: 'Not signed in.' });

		const formData = await request.formData();
		const content = String(formData.get('content') || '').trim();
		if (!content) return fail(400, { error: 'Reply cannot be empty.' });

		const { data: ticket } = await supabase.from('tickets').select('id').eq('token', params.id).maybeSingle();
		if (!ticket) return fail(404, { error: 'Ticket not found.' });

		const { error: insertError } = await supabase
			.from('ticket_messages')
			.insert({ ticket_id: ticket.id, author_id: user.id, content });

		if (insertError) return fail(500, { error: insertError.message });
		return { success: true };
	},

	close: async ({ params, locals: { supabase } }) => {
		const { data: ticket } = await supabase.from('tickets').select('id').eq('token', params.id).maybeSingle();
		if (!ticket) return fail(404, { error: 'Ticket not found.' });

		const { error: updateError } = await supabase
			.from('tickets')
			.update({ status: 'closed', closed_at: new Date().toISOString() })
			.eq('id', ticket.id);

		if (updateError) return fail(500, { error: updateError.message });
		return { success: true };
	}
};
