<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let isSubmitting = $state(false);
	let showPassword = $state(false);

	let email = $state(form?.email ?? '');
	let password = $state('');
</script>

<svelte:head>
	<title>Sign In — Resolv Support & Ticketing System</title>
</svelte:head>

<div class="flex min-h-screen w-full bg-[#f8fafc] text-slate-800">
	<!-- Left Side: Split-Screen Hero Showcase with Light Image (Hidden on mobile) -->
	<div class="relative hidden lg:flex flex-1 flex-col justify-end overflow-hidden bg-slate-100 p-12 lg:p-16">
		<!-- Background Light Hero Image with Blur -->
		<img
			src="/login-hero-light.jpg"
			alt="Resolv Enterprise IT Support Dashboard Showcase"
			class="absolute inset-0 h-full w-full object-cover object-center opacity-85 blur-[4px] scale-105 transition-all"
		/>
		
		<!-- Soft Light Overlay Gradient for perfect readability -->
		<div class="absolute inset-0 bg-gradient-to-t from-white/95 via-white/50 to-white/20 backdrop-blur-[2px]"></div>

		<!-- Hero Content Stack (Increased Logo size with transparent background placed directly above text) -->
		<div class="relative z-10 max-w-xl space-y-6">
			<!-- Increased Size Transparent Logo directly above text -->
			<div>
				<img src="/logo.png" alt="Resolv Support & Ticketing System" class="h-28 lg:h-36 w-auto object-contain filter drop-shadow-md" />
			</div>

			<div class="space-y-3">
				<span class="inline-flex items-center gap-2 rounded-full bg-blue-50/90 px-4 py-1.5 text-xs font-bold text-[#1d5b8c] backdrop-blur-md border border-blue-200/80 shadow-sm">
					<span class="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
					Enterprise SLA & Support Portal
				</span>
				<h2 class="text-3xl font-extrabold text-slate-900 leading-tight tracking-tight lg:text-4xl">
					Centralized Incident Management & SLA Tracking
				</h2>
				<p class="text-sm text-slate-700 leading-relaxed font-medium">
					Streamline multi-client ticket ingestion, automated escalation rules, and end-to-end task resolution in one unified platform.
				</p>
			</div>
		</div>
	</div>

	<!-- Right Side: Sign-In Form -->
	<div class="flex flex-1 flex-col justify-between bg-white p-8 sm:p-12 lg:p-16 lg:max-w-xl xl:max-w-2xl shadow-2xl">
		<!-- Top Bar for Small Screens -->
		<div class="flex items-center justify-between lg:hidden pb-8">
			<img src="/logo.png" alt="Resolv Logo" class="h-10 w-auto object-contain" />
			<span class="text-xs font-semibold text-slate-500">Resolv Support</span>
		</div>

		<!-- Form Card Container -->
		<div class="my-auto mx-auto w-full max-w-md space-y-8">
			<!-- Title & Subtitle -->
			<div class="space-y-2">
				<h1 class="text-3xl font-extrabold tracking-tight text-slate-900">Sign in</h1>
				<p class="text-sm text-slate-500">Enter your credentials to access your support workspace.</p>
			</div>

			<!-- First Time System Setup Banner (Disappears automatically after first Super Admin registers) -->
			{#if !data?.hasSuperAdmin}
				<div class="rounded-xl border border-amber-300 bg-amber-50/90 p-4 text-center text-xs shadow-sm space-y-2 animate-in fade-in duration-200">
					<div class="flex items-center justify-center gap-1.5 font-bold text-amber-900 text-sm">
						<span class="material-symbols-outlined text-[18px] text-amber-600">admin_panel_settings</span>
						<span>First-Time System Setup</span>
					</div>
					<p class="text-amber-800 leading-relaxed">No Super Admin account found. Register the initial system administrator below to unlock workspace setup.</p>
					<a
						href="/register"
						class="inline-flex items-center gap-1.5 rounded-lg bg-[#1d5b8c] px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#15466e] transition-colors"
					>
						<span>Register First Super Admin</span>
						<span class="material-symbols-outlined text-[16px]">arrow_forward</span>
					</a>
				</div>
			{/if}

			<!-- Login Form -->
			<form
				method="POST"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ update }) => {
						isSubmitting = false;
						await update();
					};
				}}
				class="space-y-5"
			>
				{#if form?.error}
					<div class="flex items-center gap-2.5 rounded-lg border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700 animate-in fade-in duration-150">
						<span class="material-symbols-outlined text-[18px] shrink-0 text-red-600">error</span>
						<span>{form.error}</span>
					</div>
				{/if}

				<!-- Email Field -->
				<div class="space-y-2">
					<label for="email" class="block text-xs font-bold uppercase tracking-wider text-slate-600">
						Email Address
					</label>
					<div class="relative">
						<input
							id="email"
							name="email"
							type="email"
							autocomplete="username"
							required
							bind:value={email}
							placeholder="Enter your email"
							class="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#1d5b8c] focus:ring-2 focus:ring-[#1d5b8c]/20 transition-all"
						/>
					</div>
				</div>

				<!-- Password Field -->
				<div class="space-y-2">
					<label for="password" class="block text-xs font-bold uppercase tracking-wider text-slate-600">
						Password
					</label>
					<div class="relative">
						<input
							id="password"
							name="password"
							type={showPassword ? 'text' : 'password'}
							autocomplete="current-password"
							required
							bind:value={password}
							placeholder="Enter your password"
							class="w-full rounded-lg border border-slate-300 bg-white pl-4 pr-11 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#1d5b8c] focus:ring-2 focus:ring-[#1d5b8c]/20 transition-all"
						/>
						<button
							type="button"
							onclick={() => (showPassword = !showPassword)}
							class="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
							aria-label="Toggle password visibility"
						>
							<span class="material-symbols-outlined text-[18px]">
								{showPassword ? 'visibility_off' : 'visibility'}
							</span>
						</button>
					</div>
				</div>

				<!-- Submit Button -->
				<button
					type="submit"
					disabled={isSubmitting || !email.trim() || !password.trim()}
					class="w-full flex items-center justify-center gap-2 rounded-lg bg-[#1d5b8c] hover:bg-[#15466e] px-4 py-3 text-sm font-bold text-white shadow-md shadow-[#1d5b8c]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
				>
					{#if isSubmitting}
						<span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
						<span>Authenticating...</span>
					{:else}
						<span>Sign in</span>
						<span class="material-symbols-outlined text-[18px]">arrow_forward</span>
					{/if}
				</button>
			</form>
		</div>

		<!-- Footer Info -->
		<div class="pt-6 text-center text-xs text-slate-400">
			Protected by Resolv Security & Workspace Isolation
		</div>
	</div>
</div>







