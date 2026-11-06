// dsh-tokenhub-usage — Host half.
// Registers an HTTP route on the Web server that returns TokenHub usage
// snapshots (plan credits, model ranking, credit trend, recent calls) gathered
// from the local TokenHub CLI (`th`, normally `~/.local/bin/th`). The browser
// half fetches that route same-origin, so no custom Remote namespace is needed.
import { execFile as execFileCb } from "node:child_process";
import { accessSync, constants as fsConstants } from "node:fs";
import { homedir } from "node:os";
import { promisify } from "node:util";

const execFile = promisify(execFileCb);
const EXEC_TIMEOUT_MS = 60_000;
const ROUTE = "/tokenhub-usage";
const SNAPSHOT_PATH = `${ROUTE}/snapshot`;
const DEFAULT_SERIES = "common";

/** Where a `th` install may live: override, common prefixes, then `$PATH`. */
const TH_CANDIDATES = [
	process.env.DSH_TOKENHUB_TH,
	`${homedir()}/.local/bin/th`,
	"/usr/local/bin/th",
	"/opt/homebrew/bin/th",
	"/opt/local/bin/th",
];

let thPath;

/** Resolve the CLI once: first executable candidate, else bare `th` via PATH. */
function resolveTh() {
	if (thPath !== undefined) return thPath;
	for (const candidate of TH_CANDIDATES) {
		if (!candidate) continue;
		try {
			accessSync(candidate, fsConstants.X_OK);
			thPath = candidate;
			return thPath;
		} catch {
			// try the next candidate
		}
	}
	thPath = "th";
	return thPath;
}

/** Run the TokenHub CLI and parse its `--json` stdout. */
async function runTh(args) {
	let stdout;
	try {
		({ stdout } = await execFile(resolveTh(), args, {
			timeout: EXEC_TIMEOUT_MS,
			maxBuffer: 32 * 1024 * 1024,
		}));
	} catch (error) {
		if (error?.code === "ENOENT") {
			throw new Error(
				"TokenHub CLI not found (th). Install it with `npm i -g tencent-tokenhub-cli`, run `th auth login`, then retry.",
			);
		}
		throw error;
	}
	const start = stdout.indexOf("{");
	if (start < 0) throw new Error(`thcli produced no JSON for: th ${args.join(" ")}`);
	return JSON.parse(stdout.slice(start));
}

function clamp(value, min, max) {
	return Math.min(Math.max(value, min), max);
}

/** Plan holdings, credits and lifetime token counters. */
async function readSummary() {
	const data = await runTh(["plan", "personal", "list", "--json"]);
	const packages = Array.isArray(data?.Packages) ? data.Packages : [];
	const plans = packages
		.filter((pkg) => pkg?.PackageStatus === "ACTIVE" || pkg?.TotalCredits !== undefined)
		.map((pkg) => {
			const total = Number(pkg.TotalCredits ?? 0);
			const used = Number(pkg.TotalUsed ?? 0);
			return {
				series: pkg.Series ?? DEFAULT_SERIES,
				status: pkg.PackageStatus ?? "UNKNOWN",
				pkgId: pkg.PkgId ?? "",
				totalCredits: total,
				usedCredits: used,
				remainingCredits: Math.max(total - used, 0),
				startTime: pkg.StartTime ?? null,
				expireTime: pkg.ExpireTime ?? null,
				autoRenew: pkg.AutoRenewFlag === 1,
				inputToken: Number(pkg.InputToken ?? 0),
				outputToken: Number(pkg.OutputToken ?? 0),
				cacheToken: Number(pkg.CacheToken ?? 0),
			};
		});
	const primary = plans.find((plan) => plan.series === DEFAULT_SERIES) ?? plans[0] ?? null;
	return { plans, primary, fetchedAt: new Date().toISOString() };
}

/** Per-model token ranking over the last `hours` hours (default 7 days). */
async function readModelRank(hours = 168) {
	const window = clamp(Number(hours) || 168, 1, 24 * 31);
	const start = new Date(Date.now() - window * 3_600_000).toISOString();
	const data = await runTh([
		"usage", "rank",
		"--dimension", "model",
		"--metric-type", "tokens",
		"--start-time", start,
		"--json",
	]);
	const models = (Array.isArray(data?.Overview) ? data.Overview : []).map((row) => ({
		key: String(row?.Key ?? ""),
		name: String(row?.Name ?? row?.Key ?? ""),
		totalToken: Number(row?.Stats?.TotalToken ?? 0),
		inputToken: Number(row?.Stats?.InputTotalToken ?? 0),
		outputToken: Number(row?.Stats?.OutputTotalToken ?? 0),
		cacheToken: Number(row?.Stats?.CacheTotalToken ?? 0),
	}));
	const total = data?.TotalStats ?? {};
	return {
		hours: window,
		startTime: data?.StartTime ?? start,
		endTime: data?.EndTime ?? null,
		models,
		total: {
			totalToken: Number(total.TotalToken ?? models.reduce((sum, m) => sum + m.totalToken, 0)),
			inputToken: Number(total.InputTotalToken ?? 0),
			outputToken: Number(total.OutputTotalToken ?? 0),
			cacheToken: Number(total.CacheTotalToken ?? 0),
		},
		fetchedAt: new Date().toISOString(),
	};
}

/** Daily credit consumption trend. */
async function readCreditTrend(range = "30day") {
	const window = ["today", "7day", "30day"].includes(range) ? range : "30day";
	const data = await runTh([
		"plan", "personal", "usage", "credits",
		"--series", DEFAULT_SERIES,
		"--range", window,
		"--json",
	]);
	const trend = Array.isArray(data?.Trend) ? data.Trend[0] : null;
	const timestamps = Array.isArray(trend?.Timestamps) ? trend.Timestamps : [];
	const values = Array.isArray(trend?.Values) ? trend.Values : [];
	const points = timestamps.map((stamp, index) => ({
		timestamp: stamp,
		credits: Number(values[index] ?? 0),
	}));
	return { range: window, points, fetchedAt: new Date().toISOString() };
}

/** Recent per-request call records. */
async function readRecords(limit = 15) {
	const size = clamp(Number(limit) || 15, 1, 100);
	const data = await runTh([
		"plan", "personal", "records",
		"--series", DEFAULT_SERIES,
		"--limit", String(size),
		"--sort", "desc",
		"--json",
	]);
	const rows = (Array.isArray(data?.DetailSet) ? data.DetailSet : []).map((row) => ({
		requestId: String(row?.RequestId ?? ""),
		requestTime: row?.RequestTime ?? null,
		model: String(row?.ModelName ?? ""),
		inputToken: Number(row?.InputToken ?? 0),
		outputToken: Number(row?.OutputToken ?? 0),
		cacheToken: Number(row?.CacheToken ?? 0),
		totalToken: Number(row?.TotalToken ?? 0),
		totalQuota: Number(row?.TotalQuota ?? 0),
	}));
	return { rows, listOver: data?.ListOver === true, fetchedAt: new Date().toISOString() };
}

/**
 * The CLI's daily credit series only covers completed days, so today's spend is
 * missing from the trend. Recover it from the plan totals: lifetime used credits
 * minus the sum of the completed days. A package lasts a month, so the 30-day
 * window always covers the whole package.
 */
function includeTodayCredits(trend, summary) {
	const primary = summary?.primary;
	const points = Array.isArray(trend?.points) ? trend.points : [];
	if (!primary || points.length === 0) return trend;
	const start = new Date();
	start.setHours(0, 0, 0, 0);
	const todayTs = Math.floor(start.getTime() / 1000);
	if (points.some((point) => Number(point.timestamp) === todayTs)) {
		return {
			...trend,
			points: points.map((point) =>
				Number(point.timestamp) === todayTs ? { ...point, isToday: true } : point),
		};
	}
	const completed = points.reduce((sum, point) => sum + (Number(point.credits) || 0), 0);
	const rawToday = Number(primary.usedCredits) - completed;
	if (!Number.isFinite(rawToday)) return trend;
	const todayCredits = Math.round(Math.max(rawToday, 0) * 100) / 100;
	return {
		...trend,
		points: [...points, { timestamp: todayTs, credits: todayCredits, isToday: true }],
		todayCredits,
	};
}

/** The whole page payload, cached briefly and single-flighted. */
function createSnapshotSource(config) {
	const ttlMs = Number(config?.cacheTtlMs) > 0 ? Number(config.cacheTtlMs) : 30_000;
	const cache = new Map();
	const inflight = new Map();

	const cached = (key, produce) => {
		const hit = cache.get(key);
		if (hit !== undefined && Date.now() - hit.at < ttlMs) return Promise.resolve(hit.value);
		const pending = inflight.get(key);
		if (pending !== undefined) return pending;
		const promise = (async () => {
			try {
				const value = await produce();
				cache.set(key, { at: Date.now(), value });
				return value;
			} finally {
				inflight.delete(key);
			}
		})();
		inflight.set(key, promise);
		return promise;
	};

	return {
		async snapshot() {
			const [summary, rank, credits, records] = await Promise.all([
				cached("summary", () => readSummary()),
				cached("rank", () => readModelRank(168)),
				cached("credits", () => readCreditTrend("30day")),
				cached("records", () => readRecords(15)),
			]);
			return { summary, rank, credits: includeTodayCredits(credits, summary), records, fetchedAt: new Date().toISOString() };
		},
		clear() {
			cache.clear();
		},
	};
}

/** Write one JSON response. */
function sendJson(res, status, value) {
	const body = JSON.stringify(value);
	res.writeHead(status, {
		"content-type": "application/json; charset=utf-8",
		"cache-control": "no-store",
	});
	res.end(body);
}

export function apply(ctx, config) {
	const source = createSnapshotSource(config);
	ctx.inject(["webServer"], (web) => {
		web.effect(() => web.webServer.register({
			kind: "prefix",
			path: ROUTE,
			handler: (req, res) => {
				const url = new URL(req.url ?? "/", "http://dsh.invalid");
				if (url.pathname !== SNAPSHOT_PATH) {
					sendJson(res, 404, { error: "not-found" });
					return;
				}
				if (req.method !== "GET" && req.method !== "HEAD") {
					sendJson(res, 405, { error: "method-not-allowed" });
					return;
				}
				// `?refresh=1` bypasses the short-TTL cache.
				if (url.searchParams.get("refresh") === "1") source.clear();
				source.snapshot().then(
					(value) => sendJson(res, 200, value),
					(error) => sendJson(res, 500, { error: String(error?.message ?? error) }),
				);
			},
		}), "tokenhub-usage: snapshot route");
	});
}
