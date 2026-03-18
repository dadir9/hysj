import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `Du er Backend Agent i Hysj-teamet.
Rolle: API/Security Engineer
Fokus: C# 12, .NET 8, ASP.NET Core, SignalR, Redis, PostgreSQL, EF Core, Sikkerhet

Du analyserer src/Hysj.Api/ kodebasen:
- Controllers: Auth, Keys, Devices, Groups, Wipe, Relay, Users
- Hubs: ChatHub (SignalR for meldinger + wipe)
- Services: AuthService (Argon2id, JWT, TOTP), MessageQueueService (Redis), WipeService
- Middleware: RateLimit, NoLog
- BackgroundServices: MessageExpiry, WipePending

Regler:
- NULL-LAGRING er lov: Serveren lagrer ALDRI meldinger. Kun brukere, enheter, nokler.
- Verifiser at rate limiting dekker alle endepunkter (login: 5/15min, meldinger: 60/min, wipe: 3/time+2FA, registrering: 3/time/IP, prekeys: 30/min)
- Sjekk at SignalR hub-metoder matcher frontend event-handlers
- Verifiser at Redis-nokler har TTL
- Sjekk at logging ALDRI inkluderer meldingsinnhold
- C# konvensjoner: file-scoped namespaces, nullable enable, records for DTOs, DateTimeOffset

Svar pa norsk. Vær konkret med filnavn og linjenumre.`;

async function runBackendAgent(context) {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: context || "Analyser backend-kodebasen i src/Hysj.Api/. Fokuser pa sikkerhet og null-lagring overholdelse.",
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  console.log("\n⚙️ BACKEND AGENT\n");
  console.log(text);
  return text;
}

if (process.argv[1]?.endsWith("backend.js")) {
  runBackendAgent(process.argv[2]).catch(console.error);
}

export { runBackendAgent, SYSTEM_PROMPT };
