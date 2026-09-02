import type { Database } from '$lib/database.types';

export type TicketStatus = Database['public']['Enums']['ticket_status'];
export type TicketDbCategory = Database['public']['Enums']['ticket_category'];
export type TicketDbPriority = Database['public']['Enums']['ticket_priority'];

// Labels consumed by the existing portal UI's status badge switches.
export const STATUS_LABEL: Record<TicketStatus, string> = {
	raised: 'Open',
	poc_triage: 'Triaged',
	requirement_estimation: 'In Progress',
	client_approval: 'Awaiting Client Approval',
	development: 'In Development',
	delivery: 'Awaiting Client',
	closed: 'Resolved'
};

// Matches TicketProgressStepper's 0-7 index (Raised, Triaged, Estimated,
// Approved, In Dev, QA, Deployed, Resolved). The 7-stage lifecycle has no
// separate QA stage, so 'delivery' maps to Deployed (6) and QA reads as
// already completed at that point.
export const STATUS_STEP: Record<TicketStatus, number> = {
	raised: 0,
	poc_triage: 1,
	requirement_estimation: 2,
	client_approval: 3,
	development: 4,
	delivery: 6,
	closed: 7
};

export const CATEGORY_LABEL: Record<TicketDbCategory, string> = {
	bug: 'Bug',
	enhancement: 'Enhancement',
	kt: 'KT',
	training: 'Training'
};

export const PRIORITY_LABEL: Record<TicketDbPriority, string> = {
	low: 'Low',
	medium: 'Medium',
	high: 'High',
	critical: 'Critical'
};

export const BLOCKED_BADGE_CLASS = 'bg-[var(--color-error-container)] text-[var(--color-on-error-container)]';

// Delivery metrics: PoC TAT, requirement/estimation duration, client approval
// delay, development effort variance, and total end-to-end cycle time.
// Mirrors the formulas in the `ticket_metrics` Postgres view, computed here in
// JS (over RLS-scoped ticket rows) rather than querying that view directly.
export interface TicketMetricTimestamps {
	raised_at?: string | null;
	poc_responded_at?: string | null;
	requirement_completed_at?: string | null;
	client_approved_at?: string | null;
	closed_at?: string | null;
	estimated_hours?: number | null;
	actual_hours?: number | null;
}

export interface TicketMetrics {
	pocTatHours: number | null;
	reqDurationHours: number | null;
	approvalDelayHours: number | null;
	effortVariancePct: number | null;
	cycleTimeHours: number | null;
}

export function diffHours(later: string | null | undefined, earlier: string | null | undefined): number | null {
	if (!later || !earlier) return null;
	return (new Date(later).getTime() - new Date(earlier).getTime()) / 3_600_000;
}

export function computeTicketMetrics(t: TicketMetricTimestamps): TicketMetrics {
	return {
		pocTatHours: diffHours(t.poc_responded_at, t.raised_at),
		reqDurationHours: diffHours(t.requirement_completed_at, t.poc_responded_at),
		approvalDelayHours: diffHours(t.client_approved_at, t.requirement_completed_at),
		effortVariancePct:
			t.estimated_hours && t.estimated_hours > 0 && t.actual_hours !== null && t.actual_hours !== undefined
				? ((t.actual_hours - t.estimated_hours) / t.estimated_hours) * 100
				: null,
		cycleTimeHours: diffHours(t.closed_at, t.raised_at)
	};
}

export function formatMetricHours(hours: number | null): string {
	if (hours === null) return '—';
	if (hours < 1) return `${Math.round(hours * 60)}m`;
	if (hours < 48) return `${hours.toFixed(1)}h`;
	return `${(hours / 24).toFixed(1)}d`;
}

export function formatVariancePct(pct: number | null): string {
	if (pct === null) return '—';
	const sign = pct > 0 ? '+' : '';
	return `${sign}${pct.toFixed(1)}%`;
}

export function formatDateTime(value: string | null): string {
	if (!value) return '';
	return new Date(value).toLocaleString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		hour: 'numeric',
		minute: '2-digit'
	});
}

const ROLE_LABEL: Record<string, string> = {
	super_admin: 'Super Admin',
	poc: 'PoC',
	specialist: 'Specialist',
	delivery_lead: 'Delivery Lead',
	client_admin: 'Client Admin',
	project_admin: 'Project Admin',
	client_raiser: 'Client',
	client_viewer: 'Client'
};

export function roleLabel(role: string): string {
	return ROLE_LABEL[role] ?? role;
}

export function isClientRole(role: string): boolean {
	return role.startsWith('client_') || role === 'project_admin';
}

export function formatBytes(bytes: number | null): string {
	if (!bytes) return '';
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function attachmentType(mime: string | null): 'pdf' | 'img' | 'log' | 'doc' {
	if (!mime) return 'doc';
	if (mime.includes('pdf')) return 'pdf';
	if (mime.includes('image')) return 'img';
	if (mime.includes('text') || mime.includes('log')) return 'log';
	return 'doc';
}

export function formatRelative(value: string | null): string {
	if (!value) return '';
	const diffMs = Date.now() - new Date(value).getTime();
	const minutes = Math.floor(diffMs / 60000);
	if (minutes < 1) return 'Just now';
	if (minutes < 60) return `Updated ${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `Updated ${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days === 1) return 'Updated yesterday';
	if (days < 7) return `Updated ${days}d ago`;
	return `Updated ${formatDateTime(value)}`;
}
