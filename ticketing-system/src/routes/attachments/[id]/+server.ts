import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals: { supabase, safeGetSession } }) => {
	const { user } = await safeGetSession();
	if (!user) throw error(401, 'Not signed in.');

	const { data: attachment } = await supabase
		.from('ticket_attachments')
		.select('storage_path, file_name')
		.eq('id', params.id)
		.maybeSingle();

	if (!attachment) throw error(404, 'Attachment not found.');

	const { data: signed, error: signError } = await supabase.storage
		.from('ticket-attachments')
		.createSignedUrl(attachment.storage_path, 60);

	if (signError || !signed) throw error(500, signError?.message ?? 'Could not generate download link.');

	throw redirect(303, signed.signedUrl);
};
