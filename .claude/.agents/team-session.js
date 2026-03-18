import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT as FRONTEND_PROMPT } from "./src/agents/frontend.js";
import { SYSTEM_PROMPT as BACKEND_PROMPT } from "./src/agents/backend.js";
import { SYSTEM_PROMPT as RESEARCH_PROMPT } from "./src/agents/research.js";
import { SYSTEM_PROMPT as FULLSTACK_PROMPT } from "./src/agents/fullstack.js";
import { SYSTEM_PROMPT as REPORT_PROMPT } from "./src/agents/report.js";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * CLAUDE CODE TEAM - Multi-Agent System for Hysj
 *
 * 5 spesialiserte agenter samarbeider i delt chat-kontekst
 * for a analysere den null-lagring meldingsappen.
 */

class TeamSession {
  constructor() {
    this.teamMembers = {
      frontend: {
        name: "Frontend Agent",
        role: "UI/UX Developer",
        expertise: ["React Native", "Expo", "TypeScript", "Accessibility", "Theme"],
        systemPrompt: FRONTEND_PROMPT,
      },
      backend: {
        name: "Backend Agent",
        role: "API/Security Engineer",
        expertise: ["C# 12", ".NET 8", "SignalR", "Redis", "PostgreSQL", "Security"],
        systemPrompt: BACKEND_PROMPT,
      },
      research: {
        name: "Research Agent",
        role: "Security Researcher",
        expertise: ["Signal Protocol", "X3DH", "Double Ratchet", "ML-KEM", "Kryptografi"],
        systemPrompt: RESEARCH_PROMPT,
      },
      fullstack: {
        name: "Fullstack Developer",
        role: "Lead Engineer",
        expertise: ["Frontend-Backend integrasjon", "DTOs", "SignalR", "API alignment"],
        systemPrompt: FULLSTACK_PROMPT,
      },
      report: {
        name: "Report Agent",
        role: "Quality Analyst",
        expertise: ["Prioritering", "Risikovurdering", "Handlingsplan"],
        systemPrompt: REPORT_PROMPT,
      },
    };

    this.teamChat = [];
    this.agentResponses = {};
  }

  async agentSpeak(memberId, context) {
    const agent = this.teamMembers[memberId];

    const teamContext = this.teamChat
      .slice(-8)
      .map((msg) => `${msg.author}: ${msg.content}`)
      .join("\n\n");

    const messages = [];
    if (teamContext) {
      messages.push({ role: "user", content: `Team-kontekst sa langt:\n\n${teamContext}` });
      messages.push({ role: "assistant", content: "Forstatt. Jeg har lest teamets funn sa langt." });
    }
    messages.push({ role: "user", content: context });

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: agent.systemPrompt,
      messages,
    });

    const agentMessage =
      response.content[0].type === "text" ? response.content[0].text : "";

    this.teamChat.push({
      role: "assistant",
      author: agent.name,
      content: agentMessage,
    });

    this.agentResponses[memberId] = agentMessage;
    return agentMessage;
  }

  async runTeamAnalysis(appDescription) {
    console.log(`
+=========================================================================+
|                  HYSJ TEAM SESSION STARTED                              |
|                                                                         |
|  5 spesialister samarbeider i delt chat                                 |
|  Prosjekt: Hysj - Null-lagring meldingsapp                             |
+=========================================================================+
    `);

    // 1. Frontend Agent
    console.log("\n--- Frontend Agent starter analyse ---\n");
    await this.agentSpeak(
      "frontend",
      `Analyser Hysj frontend-kodebasen:\n\n${appDescription}\n\nFokuser pa UI/UX kvalitet, tema-konsistens, accessibility, og navigasjon.`
    );
    console.log(this.agentResponses.frontend);

    // 2. Backend Agent
    console.log("\n\n--- Backend Agent analyserer sikkerhet ---\n");
    await this.agentSpeak(
      "backend",
      `Frontend Agent fant UI-problemer. Analyser backend-sikkerhet: rate limiting, null-lagring, SignalR, auth, Redis TTL.`
    );
    console.log(this.agentResponses.backend);

    // 3. Research Agent
    console.log("\n\n--- Research Agent vurderer kryptografi ---\n");
    await this.agentSpeak(
      "research",
      `Backend Agent identifiserte sikkerhetsproblemer. Vurder krypto-implementasjonen: Er X3DH, Double Ratchet, Sealed Sender, Onion Routing korrekt og integrert?`
    );
    console.log(this.agentResponses.research);

    // 4. Fullstack Developer
    console.log("\n\n--- Fullstack Developer sjekker integrasjon ---\n");
    await this.agentSpeak(
      "fullstack",
      `Basert pa alle funn - sjekk frontend<->backend alignment: DTOs vs types, SignalR signaturer, auth token-flyt, wipe-routing.`
    );
    console.log(this.agentResponses.fullstack);

    // 5. Report Agent
    console.log("\n\n--- Report Agent lager prioritert plan ---\n");
    await this.agentSpeak(
      "report",
      `Lag en prioritert rapport (P1/P2/P3) basert pa alle agentenes funn. Inkluder anbefalt rekkefolge.`
    );
    console.log(this.agentResponses.report);

    return this.agentResponses;
  }

  getTeamSummary() {
    return `
=========================================================================
                        TEAM SESSION OPPSUMMERING
=========================================================================

Team members:
${Object.entries(this.teamMembers)
  .map(
    ([id, member]) => `  ${member.name} - ${member.role}
    Fokus: ${member.expertise.join(", ")}`
  )
  .join("\n")}

Meldinger i team chat: ${this.teamChat.length}
Agent-svar samlet: ${Object.keys(this.agentResponses).length}

=========================================================================
    `;
  }
}

async function main() {
  const team = new TeamSession();

  const appDescription = `
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

  const responses = await team.runTeamAnalysis(appDescription);

  console.log("\n" + "=".repeat(75));
  console.log(team.getTeamSummary());
  console.log("=".repeat(75));

  console.log("\nTeam-analyse ferdig!");
}

main().catch(console.error);
