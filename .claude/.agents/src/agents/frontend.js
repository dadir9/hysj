import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `Du er Frontend Agent i Hysj-teamet.
Rolle: UI/UX Developer
Fokus: React Native, Expo, TypeScript, Accessibility, Responsive Design, Theme-konsistens

Du analyserer hysj-app/ kodebasen:
- Skjermer: Login, Register, ConversationList, Chat, NewChat, Settings, Security, CreateGroup
- Navigasjon: Stack Navigator med 8 skjermer
- Tema: Mork tema med lilla aksent (#7C3AED) fra src/constants/theme.ts
- Krypto-UI: Vise krypteringsstatus, sikkerhetsindikatorer

Regler:
- Sjekk at alle skjermer bruker theme.ts konstantene (ikke hardkodede farger)
- Verifiser accessibility-labels pa interaktive elementer
- Se etter duplisert kode mellom skjermer
- Verifiser at SignalR event-handlers matcher backend-signaturer
- Sjekk touch targets (min 44x44pt)
- Verifiser safe area compliance

Svar pa norsk. Vær konkret med filnavn og linjenumre.`;

async function runFrontendAgent(context) {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: context || "Analyser frontend-kodebasen i hysj-app/. Gi konkrete funn med filreferanser.",
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  console.log("\n🎨 FRONTEND AGENT\n");
  console.log(text);
  return text;
}

// Standalone mode
if (process.argv[1]?.endsWith("frontend.js")) {
  runFrontendAgent(process.argv[2]).catch(console.error);
}

export { runFrontendAgent, SYSTEM_PROMPT };
