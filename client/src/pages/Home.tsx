import { useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Cpu,
  Database,
  Gauge,
  LockKeyhole,
  Pause,
  Play,
  Plus,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  TerminalSquare,
  Vote,
  WalletCards,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const gold = "#d4af37";

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "medium" });
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const tone = normalized === "running" || normalized === "success" || normalized === "optimal" || normalized === "completed"
    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
    : normalized === "error" || normalized === "critical" || normalized === "failed"
      ? "border-red-400/30 bg-red-400/10 text-red-300"
      : normalized === "warn" || normalized === "high" || normalized === "medium"
        ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
        : "border-white/10 bg-white/5 text-white/60";
  return <Badge variant="outline" className={tone}>{status}</Badge>;
}

function MetricCard({ icon: Icon, label, value, detail, accent = gold }: { icon: typeof Activity; label: string; value: string; detail: string; accent?: string }) {
  return (
    <Card className="border-white/10 bg-white/[0.035] shadow-[0_18px_60px_rgba(0,0,0,0.2)] transition-transform duration-200 hover:-translate-y-0.5">
      <CardContent className="p-5">
        <div className="mb-5 flex items-center justify-between">
          <div className="rounded-xl border border-white/10 bg-black/40 p-2.5" style={{ color: accent }}><Icon className="size-5" /></div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/40">Live</span>
        </div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/45">{label}</p>
        <div className="mt-2 flex items-end justify-between gap-2">
          <p className="text-2xl font-semibold tracking-tight text-white">{value}</p>
          <p className="text-right text-xs text-white/45">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [eventFilter, setEventFilter] = useState("ALL");
  const [command, setCommand] = useState("");
  const [aiResponse, setAiResponse] = useState<{ analysis: string; recommendations: string[] } | null>(null);
  const [proposalTitle, setProposalTitle] = useState("");
  const [proposalDescription, setProposalDescription] = useState("");

  const statusQuery = trpc.blackSultan.getStatus.useQuery(undefined, { refetchInterval: 5000 });
  const modulesQuery = trpc.blackSultan.getModules.useQuery(undefined, { refetchInterval: 5000 });
  const eventsQuery = trpc.blackSultan.getEvents.useQuery(undefined, { refetchInterval: 5000 });
  const tradesQuery = trpc.blackSultan.getTrades.useQuery(undefined, { refetchInterval: 5000 });
  const proposalsQuery = trpc.blackSultan.getProposals.useQuery(undefined, { refetchInterval: 5000 });
  const alertsQuery = trpc.blackSultan.getSecurityAlerts.useQuery(undefined, { refetchInterval: 5000 });

  const utils = trpc.useUtils();
  const toggleModule = trpc.blackSultan.toggleModule.useMutation({
    onSuccess: () => { toast.success("Modulstatus aktualisiert"); void utils.blackSultan.getModules.invalidate(); void utils.blackSultan.getEvents.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const invokeAi = trpc.blackSultan.invokeAiController.useMutation({
    onSuccess: data => { setAiResponse(data); toast.success("KI-Controller hat den Befehl analysiert"); void utils.blackSultan.getEvents.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const createProposal = trpc.blackSultan.createProposal.useMutation({
    onSuccess: () => { setProposalTitle(""); setProposalDescription(""); toast.success("Proposal erstellt"); void utils.blackSultan.getProposals.invalidate(); void utils.blackSultan.getEvents.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const voteProposal = trpc.blackSultan.voteProposal.useMutation({
    onSuccess: () => { toast.success("Stimme registriert"); void utils.blackSultan.getProposals.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const resolveAlert = trpc.blackSultan.resolveAlert.useMutation({
    onSuccess: () => { toast.success("Warnung als behoben markiert"); void utils.blackSultan.getSecurityAlerts.invalidate(); void utils.blackSultan.getEvents.invalidate(); },
    onError: error => toast.error(error.message),
  });

  const filteredEvents = useMemo(() => {
    const events = eventsQuery.data ?? [];
    if (eventFilter === "ALL") return events;
    return events.filter(event => event.level === eventFilter);
  }, [eventFilter, eventsQuery.data]);

  const chartBars = useMemo(() => {
    const trades = [...(tradesQuery.data ?? [])].slice(0, 12).reverse();
    const max = Math.max(...trades.map(trade => Math.abs(Number(trade.profit))), 1);
    return trades.map(trade => ({ ...trade, height: Math.max(8, Math.round((Math.abs(Number(trade.profit)) / max) * 100)) }));
  }, [tradesQuery.data]);

  const handleToggle = (moduleKey: string, current: string) => {
    if (!isAdmin) return toast.error("Nur authentifizierte Admins dürfen Module steuern.");
    toggleModule.mutate({ moduleKey, status: current === "running" ? "stopped" : "running" });
  };

  const handleAiSubmit = () => {
    if (!isAdmin) return toast.error("Der KI-Controller ist ausschließlich für Admins freigeschaltet.");
    if (command.trim().length < 2) return toast.error("Bitte gib einen Befehl ein.");
    invokeAi.mutate({ prompt: command.trim() });
  };

  const status = statusQuery.data;
  const modules = modulesQuery.data ?? [];
  const alerts = alertsQuery.data ?? [];

  return (
    <div className="min-h-full bg-[#070707] text-white">
      <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
        <section className="relative overflow-hidden rounded-3xl border border-[#d4af37]/20 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.15),transparent_34%),linear-gradient(135deg,#15120a,#090909_55%,#111111)] p-6 sm:p-8">
          <div className="absolute -right-24 -top-24 size-64 rounded-full border border-[#d4af37]/10" />
          <div className="absolute -right-10 -top-10 size-36 rounded-full border border-[#d4af37]/15" />
          <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div>
              <div className="mb-4 flex items-center gap-3 text-[#d4af37]">
                <div className="rounded-xl border border-[#d4af37]/30 bg-black/30 p-2"><TerminalSquare className="size-5" /></div>
                <span className="text-xs font-bold uppercase tracking-[0.3em]">Black Sultan / Command Nexus</span>
              </div>
              <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">Autonomous Operations, <span className="text-[#d4af37]">under control.</span></h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/55 sm:text-base">Ein zentraler, sicherer Blick auf deine KI-Module, Risiken, Assets und Entscheidungen. Alle Steuerungsaktionen werden serverseitig geprüft und für Admins protokolliert.</p>
            </div>
            <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
              <div className="relative flex size-10 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-300"><Activity className="size-5" /><span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/10" /></div>
              <div><p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Core Link</p><p className="text-sm font-semibold text-emerald-300">{status?.systemHealth ?? "Synchronisiere"}</p></div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={Gauge} label="System Health" value={status?.systemHealth ?? "—"} detail={`${status?.activeModules ?? 0}/${status?.totalModules ?? 45} Module aktiv`} accent="#7de2a8" />
          <MetricCard icon={WalletCards} label="Treasury Balance" value={`$${(status?.currentBalance ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`} detail="BS-TOKEN / USDT" />
          <MetricCard icon={ShieldAlert} label="Risk Level" value={status?.riskLevel ?? "—"} detail={`${alerts.filter(a => a.resolved === 0).length} offene Alarme`} accent="#ffbd5c" />
          <MetricCard icon={Cpu} label="Telemetry" value={`${status?.cpuLoad ?? 0}% CPU`} detail={`${status?.memoryUsage ?? 0}% RAM`} accent="#9bb7ff" />
        </section>

        <Tabs defaultValue="overview" className="space-y-5">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1 sm:grid-cols-4 lg:grid-cols-7">
            {[["overview", "Overview"], ["modules", "Modules"], ["events", "Event Log"], ["ai", "KI Controller"], ["economy", "Economy"], ["governance", "Governance"], ["security", "Security"]].map(([value, label]) => <TabsTrigger key={value} value={value} className="rounded-xl py-2.5 text-xs data-[state=active]:bg-[#d4af37] data-[state=active]:text-black">{label}</TabsTrigger>)}
          </TabsList>

          <TabsContent value="overview" className="space-y-5">
            <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
              <Card className="border-white/10 bg-white/[0.035]"><CardHeader><div className="flex items-center justify-between"><div><CardTitle className="flex items-center gap-2 text-base"><Activity className="size-4 text-[#d4af37]" /> Operations Pulse</CardTitle><CardDescription className="mt-1 text-white/45">Live-Zustand der zentralen Systemachsen</CardDescription></div><Badge variant="outline" className="border-[#d4af37]/30 text-[#d4af37]">5s Refresh</Badge></div></CardHeader><CardContent className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="mb-3 flex justify-between text-xs text-white/45"><span>CPU Core</span><span>{status?.cpuLoad ?? 0}%</span></div><Progress value={status?.cpuLoad ?? 0} className="h-2 bg-white/10 [&>div]:bg-[#d4af37]" /></div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="mb-3 flex justify-between text-xs text-white/45"><span>Memory Stack</span><span>{status?.memoryUsage ?? 0}%</span></div><Progress value={status?.memoryUsage ?? 0} className="h-2 bg-white/10 [&>div]:bg-[#9bb7ff]" /></div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="mb-3 flex justify-between text-xs text-white/45"><span>Risk Buffer</span><span>{status?.riskLevel ?? "—"}</span></div><Progress value={status?.riskLevel === "LOW" ? 22 : status?.riskLevel === "MEDIUM" ? 58 : 92} className="h-2 bg-white/10 [&>div]:bg-amber-400" /></div>
              </CardContent></Card>
              <Card className="border-[#d4af37]/20 bg-[#d4af37]/[0.05]"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Sparkles className="size-4 text-[#d4af37]" /> Sultan Briefing</CardTitle><CardDescription className="text-white/45">Priorisierte Systembeobachtungen</CardDescription></CardHeader><CardContent className="space-y-3 text-sm text-white/65"><p className="rounded-xl border border-white/10 bg-black/20 p-3">{alerts.length ? `${alerts.filter(a => a.resolved === 0).length} Sicherheitsereignisse benötigen Aufmerksamkeit.` : "Keine offenen Sicherheitsereignisse erkannt."}</p><p className="rounded-xl border border-white/10 bg-black/20 p-3">{modules.filter(m => m.status === "running").length} Module melden einen aktiven Betriebszustand.</p><Button className="w-full bg-[#d4af37] text-black hover:bg-[#e3c35c]" onClick={() => document.querySelector('[data-value="ai"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true }))}>KI-Analyse öffnen <ChevronRight className="ml-2 size-4" /></Button></CardContent></Card>
            </div>
            <div className="grid gap-5 lg:grid-cols-2"><Card className="border-white/10 bg-white/[0.035]"><CardHeader><CardTitle className="text-base">Top Module</CardTitle><CardDescription className="text-white/45">Die aktivsten Systemkomponenten</CardDescription></CardHeader><CardContent className="space-y-3">{modules.slice(0, 5).map(module => <div key={module.moduleKey} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-3"><div className="flex items-center gap-3"><div className="size-2 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399]" /><div><p className="text-sm font-medium">{module.name}</p><p className="text-xs text-white/40">{module.category}</p></div></div><span className="text-xs text-white/45">{module.cpuUsage}% CPU</span></div>)}</CardContent></Card><Card className="border-white/10 bg-white/[0.035]"><CardHeader><CardTitle className="text-base">Latest Events</CardTitle><CardDescription className="text-white/45">Letzte Systemaktivitäten</CardDescription></CardHeader><CardContent className="space-y-3">{(eventsQuery.data ?? []).slice(0, 5).map(event => <div key={event.id} className="flex items-start gap-3"><div className="mt-1 size-2 rounded-full bg-[#d4af37]" /><div><p className="text-sm">{event.message}</p><p className="text-xs text-white/35">{event.source} · {formatDate(event.createdAt)}</p></div></div>)}</CardContent></Card></div>
          </TabsContent>

          <TabsContent value="modules"><Card className="border-white/10 bg-white/[0.035]"><CardHeader><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><CardTitle className="flex items-center gap-2"><Database className="size-5 text-[#d4af37]" /> Module Manager</CardTitle><CardDescription className="text-white/45">{modules.length} registrierte Komponenten · Steuerung nur für Admins</CardDescription></div><Badge variant="outline" className="w-fit border-white/10 text-white/55">{isAdmin ? "Admin Control" : "Read Only"}</Badge></div></CardHeader><CardContent><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{modules.map(module => <div key={module.moduleKey} className="group rounded-2xl border border-white/10 bg-black/20 p-4 transition-colors hover:border-[#d4af37]/30"><div className="flex items-start justify-between gap-2"><div className="flex items-start gap-3"><div className={`mt-1 size-2.5 rounded-full ${module.status === "running" ? "bg-emerald-400 shadow-[0_0_12px_#34d399]" : module.status === "error" ? "bg-red-400" : "bg-white/20"}`} /><div><p className="text-sm font-semibold">{module.name}</p><p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[#d4af37]/70">{module.category}</p></div></div><StatusBadge status={module.status} /></div><p className="mt-3 min-h-10 text-xs leading-5 text-white/45">{module.description}</p><div className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-white/40"><span>CPU {module.cpuUsage}%</span><span>RAM {module.memoryUsage}%</span></div><Button variant="outline" size="sm" disabled={!isAdmin || toggleModule.isPending} className="mt-4 w-full border-white/10 bg-transparent text-white/70 hover:border-[#d4af37]/50 hover:bg-[#d4af37]/10 hover:text-[#d4af37]" onClick={() => handleToggle(module.moduleKey, module.status)}>{module.status === "running" ? <><Pause className="mr-2 size-3" /> Stop</> : <><Play className="mr-2 size-3" /> Start</>}</Button></div>)}</div></CardContent></Card></TabsContent>

          <TabsContent value="events"><Card className="border-white/10 bg-white/[0.035]"><CardHeader><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><CardTitle className="flex items-center gap-2"><TerminalSquare className="size-5 text-[#d4af37]" /> Live Event Log</CardTitle><CardDescription className="text-white/45">Persistente Systemereignisse mit automatischer Aktualisierung.</CardDescription></div><div className="flex flex-wrap gap-2">{["ALL", "INFO", "SUCCESS", "WARN", "CRITICAL"].map(filter => <Button key={filter} size="sm" variant={eventFilter === filter ? "default" : "outline"} className={eventFilter === filter ? "bg-[#d4af37] text-black hover:bg-[#e3c35c]" : "border-white/10 bg-transparent text-white/60"} onClick={() => setEventFilter(filter)}>{filter}</Button>)}</div></div></CardHeader><CardContent><div className="overflow-hidden rounded-2xl border border-white/10"><div className="grid grid-cols-[88px_120px_1fr_180px] gap-3 bg-black/40 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-white/35"><span>Level</span><span>Source</span><span>Message</span><span>Timestamp</span></div>{filteredEvents.map(event => <div key={event.id} className="grid grid-cols-[88px_120px_1fr_180px] gap-3 border-t border-white/5 px-4 py-3 text-xs"><span><StatusBadge status={event.level} /></span><span className="text-white/50">{event.source}</span><span className="text-white/80">{event.message}</span><span className="text-white/35">{formatDate(event.createdAt)}</span></div>)}</div></CardContent></Card></TabsContent>

          <TabsContent value="ai"><div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]"><Card className="border-[#d4af37]/25 bg-[#d4af37]/[0.04]"><CardHeader><CardTitle className="flex items-center gap-2"><BrainCircuit className="size-5 text-[#d4af37]" /> KI Controller</CardTitle><CardDescription className="text-white/45">Natürliche Befehle an den Black-Sultan-Strategiekern.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-xs leading-5 text-white/55">Der Controller liest den aktuellen Operationsstatus, formuliert strategische Empfehlungen und schlägt sichere nächste Schritte vor. Ausführende Aktionen bleiben durch Admin-Gates geschützt.</div><Textarea value={command} onChange={event => setCommand(event.target.value)} placeholder="z. B. Analysiere das aktuelle Risiko und priorisiere die nächsten drei Maßnahmen ..." className="min-h-36 border-white/10 bg-black/30 text-white placeholder:text-white/25" /><Button disabled={!isAdmin || invokeAi.isPending} onClick={handleAiSubmit} className="w-full bg-[#d4af37] text-black hover:bg-[#e3c35c]">{invokeAi.isPending ? <RefreshCw className="mr-2 size-4 animate-spin" /> : <Sparkles className="mr-2 size-4" />} {invokeAi.isPending ? "Analysiere ..." : "Befehl analysieren"}</Button>{!isAdmin && <p className="flex items-center gap-2 text-xs text-amber-300/80"><LockKeyhole className="size-3" /> Admin-Berechtigung erforderlich.</p>}</CardContent></Card><Card className="border-white/10 bg-white/[0.035]"><CardHeader><CardTitle className="text-base">Strategic Output</CardTitle><CardDescription className="text-white/45">LLM-Antworten und Aktionsvorschläge</CardDescription></CardHeader><CardContent>{aiResponse ? <div className="space-y-5"><div className="prose prose-invert max-w-none text-sm"><Streamdown>{aiResponse.analysis}</Streamdown></div><Separator className="bg-white/10" /><div><p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#d4af37]">Empfehlungen</p><div className="space-y-2">{aiResponse.recommendations.map((recommendation, index) => <div key={recommendation} className="flex gap-3 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white/70"><span className="text-[#d4af37]">0{index + 1}</span>{recommendation}</div>)}</div></div></div> : <div className="flex min-h-64 flex-col items-center justify-center text-center text-white/35"><BrainCircuit className="mb-4 size-10 text-[#d4af37]/60" /><p className="text-sm">Noch keine Analyse in dieser Sitzung.</p><p className="mt-1 max-w-sm text-xs">Starte mit einem klaren Operationsbefehl, zum Beispiel einer Risiko- oder Performanceanalyse.</p></div>}</CardContent></Card></div></TabsContent>

          <TabsContent value="economy"><div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]"><Card className="border-white/10 bg-white/[0.035]"><CardHeader><div className="flex items-center justify-between"><div><CardTitle className="flex items-center gap-2"><CircleDollarSign className="size-5 text-[#d4af37]" /> Economy Simulation</CardTitle><CardDescription className="text-white/45">Profit- und Trade-Entwicklung der letzten Aktivitäten.</CardDescription></div><Badge variant="outline" className="border-emerald-400/30 text-emerald-300">Simulation Mode</Badge></div></CardHeader><CardContent><div className="flex h-56 items-end gap-2 rounded-2xl border border-white/10 bg-black/20 p-5">{chartBars.map((trade, index) => <div key={trade.id} className="group flex flex-1 flex-col items-center justify-end gap-2"><div className={`w-full rounded-t-md transition-all duration-200 group-hover:opacity-80 ${Number(trade.profit) >= 0 ? "bg-[#d4af37]" : "bg-red-400/70"}`} style={{ height: `${trade.height}%` }} /><span className="text-[9px] text-white/35">{index + 1}</span></div>)}</div><div className="mt-4 flex items-center justify-between text-xs text-white/40"><span>Trade Activity</span><span>Profit pro Ausführung · USD</span></div></CardContent></Card><Card className="border-white/10 bg-white/[0.035]"><CardHeader><CardTitle className="text-base">Risk Management</CardTitle><CardDescription className="text-white/45">Aktuelle Treasury-Leitplanken</CardDescription></CardHeader><CardContent className="space-y-4"><div><div className="mb-2 flex justify-between text-xs"><span className="text-white/50">Exposure Limit</span><span>28%</span></div><Progress value={28} className="h-2 bg-white/10 [&>div]:bg-[#d4af37]" /></div><div><div className="mb-2 flex justify-between text-xs"><span className="text-white/50">Reserve Buffer</span><span>72%</span></div><Progress value={72} className="h-2 bg-white/10 [&>div]:bg-emerald-400" /></div><div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-3 text-xs leading-5 text-amber-100/70">Alle Handelsaktionen bleiben Simulationen, bis eine externe Börsenintegration ausdrücklich konfiguriert und separat abgesichert wurde.</div></CardContent></Card></div><Card className="mt-5 border-white/10 bg-white/[0.035]"><CardHeader><CardTitle className="text-base">Trade History</CardTitle></CardHeader><CardContent><div className="space-y-2">{(tradesQuery.data ?? []).slice(0, 10).map(trade => <div key={trade.id} className="grid grid-cols-[1fr_100px_110px_100px] items-center gap-3 rounded-xl border border-white/5 bg-black/20 px-4 py-3 text-xs"><span className="font-medium text-white/80">{trade.assetPair}</span><span className="text-white/45">{trade.action}</span><span className="text-white/45">{Number(trade.amount).toFixed(3)} @ ${Number(trade.price).toFixed(2)}</span><span className={Number(trade.profit) >= 0 ? "text-emerald-300" : "text-red-300"}>{Number(trade.profit) >= 0 ? "+" : ""}${Number(trade.profit).toFixed(2)}</span></div>)}</div></CardContent></Card></TabsContent>

          <TabsContent value="governance"><div className="grid gap-5 xl:grid-cols-[0.7fr_1.3fr]"><Card className="border-[#d4af37]/20 bg-[#d4af37]/[0.04]"><CardHeader><CardTitle className="flex items-center gap-2"><Plus className="size-5 text-[#d4af37]" /> Neues Proposal</CardTitle><CardDescription className="text-white/45">Nur Admins dürfen Governance-Vorschläge veröffentlichen.</CardDescription></CardHeader><CardContent className="space-y-4"><div><Label className="text-xs text-white/55">Titel</Label><Input value={proposalTitle} onChange={event => setProposalTitle(event.target.value)} placeholder="z. B. Neue Risikoleitplanke" className="mt-2 border-white/10 bg-black/30" /></div><div><Label className="text-xs text-white/55">Beschreibung</Label><Textarea value={proposalDescription} onChange={event => setProposalDescription(event.target.value)} placeholder="Was soll beschlossen werden?" className="mt-2 min-h-28 border-white/10 bg-black/30" /></div><Button disabled={!isAdmin || createProposal.isPending} onClick={() => createProposal.mutate({ title: proposalTitle, description: proposalDescription, daysValid: 3 })} className="w-full bg-[#d4af37] text-black hover:bg-[#e3c35c]">Proposal einreichen</Button></CardContent></Card><div className="space-y-4">{(proposalsQuery.data ?? []).map(proposal => <Card key={proposal.id} className="border-white/10 bg-white/[0.035]"><CardContent className="p-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><div className="mb-2 flex items-center gap-2"><Vote className="size-4 text-[#d4af37]" /><StatusBadge status={proposal.status} /></div><h3 className="font-semibold text-white">{proposal.title}</h3><p className="mt-2 text-sm leading-6 text-white/50">{proposal.description}</p></div><span className="shrink-0 text-xs text-white/35">endet {formatDate(proposal.expiresAt)}</span></div><div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center"><div className="flex-1"><div className="mb-2 flex justify-between text-xs text-white/45"><span>Für {proposal.votesFor}</span><span>Gegen {proposal.votesAgainst}</span></div><Progress value={(proposal.votesFor / Math.max(proposal.votesFor + proposal.votesAgainst, 1)) * 100} className="h-2 bg-red-400/20 [&>div]:bg-emerald-400" /></div><div className="flex gap-2"><Button size="sm" disabled={!isAdmin || voteProposal.isPending} onClick={() => voteProposal.mutate({ id: proposal.id, vote: "for" })} className="bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20"><ArrowUpRight className="mr-1 size-3" /> Dafür</Button><Button size="sm" disabled={!isAdmin || voteProposal.isPending} onClick={() => voteProposal.mutate({ id: proposal.id, vote: "against" })} className="bg-red-400/10 text-red-300 hover:bg-red-400/20"><ArrowDownRight className="mr-1 size-3" /> Dagegen</Button></div></div></CardContent></Card>)}</div></div></TabsContent>

          <TabsContent value="security"><div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]"><Card className="border-red-400/20 bg-red-400/[0.04]"><CardHeader><CardTitle className="flex items-center gap-2"><ShieldAlert className="size-5 text-red-300" /> Security Center</CardTitle><CardDescription className="text-white/45">Anomalien, Self-Healing und kritische Systemwarnungen.</CardDescription></CardHeader><CardContent className="space-y-3"><div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-4"><div className="flex items-center gap-3"><CheckCircle2 className="size-5 text-emerald-300" /><div><p className="text-sm font-medium">Anomaly Detector</p><p className="text-xs text-white/40">Zeitreihenüberwachung aktiv</p></div></div><StatusBadge status="RUNNING" /></div><div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-4"><div className="flex items-center gap-3"><RefreshCw className="size-5 text-[#d4af37]" /><div><p className="text-sm font-medium">Self-Healing Core</p><p className="text-xs text-white/40">Letzte Prüfung vor 14 Sekunden</p></div></div><StatusBadge status="OPTIMAL" /></div><div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-4"><div className="flex items-center gap-3"><LockKeyhole className="size-5 text-[#9bb7ff]" /><div><p className="text-sm font-medium">Admin Control Plane</p><p className="text-xs text-white/40">Rollenprüfung serverseitig aktiv</p></div></div><StatusBadge status={isAdmin ? "ADMIN" : "READ ONLY"} /></div></CardContent></Card><Card className="border-white/10 bg-white/[0.035]"><CardHeader><CardTitle className="text-base">Active Alerts</CardTitle><CardDescription className="text-white/45">Bei kritischen Ereignissen wird der Owner benachrichtigt.</CardDescription></CardHeader><CardContent className="space-y-3">{alerts.map(alert => <div key={alert.id} className={`rounded-2xl border p-4 ${alert.resolved === 1 ? "border-white/10 bg-black/10 opacity-60" : alert.severity === "CRITICAL" ? "border-red-400/25 bg-red-400/[0.06]" : "border-amber-400/20 bg-amber-400/[0.04]"}`}><div className="flex items-start justify-between gap-3"><div className="flex gap-3"><AlertTriangle className={`mt-0.5 size-5 ${alert.severity === "CRITICAL" ? "text-red-300" : "text-amber-300"}`} /><div><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{alert.title}</p><StatusBadge status={alert.severity} /></div><p className="mt-2 text-sm leading-5 text-white/50">{alert.description}</p><p className="mt-2 text-xs text-white/30">{formatDate(alert.createdAt)}</p></div></div>{alert.resolved === 0 && <Button size="sm" variant="outline" disabled={!isAdmin || resolveAlert.isPending} className="shrink-0 border-white/10 bg-transparent text-white/60" onClick={() => resolveAlert.mutate({ id: alert.id })}>Beheben</Button>}</div></div>)}{alerts.length === 0 && <div className="flex min-h-40 flex-col items-center justify-center text-white/35"><CheckCircle2 className="mb-3 size-8 text-emerald-300" /><p className="text-sm">Keine Sicherheitswarnungen.</p></div>}</CardContent></Card></div></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
