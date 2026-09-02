import nodemailer from 'nodemailer';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '$lib/server/supabase';
import { env as privateEnv } from '$env/dynamic/private';
import {
	renderStageEmail,
	type StageEventKey,
	type EmailTicketInfo
} from './emailTemplates';
import type { Database } from '$lib/database.types';

export interface EmailRoutingResult {
	to: string;
	cc: string[];
}

const DEFAULT_FROM = privateEnv.SMTP_FROM || '"Nexus Ticketing System" <alerts@innovyxtechlabs.com>';
const DOMAIN = 'innovyxtechlabs.com';

// Initialize Nodemailer SMTP Transport
const smtpPort = Number(privateEnv.SMTP_PORT || 465);
const isSecure = privateEnv.SMTP_SECURE ? privateEnv.SMTP_SECURE === 'true' : smtpPort === 465;

const transporter = nodemailer.createTransport({
	host: privateEnv.SMTP_HOST || 'smtp.gmail.com',
	port: smtpPort,
	secure: isSecure,
	auth: {
		user: privateEnv.SMTP_USER || 'alerts@innovyxtechlabs.com',
		pass: privateEnv.SMTP_PASS || ''
	}
});

/**
 * Resolves the primary TO recipient (Raiser) and CC recipients:
 * - CC includes: All Project Admins, Client Admins, Default POC, Ticket POC, Specialist, Delivery Manager
 * - Watchers are CC'd ONLY IF ticket.priority === 'critical' (P0)
 */
export async function resolveTicketEmailRouting(
	supabase: SupabaseClient<Database>,
	ticketId: string
): Promise<{ routing: EmailRoutingResult; ticket: Record<string, any> } | null> {
	const { data: ticket, error } = await supabaseAdmin
		.from('tickets')
		.select(
			`*,
      client:clients(id, name),
      project:projects(id, name, default_poc_id),
      raised_by_profile:profiles!tickets_raised_by_fkey(id, email, full_name),
      poc_profile:profiles!tickets_poc_id_fkey(id, email, full_name),
      specialist_profile:profiles!tickets_specialist_id_fkey(id, email, full_name),
      delivery_lead_profile:profiles!tickets_delivery_lead_id_fkey(id, email, full_name)`
		)
		.eq('id', ticketId)
		.maybeSingle();

	if (error || !ticket) {
		console.error('[Email Dispatch] Failed to load ticket for email routing:', error);
		return null;
	}

	const raiserEmail = (ticket.raised_by_profile as any)?.email?.toLowerCase() || '';
	const ccSet = new Set<string>();

	// 1. Assigned Project Admins (project_members with role 'project_admin')
	const { data: projectAdminMembers } = await supabaseAdmin
		.from('project_members')
		.select('user_id, profiles!project_members_user_id_fkey(email, role)')
		.eq('project_id', ticket.project_id);

	if (projectAdminMembers) {
		for (const pm of projectAdminMembers) {
			const prof = Array.isArray(pm.profiles) ? pm.profiles[0] : pm.profiles;
			if (prof && prof.role === 'project_admin' && prof.email) {
				ccSet.add(prof.email.toLowerCase());
			}
		}
	}

	// 2. Client Admins for ticket.client_id
	const { data: clientAdmins } = await supabaseAdmin
		.from('profiles')
		.select('email')
		.eq('client_id', ticket.client_id)
		.eq('role', 'client_admin');

	if (clientAdmins) {
		for (const ca of clientAdmins) {
			if (ca.email) ccSet.add(ca.email.toLowerCase());
		}
	}

	// 3. Project Default POC
	if ((ticket.project as any)?.default_poc_id) {
		const { data: defPoc } = await supabaseAdmin
			.from('profiles')
			.select('email')
			.eq('id', (ticket.project as any).default_poc_id)
			.maybeSingle();
		if (defPoc?.email) ccSet.add(defPoc.email.toLowerCase());
	}

	// 4. Ticket POC
	if ((ticket.poc_profile as any)?.email) {
		ccSet.add((ticket.poc_profile as any).email.toLowerCase());
	}

	// 5. Specialist / Developer
	if ((ticket.specialist_profile as any)?.email) {
		ccSet.add((ticket.specialist_profile as any).email.toLowerCase());
	}

	// 6. Delivery Manager / Lead
	if ((ticket.delivery_lead_profile as any)?.email) {
		ccSet.add((ticket.delivery_lead_profile as any).email.toLowerCase());
	}

	// 7. Watchers: Included ONLY IF ticket.priority === 'critical' (P0)
	if (ticket.priority === 'critical') {
		const { data: watchers } = await supabaseAdmin
			.from('ticket_watchers')
			.select('email')
			.eq('ticket_id', ticket.id);

		if (watchers) {
			for (const w of watchers) {
				if (w.email) ccSet.add(w.email.toLowerCase());
			}
		}
	}

	// Deduplicate: Remove the TO email from CC list if present
	if (raiserEmail) {
		ccSet.delete(raiserEmail);
	}

	return {
		routing: {
			to: raiserEmail,
			cc: Array.from(ccSet).filter(Boolean)
		},
		ticket
	};
}

/**
 * Builds RFC 5322 single-thread loop headers (Message-ID, In-Reply-To, References)
 */
export function buildThreadHeaders(ticketId: string, eventId: string, isRoot: boolean) {
	const rootMsgId = `<ticket-${ticketId}-root@${DOMAIN}>`;
	const eventMsgId = isRoot ? rootMsgId : `<ticket-${ticketId}-event-${eventId}@${DOMAIN}>`;

	return {
		messageId: eventMsgId,
		rootMessageId: rootMsgId,
		inReplyTo: isRoot ? null : rootMsgId,
		references: isRoot ? null : rootMsgId
	};
}

export interface DispatchParams {
	ticketId: string;
	event: StageEventKey;
	actorId?: string | null;
	notes?: string | null;
}

/**
 * High-level server notification dispatcher.
 * Asynchronously renders HTML template, inserts DB audit records into email_notifications,
 * and sends email via Nodemailer SMTP with RFC 5322 thread headers.
 */
export async function dispatchStageEmailNotification(params: DispatchParams): Promise<void> {
	try {
		const resolved = await resolveTicketEmailRouting(supabaseAdmin, params.ticketId);
		if (!resolved) return;

		const { routing, ticket } = resolved;
		if (!routing.to && routing.cc.length === 0) {
			console.log(`[Email Dispatch] No recipients found for ticket ${ticket.token}, skipping SMTP.`);
			return;
		}

		let actorName: string | null = null;
		if (params.actorId) {
			const { data: actorProfile } = await supabaseAdmin
				.from('profiles')
				.select('full_name, email')
				.eq('id', params.actorId)
				.maybeSingle();
			actorName = actorProfile?.full_name || actorProfile?.email || null;
		}

		const emailTicketInfo: EmailTicketInfo = {
			id: ticket.id,
			token: ticket.token,
			title: ticket.title,
			description: ticket.description,
			category: ticket.category,
			priority: ticket.priority,
			status: ticket.status,
			targetDate: ticket.target_date,
			clientName: (ticket.client as any)?.name,
			projectName: (ticket.project as any)?.name,
			raiserName: (ticket.raised_by_profile as any)?.full_name || (ticket.raised_by_profile as any)?.email,
			specialistName: (ticket.specialist_profile as any)?.full_name || (ticket.specialist_profile as any)?.email,
			estimatedHours: ticket.estimated_hours
		};

		const isRoot = params.event === 'ticket_raised';
		const eventId = crypto.randomUUID();
		const threadHeaders = buildThreadHeaders(ticket.id, eventId, isRoot);

		const { subject, html } = renderStageEmail({
			event: params.event,
			ticket: emailTicketInfo,
			actorName,
			notes: params.notes
		});

		// 1. Insert DB audit records into email_notifications for all recipients
		const allRecipients = Array.from(new Set([routing.to, ...routing.cc])).filter(Boolean);

		const notificationInserts = allRecipients.map((recipient) => ({
			ticket_id: ticket.id,
			event: (params.event === 'reopened' || params.event === 'pending_admin_approval' || params.event === 'admin_rejected'
				? 'ticket_raised'
				: params.event) as any,
			recipient_email: recipient,
			subject,
			body: `Stage update: ${params.event}. Ticket ${ticket.token} (${ticket.title})`,
			root_message_id: threadHeaders.rootMessageId,
			in_reply_to: threadHeaders.inReplyTo
		}));

		if (notificationInserts.length > 0) {
			await supabaseAdmin.from('email_notifications').insert(notificationInserts);
		}

		// 2. Deliver via Nodemailer SMTP if credentials exist (or log in dev mode)
		if (!privateEnv.SMTP_PASS || privateEnv.SMTP_PASS.trim() === '') {
			console.log(`[Email Dispatch - Dev Mode / No SMTP Pass] Dispatched ${params.event} for ${ticket.token}:`);
			console.log(`  TO: ${routing.to}`);
			console.log(`  CC: ${routing.cc.join(', ')}`);
			console.log(`  Subject: ${subject}`);
			console.log(`  Thread Root: ${threadHeaders.rootMessageId}`);
			return;
		}

		const mailOptions: nodemailer.SendMailOptions = {
			from: DEFAULT_FROM,
			to: routing.to || routing.cc[0],
			cc: routing.to ? routing.cc : routing.cc.slice(1),
			subject,
			html,
			headers: {
				'Message-ID': threadHeaders.messageId,
				...(threadHeaders.inReplyTo ? { 'In-Reply-To': threadHeaders.inReplyTo } : {}),
				...(threadHeaders.references ? { References: threadHeaders.references } : {})
			}
		};

		const sendResult = await transporter.sendMail(mailOptions);
		console.log(`[Email Dispatch Success] Message ${sendResult.messageId} sent for ${ticket.token} (${params.event})`);
	} catch (err) {
		console.error('[Email Dispatch Error] Failed to dispatch stage email notification:', err);
	}
}
