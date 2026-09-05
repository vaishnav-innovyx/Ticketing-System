import { json, error } from '@sveltejs/kit';
import { authenticateApiToken } from '$lib/server/apiAuth';
import { supabaseAdmin } from '$lib/server/supabase';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request }) => {
	const auth = await authenticateApiToken(request);
	const ticketId = params.id;

	if (!ticketId) {
		throw error(400, 'Ticket ID is required.');
	}

	let body: { depends_on_token?: string; depends_on_id?: string };
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Request body must be valid JSON.');
	}

	const dependsOnToken = body.depends_on_token?.trim();
	const dependsOnId = body.depends_on_id?.trim();

	if (!dependsOnToken && !dependsOnId) {
		throw error(400, 'depends_on_token or depends_on_id is required.');
	}

	// Verify target ticket belongs to client's tenant scope
	let query = supabaseAdmin.from('tickets').select('id, token').eq('client_id', auth.clientId);
	if (dependsOnId) {
		query = query.eq('id', dependsOnId);
	} else if (dependsOnToken) {
		query = query.eq('token', dependsOnToken);
	}

	const { data: targetTicket, error: targetError } = await query.maybeSingle();

	if (targetError || !targetTicket) {
		throw error(404, `Target dependency ticket not found under authorized organization.`);
	}

	if (targetTicket.id === ticketId) {
		throw error(400, 'A ticket cannot depend on itself.');
	}

	const { data: newDep, error: insertError } = await supabaseAdmin
		.from('ticket_dependencies')
		.insert({
			ticket_id: ticketId,
			depends_on_ticket_id: targetTicket.id
		} as never)
		.select('id, ticket_id, depends_on_ticket_id')
		.single();

	if (insertError) {
		throw error(400, insertError.message);
	}

	return json({ success: true, dependency: newDep }, { status: 201 });
};
