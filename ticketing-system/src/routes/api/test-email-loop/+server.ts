import { json, type RequestHandler } from '@sveltejs/kit';
import { runAutomatedStageEmailLoopTest } from '$lib/server/testStageEmailLoop';

export const GET: RequestHandler = async () => {
	try {
		const result = await runAutomatedStageEmailLoopTest();
		return json({
			success: true,
			message: `Automated 7-Stage Email Loop Test Completed for Ticket ${result.ticketToken}`,
			result
		});
	} catch (err: any) {
		console.error('[API Test Loop Error]:', err);
		return json(
			{
				success: false,
				error: err?.message || String(err)
			},
			{ status: 500 }
		);
	}
};

export const POST: RequestHandler = GET;
