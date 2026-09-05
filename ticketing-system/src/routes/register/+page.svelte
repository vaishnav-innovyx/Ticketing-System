<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let isSubmitting = $state(false);
	let showPassword = $state(false);

	let fullName = $state(form?.fullName ?? '');
	let email = $state(form?.email ?? '');
	let password = $state('');
	let confirmPassword = $state('');
</script>

<svelte:head>
	<title>Register First Super Admin — Resolv Ticketing System</title>
</svelte:head>

<div class="flex min-h-screen w-full bg-[#f8fafc] text-slate-800">
	<!-- Left Side: Split-Screen Hero Showcase with Light Image -->
	<div class="relative hidden lg:flex flex-1 flex-col justify-end overflow-hidden bg-slate-100 p-12 lg:p-16">
		<!-- Background Light Hero Image with Blur -->
		<img
			src="/login-hero-light.jpg"
			alt="Resolv Enterprise IT Support Dashboard Showcase"
			class="absolute inset-0 h-full w-full object-cover object-center opacity-85 blur-[4px] scale-105 transition-all"
		/>
		
		<!-- Soft Light Overlay Gradient for perfect readability -->
		<div class="absolute inset-0 bg-gradient-to-t from-white/95 via-white/50 to-white/20 backdrop-blur-[2px]"></div>

		<!-- Hero Content Stack -->
		<div class="relative z-10 max-w-xl space-y-6">
			<!-- Transparent Logo directly above text -->
			<div>
				<img src="/logo.png" alt="Resolv Support & Ticketing System" class="h-28 lg:h-36 w-auto object-contain filter drop-shadow-md" />
			</div>

			<div class="space-y-3">
				<span class="inline-flex items-center gap-2 rounded-full bg-blue-50/90 px-4 py-1.5 text-xs font-bold text-[#1d5b8c] backdrop-blur-md border border-blue-200/80 shadow-sm">
					<span class="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
					Initial Workspace Initialization
				</span>
				<h2 class="text-3xl font-extrabold text-slate-900 leading-tight tracking-tight lg:text-4xl">
					Create Your First Super Admin Account
				</h2>
				<p class="text-sm text-slate-700 leading-relaxed font-medium">
					This account will have master administrative rights to set up clients, projects, specialist teams, and integration tokens.
				</p>
			</div>
		</div>
	</div>

	<!-- Right Side: Registration Form Container -->
	<div class="flex flex-1 flex-col justify-between bg-white p-8 sm:p-12 lg:p-16 lg:max-w-xl xl:max-w-2xl shadow-2xl">
		<!-- Top Bar for Small Screens -->
		<div class="flex items-center justify-between lg:hidden pb-6">
			<img src="/logo.png" alt="Resolv Logo" class="h-10 w-auto object-contain" />
			<span class="text-xs font-semibold text-slate-500">Resolv Support</span>
		</div>

		<!-- Form Container -->
		<div class="my-auto mx-auto w-full max-w-md space-y-6">
			<!-- Header -->
			<div class="space-y-1.5">
				<div class="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-900 border border-amber-200 mb-1">
					<span class="material-symbols-outlined text-[15px] text-amber-600">shield_person</span>
					<span>One-Time System Setup</span>
				</div>
				<h1 class="text-3xl font-extrabold tracking-tight text-slate-900">Register Super Admin</h1>
				<p class="text-sm text-slate-500">Initialize the primary administrator account for Resolv.</p>
			</div>

			<!-- Form -->
			<form
				method="POST"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ update }) => {
						isSubmitting = false;
						await update();
					};
				}}
				class="space-y-4"
			>
				{#if form?.error}
					<div class="flex items-center gap-2.5 rounded-lg border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700 animate-in fade-in duration-150">
						<span class="material-symbols-outlined text-[18px] shrink-0 text-red-600">error</span>
						<span>{form.error}</span>
					</div>
				{/if}

				<!-- Full Name -->
				<div class="space-y-1.5">
					<label for="fullName" class="block text-xs font-bold uppercase tracking-wider text-slate-600">
						Full Name <span class="text-red-500">*</span>
					</label>
					<input
						id="fullName"
						name="fullName"
						type="text"
						required
						bind:value={fullName}
						placeholder="e.g. John Doe"
						class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#1d5b8c] focus:ring-2 focus:ring-[#1d5b8c]/20 transition-all"
					/>
				</div>

				<!-- Email Address -->
				<div class="space-y-1.5">
					<label for="email" class="block text-xs font-bold uppercase tracking-wider text-slate-600">
						Email Address <span class="text-red-500">*</span>
					</label>
					<input
						id="email"
						name="email"
						type="email"
						autocomplete="username"
						required
						bind:value={email}
						placeholder="admin@organization.com"
						class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#1d5b8c] focus:ring-2 focus:ring-[#1d5b8c]/20 transition-all"
					/>
				</div>

				<!-- Password -->
				<div class="space-y-1.5">
					<label for="password" class="block text-xs font-bold uppercase tracking-wider text-slate-600">
						Password <span class="text-red-500">*</span>
					</label>
					<div class="relative">
						<input
							id="password"
							name="password"
							type={showPassword ? 'text' : 'password'}
							autocomplete="new-password"
							required
							bind:value={password}
							placeholder="At least 8 characters"
							class="w-full rounded-lg border border-slate-300 bg-white pl-4 pr-11 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#1d5b8c] focus:ring-2 focus:ring-[#1d5b8c]/20 transition-all"
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

				<!-- Confirm Password -->
				<div class="space-y-1.5">
					<label for="confirmPassword" class="block text-xs font-bold uppercase tracking-wider text-slate-600">
						Confirm Password <span class="text-red-500">*</span>
					</label>
					<input
						id="confirmPassword"
						name="confirmPassword"
						type={showPassword ? 'text' : 'password'}
						autocomplete="new-password"
						required
						bind:value={confirmPassword}
						placeholder="Re-enter password"
						class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#1d5b8c] focus:ring-2 focus:ring-[#1d5b8c]/20 transition-all"
					/>
				</div>

				<!-- Submit Button -->
				<button
					type="submit"
					disabled={isSubmitting || !fullName.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()}
					class="w-full mt-2 flex items-center justify-center gap-2 rounded-lg bg-[#1d5b8c] hover:bg-[#15466e] px-4 py-3 text-sm font-bold text-white shadow-md shadow-[#1d5b8c]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
				>
					{#if isSubmitting}
						<span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
						<span>Creating Super Admin...</span>
					{:else}
						<span>Complete Super Admin Registration</span>
						<span class="material-symbols-outlined text-[18px]">arrow_forward</span>
					{/if}
				</button>
			</form>

			<div class="text-center">
				<a href="/login" class="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors">
					← Back to Sign In
				</a>
			</div>
		</div>

		<!-- Footer -->
		<div class="pt-6 text-center text-xs text-slate-400">
			Protected by Resolv Security & Workspace Isolation
		</div>
	</div>
</div>
