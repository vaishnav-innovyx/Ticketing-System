import type { ConsoleLogEntry, EnvironmentDiagnostics, LogLevel, ParsedDiagnostics } from '$lib/types/diagnostics';

function normalizeLevel(val: unknown): LogLevel {
	if (typeof val !== 'string') return 'log';
	const s = val.toLowerCase().trim();
	if (s.includes('err') || s === 'exception') return 'error';
	if (s.includes('warn')) return 'warn';
	if (s.includes('info')) return 'info';
	if (s.includes('debug') || s.includes('trace')) return 'debug';
	return 'log';
}

function parseStringLogLine(line: string, index: number): ConsoleLogEntry {
	let level: LogLevel = 'log';
	let message = line;
	let timestamp: string | undefined = undefined;

	// Pattern 1: [2026-09-09T10:00:00Z] [ERROR] message
	const bracketMatch = line.match(/^\[(.*?)\]\s*\[(.*?)\]\s*(.*)$/);
	if (bracketMatch) {
		const [, timeStr, levelStr, msgStr] = bracketMatch;
		if (!isNaN(Date.parse(timeStr))) {
			timestamp = timeStr;
		}
		level = normalizeLevel(levelStr);
		message = msgStr;
	} else {
		// Pattern 2: [ERROR] message or ERROR: message
		const simpleMatch = line.match(/^\[?(ERROR|WARN|WARNING|INFO|LOG|DEBUG)\]?:?\s*(.*)$/i);
		if (simpleMatch) {
			level = normalizeLevel(simpleMatch[1]);
			message = simpleMatch[2];
		}
	}

	return {
		id: `log-str-${index}`,
		level,
		message,
		timestamp
	};
}

function parseLogItem(item: unknown, index: number): ConsoleLogEntry {
	if (typeof item === 'string') {
		return parseStringLogLine(item, index);
	}

	if (typeof item === 'object' && item !== null) {
		const obj = item as Record<string, unknown>;
		const rawLevel = obj.level ?? obj.type ?? obj.severity ?? 'log';
		const level = normalizeLevel(rawLevel);

		let message = '';
		if (typeof obj.message === 'string') {
			message = obj.message;
		} else if (typeof obj.text === 'string') {
			message = obj.text;
		} else if (typeof obj.msg === 'string') {
			message = obj.msg;
		} else if (Array.isArray(obj.args)) {
			message = obj.args
				.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a)))
				.join(' ');
		} else {
			message = JSON.stringify(item);
		}

		let timestamp: string | undefined = undefined;
		if (typeof obj.timestamp === 'string') {
			timestamp = obj.timestamp;
		} else if (typeof obj.time === 'string') {
			timestamp = obj.time;
		} else if (typeof obj.timestamp === 'number') {
			timestamp = new Date(obj.timestamp).toISOString();
		}

		const stack = typeof obj.stack === 'string' ? obj.stack : undefined;
		const data = obj.data ?? obj.args ?? undefined;

		return {
			id: `log-${index}`,
			level,
			message,
			timestamp,
			stack,
			data
		};
	}

	return {
		id: `log-${index}`,
		level: 'log',
		message: String(item)
	};
}

export function parseDiagnostics(raw: unknown): ParsedDiagnostics | null {
	if (!raw) return null;

	let rawObj: Record<string, unknown> | null = null;
	let rawLogs: unknown[] = [];

	if (typeof raw === 'string') {
		try {
			const parsed = JSON.parse(raw);
			return parseDiagnostics(parsed);
		} catch {
			// Plain text log lines
			const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
			const logs = lines.map((line, idx) => parseStringLogLine(line, idx));
			const errorCount = logs.filter((l) => l.level === 'error').length;
			const warnCount = logs.filter((l) => l.level === 'warn').length;
			const infoCount = logs.filter((l) => l.level === 'info' || l.level === 'log').length;

			return {
				logs,
				errorCount,
				warnCount,
				infoCount,
				rawJson: raw
			};
		}
	}

	if (Array.isArray(raw)) {
		rawLogs = raw;
	} else if (typeof raw === 'object' && raw !== null) {
		rawObj = raw as Record<string, unknown>;

		if (Array.isArray(rawObj.console_logs)) {
			rawLogs = rawObj.console_logs;
		} else if (Array.isArray(rawObj.logs)) {
			rawLogs = rawObj.logs;
		} else if (Array.isArray(rawObj.console)) {
			rawLogs = rawObj.console;
		} else if (typeof rawObj.console_logs === 'string') {
			const lines = rawObj.console_logs.split(/\r?\n/).filter((l) => l.trim().length > 0);
			rawLogs = lines;
		} else if (typeof rawObj.logs === 'string') {
			const lines = rawObj.logs.split(/\r?\n/).filter((l) => l.trim().length > 0);
			rawLogs = lines;
		}
	}

	const logs: ConsoleLogEntry[] = rawLogs.map((item, idx) => parseLogItem(item, idx));

	let environment: EnvironmentDiagnostics | undefined = undefined;
	if (rawObj) {
		const envObj = (rawObj.environment ?? rawObj.system ?? rawObj.client ?? {}) as Record<string, unknown>;
		environment = {
			url: (rawObj.url ?? envObj.url ?? rawObj.current_url) as string | undefined,
			userAgent: (rawObj.userAgent ?? rawObj.user_agent ?? envObj.userAgent ?? envObj.user_agent) as string | undefined,
			browser: (rawObj.browser ?? envObj.browser) as string | undefined,
			os: (rawObj.os ?? envObj.os ?? envObj.platform) as string | undefined,
			screen: (rawObj.screen ?? envObj.screen) as string | undefined,
			appVersion: (rawObj.appVersion ?? rawObj.app_version ?? envObj.version) as string | undefined,
			environment: (rawObj.env ?? envObj.env ?? envObj.environment) as string | undefined
		};

		// If all fields are undefined, keep environment undefined
		const hasAnyEnv = Object.values(environment).some((v) => v !== undefined);
		if (!hasAnyEnv) {
			environment = undefined;
		}
	}

	const errorCount = logs.filter((l) => l.level === 'error').length;
	const warnCount = logs.filter((l) => l.level === 'warn').length;
	const infoCount = logs.filter((l) => l.level === 'info' || l.level === 'log').length;

	return {
		logs,
		environment,
		errorCount,
		warnCount,
		infoCount,
		rawJson: raw
	};
}

export function formatLogsAsText(diagnostics: ParsedDiagnostics): string {
	const header: string[] = ['=== CONSOLE LOGS & DIAGNOSTICS ==='];

	if (diagnostics.environment) {
		header.push('--- ENVIRONMENT ---');
		if (diagnostics.environment.url) header.push(`URL: ${diagnostics.environment.url}`);
		if (diagnostics.environment.browser) header.push(`Browser: ${diagnostics.environment.browser}`);
		if (diagnostics.environment.os) header.push(`OS: ${diagnostics.environment.os}`);
		if (diagnostics.environment.userAgent) header.push(`User Agent: ${diagnostics.environment.userAgent}`);
		if (diagnostics.environment.screen) header.push(`Screen: ${diagnostics.environment.screen}`);
		header.push('-------------------');
	}

	header.push(`Total Entries: ${diagnostics.logs.length} (Errors: ${diagnostics.errorCount}, Warnings: ${diagnostics.warnCount})`);
	header.push('');

	const lines = diagnostics.logs.map((log) => {
		const time = log.timestamp ? `[${log.timestamp}] ` : '';
		const lvl = `[${log.level.toUpperCase()}]`.padEnd(8);
		let out = `${time}${lvl} ${log.message}`;
		if (log.stack) {
			out += `\n  Stack: ${log.stack}`;
		}
		if (log.data) {
			out += `\n  Data: ${JSON.stringify(log.data, null, 2)}`;
		}
		return out;
	});

	return header.concat(lines).join('\n');
}
