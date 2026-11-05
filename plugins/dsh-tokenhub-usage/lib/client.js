// dsh-tokenhub-usage — Client half (browser bundle).
// Injects a "TokenHub 用量" panel into the Web GUI main area with a sidebar
// entry. Data is fetched same-origin from the host half's HTTP route.
window.__ModuleLoader__.load({
	id: "dsh-tokenhub-usage",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		const react = require("react");
		const jsxRuntime = require("react/jsx-runtime");

		const { useState, useEffect, useCallback } = react;
		const jsx = jsxRuntime.jsx;
		const jsxs = jsxRuntime.jsxs;
		const Fragment = jsxRuntime.Fragment;

		const NS = "tokenhubUsage";
		const PANEL_ID = "tokenhub-usage";

		const inject = ["slots", "locale"];

		const dictionaries = {
			zh: {
				panel: "TokenHub 用量",
				title: "TokenHub 用量",
				refresh: "刷新",
				refreshing: "刷新中…",
				loading: "加载中…",
				updated: "更新于",
				loadFailed: "数据加载失败",
				retry: "重试",
				remainingCredits: "剩余积分",
				usedOfTotal: "已用 {used} / {total}",
				usedPercent: "已用 {percent}",
				shareOfTotal: "占比",
				status: "状态",
				expire: "有效期至",
				autoRenew: "自动续费",
				on: "已开启",
				off: "已关闭",
				noPlan: "未找到生效中的个人套餐",
				tokenStats: "周期 Token 统计",
				input: "输入",
				output: "输出",
				cache: "缓存",
				modelRank: "模型用量排行（近 7 天）",
				creditTrend: "积分消耗趋势（近 30 天）",
				recentCalls: "最近调用",
				time: "时间",
				model: "模型",
				tokens: "Tokens",
				credits: "积分",
				empty: "暂无数据",
				perDay: "每日消耗积分",
			},
			en: {
				panel: "TokenHub Usage",
				title: "TokenHub Usage",
				refresh: "Refresh",
				refreshing: "Refreshing…",
				loading: "Loading…",
				updated: "Updated",
				loadFailed: "Failed to load data",
				retry: "Retry",
				remainingCredits: "Remaining credits",
				usedOfTotal: "{used} / {total} used",
				usedPercent: "{percent} used",
				shareOfTotal: "share",
				status: "Status",
				expire: "Expires",
				autoRenew: "Auto-renew",
				on: "On",
				off: "Off",
				noPlan: "No active personal plan found",
				tokenStats: "Token statistics",
				input: "Input",
				output: "Output",
				cache: "Cache",
				modelRank: "Model usage ranking (last 7 days)",
				creditTrend: "Credit consumption trend (last 30 days)",
				recentCalls: "Recent calls",
				time: "Time",
				model: "Model",
				tokens: "Tokens",
				credits: "Credits",
				empty: "No data yet",
				perDay: "Credits per day",
			},
		};

		// ---------- formatting helpers ----------
		const fmt = (value) => Number(value ?? 0).toLocaleString("en-US");
		const fmtCredits = (value) => Number(value ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
		/** Short credit numbers for dense bar labels (e.g. a 30-day series). */
		const fmtCompactCredits = (value) => {
			const n = Number(value) || 0;
			if (n >= 10000) return `${Math.round(n / 1000)}k`;
			if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
			if (n >= 100) return String(Math.round(n));
			if (n >= 10) return n.toFixed(1);
			return n.toFixed(2).replace(/\.?0+$/, "") || "0";
		};
		/** Percentage with two decimals; keeps tiny-but-nonzero shares visible. */
		const fmtPercent = (value) => {
			const n = Number(value ?? 0);
			if (!Number.isFinite(n) || n <= 0) return "0.00%";
			if (n >= 99.995 && n <= 100.005) return "100%";
			if (n < 0.01) return "<0.01%";
			return `${n.toFixed(2)}%`;
		};
		const shareOf = (part, whole) => (Number(whole) > 0 ? (Number(part ?? 0) / Number(whole)) * 100 : 0);
		const fmtTime = (iso) => {
			if (!iso) return "—";
			const date = new Date(iso);
			if (Number.isNaN(date.getTime())) return String(iso);
			const pad = (n) => String(n).padStart(2, "0");
			return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
		};
		/** Normalize ISO strings and epoch seconds/milliseconds into a Date. */
		const asDate = (value) => {
			if (value === null || value === undefined || value === "") return null;
			let date;
			if (typeof value === "number" || /^\d+$/.test(String(value))) {
				const n = Number(value);
				if (!Number.isFinite(n) || n <= 0) return null;
				date = new Date(n < 1e12 ? n * 1000 : n);
			} else {
				date = new Date(value);
			}
			return Number.isNaN(date.getTime()) ? null : date;
		};
		const day = (value) => {
			const date = asDate(value);
			if (date === null) return "";
			const pad = (n) => String(n).padStart(2, "0");
			return `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
		};
		const dayFull = (value) => {
			const date = asDate(value);
			if (date === null) return "";
			const pad = (n) => String(n).padStart(2, "0");
			return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
		};

		const styles = {
			root: { height: "100%", overflow: "auto", padding: "24px 28px", boxSizing: "border-box", color: "inherit" },
			inner: { maxWidth: 860, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 },
			header: { display: "flex", alignItems: "center", gap: 12 },
			title: { fontSize: 18, fontWeight: 600, margin: 0, flex: 1 },
			updated: { fontSize: 12, opacity: 0.55 },
			button: {
				display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer",
				border: "1px solid rgba(127,127,127,0.35)", borderRadius: 8, background: "transparent",
				color: "inherit", padding: "6px 12px", fontSize: 13,
			},
			error: { padding: "10px 14px", borderRadius: 10, background: "rgba(220,80,80,0.12)", fontSize: 13 },
			card: { border: "1px solid rgba(127,127,127,0.22)", borderRadius: 12, padding: "16px 18px", background: "rgba(127,127,127,0.05)" },
			cardTitle: { fontSize: 13, fontWeight: 600, opacity: 0.7, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.4 },
			bigNumber: { fontSize: 34, fontWeight: 700, lineHeight: 1.15 },
			muted: { opacity: 0.6, fontSize: 12.5 },
			row: { display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" },
			progressOuter: { height: 8, borderRadius: 4, background: "rgba(127,127,127,0.25)", marginTop: 10, overflow: "hidden" },
			progressInner: { height: "100%", borderRadius: 4, background: "#3b82f6" },
			statRow: { display: "flex", gap: 12, flexWrap: "wrap" },
			stat: { flex: "1 1 160px", border: "1px solid rgba(127,127,127,0.22)", borderRadius: 12, padding: "12px 14px" },
			statLabel: { fontSize: 12, opacity: 0.6 },
			statValue: { fontSize: 20, fontWeight: 650, marginTop: 2 },
			barRow: { display: "grid", gridTemplateColumns: "minmax(120px, 220px) 1fr", gap: 10, alignItems: "center", padding: "4px 0" },
			barName: { fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
			barOuter: { background: "rgba(127,127,127,0.15)", borderRadius: 5, height: 14, position: "relative", overflow: "hidden" },
			barInner: { height: "100%", background: "#3b82f6", borderRadius: 5 },
			barValue: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 6, fontSize: 11, fontWeight: 600, textShadow: "0 1px 2px rgba(0,0,0,0.35)" },
			tag: { display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: 11.5, border: "1px solid rgba(127,127,127,0.35)" },
			pctBadge: {
				display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 999,
				background: "rgba(59,130,246,0.14)", border: "1px solid rgba(59,130,246,0.35)",
				fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
			},
			barShare: { marginLeft: 6, opacity: 0.7, fontWeight: 500 },
			table: { width: "100%", borderCollapse: "collapse", fontSize: 12.5 },
			th: { textAlign: "left", opacity: 0.6, fontWeight: 500, padding: "4px 8px", borderBottom: "1px solid rgba(127,127,127,0.25)", whiteSpace: "nowrap" },
			td: { padding: "5px 8px", borderBottom: "1px solid rgba(127,127,127,0.12)", whiteSpace: "nowrap" },
		};

		function PanelIcon({ size }) {
			const s = size ?? 16;
			return jsxs("svg", {
				width: s, height: s, viewBox: "0 0 16 16", fill: "none",
				stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round",
				// Hovering the sidebar entry is the cheapest signal that the panel is
				// about to open, so warm the snapshot before the click lands.
				onPointerEnter: warmSnapshot,
				onFocus: warmSnapshot,
				children: [
					jsx("rect", { x: 1.5, y: 8, width: 3, height: 6.5, rx: 1 }),
					jsx("rect", { x: 6.5, y: 4.5, width: 3, height: 10, rx: 1 }),
					jsx("rect", { x: 11.5, y: 1.5, width: 3, height: 13, rx: 1 }),
				],
			});
		}

		function RefreshIcon() {
			return jsx("svg", {
				width: 13, height: 13, viewBox: "0 0 16 16", fill: "none",
				stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round",
				children: jsx("path", { d: "M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 1.8v2.7h-2.7" }),
			});
		}

		function Section({ title, children }) {
			return jsxs("div", { style: styles.card, children: [
				jsx("div", { style: styles.cardTitle, children: title }),
				children,
			] });
		}

		function PlanCard({ plan, t }) {
			if (!plan) return jsx("div", { style: styles.error, children: t("noPlan") });
			const hasTotal = Number(plan.totalCredits) > 0;
			const usedPctRaw = hasTotal ? (Number(plan.usedCredits) / Number(plan.totalCredits)) * 100 : 0;
			const barPct = Math.min(100, Math.max(usedPctRaw, 1));
			return jsxs(Section, { title: t("panel"), children: [
				jsxs("div", { style: { display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }, children: [
					jsxs("div", { style: { flex: "1 1 240px" }, children: [
						jsx("div", { style: styles.muted, children: t("remainingCredits") }),
						jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }, children: [
							jsx("div", { style: styles.bigNumber, children: fmtCredits(plan.remainingCredits) }),
							jsx("span", { style: styles.pctBadge, title: t("usedOfTotal", { used: fmtCredits(plan.usedCredits), total: fmtCredits(plan.totalCredits) }), children: hasTotal ? t("usedPercent", { percent: fmtPercent(usedPctRaw) }) : "—" }),
						] }),
						jsx("div", { style: styles.muted, children: t("usedOfTotal", { used: fmtCredits(plan.usedCredits), total: fmtCredits(plan.totalCredits) }) }),
						jsx("div", { style: styles.progressOuter, children: jsx("div", { style: { ...styles.progressInner, width: `${barPct}%` } }) }),
					] }),
					jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5 }, children: [
						jsxs("div", { style: styles.row, children: [jsx("span", { style: styles.muted, children: t("status") }), jsx("span", { style: styles.tag, children: plan.status })] }),
						jsxs("div", { style: styles.row, children: [jsx("span", { style: styles.muted, children: t("expire") }), jsx("span", { children: fmtTime(plan.expireTime) })] }),
						jsxs("div", { style: styles.row, children: [jsx("span", { style: styles.muted, children: t("autoRenew") }), jsx("span", { children: plan.autoRenew ? t("on") : t("off") })] }),
						jsx("div", { style: styles.muted, children: plan.pkgId }),
					] }),
				] }),
			] });
		}

		function TokenStats({ plan, rank, t }) {
			const source = rank?.total?.totalToken ? rank : null;
			const cells = source ? [
				[t("input"), source.total.inputToken],
				[t("output"), source.total.outputToken],
				[t("cache"), source.total.cacheToken],
				[t("tokens"), source.total.totalToken],
			] : plan ? [
				[t("input"), plan.inputToken],
				[t("output"), plan.outputToken],
				[t("cache"), plan.cacheToken],
			] : [];
			return jsxs(Section, { title: source ? `${t("tokenStats")} · ${t("modelRank").includes("7") ? "7d" : ""}` : t("tokenStats"), children: [
				jsxs("div", { style: styles.statRow, children: cells.map(([label, value]) => jsxs("div", { style: styles.stat, children: [
					jsx("div", { style: styles.statLabel, children: label }),
					jsx("div", { style: styles.statValue, children: fmt(value) }),
				] }, label)) }),
			] });
		}

		function ModelRank({ rank, t }) {
			const models = (rank?.models ?? []).filter((m) => m.totalToken > 0);
			if (models.length === 0) return jsx(Section, { title: t("modelRank"), children: jsx("div", { style: styles.muted, children: t("empty") }) });
			const max = Math.max(...models.map((m) => m.totalToken));
			const totalTokens = Number(rank?.total?.totalToken ?? 0) || models.reduce((sum, m) => sum + m.totalToken, 0);
			return jsx(Section, { title: t("modelRank"), children: jsx("div", { children: models.map((m) => {
				const share = shareOf(m.totalToken, totalTokens);
				return jsxs("div", { style: styles.barRow, children: [
					jsx("div", { style: styles.barName, title: m.name, children: m.name }),
					jsxs("div", { style: styles.barOuter, title: `${t("shareOfTotal")} ${fmtPercent(share)}`, children: [
						jsx("div", { style: { ...styles.barInner, width: `${Math.max((m.totalToken / max) * 100, 2)}%` } }),
						jsxs("div", { style: styles.barValue, children: [
							fmt(m.totalToken),
							jsx("span", { style: styles.barShare, children: fmtPercent(share) }),
						] }),
					] }),
				] }, m.key);
			}) }) });
		}

		function CreditTrend({ credits, t }) {
			const points = credits?.points ?? [];
			if (points.length === 0) return jsx(Section, { title: t("creditTrend"), children: jsx("div", { style: styles.muted, children: t("empty") }) });
			const max = Math.max(...points.map((p) => Number(p.credits) || 0), 1);
			const dense = points.length > 12;
			const barText = (value) => (dense ? fmtCompactCredits(value) : fmtCredits(value));
			// Label every Nth day so a 30-day series stays readable; always keep the last day.
			const step = Math.max(1, Math.ceil((points.length - 1) / 7));
			const labelled = new Set();
			for (let i = 0; i < points.length; i += step) labelled.add(i);
			labelled.add(points.length - 1);
			return jsx(Section, { title: t("creditTrend"), children:
				jsxs("div", { children: [
					jsx("div", { style: { ...styles.muted, marginBottom: 8 }, children: t("perDay") }),
					jsx("div", { style: { display: "flex", alignItems: "flex-end", gap: 4, height: 108 }, children: points.map((p, i) => {
						const value = Number(p.credits) || 0;
						return jsxs("div", { style: { flex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 2 }, title: `${dayFull(p.timestamp)} · ${fmtCredits(value)}`, children: [
							jsx("div", { style: { fontSize: 9, lineHeight: "11px", height: 11, opacity: value > 0 ? 0.75 : 0.3, whiteSpace: "nowrap" }, children: barText(value) }),
							jsx("div", { style: { width: "70%", maxWidth: 26, minHeight: 2, borderRadius: 3, background: "#3b82f6", height: Math.max((value / max) * 72, 2) } }),
							jsx("div", { style: { fontSize: 9.5, lineHeight: "12px", height: 12, opacity: 0.55, whiteSpace: "nowrap" }, children: labelled.has(i) ? day(p.timestamp) : "" }),
						] }, p.timestamp ?? i);
					}) }),
				] }) });
		}

		function RecentCalls({ records, t }) {
			const rows = records?.rows ?? [];
			return jsx(Section, { title: t("recentCalls"), children: rows.length === 0
				? jsx("div", { style: styles.muted, children: t("empty") })
				: jsxs("table", { style: styles.table, children: [
					jsx("thead", { children: jsxs("tr", { children: [
						jsx("th", { style: styles.th, children: t("time") }),
						jsx("th", { style: styles.th, children: t("model") }),
						jsx("th", { style: styles.th, children: t("input") }),
						jsx("th", { style: styles.th, children: t("output") }),
						jsx("th", { style: styles.th, children: t("cache") }),
						jsx("th", { style: styles.th, children: t("credits") }),
					] }) }),
					jsx("tbody", { children: rows.map((r) => jsxs("tr", { children: [
						jsx("td", { style: styles.td, children: fmtTime(r.requestTime) }),
						jsx("td", { style: styles.td, children: r.model }),
						jsx("td", { style: styles.td, children: fmt(r.inputToken) }),
						jsx("td", { style: styles.td, children: fmt(r.outputToken) }),
						jsx("td", { style: styles.td, children: fmt(r.cacheToken) }),
						jsx("td", { style: styles.td, children: fmtCredits(r.totalQuota) }),
					] }, r.requestId)) }),
				] }) });
		}

		/** Same-origin URL of the host half's snapshot route, under the GUI mount. */
		function snapshotUrl(refresh) {
			const url = new URL("tokenhub-usage/snapshot", document.baseURI);
			if (refresh) url.searchParams.set("refresh", "1");
			return url.href;
		}

		// ---------- snapshot cache (module-level, survives panel unmount) ----------
		// The DSH main slot keeps only the selected panel mounted, so opening this
		// panel again remounts UsagePage. Without a cache outside React every open
		// starts from `loading`, fetches four `th` CLI calls on the host (~1s) and
		// shows the spinner; with it the last snapshot paints on the first frame and
		// the revalidation happens silently in the background.
		let cachedSnapshot = null;
		let inflight = null;

		function fetchSnapshot(refresh) {
			return (async () => {
				const response = await fetch(snapshotUrl(refresh), { credentials: "same-origin", cache: "no-store" });
				const body = await response.json().catch(() => null);
				if (!response.ok) throw new Error(body?.error ?? `HTTP ${response.status}`);
				if (body?.error) throw new Error(body.error);
				cachedSnapshot = body;
				return body;
			})();
		}

		/** Shared snapshot fetch: de-dupes concurrent calls, caches the last payload. */
		function loadSnapshot(refresh = false) {
			if (!refresh && inflight !== null) return inflight;
			const pending = (refresh ? fetchSnapshot(true) : fetchSnapshot(false)).finally(() => {
				if (inflight === pending) inflight = null;
			});
			inflight = pending;
			return pending;
		}

		/** Warm the cache before the panel is opened; failures are retried by the panel. */
		function warmSnapshot() {
			loadSnapshot(false).catch(() => {});
		}

		function UsagePage({ t }) {
			const [state, setState] = useState(() => ({
				status: cachedSnapshot ? "ready" : "loading",
				data: cachedSnapshot,
				error: null,
			}));
			// `silent` keeps already-visible data on screen (no "刷新中…" flash) and is
			// used for the mount revalidation and the background poll.
			const load = useCallback(async (refresh, silent) => {
				setState((prev) => ({
					...prev,
					status: silent && prev.data ? prev.status : prev.data ? "refreshing" : "loading",
					error: null,
				}));
				try {
					const body = await loadSnapshot(refresh === true);
					setState({ status: "ready", data: body, error: null });
				} catch (error) {
					setState((prev) => ({ status: prev.data ? "ready" : "error", data: prev.data, error: String(error?.message ?? error) }));
				}
			}, []);
			const reload = useCallback(() => load(true, false), [load]);
			useEffect(() => {
				load(false, true);
				const timer = setInterval(() => load(false, true), 120_000);
				return () => clearInterval(timer);
			}, [load]);

			const t0 = state.data?.summary?.fetchedAt;

			return jsxs("div", { style: styles.root, children: [
				jsxs("div", { style: styles.inner, children: [
					jsxs("div", { style: styles.header, children: [
						jsx("h1", { style: styles.title, children: t("title") }),
						jsx("span", { style: styles.updated, children: t0 ? `${t("updated")} ${fmtTime(t0)}` : "" }),
						jsx("button", { style: styles.button, onClick: reload, disabled: state.status === "loading" || state.status === "refreshing", children:
							jsxs(Fragment, { children: [jsx(RefreshIcon, {}), " ", state.status === "loading" || state.status === "refreshing" ? t("refreshing") : t("refresh")] })
						}),
					] }),
					state.error ? jsxs("div", { style: styles.error, children: [t("loadFailed"), "：", state.error] }) : null,
					state.status === "loading" ? jsx("div", { style: styles.muted, children: t("loading") }) : null,
					state.data ? jsxs(Fragment, { children: [
						jsx(PlanCard, { plan: state.data.summary?.primary, t }),
						jsx(TokenStats, { plan: state.data.summary?.primary, rank: state.data.rank, t }),
						jsx(ModelRank, { rank: state.data.rank, t }),
						jsx(CreditTrend, { credits: state.data.credits, t }),
						jsx(RecentCalls, { records: state.data.records, t }),
					] }) : null,
				] }),
			] });
		}

		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, dictionaries), "tokenhub-usage: dictionaries");
			const t = ctx.locale.bind(NS);
			// Warm the snapshot once after boot so the very first open of the panel
			// paints data instead of a spinner. Delayed to stay off the boot path.
			const warmTimer = setTimeout(warmSnapshot, 1_500);
			ctx.effect(() => () => clearTimeout(warmTimer), "tokenhub-usage: warm timer");
			ctx.slots.inject("main", () => ctx.slots.register({
				name: "main",
				key: PANEL_ID,
				locale: NS,
				inject: () => ({ t }),
			}, UsagePage));
			ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
				name: "sidebar.panellist",
				id: PANEL_ID,
				order: 50,
				locale: NS,
				label: () => t("panel"),
			}, PanelIcon));
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	},
});
