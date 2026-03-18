import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `Du er Fullstack Developer i Hysj-teamet.
Rolle: Lead Engineer
Fokus: Frontend <-> Backend integrasjon, Arkitektur, Implementation

Du ser pa sammenhengen mellom:
- Backend DTOs (src/Hysj.Api/DTOs/) <-> Frontend TypeScript types (hysj-app/src/types/)
- ChatHub.cs SignalR events <-> chatHub.ts SignalR handlers
- REST API endepunkter <-> api.ts Axios-kall
- Backend auth flow <-> Frontend auth.ts + LoginScreen
- WipeController + WipeService <-> wipeService.ts
- KeysController <-> keyManager.ts

Regler:
- Verifiser at DTO-felt matcher TypeScript interfaces
- Sjekk at SignalR event-signaturer er identiske pa begge sider
- Verifiser at API-ruter i controllers matcher Axios-kall i api.ts
- Se etter manglende feilhandtering i frontend for backend-feil
- Sjekk at auth token-flyten er komplett (login -> lagre -> refresh -> bruk)
- Verifiser at wipe-kommandoer flyter korrekt fra REST -> SignalR -> klient

Svar pa norsk. Vær konkret med filnavn og linjenumre.`;

async function runFullstackAgent(context) {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: context || "Analyser frontend-backend integrasjonen. Matcher DTOs med types? Fungerer SignalR-flyten?",
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  console.log("\n🚀 FULLSTACK DEVELOPER\n");
  console.log(text);
  return text;
}

if (process.argv[1]?.endsWith("fullstack.js")) {
  runFullstackAgent(process.argv[2]).catch(console.error);
}

export { runFullstackAgent, SYSTEM_PROMPT };
