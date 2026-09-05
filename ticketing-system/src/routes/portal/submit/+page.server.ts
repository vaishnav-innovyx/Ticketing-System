import { fail } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/server/supabase';
import { createTicket } from '$lib/server/tickets';
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
		const dependencyKinds = formData.getAll('dependency_kind').map(String);
		const dependencyLabels = formData.getAll('dependency_label').map(String);
		const dependencyDetails = formData.getAll('dependency_detail').map(String);
		const dependencyRows = dependencyKinds
			.map((kind, i) => ({
				kind: kind === 'module' ? 'module' : 'person',
				label: (dependencyLabels[i] ?? '').trim(),
				detail: (dependencyDetails[i] ?? '').trim()
			}))
			.filter((d) => d.label);

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

		const requiresApproval = profile.role === 'client_raiser';

		let ticket;
		try {
			ticket = await createTicket({
				clientId,
				projectId,
				title,
				description,
				category,
				priority,
				raisedBy: user.id,
				requiresAdminApproval: requiresApproval,
				source: 'portal'
			});
		} catch (err) {
			return fail(500, { error: err instanceof Error ? err.message : 'Failed to create ticket.' });
		}

		if (ccEmails.length > 0) {
			await supabaseAdmin
				.from('ticket_watchers')
				.insert(ccEmails.map((email) => ({ ticket_id: ticket.id, email })));
		}

		if (dependencyRows.length > 0) {
			await supabaseAdmin.from('ticket_dependency_notes').insert(
				dependencyRows.map((d) => ({
					ticket_id: ticket.id,
					kind: d.kind as never,
					label: d.label,
					detail: d.detail || null,
					created_by: user.id
				}))
			);
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

		return {
			success: true,
			ticket: {
				id: ticket.token ?? ticket.id,
				title: ticket.title,
				priority: (ticket.priority ? PRIORITY_LABEL[ticket.priority as TicketDbPriority] : null) ?? ticket.priority,
				application: ticket.applicationName,
				ccRecipients: ccEmails,
				requiresApproval
			}
		};
	}
};
