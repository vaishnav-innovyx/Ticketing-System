import { supabaseAdmin } from '$lib/server/supabase';

export const ASSIGNABLE_ROLES = [
	'super_admin',
	'poc',
	'specialist',
	'delivery_lead',
	'client_admin',
	'client_raiser',
	'client_viewer'
] as const;

export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export const isClientRole = (role: string) => role.startsWith('client_');

interface ProvisionInput {
	fullName: string;
	email: string;
	password: string;
	role: string;
	clientId: string | null;
	projectIds: string[];
}

// Single source of truth for creating a user: Auth account -> profile -> project memberships.
// Used by both the single-add action and the bulk Excel upload.
export async function provisionUser(
	input: ProvisionInput
): Promise<{ userId: string } | { error: string }> {
	const password = input.password?.trim() || 'ChangeMe123!';

	const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
		email: input.email,
		password,
		email_confirm: true,
		user_metadata: { full_name: input.fullName }
	});

	if (authError || !authData.user) {
		return { error: authError?.message || 'Failed to create authentication user account.' };
	}

	const userId = authData.user.id;

	const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
		id: userId,
		email: input.email,
		full_name: input.fullName,
		role: input.role as never,
		client_id: input.clientId
	});

	if (profileError) {
		// Roll back the orphaned auth user (e.g. seat-quota trigger rejected the profile).
		await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {});
		return { error: profileError.message };
	}

	if (input.projectIds.length > 0) {
		await supabaseAdmin
			.from('project_members')
			.insert(input.projectIds.map((projectId) => ({ project_id: projectId, user_id: userId })));
	}

	return { userId };
}
