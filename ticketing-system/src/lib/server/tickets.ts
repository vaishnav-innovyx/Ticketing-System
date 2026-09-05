import { supabaseAdmin } from '$lib/server/supabase';
import { dispatchStageEmailNotification } from '$lib/server/email';
import type { Json } from '$lib/database.types';

export interface CreateTicketInput {
	clientId: string;
	projectId: string;
	title: string;
	description: string;
	category?: string;
	priority?: string;
	environment?: string;
	raisedBy?: string | null;
	requiresAdminApproval?: boolean;
	source: 'portal' | 'api';
	externalRef?: string | null;
	diagnostics?: Json | null;
}

export interface CreatedTicket {
	id: string;
	token: string | null;
	title: string;
	priority: string;
	applicationName: string;
}

/**
 * Single source of truth for inserting a ticket, shared by the authenticated
 * portal form action (src/routes/portal/submit/+page.server.ts) and the
 * token-authenticated public API (src/routes/api/v1/tickets/+server.ts), so
 * the two entry points can never drift on default-POC resolution, approval
 * gating, or notification dispatch.
 */
export async function createTicket(input: CreateTicketInput): Promise<CreatedTicket> {
	const { data: projectRow } = await supabaseAdmin
		.from('projects')
		.select('default_poc_id')
		.eq('id', input.projectId)
		.single();

	const requiresApproval = input.requiresAdminApproval ?? false;

	const { data: ticket, error: insertError } = await supabaseAdmin
		.from('tickets')
		.insert({
			client_id: input.clientId,
			project_id: input.projectId,
			category: (input.category ?? 'bug') as never,
			priority: (input.priority ?? 'medium') as never,
			environment: input.environment ?? undefined,
			title: input.title,
			description: input.description,
			raised_by: input.raisedBy ?? null,
			poc_id: projectRow?.default_poc_id ?? undefined,
			requires_admin_approval: requiresApproval,
			source: input.source,
			external_ref: input.externalRef ?? null,
			diagnostics: input.diagnostics ?? null
		})
		.select('id, token, title, priority, projects(name)')
		.single();

	if (insertError || !ticket) {
		throw new Error(insertError?.message ?? 'Failed to create ticket.');
	}

	dispatchStageEmailNotification({
		ticketId: ticket.id,
		event: requiresApproval ? 'pending_admin_approval' : 'ticket_raised',
		actorId: input.raisedBy ?? null
	}).catch((err) => console.error('Failed to dispatch ticket creation email:', err));

	return {
		id: ticket.id,
		token: ticket.token,
		title: ticket.title,
		priority: ticket.priority,
		applicationName: (ticket.projects as { name?: string } | null)?.name ?? ''
	};
}
