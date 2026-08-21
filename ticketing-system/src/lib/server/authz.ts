import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/database.types';

export const INTERNAL_ROLES = ['super_admin', 'poc', 'specialist', 'delivery_lead'];

export async function requireInternalRole(supabase: SupabaseClient<Database>, userId: string): Promise<boolean> {
	const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();
	return !!profile && INTERNAL_ROLES.includes(profile.role);
}
