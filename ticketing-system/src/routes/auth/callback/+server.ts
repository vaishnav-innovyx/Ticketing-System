import { redirect } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/server/supabase';
import { logAuditEvent } from '$lib/server/audit';
import type { RequestHandler } from './$types';

const INTERNAL_ROLES = ['super_admin', 'poc', 'specialist', 'delivery_lead'];

export const GET: RequestHandler = async ({ url, locals: { supabase }, getClientAddress, request }) => {
	const code = url.searchParams.get('code');
	const next = url.searchParams.get('next') || url.searchParams.get('redirectTo') || '/';
	const ipAddress = getClientAddress ? getClientAddress() : null;
	const userAgent = request.headers.get('user-agent');

	if (!code) {
		throw redirect(303, '/login?error=missing_auth_code');
	}

	// 1. Exchange OAuth code for session
	const { data: authData, error: authError } = await supabase.auth.exchangeCodeForSession(code);

	if (authError || !authData.session || !authData.user) {
		console.error('[Auth Callback] Code exchange failed:', authError?.message);
		throw redirect(303, '/login?error=auth_failed');
	}

	const authUser = authData.user;
	const userEmail = (authUser.email || (authUser.user_metadata?.email as string) || '').toLowerCase().trim();

	// 2. Extract Microsoft claims (tid, oid) from identities or metadata
	const azureIdentity = authUser.identities?.find((id) => id.provider === 'azure');
	const identityData = (azureIdentity?.identity_data as Record<string, unknown>) || {};
	const userMeta = (authUser.user_metadata as Record<string, unknown>) || {};

	const tid = (identityData.tid || userMeta.tid || identityData.tenant_id || userMeta.tenant_id || '') as string;
	const oid = (identityData.sub || identityData.oid || userMeta.sub || userMeta.oid || azureIdentity?.id || '') as string;
	const fullName =
		(userMeta.full_name as string) ||
		(userMeta.name as string) ||
		(identityData.name as string) ||
		userEmail.split('@')[0] ||
		'User';

	// 3. Check for existing bound profile
	// Check by user ID first, or by Microsoft identity (tid, oid), or matching email
	let { data: profile } = await supabaseAdmin
		.from('profiles')
		.select('id, email, full_name, role, user_type, client_id, microsoft_tenant_id, microsoft_object_id, status')
		.eq('id', authUser.id)
		.maybeSingle();

	if (!profile && tid && oid) {
		const { data: matchedProfile } = await supabaseAdmin
			.from('profiles')
			.select('id, email, full_name, role, user_type, client_id, microsoft_tenant_id, microsoft_object_id, status')
			.eq('microsoft_tenant_id', tid)
			.eq('microsoft_object_id', oid)
			.maybeSingle();
		if (matchedProfile) {
			profile = matchedProfile;
		}
	}

	if (!profile && userEmail) {
		const { data: matchedByEmail } = await supabaseAdmin
			.from('profiles')
			.select('id, email, full_name, role, user_type, client_id, microsoft_tenant_id, microsoft_object_id, status')
			.ilike('email', userEmail)
			.maybeSingle();
		if (matchedByEmail) {
			profile = matchedByEmail;
		}
	}

	// ---------------------------------------------------------------------------
	// SCENARIO A: User is already registered in Resolv
	// ---------------------------------------------------------------------------
	if (profile) {
		// A1: Verify user status == ACTIVE
		if (profile.status !== 'ACTIVE') {
			await supabase.auth.signOut();
			await logAuditEvent({
				organizationId: profile.client_id,
				actorUserId: profile.id,
				action: 'login_denied_user_inactive',
				resourceType: 'user',
				resourceId: profile.id,
				newValue: { status: profile.status, email: userEmail },
				ipAddress,
				userAgent
			});
			throw redirect(303, `/login?error=account_${profile.status.toLowerCase()}`);
		}

		// A2: Verify client organization status == ACTIVE (for client users)
		if (profile.client_id) {
			const { data: clientOrg } = await supabaseAdmin
				.from('clients')
				.select('id, status, microsoft_tenant_id')
				.eq('id', profile.client_id)
				.maybeSingle();

			if (clientOrg && clientOrg.status !== 'ACTIVE') {
				await supabase.auth.signOut();
				await logAuditEvent({
					organizationId: profile.client_id,
					actorUserId: profile.id,
					action: 'login_denied_org_inactive',
					resourceType: 'client',
					resourceId: clientOrg.id,
					newValue: { orgStatus: clientOrg.status },
					ipAddress,
					userAgent
				});
				throw redirect(303, '/login?error=org_suspended');
			}

			// Validate tenant match if configured
			if (clientOrg?.microsoft_tenant_id && tid && clientOrg.microsoft_tenant_id !== tid) {
				await supabase.auth.signOut();
				await logAuditEvent({
					organizationId: profile.client_id,
					actorUserId: profile.id,
					action: 'login_denied_tenant_mismatch',
					resourceType: 'client',
					resourceId: clientOrg.id,
					newValue: { expectedTenant: clientOrg.microsoft_tenant_id, actualTenant: tid },
					ipAddress,
					userAgent
				});
				throw redirect(303, '/login?error=tenant_mismatch');
			}
		}

		// A3: Update Microsoft identity binding if missing or user ID sync
		const updates: { microsoft_tenant_id?: string | null; microsoft_object_id?: string | null } = {};
		if (!profile.microsoft_tenant_id && tid) updates.microsoft_tenant_id = tid;
		if (!profile.microsoft_object_id && oid) updates.microsoft_object_id = oid;

		if (Object.keys(updates).length > 0) {
			await supabaseAdmin.from('profiles').update(updates).eq('id', profile.id);
		}

		await logAuditEvent({
			organizationId: profile.client_id,
			actorUserId: profile.id,
			action: 'login_success',
			resourceType: 'user',
			resourceId: profile.id,
			newValue: { provider: 'azure', email: userEmail },
			ipAddress,
			userAgent
		});

		// Route based on role
		if (INTERNAL_ROLES.includes(profile.role)) {
			throw redirect(303, next !== '/' && !next.startsWith('/portal') ? next : '/');
		} else {
			throw redirect(303, next.startsWith('/portal') ? next : '/portal');
		}
	}

	// ---------------------------------------------------------------------------
	// SCENARIO B: First-Login Identity Binding (Matching Pending Invitation)
	// ---------------------------------------------------------------------------
	const { data: invitation } = await supabaseAdmin
		.from('invitations')
		.select('id, email, full_name, role, user_type, client_id, project_ids, microsoft_tenant_id, status')
		.ilike('email', userEmail)
		.eq('status', 'PENDING')
		.maybeSingle();

	if (invitation) {
		// Verify expected tenant ID if specified in invitation or client
		if (invitation.client_id) {
			const { data: clientOrg } = await supabaseAdmin
				.from('clients')
				.select('id, status, microsoft_tenant_id')
				.eq('id', invitation.client_id)
				.maybeSingle();

			if (clientOrg && clientOrg.status !== 'ACTIVE') {
				await supabase.auth.signOut();
				throw redirect(303, '/login?error=org_suspended');
			}

			const expectedTenant = invitation.microsoft_tenant_id || clientOrg?.microsoft_tenant_id;
			if (expectedTenant && tid && expectedTenant !== tid) {
				await supabase.auth.signOut();
				await logAuditEvent({
					organizationId: invitation.client_id,
					action: 'invitation_tenant_mismatch',
					resourceType: 'invitation',
					resourceId: invitation.id,
					newValue: { expectedTenant, incomingTenant: tid },
					ipAddress,
					userAgent
				});
				throw redirect(303, '/login?error=tenant_mismatch');
			}
		}

		// Bind identity & create ACTIVE profile
		const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
			id: authUser.id,
			email: userEmail,
			full_name: invitation.full_name || fullName,
			role: invitation.role,
			user_type: invitation.user_type,
			client_id: invitation.client_id,
			microsoft_tenant_id: tid || invitation.microsoft_tenant_id || null,
			microsoft_object_id: oid || null,
			status: 'ACTIVE'
		});

		if (profileError) {
			console.error('[Auth Callback] Failed to bind user profile:', profileError);
			await supabase.auth.signOut();
			throw redirect(303, '/login?error=profile_creation_failed');
		}

		// Attach project memberships if specified in invitation
		if (invitation.project_ids && invitation.project_ids.length > 0) {
			const memberInserts = invitation.project_ids.map((projId: string) => ({
				project_id: projId,
				user_id: authUser.id
			}));
			await supabaseAdmin.from('project_members').insert(memberInserts);
		}

		// Mark invitation as ACTIVE (consumed)
		await supabaseAdmin
			.from('invitations')
			.update({ status: 'ACTIVE' })
			.eq('id', invitation.id);

		await logAuditEvent({
			organizationId: invitation.client_id,
			actorUserId: authUser.id,
			action: 'first_login_bind_success',
			resourceType: 'user',
			resourceId: authUser.id,
			newValue: {
				invitationId: invitation.id,
				email: userEmail,
				role: invitation.role,
				tid,
				oid
			},
			ipAddress,
			userAgent
		});

		if (INTERNAL_ROLES.includes(invitation.role)) {
			throw redirect(303, '/');
		} else {
			throw redirect(303, '/portal');
		}
	}

	// ---------------------------------------------------------------------------
	// SCENARIO C: Unregistered Microsoft User (CRITICAL ACCESS DENIAL)
	// ---------------------------------------------------------------------------
	// User authenticated with Microsoft, but is NOT pre-registered in Resolv
	console.warn(`[Auth Callback] Unregistered Microsoft user attempted access: ${userEmail} (tid: ${tid})`);

	// Immediately revoke session
	await supabase.auth.signOut();

	// Clean up orphaned auth record so untrusted user doesn't linger
	await supabaseAdmin.auth.admin.deleteUser(authUser.id).catch(() => {});

	await logAuditEvent({
		action: 'login_denied_unregistered',
		resourceType: 'security',
		resourceId: userEmail,
		newValue: {
			email: userEmail,
			tid,
			oid
		},
		ipAddress,
		userAgent
	});

	throw redirect(303, '/login?error=unregistered_user');
};
