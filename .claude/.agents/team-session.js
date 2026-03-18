import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT as FRONTEND_PROMPT, name as FE_NAME, emoji as FE_EMOJI } from "./src/agents/frontend.js";
import { SYSTEM_PROMPT as BACKEND_PROMPT, name as BE_NAME, emoji as BE_EMOJI } from "./src/agents/backend.js";
import { SYSTEM_PROMPT as RESEARCH_PROMPT, name as RE_NAME, emoji as RE_EMOJI } from "./src/agents/research.js";
import { SYSTEM_PROMPT as FULLSTACK_PROMPT, name as FS_NAME, emoji as FS_EMOJI } from "./src/agents/fullstack.js";
import { SYSTEM_PROMPT as REPORT_PROMPT, name as RP_NAME, emoji as RP_EMOJI } from "./src/agents/report.js";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * CLAUDE CODE TEAM - 5-Agent System
 *
 * Hver agent har sin egen uavhengige chat.
 * Ingen token-grenser. Ingen delt kontekst.
 * Agenter velger selv beste tilnaerming.
 * Report Agent samler alle funn til slutt.
 */

class TeamSession {
  constructor() {
    this.agents = {
      frontend: { name: FE_NAME, emoji: FE_EMOJI, systemPrompt: FRONTEND_PROMPT },
      backend: { name: BE_NAME, emoji: BE_EMOJI, systemPrompt: BACKEND_PROMPT },
      research: { name: RE_NAME, emoji: RE_EMOJI, systemPrompt: RESEARCH_PROMPT },
      fullstack: { name: FS_NAME, emoji: FS_EMOJI, systemPrompt: FULLSTACK_PROMPT },
      report: { name: RP_NAME, emoji: RP_EMOJI, systemPrompt: REPORT_PROMPT },
    };

    this.agentResponses = {};
  }

  async runAgent(agentId, context) {
    const agent = this.agents[agentId];
    const startTime = Date.now();

    console.log(`\n${agent.emoji} ${agent.name} starter analyse...`);

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      system: agent.systemPrompt,
      messages: [{ role: "user", content: context }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    this.agentResponses[agentId] = text;
    console.log(`${agent.emoji} ${agent.name} ferdig (${elapsed}s)`);
    return text;
  }

  async runTeamAnalysis(appDescription) {
    console.log(`
+=========================================================================+
|              CLAUDE CODE TEAM - 5-AGENT SYSTEM                          |
|                                                                         |
|  Hver agent har sin egen uavhengige chat                                |
|  Ingen token-grenser. Full dypgaende analyse.                           |
+=========================================================================+
    `);

    const startTime = Date.now();

    // Kjor 4 agenter parallelt — hver i sin egen chat
    console.log("--- Kjorer 4 agenter parallelt ---");

    await Promise.all([
      this.runAgent("frontend", appDescription),
      this.runAgent("backend", appDescription),
      this.runAgent("research", appDescription),
      this.runAgent("fullstack", appDescription),
    ]);

    // Print alle 4 chats
    const separator = "─".repeat(70);

    console.log(`\n\n🎨 FRONTEND CHAT\n${separator}\n`);
    console.log(this.agentResponses.frontend);

    console.log(`\n\n⚙️ BACKEND CHAT\n${separator}\n`);
    console.log(this.agentResponses.backend);

    console.log(`\n\n🔍 RESEARCH CHAT\n${separator}\n`);
    console.log(this.agentResponses.research);

    console.log(`\n\n🚀 FULLSTACK CHAT\n${separator}\n`);
    console.log(this.agentResponses.fullstack);

    // Report Agent samler alle funn
    console.log(`\n\n--- Report Agent samler alle funn ---`);

    const reportContext = `Lag en komplett prioritert rapport basert pa disse funnene fra 4 uavhengige agenter:

🎨 FRONTEND AGENT FUNN:
${this.agentResponses.frontend}

⚙️ BACKEND AGENT FUNN:
${this.agentResponses.backend}

🔍 RESEARCH AGENT FUNN:
${this.agentResponses.research}

🚀 FULLSTACK DEVELOPER FUNN:
${this.agentResponses.fullstack}`;

    await this.runAgent("report", reportContext);

    console.log(`\n\n📊 REPORT CHAT\n${separator}\n`);
    console.log(this.agentResponses.report);

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n${"=".repeat(70)}`);
    console.log(`Team-analyse ferdig! Total tid: ${totalTime}s`);
    console.log(`${"=".repeat(70)}`);

    return this.agentResponses;
  }
}

async function main() {
  const team = new TeamSession();

  // Bruk custom app-beskrivelse fra CLI, eller default Hysj-beskrivelse
  const customApp = process.argv[2];

  const defaultApp = `
HYSJ - Null-lagring meldingsapp

Frontend (hysj-app/):
- React Native 0.83 / Expo ~55 / TypeScript strict
- 8 skjermer: Login, Register, ConversationList, Chat, NewChat, Settings, Security, CreateGroup
- Krypto: X3DH, Double Ratchet, XChaCha20-Poly1305, Sealed Sender, Onion Routing, ML-KEM-768
- SignalR for sanntid, AsyncStorage for lokal lagring

Backend (src/Hysj.Api/):
- C# 12 / .NET 8 / ASP.NET Core Web API
- SignalR ChatHub for meldinger og wipe
- Redis for midlertidig meldingsko (ingen disk, TTL 72 timer)
- PostgreSQL: KUN brukere, enheter, nokler (ALDRI meldinger)
- Argon2id passord-hashing, JWT + TOTP 2FA
- Rate limiting, NoLog middleware

Kjerneprinsipp: Serveren er en blind, midlertidig postboks.
Ingen meldingslagring. Ingen metadata. Ingen spor.
  `;

  await team.runTeamAnalysis(customApp || defaultApp);
}

main().catch(console.error);
