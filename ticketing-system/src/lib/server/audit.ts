import { supabaseAdmin } from './supabase';

export interface AuditLogParams {
	organizationId?: string | null;
	actorUserId?: string | null;
	action: string;
	resourceType: string;
	resourceId?: string | null;
	oldValue?: Record<string, unknown> | null;
	newValue?: Record<string, unknown> | null;
	ipAddress?: string | null;
	userAgent?: string | null;
}

/**
 * Records a security or domain event into the audit_logs table via supabaseAdmin (bypassing RLS).
 * Non-blocking: logs error to console if writing fails without failing user requests.
 */
export async function logAuditEvent(params: AuditLogParams): Promise<void> {
	try {
		const { error } = await supabaseAdmin.from('audit_logs').insert({
			organization_id: params.organizationId ?? null,
			actor_user_id: params.actorUserId ?? null,
			action: params.action,
			resource_type: params.resourceType,
			resource_id: params.resourceId ?? null,
			old_value: (params.oldValue as unknown as never) ?? null,
			new_value: (params.newValue as unknown as never) ?? null,
			ip_address: params.ipAddress ?? null,
			user_agent: params.userAgent ?? null
		});

		if (error) {
			console.error('[AuditLog] Failed to record audit log:', error.message);
		}
	} catch (err) {
		console.error('[AuditLog] Exception while writing audit log:', err);
	}
}
