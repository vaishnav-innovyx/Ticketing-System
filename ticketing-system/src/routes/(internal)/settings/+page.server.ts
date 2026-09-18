import { fail } from '@sveltejs/kit';
import { changeOwnPassword } from '$lib/server/password';
import type { Actions } from './$types';

export const actions: Actions = {
	changePassword: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();
		if (!user) {
			return fail(401, { error: 'You must be logged in to change your password.' });
		}

		const formData = await request.formData();
		const result = await changeOwnPassword({
			supabase,
			user,
			currentPassword: String(formData.get('currentPassword') || ''),
			newPassword: String(formData.get('newPassword') || ''),
			confirmPassword: String(formData.get('confirmPassword') || '')
		});

		if ('error' in result) {
			return fail(400, { error: result.error });
		}

		return { success: true };
	}
};
