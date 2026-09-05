import { createHmac, timingSafeEqual } from 'node:crypto';
import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { authenticateApiToken } from '$lib/server/apiAuth';
import { createTicket } from '$lib/server/tickets';
import { supabaseAdmin } from '$lib/server/supabase';
import type { RequestHandler } from './$types';

const TICKET_CATEGORIES = ['bug', 'enhancement', 'kt', 'training'];
const TICKET_PRIORITIES = ['low', 'medium', 'high', 'critical'];
const MAX_DIAGNOSTICS_BYTES = 200_000;

interface UserIdentityPayload {
	reporter_name?: string;
	reporter_email?: string;
	reporter_role?: string;
	timestamp?: number;
	nonce?: string;
}

interface CreateTicketBody {
	title?: string;
	description?: string;
	category?: string;
	priority?: string;
	environment?: string;
	reporter_email?: string;
	reporter_name?: string;
	reporter_role?: string;
	user_identity?: UserIdentityPayload;
	user_signature?: string;
	external_ref?: string;
	diagnostics?: unknown;
	depends_on_tokens?: string[];
}

function verifyUserSignature(identity: UserIdentityPayload, signature: string, secret: string): boolean {
	const email = (identity.reporter_email || '').trim().toLowerCase();
	const role = (identity.reporter_role || 'client_raiser').trim();
	const timestamp = identity.timestamp || 0;
	const nonce = (identity.nonce || '').trim();

	// Check 5-minute replay window (300 seconds)
	const nowSeconds = Math.floor(Date.now() / 1000);
	if (Math.abs(nowSeconds - timestamp) > 300) {
		return false;
	}

	const canonicalStr = `${email}:${role}:${timestamp}:${nonce}`;
	const expectedHmac = createHmac('sha256', secret).update(canonicalStr).digest('hex');

	if (expectedHmac.length !== signature.length) {
		return false;
	}

	try {
		return timingSafeEqual(Buffer.from(expectedHmac, 'hex'), Buffer.from(signature, 'hex'));
	} catch {
		return false;
	}
}

function assertValidTicketPayload(body: CreateTicketBody): void {
	if (!body.description || typeof body.description !== 'string' || !body.description.trim()) {
		throw error(400, 'description is required.');
	}
	if (body.category && !TICKET_CATEGORIES.includes(body.category)) {
		throw error(400, `category must be one of: ${TICKET_CATEGORIES.join(', ')}`);
	}
	if (body.priority && !TICKET_PRIORITIES.includes(body.priority)) {
		throw error(400, `priority must be one of: ${TICKET_PRIORITIES.join(', ')}`);
	}
	if (body.diagnostics !== undefined) {
		const size = JSON.stringify(body.diagnostics).length;
		if (size > MAX_DIAGNOSTICS_BYTES) {
			throw error(400, `diagnostics payload too large (${size} bytes, max ${MAX_DIAGNOSTICS_BYTES}).`);
		}
	}
}

export const POST: RequestHandler = async ({ request }) => {
	const auth = await authenticateApiToken(request);

	let body: CreateTicketBody;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Request body must be valid JSON.');
	}

	assertValidTicketPayload(body);

	// Shared secret resolution for HMAC verification
	const sharedSecret = env.TICKETING_SHARED_SECRET || process.env.TICKETING_SHARED_SECRET || '';
	const identity = body.user_identity;
	const signature = body.user_signature;

	if (sharedSecret && identity && signature) {
		const isValidSig = verifyUserSignature(identity, signature, sharedSecret);
		if (!isValidSig) {
			throw error(401, 'Invalid or expired user signature.');
		}
	}

	const reporterEmail = (identity?.reporter_email || body.reporter_email || '').trim().toLowerCase();
	const reporterName = (identity?.reporter_name || body.reporter_name || '').trim();

	if (!reporterEmail) {
		throw error(400, 'reporter_email is required to verify user registration in the Ticketing System.');
	}

	// Lookup existing registered profile in the Ticketing System
	const { data: existingProfile } = await supabaseAdmin
		.from('profiles')
		.select('id, role, client_id')
		.eq('email', reporterEmail)
		.maybeSingle();

	if (!existingProfile) {
		throw error(
			403,
			`User "${reporterEmail}" is not registered in the Ticketing System. Only registered users are authorized to raise tickets.`
		);
	}

	// Verify organization alignment (user must belong to the authorized client or be super_admin/internal staff)
	const isInternalOrAdmin = ['super_admin', 'poc', 'specialist', 'delivery_lead'].includes(existingProfile.role);
	if (!isInternalOrAdmin && existingProfile.client_id && existingProfile.client_id !== auth.clientId) {
		throw error(403, `User "${reporterEmail}" is not authorized for this client organization.`);
	}

	const raisedByUserId = existingProfile.id;
	const reporterRole = existingProfile.role;

	// Evaluate Admin Approval Gating:
	// If the user's role is client_raiser, admin approval is required before technical triage.
	const requiresAdminApproval = reporterRole === 'client_raiser';

	const title = (body.title ?? body.description!.slice(0, 80)).trim();
	const reporterParts = [reporterName, reporterEmail && `<${reporterEmail}>`].filter(Boolean);
	const reporterLine = reporterParts.length ? `Reported by: ${reporterParts.join(' ')}\n\n` : '';

	let ticket;
	try {
		ticket = await createTicket({
			clientId: auth.clientId,
			projectId: auth.projectId,
			title,
			description: reporterLine + body.description!.trim(),
			category: body.category,
			priority: body.priority,
			environment: body.environment,
			raisedBy: raisedByUserId,
			requiresAdminApproval,
			source: 'api',
			externalRef: body.external_ref ?? null,
			diagnostics: (body.diagnostics as never) ?? null
		});
	} catch (err) {
		throw error(500, err instanceof Error ? err.message : 'Failed to create ticket.');
	}

	// Link dependencies if depends_on_tokens provided
	if (body.depends_on_tokens && Array.isArray(body.depends_on_tokens) && body.depends_on_tokens.length > 0) {
		const { data: blockerTickets } = await supabaseAdmin
			.from('tickets')
			.select('id, token')
			.eq('client_id', auth.clientId)
			.in('token', body.depends_on_tokens);

		if (blockerTickets && blockerTickets.length > 0) {
			const dependencyInserts = blockerTickets
				.filter((b) => b.id !== ticket.id)
				.map((b) => ({
					ticket_id: ticket.id,
					depends_on_ticket_id: b.id,
					created_by: raisedByUserId
				}));
			if (dependencyInserts.length > 0) {
				await supabaseAdmin.from('ticket_dependencies').insert(dependencyInserts as never);
			}
		}
	}

	return json(
		{
			id: ticket.id,
			token: ticket.token,
			title: ticket.title,
			priority: ticket.priority,
			requires_admin_approval: requiresAdminApproval
		},
		{ status: 201 }
	);
};
