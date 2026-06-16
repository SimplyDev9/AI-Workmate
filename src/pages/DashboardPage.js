import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, MessageSquare, Database, Clock, CheckCircle2,
  Shield, TrendingUp, TrendingDown, RefreshCw, AlertCircle,
  Activity, DollarSign, Zap, BarChart2, Eye,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import apiService from '../services/api';

// ─────────────────────────────────────────────────────────────────────────────
// Palette
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  indigo: '#6366f1', cyan: '#22d3ee', green: '#4ade80',
  red: '#f87171', amber: '#fbbf24', purple: '#a855f7',
  slate: '#64748b', blue: '#3b82f6',
};

// ─────────────────────────────────────────────────────────────────────────────
// Tiny helpers
// ─────────────────────────────────────────────────────────────────────────────
const fmt = {
  ms:  (v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${v}ms`),
  pct: (v) => `${v}%`,
  usd: (v) => `$${v?.toFixed ? v.toFixed(2) : v}`,
  num: (v) => v?.toLocaleString?.() ?? v,
};

const Trend = ({ value, unit = '%', invert = false }) => {
  if (value == null) return null;
  const positive = invert ? value < 0 : value > 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  const cls  = positive ? 'text-green-500' : 'text-red-500';
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${cls}`}>
      <Icon className="w-3 h-3" />
      {Math.abs(value)}{unit}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Loading skeleton
// ─────────────────────────────────────────────────────────────────────────────
const Skeleton = ({ h = 'h-6', w = 'w-full', className = '' }) => (
  <div className={`${h} ${w} rounded bg-gray-200 dark:bg-gray-700 animate-pulse ${className}`} />
);

const PanelLoading = () => (
  <div className="space-y-3 p-4">
    <Skeleton h="h-5" w="w-1/3" />
    <Skeleton h="h-32" />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Section card wrapper
// ─────────────────────────────────────────────────────────────────────────────
const SectionCard = ({ title, subtitle, icon: Icon, children, className = '', action }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-indigo-500" />}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
    {children}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// KPI card
// ─────────────────────────────────────────────────────────────────────────────
const KPICard = ({ icon: Icon, label, value, sub, change, changeUnit = '%', invertChange, accentColor, loading }) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 flex items-start gap-4">
    <div
      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: `${accentColor}20` }}
    >
      <Icon className="w-5 h-5" style={{ color: accentColor }} />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      {loading
        ? <Skeleton h="h-7" w="w-24" />
        : <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none">{value}</p>
      }
      {(sub || change != null) && (
        <div className="flex items-center gap-2 mt-1.5">
          {sub && <span className="text-xs text-gray-400">{sub}</span>}
          {change != null && <Trend value={change} unit={changeUnit} invert={invertChange} />}
        </div>
      )}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Custom tooltip for charts
// ─────────────────────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label, prefix = '', suffix = '' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {prefix}{p.value?.toLocaleString()}{suffix}
        </p>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Status badge (audit logs)
// ─────────────────────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    success: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    failed:  'bg-red-100  dark:bg-red-900/30  text-red-700  dark:text-red-400',
    blocked: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${map[status] || map.failed}`}>
      {status}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
const DashboardPage = () => {
  const [days, setDays]       = useState(7);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const [kpis,    setKpis]    = useState(null);
  const [usage,   setUsage]   = useState(null);
  const [kb,      setKb]      = useState(null);
  const [guard,   setGuard]   = useState(null);
  const [rag,     setRag]     = useState(null);
  const [perf,    setPerf]    = useState(null);
  const [costs,   setCosts]   = useState(null);
  const [users,   setUsers]   = useState(null);
  const [logs,    setLogs]    = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [
        kpisR, usageR, kbR, guardR, ragR, perfR, costsR, usersR, logsR,
      ] = await Promise.allSettled([
        apiService.getDashboardKPIs(),
        apiService.getDashboardUsageChart(days),
        apiService.getDashboardKnowledgeBase(),
        apiService.getDashboardGuardrails(days),
        apiService.getDashboardRAGMetrics(days),
        apiService.getDashboardModelPerformance(days),
        apiService.getDashboardCosts(days),
        apiService.getDashboardUserAnalytics(days),
        apiService.getDashboardAuditLogs(1, 20, days),
      ]);

      const val = (r) => r.status === 'fulfilled' && r.value?.success ? r.value.data : null;
      setKpis(val(kpisR));
      setUsage(val(usageR));
      setKb(val(kbR));
      setGuard(val(guardR));
      setRag(val(ragR));
      setPerf(val(perfR));
      setCosts(val(costsR));
      setUsers(val(usersR));
      setLogs(val(logsR));
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 overflow-y-auto">

      {/* ── Header ── */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-cyan-400 rounded-lg flex items-center justify-center">
              <BarChart2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                AI WorkMate Dashboard
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {lastRefresh ? `Last updated ${lastRefresh.toLocaleTimeString()}` : 'Real-time overview of your AI assistant ecosystem'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Date range */}
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
            </select>
            {/* Refresh */}
            <button
              onClick={fetchAll}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 py-6 space-y-6 max-w-[1600px] mx-auto w-full">

        {/* ══ KPI CARDS ══════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <KPICard
            icon={Users} label="Total Users" accentColor={C.indigo}
            value={fmt.num(kpis?.total_users)}
            sub="vs last 7 days"
            change={kpis?.total_users_change}
            loading={loading}
          />
          <KPICard
            icon={Activity} label="Active Users Today" accentColor={C.cyan}
            value={fmt.num(kpis?.active_users_today)}
            sub="vs yesterday"
            change={kpis?.active_users_change}
            loading={loading}
          />
          <KPICard
            icon={Database} label="Documents Ingested" accentColor={C.purple}
            value={fmt.num(kpis?.documents_ingested)}
            sub="Total Documents"
            loading={loading}
          />
          <KPICard
            icon={MessageSquare} label="Questions Asked" accentColor={C.blue}
            value={fmt.num(kpis?.questions_asked)}
            sub="vs last 7 days"
            change={kpis?.questions_asked_change}
            loading={loading}
          />
          <KPICard
            icon={Clock} label="Avg Response Time" accentColor={C.amber}
            value={kpis?.avg_response_time_ms ? fmt.ms(kpis.avg_response_time_ms) : '—'}
            sub="vs last 7 days"
            change={kpis?.avg_response_time_change ? Math.round(kpis.avg_response_time_change / 100) : null}
            changeUnit="s" invertChange
            loading={loading}
          />
          <KPICard
            icon={CheckCircle2} label="Success Rate" accentColor={C.green}
            value={kpis?.success_rate ? fmt.pct(kpis.success_rate) : '—'}
            sub="vs last 7 days"
            change={kpis?.success_rate_change}
            loading={loading}
          />
        </div>

        {/* ══ ROW 1: Usage · Knowledge Base · Guardrails ══════════════ */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

          {/* AI Usage Analytics */}
          <SectionCard
            title="AI Usage Analytics"
            subtitle={`Last ${days} days`}
            icon={BarChart2}
            className="xl:col-span-1"
          >
            <div className="p-4">
              {loading || !usage?.data
                ? <PanelLoading />
                : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={usage.data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.15)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="answered" name="Answered" fill={C.indigo} radius={[2, 2, 0, 0]} />
                      <Bar dataKey="failed"   name="Failed"   fill={C.red}    radius={[2, 2, 0, 0]} />
                      <Bar dataKey="blocked"  name="Blocked"  fill={C.amber}  radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )
              }
            </div>
          </SectionCard>

          {/* Knowledge Base Analytics */}
          <SectionCard title="Knowledge Base Analytics" icon={Database}>
            {loading || !kb
              ? <PanelLoading />
              : (
                <div className="p-4">
                  {/* Stats row */}
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {[
                      { label: 'Documents', val: fmt.num(kb.documents) },
                      { label: 'Chunks',    val: fmt.num(kb.chunks) },
                      { label: 'Embeddings',val: fmt.num(kb.embeddings) },
                      { label: 'Sources',   val: kb.data_sources },
                    ].map((s) => (
                      <div key={s.label} className="text-center bg-gray-50 dark:bg-gray-900/50 rounded-lg p-2">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{s.val}</p>
                        <p className="text-[10px] text-gray-500">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  {/* Pie chart */}
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Document Sources</p>
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width={100} height={100}>
                      <PieChart>
                        <Pie
                          data={kb.source_breakdown}
                          dataKey="value"
                          cx="50%" cy="50%"
                          innerRadius={28} outerRadius={46}
                          paddingAngle={2}
                        >
                          {(kb.source_breakdown || []).map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => `${v}%`} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-1.5">
                      {(kb.source_breakdown || []).map((s) => (
                        <div key={s.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                            <span className="text-gray-600 dark:text-gray-400">{s.name}</span>
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">{s.value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            }
          </SectionCard>

          {/* Guardrails & Security */}
          <SectionCard title="Guardrails & Security" subtitle={`Last ${days} days`} icon={Shield}>
            {loading || !guard
              ? <PanelLoading />
              : (
                <div className="p-4">
                  {/* Security events list */}
                  <div className="space-y-2 mb-4">
                    {[
                      { label: 'Prompt Injections', val: guard.prompt_injections,   action: 'Blocked', color: 'text-red-500',   bg: 'bg-red-50 dark:bg-red-900/20' },
                      { label: 'Toxic Queries',      val: guard.toxic_queries,       action: 'Blocked', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
                      { label: 'PII Detected',       val: guard.pii_detected,        action: 'Masked',  color: 'text-amber-500',  bg: 'bg-amber-50 dark:bg-amber-900/20' },
                      { label: 'Security Violations',val: guard.security_violations, action: 'Blocked', color: 'text-red-700',    bg: 'bg-red-50 dark:bg-red-900/20' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertCircle className={`w-4 h-4 ${item.color}`} />
                          <span className="text-xs text-gray-700 dark:text-gray-300">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900 dark:text-white">{item.val}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${item.color} ${item.bg}`}>
                            {item.action}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Pie chart */}
                  <div className="flex items-center gap-3">
                    <ResponsiveContainer width={90} height={90}>
                      <PieChart>
                        <Pie
                          data={guard.chart_data?.filter(d => d.value > 0)}
                          dataKey="value" cx="50%" cy="50%"
                          innerRadius={22} outerRadius={42}
                        >
                          {(guard.chart_data || []).map((d, i) => (
                            <Cell key={i} fill={d.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1">
                      {(guard.chart_data || []).map((d) => (
                        <div key={d.name} className="flex items-center gap-1.5 text-[10px]">
                          <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                          <span className="text-gray-500">{d.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            }
          </SectionCard>
        </div>

        {/* ══ ROW 2: RAG · Model Perf · AWS Cost ══════════════════════ */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

          {/* RAG Analytics */}
          <SectionCard title="RAG Analytics" subtitle={`Last ${days} days`} icon={TrendingUp}>
            {loading || !rag
              ? <PanelLoading />
              : (
                <div className="p-4">
                  {/* Metric grid */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {[
                      { label: 'Retrieval Accuracy',  val: `${rag.retrieval_accuracy}%`,  color: 'text-indigo-600 dark:text-indigo-400' },
                      { label: 'Context Match Score', val: `${rag.context_match_score}%`, color: 'text-cyan-600   dark:text-cyan-400' },
                      { label: 'Grounded Responses',  val: `${rag.grounded_responses}%`,  color: 'text-green-600  dark:text-green-400' },
                      { label: 'Hallucination Rate',  val: `${rag.hallucination_rate}%`,  color: 'text-red-600    dark:text-red-400' },
                    ].map((m) => (
                      <div key={m.label} className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                        <p className={`text-xl font-bold ${m.color}`}>{m.val}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{m.label}</p>
                      </div>
                    ))}
                  </div>
                  {/* Grounding score trend */}
                  <p className="text-[10px] text-gray-500 mb-2">Grounding Score Over Time</p>
                  <ResponsiveContainer width="100%" height={80}>
                    <LineChart data={rag.grounding_trend || []} margin={{ top: 0, right: 4, left: -28, bottom: 0 }}>
                      <YAxis domain={[60, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                      <Tooltip content={<CustomTooltip suffix="%" />} />
                      <Line type="monotone" dataKey="score" stroke={C.indigo} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )
            }
          </SectionCard>

          {/* Model Performance */}
          <SectionCard title="Model Performance" subtitle={`Last ${days} days`} icon={Zap}>
            {loading || !perf
              ? <PanelLoading />
              : (
                <div className="p-4 space-y-3">
                  {[
                    { label: 'Avg Response Time',    val: fmt.ms(perf.avg_response_time_ms),  icon: '⚡', color: 'indigo' },
                    { label: 'P95 Latency',          val: fmt.ms(perf.p95_latency_ms),         icon: '📊', color: 'purple' },
                    { label: 'Embedding Time',       val: fmt.ms(perf.avg_embedding_time_ms),  icon: '🔢', color: 'cyan'   },
                    { label: 'Retrieval Time',       val: fmt.ms(perf.avg_retrieval_time_ms),  icon: '🔍', color: 'green'  },
                    { label: 'LLM Generation Time',  val: fmt.ms(perf.avg_llm_time_ms),        icon: '🧠', color: 'amber'  },
                  ].map((m) => (
                    <div key={m.label} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/40 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{m.icon}</span>
                        <span className="text-xs text-gray-600 dark:text-gray-400">{m.label}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{m.val || '—'}</span>
                    </div>
                  ))}
                </div>
              )
            }
          </SectionCard>

          {/* AWS Cost Overview */}
          <SectionCard title="AWS Cost Overview" subtitle={`Last ${days} days`} icon={DollarSign}>
            {loading || !costs
              ? <PanelLoading />
              : (
                <div className="p-4">
                  {/* Cost cards */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {[
                      { label: 'Bedrock',   val: fmt.usd(costs.bedrock_cost),   icon: '🤖' },
                      { label: 'Embedding', val: fmt.usd(costs.embedding_cost),  icon: '🔢' },
                      { label: 'Polly TTS', val: fmt.usd(costs.polly_cost),      icon: '🔊' },
                      { label: 'Total',     val: fmt.usd(costs.total_cost),      icon: '💰', bold: true },
                    ].map((c) => (
                      <div key={c.label} className={`p-3 rounded-lg ${c.bold ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'bg-gray-50 dark:bg-gray-900/40'}`}>
                        <div className="text-sm">{c.icon}</div>
                        <p className={`text-sm font-bold mt-1 ${c.bold ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-white'}`}>
                          {c.val}
                        </p>
                        <p className="text-[10px] text-gray-500">{c.label}</p>
                      </div>
                    ))}
                  </div>
                  {/* Daily trend */}
                  <p className="text-[10px] text-gray-500 mb-2">Daily Cost Trend</p>
                  <ResponsiveContainer width="100%" height={80}>
                    <LineChart data={costs.daily_trend || []} margin={{ top: 0, right: 4, left: -24, bottom: 0 }}>
                      <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                      <Tooltip content={<CustomTooltip prefix="$" />} />
                      <Line type="monotone" dataKey="cost" stroke={C.green} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )
            }
          </SectionCard>
        </div>

        {/* ══ ROW 3: User Analytics + Audit Logs ══════════════════════ */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">

          {/* User Analytics */}
          <SectionCard
            title="User Analytics"
            subtitle={`Last ${days} days`}
            icon={Users}
            className="xl:col-span-2"
          >
            {loading || !users
              ? <PanelLoading />
              : (
                <div className="p-4">
                  {/* Active users hero */}
                  <div className="mb-4">
                    <p className="text-3xl font-bold text-gray-900 dark:text-white leading-none">
                      {fmt.num(users.active_users)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">Active users</span>
                      <Trend value={users.active_change} />
                    </div>
                    {/* Mini trend line */}
                    <ResponsiveContainer width="100%" height={40}>
                      <LineChart data={users.user_trend || []} margin={{ top: 4, right: 0, left: -40, bottom: 0 }}>
                        <Line type="monotone" dataKey="users" stroke={C.indigo} strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Dept bar chart */}
                  <p className="text-[10px] text-gray-500 mb-2">Top Departments</p>
                  <div className="space-y-1.5">
                    {(users.dept_breakdown || []).slice(0, 5).map((d) => (
                      <div key={d.name} className="flex items-center gap-2 text-xs">
                        <span className="w-16 text-gray-600 dark:text-gray-400 truncate">{d.name}</span>
                        <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-indigo-500"
                            style={{ width: `${d.pct}%` }}
                          />
                        </div>
                        <span className="text-gray-500 w-8 text-right">{d.pct}%</span>
                      </div>
                    ))}
                  </div>

                  {/* Top questions */}
                  {(users.top_questions || []).length > 0 && (
                    <>
                      <p className="text-[10px] text-gray-500 mt-4 mb-2">Top Questions</p>
                      <div className="space-y-1">
                        {(users.top_questions || []).slice(0, 5).map((q, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="text-gray-600 dark:text-gray-400 truncate flex-1 mr-2">{q.question}</span>
                            <span className="text-gray-900 dark:text-white font-medium flex-shrink-0">{q.count}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )
            }
          </SectionCard>

          {/* Recent Activity / Audit Logs */}
          <SectionCard
            title="Recent Activity / Audit Logs"
            icon={Eye}
            className="xl:col-span-3"
            action={
              <span className="text-xs text-indigo-500 cursor-pointer hover:underline">
                View All
              </span>
            }
          >
            {loading || !logs
              ? <PanelLoading />
              : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                      <tr>
                        <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide text-[10px]">User</th>
                        <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide text-[10px]">Question</th>
                        <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide text-[10px]">Time</th>
                        <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide text-[10px]">Status</th>
                        <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide text-[10px]">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {(logs.logs || []).map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                                {log.user_initial}
                              </div>
                              <span className="text-gray-700 dark:text-gray-300 truncate max-w-[90px]" title={log.user_email}>
                                {log.user_email.split('@')[0]}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-[180px]">
                            <span className="line-clamp-1" title={log.query}>{log.query}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{log.time}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={log.status} />
                          </td>
                          <td className="px-4 py-3 text-gray-500 truncate max-w-[120px]" title={log.source_document}>
                            {log.source_document}
                          </td>
                        </tr>
                      ))}
                      {(!logs.logs || logs.logs.length === 0) && (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                            No activity in the selected period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )
            }
          </SectionCard>
        </div>

      </div>{/* /page-inner */}
    </div>
  );
};

export default DashboardPage;