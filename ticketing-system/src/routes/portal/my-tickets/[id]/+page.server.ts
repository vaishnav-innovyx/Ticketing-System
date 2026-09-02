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

	const [{ data: messages }, { data: attachments }, { data: watchers }, { data: dependencies }] = await Promise.all([
		supabase
			.from('ticket_messages')
			.select('id, content, created_at, author:profiles(full_name, role)')
			.eq('ticket_id', ticket.id)
			.order('created_at', { ascending: true }),
		supabase
			.from('ticket_attachments')
			.select('id, file_name, file_size_bytes, mime_type, message_id')
			.eq('ticket_id', ticket.id),
		supabase.from('ticket_watchers').select('id, email, full_name').eq('ticket_id', ticket.id),
		supabase
			.from('ticket_dependencies')
			.select('depends_on:tickets!ticket_dependencies_depends_on_ticket_id_fkey(token, title, status)')
			.eq('ticket_id', ticket.id)
	]);

	const blockers = (dependencies ?? [])
		.map((d) => (Array.isArray(d.depends_on) ? d.depends_on[0] : d.depends_on))
		.filter((dep) => dep && dep.status !== 'closed');

	return {
		ticket,
		messages: messages ?? [],
		attachments: attachments ?? [],
		watchers: watchers ?? [],
		blockers
	};
};

export const actions: Actions = {
	reply: async ({ request, params, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();
		if (!user) return fail(401, { error: 'Not signed in.' });

		const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
		if (profile?.role === 'client_viewer') {
			return fail(403, { error: 'Viewer accounts cannot post replies.' });
		}

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

	close: async ({ params, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();
		if (!user) return fail(401, { error: 'Not signed in.' });

		const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
		if (profile?.role === 'client_viewer') {
			return fail(403, { error: 'Viewer accounts cannot resolve tickets.' });
		}

		const { data: ticket } = await supabase
			.from('tickets')
			.select('id, status, requires_admin_approval, admin_approved_at, admin_rejected_at')
			.eq('token', params.id)
			.maybeSingle();
		if (!ticket) return fail(404, { error: 'Ticket not found.' });
		if (ticket.status === 'closed') return fail(400, { error: 'This ticket is already resolved.' });
		if (ticket.requires_admin_approval && !ticket.admin_approved_at) {
			return fail(400, { error: 'This ticket needs admin approval before it can be resolved.' });
		}

		const { data: dependencies } = await supabase
			.from('ticket_dependencies')
			.select('depends_on:tickets!ticket_dependencies_depends_on_ticket_id_fkey(token, status)')
			.eq('ticket_id', ticket.id);
		const openBlockers = (dependencies ?? [])
			.map((d) => (Array.isArray(d.depends_on) ? d.depends_on[0] : d.depends_on))
			.filter((dep) => dep && dep.status !== 'closed');
		if (openBlockers.length > 0) {
			return fail(400, { error: `Ticket is blocked by ${openBlockers.map((dep) => dep!.token).join(', ')}` });
		}

		const { error: updateError } = await supabase
			.from('tickets')
			.update({ status: 'closed', closed_at: new Date().toISOString() })
			.eq('id', ticket.id);

		if (updateError) return fail(500, { error: updateError.message });
		return { success: true };
	},

	reopen: async ({ params, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();
		if (!user) return fail(401, { error: 'Not signed in.' });

		const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
		if (profile?.role === 'client_viewer') {
			return fail(403, { error: 'Viewer accounts cannot reopen tickets.' });
		}

		const { data: ticket } = await supabase.from('tickets').select('id, status').eq('token', params.id).maybeSingle();
		if (!ticket) return fail(404, { error: 'Ticket not found.' });
		if (ticket.status !== 'closed') {
			return fail(400, { error: 'Only a resolved ticket can be reopened.' });
		}

		const { error: updateError } = await supabase
			.from('tickets')
			.update({ status: 'development', closed_at: null })
			.eq('id', ticket.id);

		if (updateError) return fail(500, { error: updateError.message });
		return { success: true };
	},

	addWatcher: async ({ request, params, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();
		if (!user) return fail(401, { error: 'Not signed in.' });

		const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
		if (profile?.role === 'client_viewer') {
			return fail(403, { error: 'Viewer accounts cannot manage watchers.' });
		}

		const formData = await request.formData();
		const email = String(formData.get('email') || '').trim().toLowerCase();
		if (!email) return fail(400, { error: 'Email is required.' });

		const { data: ticket } = await supabase.from('tickets').select('id').eq('token', params.id).maybeSingle();
		if (!ticket) return fail(404, { error: 'Ticket not found.' });

		const { error: insertError } = await supabase.from('ticket_watchers').insert({ ticket_id: ticket.id, email });
		if (insertError) return fail(400, { error: insertError.message });
		return { success: true };
	},

	removeWatcher: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();
		if (!user) return fail(401, { error: 'Not signed in.' });

		const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
		if (profile?.role === 'client_viewer') {
			return fail(403, { error: 'Viewer accounts cannot manage watchers.' });
		}

		const formData = await request.formData();
		const watcherId = String(formData.get('watcher_id') || '').trim();
		if (!watcherId) return fail(400, { error: 'Watcher id is required.' });

		const { error: deleteError } = await supabase.from('ticket_watchers').delete().eq('id', watcherId);
		if (deleteError) return fail(500, { error: deleteError.message });
		return { success: true };
	},

	approveEstimate: async ({ request, params, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();
		if (!user) return fail(401, { error: 'Not signed in.' });

		const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
		if (profile?.role !== 'client_admin' && profile?.role !== 'project_admin' && profile?.role !== 'client_raiser') {
			return fail(403, { error: 'Only a client admin, project admin, or raiser can approve an estimate.' });
		}

		const { data: ticket } = await supabase.from('tickets').select('id, status').eq('token', params.id).maybeSingle();
		if (!ticket) return fail(404, { error: 'Ticket not found.' });
		if (ticket.status !== 'client_approval') {
			return fail(400, { error: 'This ticket is not currently awaiting approval.' });
		}

		const formData = await request.formData();
		const notes = String(formData.get('notes') || '').trim() || null;

		// Approving stamps client_approved_at but deliberately does NOT advance status —
		// the ticket stays in client_approval until an internal staffer explicitly starts
		// development, so "In Development" always means someone on our side confirmed it.
		const { error: updateError } = await supabase
			.from('tickets')
			.update({
				client_approved_at: new Date().toISOString(),
				client_approval_notes: notes
			})
			.eq('id', ticket.id);

		if (updateError) return fail(500, { error: updateError.message });
		return { success: true };
	},

	requestEstimateChanges: async ({ request, params, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();
		if (!user) return fail(401, { error: 'Not signed in.' });

		const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
		if (profile?.role !== 'client_admin' && profile?.role !== 'project_admin' && profile?.role !== 'client_raiser') {
			return fail(403, { error: 'Only a client admin, project admin, or raiser can request estimate changes.' });
		}

		const formData = await request.formData();
		const notes = String(formData.get('notes') || '').trim();
		if (!notes) return fail(400, { error: 'Let us know what needs to change.' });

		const { data: ticket } = await supabase.from('tickets').select('id, status').eq('token', params.id).maybeSingle();
		if (!ticket) return fail(404, { error: 'Ticket not found.' });
		if (ticket.status !== 'client_approval') {
			return fail(400, { error: 'This ticket is not currently awaiting approval.' });
		}

		const { error: updateError } = await supabase
			.from('tickets')
			.update({ status: 'requirement_estimation', client_approval_notes: notes })
			.eq('id', ticket.id);

		if (updateError) return fail(500, { error: updateError.message });
		return { success: true };
	},

	attachFile: async ({ request, params, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();
		if (!user) return fail(401, { error: 'Not signed in.' });

		const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
		if (profile?.role === 'client_viewer') {
			return fail(403, { error: 'Viewer accounts cannot attach files.' });
		}

		const formData = await request.formData();
		const file = formData.get('file');
		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { error: 'Choose a file to attach.' });
		}

		const { data: ticket } = await supabase.from('tickets').select('id').eq('token', params.id).maybeSingle();
		if (!ticket) return fail(404, { error: 'Ticket not found.' });

		const path = `${ticket.id}/${crypto.randomUUID()}-${file.name}`;
		const { error: uploadError } = await supabase.storage.from('ticket-attachments').upload(path, file);
		if (uploadError) return fail(500, { error: uploadError.message });

		const { error: insertError } = await supabase.from('ticket_attachments').insert({
			ticket_id: ticket.id,
			uploaded_by: user.id,
			file_name: file.name,
			file_size_bytes: file.size,
			mime_type: file.type,
			storage_path: path
		});
		if (insertError) return fail(500, { error: insertError.message });

		return { success: true };
	},

	approveRaisedTicket: async ({ params, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();
		if (!user) return fail(401, { error: 'Not signed in.' });

		const { data: ticket } = await supabase
			.from('tickets')
			.select('id, project_id, requires_admin_approval, admin_approved_at')
			.eq('token', params.id)
			.maybeSingle();
		if (!ticket) return fail(404, { error: 'Ticket not found.' });
		if (!ticket.requires_admin_approval || ticket.admin_approved_at) {
			return fail(400, { error: 'This ticket is not awaiting approval.' });
		}

		const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
		if (profile?.role !== 'project_admin' && profile?.role !== 'super_admin') {
			return fail(403, { error: 'Only an assigned project admin can approve a raised ticket.' });
		}

		if (profile.role === 'project_admin') {
			const { data: membership } = await supabase
				.from('project_members')
				.select('id')
				.eq('project_id', ticket.project_id)
				.eq('user_id', user.id)
				.maybeSingle();
			if (!membership) {
				return fail(403, { error: 'You are not assigned as a project admin for this project.' });
			}
		}

		const { error: updateError } = await supabase
			.from('tickets')
			.update({ admin_approved_at: new Date().toISOString(), admin_approved_by: user.id })
			.eq('id', ticket.id);

		if (updateError) return fail(500, { error: updateError.message });
		return { success: true };
	},

	rejectRaisedTicket: async ({ request, params, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();
		if (!user) return fail(401, { error: 'Not signed in.' });

		const formData = await request.formData();
		const reason = String(formData.get('reason') || '').trim();
		if (!reason) return fail(400, { error: 'Let the raiser know why this is being rejected.' });

		const { data: ticket } = await supabase
			.from('tickets')
			.select('id, project_id, requires_admin_approval, admin_approved_at')
			.eq('token', params.id)
			.maybeSingle();
		if (!ticket) return fail(404, { error: 'Ticket not found.' });
		if (!ticket.requires_admin_approval || ticket.admin_approved_at) {
			return fail(400, { error: 'This ticket is not awaiting approval.' });
		}

		const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
		if (profile?.role !== 'project_admin' && profile?.role !== 'super_admin') {
			return fail(403, { error: 'Only an assigned project admin can reject a raised ticket.' });
		}

		if (profile.role === 'project_admin') {
			const { data: membership } = await supabase
				.from('project_members')
				.select('id')
				.eq('project_id', ticket.project_id)
				.eq('user_id', user.id)
				.maybeSingle();
			if (!membership) {
				return fail(403, { error: 'You are not assigned as a project admin for this project.' });
			}
		}

		const { error: updateError } = await supabase
			.from('tickets')
			.update({
				status: 'closed',
				closed_at: new Date().toISOString(),
				admin_rejected_at: new Date().toISOString(),
				admin_rejection_reason: reason
			})
			.eq('id', ticket.id);

		if (updateError) return fail(500, { error: updateError.message });
		return { success: true };
	}
};
