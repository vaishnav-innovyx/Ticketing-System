import { fail } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/server/supabase';
import { dispatchStageEmailNotification } from '$lib/server/email';
import { PRIORITY_LABEL, type TicketDbPriority } from '$lib/portal/ticketDisplay';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { user } = await safeGetSession();
	if (!user) return { projects: [] };

	const { data: profile } = await supabase
		.from('profiles')
		.select('role, client_id')
		.eq('id', user.id)
		.single();

	// If the user belongs to a client, fetch that client's projects
	if (profile?.client_id) {
		const { data: projects } = await supabaseAdmin
			.from('projects')
			.select('id, name, code, client_id')
			.eq('client_id', profile.client_id)
			.order('name');

		return { projects: projects ?? [] };
	}

	// For internal staff / super admin testing the portal, fetch all projects
	const { data: projects } = await supabaseAdmin
		.from('projects')
		.select('id, name, code, client_id')
		.order('name');

	return { projects: projects ?? [] };
};

const TICKET_RAISER_ROLES = ['super_admin', 'poc', 'specialist', 'delivery_lead', 'client_admin', 'project_admin', 'client_raiser'];

export const actions: Actions = {
	default: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();
		if (!user) return fail(401, { error: 'Not signed in.' });

		const { data: profile } = await supabase.from('profiles').select('id, client_id, role').eq('id', user.id).single();
		if (!profile || !TICKET_RAISER_ROLES.includes(profile.role)) {
			return fail(403, { error: 'Your account does not have permission to raise tickets.' });
		}

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

		// Determine client_id: use user's client_id, or look up from the selected project (for internal staff/admin)
		let clientId = profile?.client_id;
		if (!clientId) {
			const { data: proj } = await supabaseAdmin
				.from('projects')
				.select('client_id')
				.eq('id', projectId)
				.single();
			clientId = proj?.client_id ?? null;
		}

		if (!clientId) {
			return fail(400, { error: 'No client associated with this project or account.' });
		}

		const { data: projectRow } = await supabaseAdmin.from('projects').select('default_poc_id').eq('id', projectId).single();
		const requiresApproval = profile.role === 'client_raiser';

		const { data: ticket, error: insertError } = await supabaseAdmin
			.from('tickets')
			.insert({
				client_id: clientId,
				project_id: projectId,
				category: category as never,
				priority: priority as never,
				title,
				description,
				raised_by: user.id,
				poc_id: projectRow?.default_poc_id ?? undefined,
				requires_admin_approval: requiresApproval
			})
			.select('id, token, title, priority, projects(name)')
			.single();

		if (insertError || !ticket) {
			return fail(500, { error: insertError?.message ?? 'Failed to create ticket.' });
		}

		if (ccEmails.length > 0) {
			await supabaseAdmin
				.from('ticket_watchers')
				.insert(ccEmails.map((email) => ({ ticket_id: ticket.id, email })));
		}

		for (const file of files) {
			const path = `${ticket.id}/${crypto.randomUUID()}-${file.name}`;
			const { error: uploadError } = await supabase.storage
				.from('ticket-attachments')
				.upload(path, file);
			if (!uploadError) {
				await supabaseAdmin.from('ticket_attachments').insert({
					ticket_id: ticket.id,
					uploaded_by: user.id,
					file_name: file.name,
					file_size_bytes: file.size,
					mime_type: file.type,
					storage_path: path
				});
			}
		}

		// Dispatch stage notification email
		dispatchStageEmailNotification({
			ticketId: ticket.id,
			event: requiresApproval ? 'pending_admin_approval' : 'ticket_raised',
			actorId: user.id
		}).catch((err) => console.error('Failed to dispatch portal ticket creation email:', err));

		return {
			success: true,
			ticket: {
				id: ticket.token ?? ticket.id,
				title: ticket.title,
				priority: (ticket.priority ? PRIORITY_LABEL[ticket.priority as TicketDbPriority] : null) ?? ticket.priority,
				application: (ticket.projects as { name?: string } | null)?.name ?? '',
				ccRecipients: ccEmails,
				requiresApproval
			}
		};
	}
};
