import { fail } from '@sveltejs/kit';
import { PRIORITY_LABEL, type TicketDbPriority } from '$lib/portal/ticketDisplay';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const { data: memberships } = await supabase.from('project_members').select('projects(id, name)');

	const projects = (memberships ?? [])
		.map((m) => m.projects)
		.filter((p): p is { id: string; name: string } => !!p);

	return { projects };
};

export const actions: Actions = {
	default: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();
		if (!user) return fail(401, { error: 'Not signed in.' });

		const formData = await request.formData();
		const title = String(formData.get('title') || '').trim();
		const description = String(formData.get('description') || '').trim();
		const category = String(formData.get('category') || 'bug');
		const priority = String(formData.get('priority') || 'medium');
		const projectId = String(formData.get('project_id') || '');
		const ccEmails = formData.getAll('cc').map(String).filter(Boolean);
		const files = formData.getAll('attachments').filter((f): f is File => f instanceof File && f.size > 0);

		if (!title || !description || !projectId) {
			return fail(400, { error: 'Title, description, and application are required.' });
		}

		const { data: profile } = await supabase.from('profiles').select('client_id').eq('id', user.id).single();
		if (!profile?.client_id) return fail(400, { error: 'No client associated with this account.' });

		const { data: ticket, error: insertError } = await supabase
			.from('tickets')
			.insert({
				client_id: profile.client_id,
				project_id: projectId,
				category: category as never,
				priority: priority as never,
				title,
				description,
				raised_by: user.id
			})
			.select('id, token, title, priority, projects(name)')
			.single();

		if (insertError || !ticket) return fail(500, { error: insertError?.message ?? 'Failed to create ticket.' });

		if (ccEmails.length > 0) {
			await supabase.from('ticket_watchers').insert(ccEmails.map((email) => ({ ticket_id: ticket.id, email })));
		}

		for (const file of files) {
			const path = `${ticket.id}/${crypto.randomUUID()}-${file.name}`;
			const { error: uploadError } = await supabase.storage.from('ticket-attachments').upload(path, file);
			if (!uploadError) {
				await supabase.from('ticket_attachments').insert({
					ticket_id: ticket.id,
					uploaded_by: user.id,
					file_name: file.name,
					file_size_bytes: file.size,
					mime_type: file.type,
					storage_path: path
				});
			}
		}

		return {
			success: true,
			ticket: {
				id: ticket.token ?? ticket.id,
				title: ticket.title,
				priority: PRIORITY_LABEL[ticket.priority as TicketDbPriority],
				application: ticket.projects?.name ?? '',
				ccRecipients: ccEmails
			}
		};
	}
};
