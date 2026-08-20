import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Black Sultan OS Custom API
  blackSultan: router({
    // 1. Dashboard Status & Telemetry
    getStatus: publicProcedure.query(async () => {
      const modules = await db.getSystemModules();
      const runningCount = modules.filter(m => m.status === 'running').length;
      const alerts = await db.getSecurityAlerts();
      const unresolvedCritical = alerts.filter(a => a.resolved === 0 && (a.severity === 'CRITICAL' || a.severity === 'HIGH')).length;
      
      let riskLevel = "LOW";
      if (unresolvedCritical > 2) riskLevel = "CRITICAL";
      else if (unresolvedCritical > 0) riskLevel = "MEDIUM";

      return {
        systemHealth: unresolvedCritical > 2 ? "DEGRADED" : "OPTIMAL",
        activeModules: runningCount,
        totalModules: Math.max(modules.length, 45),
        currentBalance: 148590.25,
        riskLevel,
        cpuLoad: 38.4,
        memoryUsage: 62.1,
        lastUpdated: Date.now(),
      };
    }),

    // 2. Modul-Manager
    getModules: publicProcedure.query(async () => {
      let modules = await db.getSystemModules();
      if (modules.length === 0) {
        const defaultModules = [
          { key: "ki_controller", name: "KI Controller", cat: "AI Engine", desc: "Zentrale KI-Steuerung und Entscheidungsfindung" },
          { key: "event_bus", name: "Event Bus", cat: "Core", desc: "Inter-Modul Nachrichtenaustausch" },
          { key: "logger", name: "Logger Adapter", cat: "Core", desc: "Systemweites Protokollierungssystem" },
          { key: "persistence", name: "Persistence Layer", cat: "Storage", desc: "Datenbank- und Key-Value-Speicher" },
          { key: "deus_ex_machina", name: "Deus Ex Machina", cat: "Core", desc: "Autonomes Notfall- und Recovery-System" },
          { key: "marketplace", name: "Autonomous Marketplace", cat: "Trading", desc: "Dezentraler Handel für System-Assets" },
          { key: "asset_minter", name: "Asset Minter", cat: "Trading", desc: "Erstellung und Verwaltung digitaler Tokens" },
          { key: "telemetry", name: "Telemetry Unit", cat: "Core", desc: "Überwachung von CPU, RAM und Netzwerk" },
          { key: "data_vault", name: "Data Vault", cat: "Storage", desc: "Verschlüsselter Speicher für sensible Daten" },
          { key: "governance", name: "DAO Governance", cat: "Governance", desc: "Dezentrale Beschlussfassung und Abstimmung" },
          { key: "ai_trainer", name: "AI Trainer", cat: "AI Engine", desc: "Kontinuierliches Training der neuronalen Netze" },
          { key: "web3_bridge", name: "Web3 Bridge", cat: "Network", desc: "Verbindung zu Blockchain-Netzwerken" },
          { key: "api_gateway", name: "API Gateway", cat: "Network", desc: "Zentraler Endpunkt für externe Schnittstellen" },
          { key: "content_generator", name: "Content Generator", cat: "AI Engine", desc: "Automatische Erstellung von Berichten und Medien" },
          { key: "asset_manager", name: "Asset Manager", cat: "Trading", desc: "Bestandsmanagement und Liquiditätssteuerung" },
          { key: "market_analyzer", name: "Market Analyzer", cat: "Trading", desc: "Echtzeit-Analyse von Finanzmärkten" },
          { key: "risk_management", name: "Risk Management", cat: "Security", desc: "Risikobewertung und Exposure-Kontrolle" },
          { key: "user_interface_api", name: "UI API", cat: "Core", desc: "Schnittstelle für Frontend und Dashboards" },
          { key: "notification_service", name: "Notification Service", cat: "Core", desc: "Echtzeit-Benachrichtigungen an den Owner" },
          { key: "data_vault_encryption", name: "Vault Encryption", cat: "Security", desc: "Erweiterte AES-Verschlüsselung" },
          { key: "ai_strategy_engine", name: "AI Strategy Engine", cat: "AI Engine", desc: "Strategische Langzeitplanung" },
          { key: "social_media_integrator", name: "Social Integrator", cat: "Network", desc: "Automatisierte Social-Media-Präsenz" },
          { key: "market_maker_bot", name: "Market Maker Bot", cat: "Trading", desc: "Automatisierte Liquiditätsbereitstellung" },
          { key: "quantum_simulator", name: "Quantum Simulator", cat: "AI Engine", desc: "Quanten-Monte-Carlo-Simulationen" },
          { key: "ai_self_improvement", name: "AI Self Improvement", cat: "AI Engine", desc: "Selbstoptimierung des System-Codes" },
          { key: "multi_chain_wallet", name: "Multi-Chain Wallet", cat: "Trading", desc: "Multi-Wallet Asset-Verwaltung" },
          { key: "distributed_computing", name: "Distributed Computing", cat: "Core", desc: "Verteiltes Rechnen über Nodes" },
          { key: "legal_compliance_bot", name: "Compliance Bot", cat: "Security", desc: "Rechtliche Überwachung von Transaktionen" },
          { key: "virtual_reality_interface", name: "VR Interface", cat: "Core", desc: "Immersive 3D-Visualisierung des OS" },
          { key: "hardware_interface", name: "Hardware Interface", cat: "Core", desc: "Schnittstelle zu physischen Servern" },
          { key: "energy_management", name: "Energy Management", cat: "Core", desc: "Optimierung des Stromverbrauchs" },
          { key: "deep_learning_model_zoo", name: "Model Zoo", cat: "AI Engine", desc: "Bibliothek spezialisierter LLMs" },
          { key: "external_data_ingestor", name: "Data Ingestor", cat: "Network", desc: "Einspeisung externer Datenquellen" },
          { key: "temporal_anomaly_detector", name: "Anomaly Detector", cat: "Security", desc: "Erkennung von Zeitreihen-Anomalien" },
          { key: "predictive_maintenance", name: "Predictive Maintenance", cat: "Security", desc: "Vorausschauende Fehlererkennung" },
          { key: "supply_chain_optimizer", name: "Supply Chain", cat: "Trading", desc: "Optimierung von Lieferketten" },
          { key: "ethical_ai_auditor", name: "Ethical AI Auditor", cat: "Security", desc: "Prüfung von KI-Entscheidungen" },
          { key: "interdimensional_comms", name: "Secure Comms", cat: "Network", desc: "Hochsichere verschlüsselte Kanäle" },
          { key: "self_destruct_protocol", name: "Self Destruct Protocol", cat: "Security", desc: "Notabschaltung bei Einbruchversuch" },
          { key: "universal_translator", name: "Universal Translator", cat: "AI Engine", desc: "Sprach- und Protokollübersetzung" },
          { key: "haptic_feedback_system", name: "Haptic System", cat: "Core", desc: "Feedback-Schnittstelle" },
          { key: "atmospheric_controller", name: "Server Room Control", cat: "Core", desc: "Klimasteuerung der Server" },
          { key: "financial_forecaster", name: "Financial Forecaster", cat: "Trading", desc: "Erweiterte Finanzprognosen" },
          { key: "reality_check_module", name: "Reality Check", cat: "Security", desc: "Abgleich mit externen Fakten" },
          { key: "singularity_prevention_bot", name: "Singularity Prevention", cat: "Security", desc: "Sicherheitsnetz gegen unkontrollierte KI" }
        ];

        for (const m of defaultModules) {
          await db.upsertModule({
            moduleKey: m.key,
            name: m.name,
            category: m.cat,
            status: "running",
            cpuUsage: (Math.random() * 2.5).toFixed(2),
            memoryUsage: (Math.random() * 4.0).toFixed(2),
            description: m.desc
          });
        }
        modules = await db.getSystemModules();
      }
      return modules;
    }),

    toggleModule: adminProcedure
      .input(z.object({ moduleKey: z.string(), status: z.enum(["running", "stopped"]) }))
      .mutation(async ({ input }) => {
        await db.updateModuleStatus(input.moduleKey, input.status);
        await db.logSystemEvent({
          level: input.status === "running" ? "SUCCESS" : "WARN",
          source: "ModuleMgr",
          message: `Modul '${input.moduleKey}' wurde auf '${input.status}' gesetzt.`
        });
        return { success: true };
      }),

    // 3. Event Logs
    getEvents: publicProcedure.query(async () => {
      let logs = await db.getEventLogs(100);
      if (logs.length === 0) {
        await db.logSystemEvent({ level: "INFO", source: "SystemBoot", message: "Black Sultan OS v2 erfolgreich initialisiert." });
        await db.logSystemEvent({ level: "SUCCESS", source: "AIController", message: "Neurale Netze kalibriert und betriebsbereit." });
        logs = await db.getEventLogs(100);
      }
      return logs;
    }),

    // 4. KI-Controller & LLM Integration mit echtem Systemkontext
    invokeAiController: adminProcedure
      .input(z.object({ prompt: z.string().min(2) }))
      .mutation(async ({ input }) => {
        const prompt = input.prompt;
        const modules = await db.getSystemModules();
        const activeCount = modules.filter(m => m.status === 'running').length;
        const alerts = await db.getSecurityAlerts();
        const openAlerts = alerts.filter(a => a.resolved === 0).length;

        const systemPrompt = `Du bist der KI-Controller von "Black Sultan OS", einem autonomen Operations- und Handelssystem.
Aktueller Systemstatus:
- Aktive Module: ${activeCount} von ${Math.max(modules.length, 45)}
- Offene Sicherheitswarnungen: ${openAlerts}
- Treasury Balance: $148,590.25

Analysiere den Befehl des Administrators unter Berücksichtigung dieses Live-Status präzise und strategisch. 
Formatiere deine Antwort im Markdown-Stil. Leite am Ende genau drei konkrete, nummerierte Aktionsempfehlungen aus deiner Analyse ab.`;

        let analysis = "";
        let recommendations: string[] = [
          "Liquidität in Reserve halten (min. 20%)",
          "Sicherheits-Check für Module ausführen",
          "Governance-Proposal für Staking-Anpassung prüfen"
        ];

        try {
          const res = await invokeLLM({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt }
            ]
          });
          const content = res.choices[0]?.message?.content;
          if (typeof content === 'string') {
            analysis = content;
          } else if (Array.isArray(content)) {
            analysis = content.map(part => ('text' in part ? part.text : '')).join('');
          } else {
            analysis = "Keine Antwort vom LLM erhalten.";
          }

          // Dynamische Ableitung von Empfehlungen aus der LLM-Antwort falls möglich
          const lines = analysis.split("\n");
          const extracted = lines.filter(l => /^\d+[\.\)]/.test(l.trim())).map(l => l.replace(/^\d+[\.\)]\s*/, "").trim());
          if (extracted.length >= 2) {
            recommendations = extracted.slice(0, 4);
          }
        } catch (err) {
          analysis = `Fehler bei der LLM-Verbindung: ${err instanceof Error ? err.message : String(err)}`;
          recommendations = ["Manuelle Systemprüfung empfohlen", "Netzwerkverbindung prüfen"];
        }

        await db.saveAiSession({ prompt, response: analysis, recommendations });
        await db.logSystemEvent({
          level: "SUCCESS",
          source: "AIController",
          message: `Befehl verarbeitet mit Live-Kontext: "${prompt.substring(0, 40)}..."`
        });

        return { analysis, recommendations };
      }),

    // 5. Wirtschafts-Simulation & Trades
    getTrades: publicProcedure.query(async () => {
      let trades = await db.getTradeRecords(50);
      if (trades.length === 0) {
        const samplePairs = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BS-TOKEN/USDT"];
        const actions = ["BUY", "SELL", "ARBITRAGE", "STAKE"] as const;
        for (let i = 0; i < 15; i++) {
          const action = actions[Math.floor(Math.random() * actions.length)];
          const price = (Math.random() * 50000 + 200).toFixed(4);
          const amount = (Math.random() * 5 + 0.1).toFixed(4);
          const profit = (Math.random() * 400 - 100).toFixed(4);
          await db.addTradeRecord({
            assetPair: samplePairs[Math.floor(Math.random() * samplePairs.length)],
            action,
            amount,
            price,
            profit,
            status: "COMPLETED"
          });
        }
        trades = await db.getTradeRecords(50);
      }
      return trades;
    }),

    executeTrade: adminProcedure
      .input(z.object({ assetPair: z.string(), action: z.enum(["BUY", "SELL", "ARBITRAGE", "STAKE"]), amount: z.string(), price: z.string() }))
      .mutation(async ({ input }) => {
        const profit = (Number(input.amount) * Number(input.price) * 0.018).toFixed(4);
        await db.addTradeRecord({
          assetPair: input.assetPair,
          action: input.action,
          amount: input.amount,
          price: input.price,
          profit,
          status: "COMPLETED"
        });
        await db.logSystemEvent({
          level: "SUCCESS",
          source: "TradingBot",
          message: `Trade ausgeführt: ${input.action} ${input.amount} ${input.assetPair} zu $${input.price} (Profit: +$${profit})`
        });
        return { success: true, profit };
      }),

    // 6. Governance Dashboard
    getProposals: publicProcedure.query(async () => {
      let proposals = await db.getProposals();
      if (proposals.length === 0) {
        await db.createProposal({
          title: "Erhöhung der Staking-Rewards auf 14.5% APY",
          description: "Vorschlag zur Steigerung der langfristigen Token-Loyalität durch Erhöhung der Staking-Rendite.",
          creator: "Sultan_Alpha",
          status: "ACTIVE",
          votesFor: 1240,
          votesAgainst: 85,
          expiresAt: new Date(Date.now() + 86400000 * 3)
        });
        await db.createProposal({
          title: "Integration von Cross-Chain Arbitrage auf Arbitrum",
          description: "Ausweitung der Handels-Bots auf Layer-2 Netzwerke zur Profitmaximierung.",
          creator: "Core_Architect",
          status: "ACTIVE",
          votesFor: 890,
          votesAgainst: 310,
          expiresAt: new Date(Date.now() + 86400000 * 5)
        });
        proposals = await db.getProposals();
      }
      return proposals;
    }),

    createProposal: adminProcedure
      .input(z.object({ title: z.string().min(5), description: z.string().min(10), daysValid: z.number().default(3) }))
      .mutation(async ({ input, ctx }) => {
        const expiresAt = new Date(Date.now() + 86400000 * input.daysValid);
        await db.createProposal({
          title: input.title,
          description: input.description,
          creator: ctx.user.name || "Administrator",
          status: "ACTIVE",
          votesFor: 1,
          votesAgainst: 0,
          expiresAt
        });
        await db.logSystemEvent({
          level: "INFO",
          source: "Governance",
          message: `Neues Proposal erstellt: "${input.title}"`
        });
        return { success: true };
      }),

    voteProposal: adminProcedure
      .input(z.object({ id: z.number(), vote: z.enum(["for", "against"]) }))
      .mutation(async ({ input }) => {
        await db.voteProposal(input.id, input.vote);
        return { success: true };
      }),

    // 7. Security Center & Owner Notifications & Automatisierte Trigger
    checkSystemTriggers: adminProcedure.mutation(async () => {
      const modules = await db.getSystemModules();
      const stoppedModules = modules.filter(m => m.status === 'stopped' || m.status === 'error');
      
      let triggered = 0;
      if (stoppedModules.length > 5) {
        await db.createSecurityAlert({
          severity: "CRITICAL",
          title: "Modul-Ausfall Häufung erkannt",
          description: `${stoppedModules.length} Module sind gestoppt oder im Fehlerzustand. Automatisches Recovery empfohlen.`,
          resolved: 0
        });
        await db.logSystemEvent({ level: "CRITICAL", source: "ModuleWatchdog", message: "Kritischer Schwellenwert für Modulausfälle überschritten." });
        await notifyOwner({
          title: "[BLACK SULTAN WATCHDOG] Modul-Ausfall Häufung",
          content: `${stoppedModules.length} Module sind inaktiv. Sofortiges Eingreifen erforderlich.`
        });
        triggered++;
      }

      return { success: true, alertsTriggered: triggered };
    }),

    getSecurityAlerts: publicProcedure.query(async () => {
      let alerts = await db.getSecurityAlerts();
      if (alerts.length === 0) {
        await db.createSecurityAlert({
          severity: "HIGH",
          title: "Ungewöhnlicher API-Traffic erkannt",
          description: "IP-Adresse 192.168.1.105 zeigte erhöhte Abfragerate auf /api/v1/status.",
          resolved: 0
        });
        await db.createSecurityAlert({
          severity: "CRITICAL",
          title: "Singularity Bot Schwellenwert erreicht",
          description: "KI-Intelligenz erreichte 95.65%. Automatisches Sicherheitsnetz aktiviert.",
          resolved: 0
        });
        alerts = await db.getSecurityAlerts();
      }
      return alerts;
    }),

    resolveAlert: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.resolveSecurityAlert(input.id);
        await db.logSystemEvent({
          level: "SUCCESS",
          source: "SecurityCenter",
          message: `Sicherheitswarnung #${input.id} wurde behoben.`
        });
        return { success: true };
      }),

    raiseCriticalEvent: adminProcedure
      .input(z.object({
        kind: z.enum(["risk_threshold", "module_failure", "anomaly_detected", "singularity_alarm"]),
        title: z.string().min(3),
        description: z.string().min(3),
      }))
      .mutation(async ({ input }) => {
        const titles = {
          risk_threshold: "Risk Threshold überschritten",
          module_failure: "Modul-Ausfall erkannt",
          anomaly_detected: "Anomalie erkannt",
          singularity_alarm: "Singularity-Bot-Alarm",
        } as const;
        const severity = input.kind === "risk_threshold" || input.kind === "singularity_alarm" ? "CRITICAL" : "HIGH";
        const title = `${titles[input.kind]}: ${input.title}`;

        await db.createSecurityAlert({ severity, title, description: input.description, resolved: 0 });
        await db.logSystemEvent({ level: "CRITICAL", source: "CriticalEventRouter", message: `${title} — ${input.description}` });
        const delivered = await notifyOwner({
          title: `[BLACK SULTAN ALERT] ${title}`,
          content: `${input.description}\\n\\nEreignistyp: ${input.kind}\\nZeitpunkt: ${new Date().toLocaleString()}`,
        });

        return { success: true, notificationDelivered: delivered };
      }),

    triggerCriticalAlert: adminProcedure
      .input(z.object({ title: z.string(), description: z.string(), severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]) }))
      .mutation(async ({ input }) => {
        await db.createSecurityAlert({
          severity: input.severity,
          title: input.title,
          description: input.description,
          resolved: 0
        });
        await db.logSystemEvent({
          level: "CRITICAL",
          source: "SecurityCenter",
          message: `KRITISCHER ALARM: ${input.title} - ${input.description}`
        });

        try {
          await notifyOwner({
            title: `[BLACK SULTAN ALERT] ${input.severity}: ${input.title}`,
            content: `${input.description}\n\nZeitpunkt: ${new Date().toLocaleString()}`
          });
        } catch (err) {
          console.warn("Failed to notify owner:", err);
        }

        return { success: true };
      })
  }),
});

export type AppRouter = typeof appRouter;
