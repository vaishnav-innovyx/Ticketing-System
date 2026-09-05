import { json, error } from '@sveltejs/kit';
import { authenticateApiToken } from '$lib/server/apiAuth';
import { supabaseAdmin } from '$lib/server/supabase';
import type { RequestHandler } from './$types';

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Attaches a file (e.g. an auto-captured screenshot) to an API-created
 * ticket. Reuses the same private ticket-attachments bucket and path
 * convention as the portal (src/routes/portal/submit/+page.server.ts).
 */
export const POST: RequestHandler = async ({ request, params }) => {
	const auth = await authenticateApiToken(request);
	const ticketId = params.id;

	// Confirm the ticket belongs to the authenticated token's client/project
	// before allowing an upload -- prevents cross-tenant attachment injection.
	const { data: ticket } = await supabaseAdmin
		.from('tickets')
		.select('id, client_id, project_id')
		.eq('id', ticketId)
		.maybeSingle();

	if (!ticket || ticket.client_id !== auth.clientId || ticket.project_id !== auth.projectId) {
		throw error(403, 'Ticket not found for this token.');
	}

	const formData = await request.formData();
	const file = formData.get('file');
	if (!(file instanceof File) || file.size === 0) {
		throw error(400, 'A non-empty "file" field is required.');
	}
	if (file.size > MAX_ATTACHMENT_BYTES) {
		throw error(400, `File exceeds max size of ${MAX_ATTACHMENT_BYTES} bytes.`);
	}

	const path = `${ticket.id}/${crypto.randomUUID()}-${file.name}`;
	const { error: uploadError } = await supabaseAdmin.storage.from('ticket-attachments').upload(path, file);
	if (uploadError) {
		throw error(500, uploadError.message);
	}

	const { data: attachment, error: insertError } = await supabaseAdmin
		.from('ticket_attachments')
		.insert({
			ticket_id: ticket.id,
			uploaded_by: null,
			file_name: file.name,
			file_size_bytes: file.size,
			mime_type: file.type,
			storage_path: path
		})
		.select('id')
		.single();

	if (insertError || !attachment) {
		throw error(500, insertError?.message ?? 'Failed to record attachment.');
	}

	return json({ id: attachment.id }, { status: 201 });
};
