import { json, error } from '@sveltejs/kit';
import { authenticateApiToken } from '$lib/server/apiAuth';
import { supabaseAdmin } from '$lib/server/supabase';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, params }) => {
	const auth = await authenticateApiToken(request);
	const ticketIdentifier = params.id;

	// Lookup by id (UUID) or token (e.g. TC-1234)
	let query = supabaseAdmin
		.from('tickets')
		.select(
			`id, token, title, description, category, priority, status,
			source, external_ref, diagnostics, created_at, target_date,
			client_id, project_id,
			project:projects(id, name, code)`
		);

	// Test if parameter looks like UUID
	const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ticketIdentifier);
	if (isUuid) {
		query = query.eq('id', ticketIdentifier);
	} else {
		query = query.eq('token', ticketIdentifier);
	}

	const { data: ticket, error: dbError } = await query.maybeSingle();

	if (dbError) {
		throw error(500, dbError.message);
	}

	if (!ticket || ticket.client_id !== auth.clientId || ticket.project_id !== auth.projectId) {
		throw error(404, 'Ticket not found.');
	}

	return json({
		id: ticket.id,
		token: ticket.token,
		title: ticket.title,
		description: ticket.description,
		category: ticket.category,
		priority: ticket.priority,
		status: ticket.status,
		source: ticket.source,
		external_ref: ticket.external_ref,
		diagnostics: ticket.diagnostics,
		project: ticket.project,
		created_at: ticket.created_at,
		target_date: ticket.target_date
	});
};
