import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';

export interface EmailTicketInfo {
	id: string;
	token: string;
	title: string;
	description?: string | null;
	category: string;
	priority: string;
	status: string;
	targetDate?: string | null;
	clientName?: string | null;
	projectName?: string | null;
	raiserName?: string | null;
	specialistName?: string | null;
	estimatedHours?: number | null;
}

export interface MasterLayoutOptions {
	title: string;
	badgeText: string;
	badgeBgColor?: string;
	badgeTextColor?: string;
	contentHtml: string;
	actionUrl?: string;
	actionText?: string;
}

const APP_NAME = publicEnv.PUBLIC_APP_NAME || 'Resolv Ticketing System';
const SITE_URL = publicEnv.PUBLIC_SITE_URL || 'http://localhost:5173';
const COMPANY_NAME = privateEnv.EMAIL_COMPANY_NAME || 'Innovyx Tech Labs';
const SUPPORT_ADDRESS = privateEnv.EMAIL_SUPPORT_ADDRESS || 'alerts@innovyxtechlabs.com';

/**
 * Single source of truth master HTML layout component.
 * Adheres strictly to Standard Industrial Enterprise design guidelines:
 * - Subdued, high-contrast slate/grey canvas (#F8FAFC)
 * - Pure white container card (#FFFFFF) with neutral border (#E2E8F0)
 * - Minimalist dark header bar (#0F172A)
 * - Clean system typography stack, no decorative gradients or over-coloring
 */
export function renderEmailLayout(options: MasterLayoutOptions): string {
	const actionButtonHtml = options.actionUrl
		? `
      <div style="margin-top: 28px; margin-bottom: 24px; text-align: left;">
        <a href="${options.actionUrl}" target="_blank" style="background-color: #0F172A; color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 600; text-decoration: none; padding: 10px 20px; border-radius: 6px; display: inline-block;">
          ${options.actionText || 'View Ticket Details'} &rarr;
        </a>
      </div>
    `
		: '';

	const badgeBg = options.badgeBgColor || '#F1F5F9';
	const badgeText = options.badgeTextColor || '#334155';

	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1E293B;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);">
          
          <!-- Industrial Header Bar -->
          <tr>
            <td style="background-color: #0F172A; padding: 18px 24px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="font-size: 16px; font-weight: 700; color: #FFFFFF; letter-spacing: -0.02em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      ${APP_NAME}
                    </span>
                  </td>
                  <td align="right">
                    <span style="background-color: ${badgeBg}; color: ${badgeText}; font-size: 11px; font-weight: 600; text-transform: uppercase; padding: 4px 10px; border-radius: 12px; letter-spacing: 0.05em; display: inline-block;">
                      ${options.badgeText}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding: 28px 24px;">
              <h1 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 700; color: #0F172A; line-height: 1.3;">
                ${options.title}
              </h1>

              ${options.contentHtml}

              ${actionButtonHtml}
            </td>
          </tr>

          <!-- Footer Bar -->
          <tr>
            <td style="background-color: #F8FAFC; padding: 16px 24px; border-top: 1px solid #E2E8F0; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748B; line-height: 1.4;">
                This is an automated notification from <strong>${APP_NAME}</strong>.
              </p>
              <p style="margin: 0; font-size: 11px; color: #94A3B8;">
                &copy; ${new Date().getFullYear()} ${COMPANY_NAME}. For assistance, contact <a href="mailto:${SUPPORT_ADDRESS}" style="color: #475569; text-decoration: underline;">${SUPPORT_ADDRESS}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Formats a clean 2-column key-value attribute grid for ticket details
 */
export function renderTicketDetailsGrid(ticket: EmailTicketInfo): string {
	const priorityUpper = (ticket.priority || 'medium').toUpperCase();
	const isP0 = ticket.priority === 'critical';
	const priorityBadge = isP0
		? `<span style="background-color: #FEE2E2; color: #991B1B; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 11px;">CRITICAL (P0)</span>`
		: `<span style="background-color: #F1F5F9; color: #334155; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 11px;">${priorityUpper}</span>`;

	return `
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 16px; margin-bottom: 20px; border: 1px solid #E2E8F0; border-radius: 6px; background-color: #F8FAFC;">
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0; font-size: 13px; color: #64748B; width: 35%; font-weight: 500;">Ticket Token</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0; font-size: 13px; color: #0F172A; font-weight: 700; font-family: monospace;">${ticket.token}</td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0; font-size: 13px; color: #64748B; font-weight: 500;">Category & Priority</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0; font-size: 13px; color: #0F172A;">
          <span style="text-transform: capitalize; font-weight: 600;">${ticket.category}</span> &bull; ${priorityBadge}
        </td>
      </tr>
      ${
				ticket.clientName || ticket.projectName
					? `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0; font-size: 13px; color: #64748B; font-weight: 500;">Project / Client</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0; font-size: 13px; color: #0F172A;">${ticket.projectName || ''} ${ticket.clientName ? `(${ticket.clientName})` : ''}</td>
      </tr>
      `
					: ''
			}
      ${
				ticket.raiserName
					? `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0; font-size: 13px; color: #64748B; font-weight: 500;">Raised By</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0; font-size: 13px; color: #0F172A;">${ticket.raiserName}</td>
      </tr>
      `
					: ''
			}
      ${
				ticket.specialistName
					? `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0; font-size: 13px; color: #64748B; font-weight: 500;">Assigned Developer</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0; font-size: 13px; color: #0F172A;">${ticket.specialistName}</td>
      </tr>
      `
					: ''
			}
      ${
				ticket.estimatedHours !== null && ticket.estimatedHours !== undefined
					? `
      <tr>
        <td style="padding: 12px 16px; font-size: 13px; color: #64748B; font-weight: 500;">Estimated Hours</td>
        <td style="padding: 12px 16px; font-size: 13px; color: #0F172A; font-weight: 600;">${ticket.estimatedHours} hrs</td>
      </tr>
      `
					: ''
			}
    </table>
  `;
}

export type StageEventKey =
	| 'ticket_raised'
	| 'poc_triaged'
	| 'requirement_estimation'
	| 'client_approval'
	| 'estimate_approved'
	| 'estimate_rejected'
	| 'development'
	| 'delivery'
	| 'closed'
	| 'reopened'
	| 'pending_admin_approval'
	| 'admin_rejected';

export interface StageEmailParams {
	event: StageEventKey;
	ticket: EmailTicketInfo;
	actorName?: string | null;
	notes?: string | null;
}

/**
 * Reusable stage content builder mapping event keys to stage titles, badges, and body content.
 */
export function renderStageEmail(params: StageEmailParams): {
	subject: string;
	html: string;
	badgeText: string;
} {
	const { event, ticket, actorName, notes } = params;
	const isRoot = event === 'ticket_raised';
	const token = ticket.token;
	const title = ticket.title;
	const actionUrl = `${SITE_URL}/portal/my-tickets/${token}`;

	let subject = isRoot ? `[${token}] ${title}` : `Re: [${token}] ${title}`;
	let badgeText = 'Status Update';
	let badgeBgColor = '#F1F5F9';
	let badgeTextColor = '#334155';
	let headline = `Ticket ${token} Updated`;
	let leadMessage = `The ticket status has been updated.`;

	switch (event) {
		case 'ticket_raised':
			badgeText = 'Ticket Raised';
			badgeBgColor = '#E0F2FE';
			badgeTextColor = '#0369A1';
			headline = `New Ticket Raised: ${token}`;
			leadMessage = `A new ticket has been submitted to the ticketing system and is currently queued for triage.`;
			break;

		case 'pending_admin_approval':
			subject = `Re: [${token}] Pending Admin Approval: ${title}`;
			badgeText = 'Approval Required';
			badgeBgColor = '#FEF3C7';
			badgeTextColor = '#B45309';
			headline = `Admin Approval Required: ${token}`;
			leadMessage = `This ticket was raised by a client user and requires Client/Project Admin review before proceeding to triage.`;
			break;

		case 'admin_rejected':
			subject = `Re: [${token}] Ticket Rejected by Admin: ${title}`;
			badgeText = 'Rejected by Admin';
			badgeBgColor = '#FEE2E2';
			badgeTextColor = '#B91C1C';
			headline = `Ticket Rejected by Admin`;
			leadMessage = `This ticket was reviewed and rejected by the administrator.`;
			break;

		case 'poc_triaged':
			badgeText = 'In Triage';
			badgeBgColor = '#F1F5F9';
			badgeTextColor = '#334155';
			headline = `Ticket Under Triage`;
			leadMessage = `The Point of Contact has acknowledged ticket ${token} and initiated triage.`;
			break;

		case 'requirement_estimation':
			badgeText = 'Estimation Phase';
			badgeBgColor = '#E0E7FF';
			badgeTextColor = '#4338CA';
			headline = `Requirement Analysis & Estimation`;
			leadMessage = `The technical specialist is analyzing requirements to provide a time & effort estimation.`;
			break;

		case 'client_approval':
			badgeText = 'Awaiting Approval';
			badgeBgColor = '#FEF3C7';
			badgeTextColor = '#B45309';
			headline = `Estimate Ready for Client Approval`;
			leadMessage = `The requirement analysis and estimation for ticket ${token} has been completed and is awaiting client approval.`;
			break;

		case 'estimate_approved':
			subject = `Re: [${token}] Estimate Approved: ${title}`;
			badgeText = 'Estimate Approved';
			badgeBgColor = '#DCFCE7';
			badgeTextColor = '#15803D';
			headline = `Estimate Approved`;
			leadMessage = `The estimate for ticket ${token} was approved. Development work can now proceed.`;
			break;

		case 'estimate_rejected':
			subject = `Re: [${token}] Estimate Revision Requested: ${title}`;
			badgeText = 'Revision Requested';
			badgeBgColor = '#FEE2E2';
			badgeTextColor = '#B91C1C';
			headline = `Estimate Revision Requested`;
			leadMessage = `The client requested changes regarding the scope or estimated hours for ticket ${token}.`;
			break;

		case 'development':
			badgeText = 'In Development';
			badgeBgColor = '#D1FAE5';
			badgeTextColor = '#047857';
			headline = `Development Started`;
			leadMessage = `Ticket ${token} has moved into active development.`;
			break;

		case 'delivery':
			badgeText = 'In Delivery';
			badgeBgColor = '#F3E8FF';
			badgeTextColor = '#6B21A8';
			headline = `Development Completed & Ready for Delivery`;
			leadMessage = `Development on ticket ${token} is finished. The ticket is currently in delivery and quality verification.`;
			break;

		case 'closed':
			badgeText = 'Closed / Resolved';
			badgeBgColor = '#E2E8F0';
			badgeTextColor = '#475569';
			headline = `Ticket Resolved & Closed`;
			leadMessage = `Ticket ${token} has been successfully resolved and closed.`;
			break;

		case 'reopened':
			subject = `Re: [${token}] Ticket Reopened: ${title}`;
			badgeText = 'Ticket Reopened';
			badgeBgColor = '#FFEDD5';
			badgeTextColor = '#C2410C';
			headline = `Ticket Reopened`;
			leadMessage = `Ticket ${token} has been reopened and returned to active development.`;
			break;
	}

	const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.5; color: #334155;">
      ${leadMessage}
    </p>

    ${
			ticket.description
				? `
    <div style="margin-bottom: 20px; padding: 14px 16px; background-color: #F8FAFC; border-left: 3px solid #0F172A; border-radius: 0 4px 4px 0; font-size: 13px; color: #334155; line-height: 1.5;">
      <strong style="color: #0F172A; display: block; margin-bottom: 4px;">Summary / Description:</strong>
      ${ticket.description}
    </div>
    `
				: ''
		}

    ${
			notes
				? `
    <div style="margin-bottom: 20px; padding: 14px 16px; background-color: #FFFBEB; border: 1px solid #FCD34D; border-radius: 6px; font-size: 13px; color: #92400E; line-height: 1.5;">
      <strong style="color: #78350F; display: block; margin-bottom: 4px;">Notes ${actorName ? `from ${actorName}` : ''}:</strong>
      ${notes}
    </div>
    `
				: ''
		}

    ${renderTicketDetailsGrid(ticket)}
  `;

	const html = renderEmailLayout({
		title: headline,
		badgeText,
		badgeBgColor,
		badgeTextColor,
		contentHtml,
		actionUrl,
		actionText: 'View Ticket in Ticketing System'
	});

	return { subject, html, badgeText };
}
