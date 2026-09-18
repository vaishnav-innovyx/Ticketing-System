import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from '$lib/database.types';

export interface ChangeOwnPasswordInput {
	supabase: SupabaseClient<Database>;
	user: User;
	currentPassword: string;
	newPassword: string;
	confirmPassword: string;
}

export type ChangeOwnPasswordResult = { error: string } | { success: true };

export async function changeOwnPassword({
	supabase,
	user,
	currentPassword,
	newPassword,
	confirmPassword
}: ChangeOwnPasswordInput): Promise<ChangeOwnPasswordResult> {
	if (!currentPassword || !newPassword || !confirmPassword) {
		return { error: 'Please fill in all fields.' };
	}

	if (newPassword !== confirmPassword) {
		return { error: 'New password and confirmation do not match.' };
	}

	if (newPassword.length < 8) {
		return { error: 'New password must be at least 8 characters long.' };
	}

	if (newPassword === currentPassword) {
		return { error: 'New password must be different from your current password.' };
	}

	if (!user.email) {
		return { error: 'Unable to verify account email.' };
	}

	const { error: reauthError } = await supabase.auth.signInWithPassword({
		email: user.email,
		password: currentPassword
	});
	if (reauthError) {
		return { error: 'Current password is incorrect.' };
	}

	const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
	if (updateError) {
		return { error: updateError.message || 'Failed to update password.' };
	}

	await supabase.auth.signOut({ scope: 'others' }).catch(() => {});

	return { success: true };
}
