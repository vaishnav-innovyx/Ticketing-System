export type TicketStatus =
	| 'In Development'
	| 'Awaiting Client'
	| 'Awaiting Your Response'
	| 'Resolved'
	| 'Open'
	| 'In Progress'
	| 'Triaged';

export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type TicketCategory = 'Bug' | 'Enhancement' | 'Question' | 'Billing' | 'Security';
export type TicketApplication = 'Sales Dashboard' | 'Admin Portal' | 'Inventory Portal' | 'Analytics Hub' | 'General';

export interface TicketMessage {
	id: string;
	author: string;
	role: 'client' | 'staff' | 'ai';
	avatar?: string;
	badge?: string;
	timestamp: string;
	content: string;
	attachments?: Array<{
		name: string;
		size: string;
		type: 'pdf' | 'img' | 'log' | 'doc';
		url?: string;
	}>;
}

export interface PortalTicket {
	id: string;
	title: string;
	description: string;
	stepsToReproduce?: string[];
	expectedBehavior?: string;
	actualResult?: string;
	status: TicketStatus;
	priority: TicketPriority;
	category: TicketCategory;
	application: TicketApplication;
	environment: string;
	createdAt: string;
	lastUpdated: string;
	clientName: string;
	clientCompany: string;
	assignee: {
		name: string;
		role: string;
		avatar: string;
	};
	targetResolution?: string;
	progressStep: number; // 0 to 7: Raised, Triaged, Estimated, Approved, In Dev, QA, Deployed, Resolved
	aiSummary?: {
		whatWeUnderstand: string[];
		possibleCause: string;
	};
	ccRecipients?: string[];
	messages: TicketMessage[];
	attachments: Array<{
		name: string;
		size: string;
		type: string;
		downloadUrl?: string;
	}>;
}

export const initialTickets: PortalTicket[] = [
	{
		id: 'TK-1042',
		title: 'Invoice PDF is not downloading',
		description:
			'When I try to download an invoice PDF from the Sales Dashboard for Q3, the system throws a 500 error page. This is happening for all clients in the US region. I need to send these out by EOD Friday.\n\nSteps to reproduce:\n1. Go to Sales Dashboard\n2. Filter by Q3, US Region\n3. Click "Download PDF" on any row\n\nResult: Blank page with "Error 500: Internal Server Error".',
		stepsToReproduce: [
			'Go to Sales Dashboard',
			'Filter by Q3, US Region',
			"Click 'Download PDF' on any row"
		],
		expectedBehavior: 'Invoice PDF should download immediately with current styling.',
		actualResult: 'Blank page with "Error 500: Internal Server Error".',
		status: 'In Development',
		priority: 'High',
		category: 'Bug',
		application: 'Sales Dashboard',
		environment: 'Production',
		createdAt: 'Aug 18, 2026 09:30 AM',
		lastUpdated: 'Updated 2 hours ago',
		clientName: 'John Mathew',
		clientCompany: 'Acme Corporation',
		assignee: {
			name: 'David Chen',
			role: 'Lead Backend Engineer',
			avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAETBKKW9S3kle_m3lqYtIT-S2NBnrIf81zEhwXsZyF0Qx9w6vMCcMkDbHjS5MaAIG4ZdCvtvUAnNdiF3Afqu412OJv-54qzQNwAaaKp2jWmkguXancEvSNykRhoiErN2KIv1BUSvz5LXH8WzZt-OgkOVzZlxF675D9hNnt4LPSHbNfuzF5yCEyfdQv0jh4mnXdPg_-Z5amXXSzDaEMupaZZTzJ5IZI2ky8lYTX-4_n_aL9x_46cf7ifA'
		},
		targetResolution: 'Today, 5:00 PM EST',
		progressStep: 4, // In Dev
		aiSummary: {
			whatWeUnderstand: [
				'Issue occurs specifically in US Region, Q3 filter.',
				"Action triggered is 'Download PDF'.",
				'Resulting in a 500 Internal Server Error.'
			],
			possibleCause:
				'Based on recent deployments, the PDF generation library updated on Tuesday. It may be failing on specific locale formatting requirements for US addresses, causing the backend service to crash during rendering.'
		},
		messages: [
			{
				id: 'm1',
				author: 'John Mathew',
				role: 'client',
				avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBEAUC65ORPmsT6mXMOkdReMsILShQV97ex_PXYgmVq_kIeN65qT9x4jWaNu8k7nxOuVQfG92OtLJiYE_TI9CEgifKII1bhjCiviRh9b4GUtZpYPI-25e0R4xtzwqU1xVd9oZ_G7VvFQObpCjpeMeuIaEk4WTJ0yZvl9FUBXs77HLsNnwUF8oBLrc4SFYRR-cIR9EguzGkSXQPuYxXdGv0erR2770L7-_8S4C3dcJBlAm6kHLtAhLbADw',
				timestamp: 'Today at 09:30 AM',
				content:
					'We are noticing that trying to generate batch invoice PDFs for Q3 US region yields a 500 error consistently. Please check urgent severity since billing closing is today.'
			},
			{
				id: 'm2',
				author: 'David Chen',
				role: 'staff',
				badge: 'Lead Engineer',
				avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAETBKKW9S3kle_m3lqYtIT-S2NBnrIf81zEhwXsZyF0Qx9w6vMCcMkDbHjS5MaAIG4ZdCvtvUAnNdiF3Afqu412OJv-54qzQNwAaaKp2jWmkguXancEvSNykRhoiErN2KIv1BUSvz5LXH8WzZt-OgkOVzZlxF675D9hNnt4LPSHbNfuzF5yCEyfdQv0jh4mnXdPg_-Z5amXXSzDaEMupaZZTzJ5IZI2ky8lYTX-4_n_aL9x_46cf7ifA',
				timestamp: 'Today at 10:15 AM',
				content:
					"Hi John, I've reproduced the issue in our staging cluster. It's tied to the currency symbol font renderer in the newest Puppeteer release. We're rolling out a hotfix to our PDF worker microservice right now.",
				attachments: [
					{
						name: 'stacktrace_worker_q3.log',
						size: '42 KB',
						type: 'log'
					}
				]
			},
			{
				id: 'm3',
				author: 'John Mathew',
				role: 'client',
				avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBEAUC65ORPmsT6mXMOkdReMsILShQV97ex_PXYgmVq_kIeN65qT9x4jWaNu8k7nxOuVQfG92OtLJiYE_TI9CEgifKII1bhjCiviRh9b4GUtZpYPI-25e0R4xtzwqU1xVd9oZ_G7VvFQObpCjpeMeuIaEk4WTJ0yZvl9FUBXs77HLsNnwUF8oBLrc4SFYRR-cIR9EguzGkSXQPuYxXdGv0erR2770L7-_8S4C3dcJBlAm6kHLtAhLbADw',
				timestamp: 'Today at 11:00 AM',
				content:
					'Thanks David! Let us know as soon as the patch is deployed so our finance team can verify.'
			}
		],
		attachments: [
			{
				name: 'q3_invoice_error_screen.png',
				size: '240 KB',
				type: 'img'
			},
			{
				name: 'sample_invoice_expected.pdf',
				size: '1.2 MB',
				type: 'pdf'
			}
		]
	},
	{
		id: 'TK-1038',
		title: 'Dashboard performance issue',
		description:
			'Sales analytics overview page takes over 12 seconds to load when selecting custom date intervals spanning more than 6 months.',
		status: 'Awaiting Your Response',
		priority: 'Medium',
		category: 'Bug',
		application: 'Sales Dashboard',
		environment: 'Production',
		createdAt: 'Aug 17, 2026 14:15 PM',
		lastUpdated: 'Updated yesterday',
		clientName: 'John Mathew',
		clientCompany: 'Acme Corporation',
		assignee: {
			name: 'Sarah Jenkins',
			role: 'Support Specialist',
			avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDsSM79NxlbSkPl8Q4gSXAaPiCrA2YWvzaEeIjkHWBwQ2c3bvxaib5bySCsqgg4sZaeVd6vvEX3_EOIbK811HniAYn6Mz7RzFB3LhPZ5Bm-HO6Q4jVJShnZIiekwROWznPQEpk6hIvl2BOECGaTfA8NEm3ZXV-448UmI8sjwYCCLD5ihUv2y_5yvm-e62BRTNbN6PGKg8GzYZmfzOgqBQc6HVKkHMgflga-X3pyZGEmgtLSagCMRcabcg'
		},
		targetResolution: 'Aug 20, 2026',
		progressStep: 1, // Triaged
		aiSummary: {
			whatWeUnderstand: [
				'High latency encountered when querying > 6 month historical sales records.',
				'Client response required on whether date pagination or aggregated rollups are preferred.'
			],
			possibleCause: 'Unindexed timestamp query on the multi-tenant transactional shard.'
		},
		messages: [
			{
				id: 'm1',
				author: 'Sarah Jenkins',
				role: 'staff',
				badge: 'Support',
				timestamp: 'Yesterday at 16:40 PM',
				content:
					'Hi John, could you confirm if enabling 1-week pre-aggregated data points works for your quarterly analysis, or do you need per-second granularity for all 6 months?'
			}
		],
		attachments: []
	},
	{
		id: 'TK-1031',
		title: 'User access request',
		description:
			'Requesting elevated Admin role credentials and single sign-on mapping for 4 new finance audit team members.',
		status: 'Resolved',
		priority: 'Low',
		category: 'Question',
		application: 'Admin Portal',
		environment: 'Production',
		createdAt: 'Aug 14, 2026 10:00 AM',
		lastUpdated: 'Updated Aug 14',
		clientName: 'John Mathew',
		clientCompany: 'Acme Corporation',
		assignee: {
			name: 'Marcus Vance',
			role: 'Identity & Access Lead',
			avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAETBKKW9S3kle_m3lqYtIT-S2NBnrIf81zEhwXsZyF0Qx9w6vMCcMkDbHjS5MaAIG4ZdCvtvUAnNdiF3Afqu412OJv-54qzQNwAaaKp2jWmkguXancEvSNykRhoiErN2KIv1BUSvz5LXH8WzZt-OgkOVzZlxF675D9hNnt4LPSHbNfuzF5yCEyfdQv0jh4mnXdPg_-Z5amXXSzDaEMupaZZTzJ5IZI2ky8lYTX-4_n_aL9x_46cf7ifA'
		},
		targetResolution: 'Aug 14, 2026 (Completed)',
		progressStep: 7, // Resolved
		aiSummary: {
			whatWeUnderstand: ['4 SAML audit users provisioned.'],
			possibleCause: 'Standard access workflow.'
		},
		messages: [
			{
				id: 'm1',
				author: 'Marcus Vance',
				role: 'staff',
				badge: 'Security',
				timestamp: 'Aug 14 at 11:30 AM',
				content:
					'All 4 requested users have been added to Okta role group "Finance-Auditors" with required least-privilege tokens.'
			}
		],
		attachments: []
	},
	{
		id: 'TK-1025',
		title: 'Bulk Export of Historical Ticket Logs',
		description: 'Need a nightly CSV export of all resolved tickets directly to our S3 bucket.',
		status: 'Resolved',
		priority: 'Low',
		category: 'Enhancement',
		application: 'Admin Portal',
		environment: 'Production',
		createdAt: 'Jul 28, 2026 16:45 PM',
		lastUpdated: 'Updated Jul 30',
		clientName: 'John Mathew',
		clientCompany: 'Acme Corporation',
		assignee: {
			name: 'Sarah Jenkins',
			role: 'Support Specialist',
			avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDsSM79NxlbSkPl8Q4gSXAaPiCrA2YWvzaEeIjkHWBwQ2c3bvxaib5bySCsqgg4sZaeVd6vvEX3_EOIbK811HniAYn6Mz7RzFB3LhPZ5Bm-HO6Q4jVJShnZIiekwROWznPQEpk6hIvl2BOECGaTfA8NEm3ZXV-448UmI8sjwYCCLD5ihUv2y_5yvm-e62BRTNbN6PGKg8GzYZmfzOgqBQc6HVKkHMgflga-X3pyZGEmgtLSagCMRcabcg'
		},
		progressStep: 7,
		messages: [],
		attachments: []
	}
];

// Reactive client state store
let portalTicketsStore = [...initialTickets];

export function getPortalTickets(): PortalTicket[] {
	return portalTicketsStore;
}

export function getTicketById(id: string): PortalTicket | undefined {
	return portalTicketsStore.find((t) => t.id.toLowerCase() === id.toLowerCase());
}

export function createPortalTicket(newTicket: {
	title: string;
	description: string;
	category: TicketCategory;
	application: TicketApplication;
	priority: TicketPriority;
	attachments?: Array<{ name: string; size: string; type: string }>;
	ccRecipients?: string[];
}): PortalTicket {
	const newId = `TK-${Math.floor(1050 + Math.random() * 100)}`;
	const created: PortalTicket = {
		id: newId,
		title: newTicket.title,
		description: newTicket.description,
		status: 'Open',
		priority: newTicket.priority,
		category: newTicket.category,
		application: newTicket.application,
		environment: 'Production',
		createdAt: 'Just now',
		lastUpdated: 'Just now',
		clientName: 'John Mathew',
		clientCompany: 'Acme Corporation',
		assignee: {
			name: 'Triage Queue',
			role: 'Support On-Call',
			avatar: ''
		},
		targetResolution: 'Within 24 hours',
		progressStep: 0,
		aiSummary: {
			whatWeUnderstand: [`Newly submitted request for ${newTicket.application}.`],
			possibleCause: 'Pending engineering assessment.'
		},
		ccRecipients: newTicket.ccRecipients || [],
		messages: [
			{
				id: `m-${Date.now()}`,
				author: 'John Mathew',
				role: 'client',
				timestamp: 'Just now',
				content: newTicket.description
			}
		],
		attachments: newTicket.attachments || []
	};

	portalTicketsStore = [created, ...portalTicketsStore];
	return created;
}

export function addTicketReply(ticketId: string, content: string): boolean {
	const ticket = portalTicketsStore.find((t) => t.id.toLowerCase() === ticketId.toLowerCase());
	if (!ticket) return false;

	ticket.messages.push({
		id: `m-${Date.now()}`,
		author: 'John Mathew',
		role: 'client',
		timestamp: 'Just now',
		content
	});
	ticket.lastUpdated = 'Just now';
	return true;
}
