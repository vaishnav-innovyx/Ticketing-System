import { supabaseAdmin } from '$lib/server/supabase';
import { dispatchStageEmailNotification } from './email';
import type { StageEventKey } from './emailTemplates';

export interface TestStageLog {
	stage: string;
	event: StageEventKey;
	timestamp: string;
	success: boolean;
	error?: string;
}

export interface TestLoopResult {
	ticketToken: string;
	ticketId: string;
	recipients: {
		to: string;
		cc: string[];
	};
	stagesCompleted: TestStageLog[];
}

export async function runAutomatedStageEmailLoopTest(): Promise<TestLoopResult> {
	console.log('[Test Loop] Starting automated 7-stage email loop verification...');

	const emails = {
		raiser: 'shelvinsunilphilip@gmail.com',
		admin: 'shelvin.sp@innovyxtechlabs.com',
		developer: 'sspgaming2020@gmail.com',
		deliveryManager: 'shelvin4gta5@gmail.com',
		watcher: 'shelvinrcss@gmail.com'
	};

	// 1. Ensure client & project exist
	const { data: client } = await supabaseAdmin
		.from('clients')
		.select('id, code, name')
		.eq('code', 'ACME')
		.maybeSingle();

	const clientId = client?.id || '11111111-1111-1111-1111-111111111111';

	let { data: project } = await supabaseAdmin
		.from('projects')
		.select('id, code, name')
		.eq('client_id', clientId)
		.eq('code', 'MBANK')
		.maybeSingle();

	if (!project) {
		const { data: newProj } = await supabaseAdmin
			.from('projects')
			.insert({ client_id: clientId, code: 'MBANK', name: 'Acme Mobile Banking' })
			.select('id, code, name')
			.single();
		project = newProj;
	}

	const projectId = project?.id || '';

	// 2. Ensure test profiles exist
	async function ensureProfile(email: string, fullName: string, role: any) {
		const { data: existing } = await supabaseAdmin
			.from('profiles')
			.select('id, email, role')
			.eq('email', email.toLowerCase())
			.maybeSingle();

		if (existing) return existing.id;

		// Create Auth user if missing
		const { data: authData } = await supabaseAdmin.auth.admin.createUser({
			email,
			password: 'ChangeMe123!',
			email_confirm: true,
			user_metadata: { full_name: fullName }
		});

		const userId = authData?.user?.id || crypto.randomUUID();
		const clientScope = role.startsWith('client_') || role === 'project_admin' ? clientId : null;

		await supabaseAdmin.from('profiles').upsert({
			id: userId,
			email: email.toLowerCase(),
			full_name: fullName,
			role,
			client_id: clientScope
		});

		try {
			await supabaseAdmin
				.from('project_members')
				.insert({ project_id: projectId, user_id: userId });
		} catch {}

		return userId;
	}

	const raiserId = await ensureProfile(emails.raiser, 'Shelvin Raiser', 'client_raiser');
	const adminId = await ensureProfile(emails.admin, 'Shelvin Project Admin', 'project_admin');
	const developerId = await ensureProfile(emails.developer, 'Shelvin Specialist Dev', 'specialist');
	const deliveryManagerId = await ensureProfile(emails.deliveryManager, 'Shelvin Delivery Lead', 'delivery_lead');
	await ensureProfile(emails.watcher, 'Shelvin Watcher User', 'client_viewer');

	// 3. Create a P0 Critical Ticket
	const { count } = await supabaseAdmin
		.from('tickets')
		.select('id', { count: 'exact', head: true })
		.eq('project_id', projectId);

	const seq = String((count || 0) + 1).padStart(4, '0');
	const token = `ACME-MBANK-TK-${seq}`;

	const { data: ticket, error: ticketError } = await supabaseAdmin
		.from('tickets')
		.insert({
			token,
			client_id: clientId,
			project_id: projectId,
			title: '[TEST] Automated 7-Stage Email Loop Verification',
			description: 'Automated test verifying real email delivery, multi-recipient TO/CC routing, and single-thread loop headers.',
			category: 'bug',
			priority: 'critical', // P0 Critical so watcher is CC'd
			status: 'raised',
			raised_by: raiserId,
			poc_id: adminId,
			specialist_id: developerId,
			delivery_lead_id: deliveryManagerId,
			estimated_hours: 12
		} as never)
		.select('id, token')
		.single();

	if (ticketError || !ticket) {
		throw new Error(`Failed to create test ticket: ${ticketError?.message}`);
	}

	// 4. Add watcher
	try {
		await supabaseAdmin
			.from('ticket_watchers')
			.insert({ ticket_id: ticket.id, email: emails.watcher });
	} catch {}

	// 5. Execute 7-stage email loop sequentially
	const stageLogs: TestStageLog[] = [];

	const stagesToRun: { stage: string; event: StageEventKey; actorId: string; notes?: string }[] = [
		{ stage: 'raised', event: 'ticket_raised', actorId: raiserId },
		{ stage: 'poc_triage', event: 'poc_triaged', actorId: adminId, notes: 'Acknowledged by POC. Starting triage.' },
		{ stage: 'requirement_estimation', event: 'requirement_estimation', actorId: developerId, notes: 'Specialist analyzing technical scope.' },
		{ stage: 'client_approval', event: 'client_approval', actorId: developerId, notes: 'Estimation completed: 12 hours required.' },
		{ stage: 'client_approval (approved)', event: 'estimate_approved', actorId: raiserId, notes: 'Approved by client raiser.' },
		{ stage: 'development', event: 'development', actorId: developerId, notes: 'Coding commenced.' },
		{ stage: 'delivery', event: 'delivery', actorId: deliveryManagerId, notes: 'Build completed and verified by QA.' },
		{ stage: 'closed', event: 'closed', actorId: adminId, notes: 'Issue resolved and closed.' }
	];

	for (const step of stagesToRun) {
		try {
			// Update DB status to reflect stage
			if (step.stage !== 'raised' && step.stage !== 'client_approval (approved)') {
				await supabaseAdmin
					.from('tickets')
					.update({ status: step.stage as any, updated_at: new Date().toISOString() })
					.eq('id', ticket.id);
			}

			// Dispatch stage email notification
			await dispatchStageEmailNotification({
				ticketId: ticket.id,
				event: step.event,
				actorId: step.actorId,
				notes: step.notes
			});

			stageLogs.push({
				stage: step.stage,
				event: step.event,
				timestamp: new Date().toISOString(),
				success: true
			});

			// Short pause to ensure timestamp order
			await new Promise((res) => setTimeout(res, 500));
		} catch (err: any) {
			stageLogs.push({
				stage: step.stage,
				event: step.event,
				timestamp: new Date().toISOString(),
				success: false,
				error: err?.message || String(err)
			});
		}
	}

	return {
		ticketToken: (ticket.token || ticket.id) as string,
		ticketId: ticket.id,
		recipients: {
			to: emails.raiser,
			cc: [emails.admin, emails.developer, emails.deliveryManager, emails.watcher]
		},
		stagesCompleted: stageLogs
	};
}
