<script lang="ts">
	let { onMenuClick }: { onMenuClick?: () => void } = $props();
</script>

<header
	class="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[var(--color-outline-variant)]/60 bg-[var(--color-surface)] px-4 sm:px-6 md:px-8"
>
	<!-- Left section: mobile hamburger & title -->
	<div class="flex items-center gap-3">
		<button
			type="button"
			class="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--color-on-surface-variant)] transition-colors hover:bg-[var(--color-surface-container)] hover:text-[var(--color-primary)] md:hidden"
			aria-label="Open navigation"
			onclick={onMenuClick}
		>
			<span class="material-symbols-outlined">menu</span>
		</button>

		<div class="hidden items-center gap-2 text-title-lg font-bold text-[var(--color-on-surface)] sm:flex">
			Nexus Service Desk
		</div>
	</div>

	<!-- Center section: Search Bar -->
	<div class="mx-4 hidden max-w-md flex-1 sm:block md:mx-8">
		<div class="relative">
			<span class="material-symbols-outlined pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[20px] text-[var(--color-outline)]">
				search
			</span>
			<input
				type="text"
				placeholder="Search tickets, clients..."
				class="h-10 w-full rounded-md border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] pr-4 pl-10 text-body-sm text-[var(--color-on-surface)] transition-all placeholder:text-[var(--color-outline)] focus:border-[var(--color-primary-container)] focus:ring-1 focus:ring-[var(--color-primary-container)] focus:outline-none"
			/>
		</div>
	</div>

	<!-- Right section: actions & user profile -->
	<div class="flex items-center gap-2 sm:gap-4">
		<!-- Mobile Search Icon -->
		<button
			type="button"
			class="flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-on-surface-variant)] transition-colors hover:bg-[var(--color-surface-container)] sm:hidden"
			aria-label="Search"
		>
			<span class="material-symbols-outlined text-[20px]">search</span>
		</button>

		<!-- Notifications -->
		<button
			type="button"
			class="relative flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-on-surface-variant)] transition-colors hover:bg-[var(--color-surface-container)] hover:text-[var(--color-primary)]"
			aria-label="Notifications"
		>
			<span class="material-symbols-outlined text-[20px]">notifications</span>
			<span class="absolute top-2 right-2 h-2 w-2 rounded-full border border-[var(--color-surface)] bg-[var(--color-error)]"></span>
		</button>

		<div class="hidden h-7 w-px bg-[var(--color-outline-variant)]/60 sm:block"></div>

		<!-- User profile -->
		<div class="flex cursor-pointer items-center gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-[var(--color-surface-container-low)]">
			<div
				class="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary-container)] text-label-md font-semibold text-white shadow-sm"
			>
				AL
			</div>

			<div class="hidden text-left lg:block">
				<div class="text-label-md font-medium text-[var(--color-on-surface)]">
					Alex Morgan
				</div>
				<div class="text-label-sm text-[var(--color-on-surface-variant)]">
					Support Lead
				</div>
			</div>

			<span class="material-symbols-outlined text-[18px] text-[var(--color-on-surface-variant)]">
				arrow_drop_down
			</span>
		</div>
	</div>
</header>