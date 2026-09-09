export type LogLevel = 'error' | 'warn' | 'info' | 'log' | 'debug';

export interface ConsoleLogEntry {
	id: string;
	timestamp?: string;
	level: LogLevel;
	message: string;
	stack?: string;
	data?: unknown;
}

export interface EnvironmentDiagnostics {
	url?: string;
	userAgent?: string;
	browser?: string;
	os?: string;
	screen?: string;
	appVersion?: string;
	environment?: string;
	[key: string]: unknown;
}

export interface ParsedDiagnostics {
	logs: ConsoleLogEntry[];
	environment?: EnvironmentDiagnostics;
	errorCount: number;
	warnCount: number;
	infoCount: number;
	rawJson: unknown;
}
