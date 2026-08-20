<script lang="ts">
	interface ProjectItem {
		id: string;
		code: string;
		name: string;
		client_id?: string;
		created_at?: string;
	}

	interface MemberItem {
		id: string;
		full_name: string | null;
		email: string;
		role: string;
		client_id?: string | null;
		created_at?: string;
	}

	interface TicketItem {
		id: string;
		title: string;
		description?: string | null;
		category: string;
		status: string;
		project_id?: string;
		raised_by?: string | null;
		estimated_hours?: number | null;
		actual_hours?: number | null;
		created_at?: string;
	}

	interface ClientData {
		id: string;
		code: string;
		name: string;
		seat_quota: number | null;
		created_at: string;
		projects: ProjectItem[];
		members: MemberItem[];
		tickets: TicketItem[];
	}

	interface Props {
		client: ClientData;
		isSelected?: boolean;
		onSelect: (client: ClientData) => void;
	}

	let { client, isSelected = false, onSelect }: Props = $props();

	const isUnlimited = $derived(client.seat_quota === null || client.seat_quota === undefined || client.seat_quota <= 0);
	const usedSeats = $derived(client.members.length);
	const seatPercentage = $derived(
		!isUnlimited && client.seat_quota && client.seat_quota > 0
			? Math.min(100, Math.round((usedSeats / client.seat_quota) * 100))
			: 0
	);
	const activeTickets = $derived(
		client.tickets.filter((t) => t.status !== 'closed' && t.status !== 'delivered').length
	);

	// Generate deterministic pastel avatar gradient based on client code
	const avatarColors = [
		'from-blue-600 to-indigo-700 text-white',
		'from-emerald-600 to-teal-700 text-white',
		'from-amber-600 to-orange-700 text-white',
		'from-purple-600 to-pink-700 text-white',
		'from-cyan-600 to-blue-700 text-white'
	];
	const colorIndex = $derived((client.code.charCodeAt(0) + (client.code.charCodeAt(1) || 0)) % avatarColors.length);
	const avatarColor = $derived(avatarColors[colorIndex]);
</script>

<div
	class="nexus-card group relative flex flex-col justify-between overflow-hidden p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer {isSelected
		? 'ring-2 ring-[var(--color-primary)] border-transparent shadow-md'
		: ''}"
	onclick={() => onSelect(client)}
	onkeydown={(e) => e.key === 'Enter' && onSelect(client)}
	role="button"
	tabindex="0"
>
	<!-- Top Row: Avatar, Name & Code Badge -->
	<div>
		<div class="flex items-start justify-between gap-3">
			<div class="flex items-center gap-3">
				<div
					class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br {avatarColor} font-bold text-base shadow-sm"
				>
					{client.code.slice(0, 2).toUpperCase()}
				</div>
				<div>
					<h3 class="text-title-lg font-bold text-[var(--color-on-surface)] group-hover:text-[var(--color-primary)] transition-colors">
						{client.name}
					</h3>
					<div class="flex items-center gap-2 mt-0.5">
						<span class="inline-flex items-center rounded-md bg-[var(--color-surface-container-high)] px-2 py-0.5 text-label-xs font-mono font-semibold text-[var(--color-on-surface-variant)]">
							{client.code}
						</span>
						<span class="text-body-xs text-[var(--color-outline)] text-[12px]">
							{client.projects.length} {client.projects.length === 1 ? 'project' : 'projects'}
						</span>
					</div>
				</div>
			</div>

			<span
				class="material-symbols-outlined text-[20px] text-[var(--color-outline)] group-hover:text-[var(--color-primary)] transition-transform duration-200 group-hover:translate-x-0.5"
			>
				chevron_right
			</span>
		</div>

		<!-- Seat Quota Progress Gauge -->
		<div class="mt-5 space-y-1.5">
			<div class="flex items-center justify-between text-label-xs text-[var(--color-on-surface-variant)]">
				<span class="flex items-center gap-1 font-medium">
					<span class="material-symbols-outlined text-[14px]">group</span>
					Seats Allocation
				</span>
				{#if isUnlimited}
					<span class="font-semibold text-emerald-700 flex items-center gap-1">
						{usedSeats} / <span class="text-sm font-bold">∞</span> (Unlimited)
					</span>
				{:else}
					<span class="font-semibold text-[var(--color-on-surface)]">
						{usedSeats} / {client.seat_quota} ({seatPercentage}%)
					</span>
				{/if}
			</div>
			<div class="h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-container-high)]">
				{#if isUnlimited}
					<div
						class="h-full rounded-full bg-emerald-500 w-full opacity-60"
					></div>
				{:else}
					<div
						class="h-full rounded-full transition-all duration-500 {seatPercentage >= 90
							? 'bg-[var(--color-error)]'
							: seatPercentage >= 70
								? 'bg-[var(--color-tertiary)]'
								: 'bg-[var(--color-primary-container)]'}"
						style="width: {seatPercentage}%"
					></div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Bottom Row: Meta Badges -->
	<div class="mt-5 flex items-center justify-between border-t border-[var(--color-border-subtle)]/60 pt-3.5 text-[12px]">
		<div class="flex items-center gap-2">
			{#if activeTickets > 0}
				<span class="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 border border-amber-200">
					<span class="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
					{activeTickets} active {activeTickets === 1 ? 'ticket' : 'tickets'}
				</span>
			{:else}
				<span class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-200">
					<span class="material-symbols-outlined text-[12px]">check</span>
					All clear
				</span>
			{/if}
		</div>

		<span class="font-medium text-[var(--color-primary)] text-label-xs group-hover:underline">
			View Details &rarr;
		</span>
	</div>
</div>
