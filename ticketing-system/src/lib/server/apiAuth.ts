import crypto from 'node:crypto';
import { error } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/server/supabase';

export interface ApiTokenContext {
	tokenId: string;
	clientId: string;
	projectId: string;
	scopes: string[];
}

function hashToken(rawToken: string): string {
	return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Authenticates a machine-to-machine request against api_tokens.
 * Every /api/v1/* route should call this first and derive tenancy
 * (clientId/projectId) only from the returned context -- never from the
 * request body -- so a token can only ever write into its own project.
 */
export async function authenticateApiToken(request: Request): Promise<ApiTokenContext> {
	const authHeader = request.headers.get('authorization') ?? '';
	const match = authHeader.match(/^Bearer\s+(.+)$/i);
	if (!match) {
		throw error(401, 'Missing or malformed Authorization header. Expected: Bearer <token>');
	}

	const rawToken = match[1].trim();
	if (!rawToken) {
		throw error(401, 'Missing bearer token.');
	}

	const tokenHash = hashToken(rawToken);

	const { data: tokenRow, error: lookupError } = await supabaseAdmin
		.from('api_tokens')
		.select('id, client_id, project_id, scopes, is_active, revoked_at')
		.eq('token_hash', tokenHash)
		.maybeSingle();

	if (lookupError || !tokenRow) {
		throw error(401, 'Invalid API token.');
	}

	if (!tokenRow.is_active || tokenRow.revoked_at) {
		throw error(401, 'This API token has been revoked.');
	}

	// Fire-and-forget last-used bump; never block or fail the request on it.
	supabaseAdmin
		.from('api_tokens')
		.update({ last_used_at: new Date().toISOString() })
		.eq('id', tokenRow.id)
		.then(
			() => {},
			(err) => console.error('Failed to update api_tokens.last_used_at:', err)
		);

	return {
		tokenId: tokenRow.id,
		clientId: tokenRow.client_id,
		projectId: tokenRow.project_id,
		scopes: tokenRow.scopes ?? []
	};
}

/** Generates a new raw API token and its storage-ready hash/prefix. Raw value is shown to the admin exactly once. */
export function generateApiToken(clientCode: string): { rawToken: string; tokenHash: string; tokenPrefix: string } {
	const random = crypto.randomBytes(24).toString('hex');
	const rawToken = `tk_${clientCode.toLowerCase()}_${random}`;
	return {
		rawToken,
		tokenHash: hashToken(rawToken),
		tokenPrefix: rawToken.slice(0, 8)
	};
}
