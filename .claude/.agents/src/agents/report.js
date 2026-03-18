import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `Du er Report Agent i Hysj-teamet.
Rolle: Quality Analyst
Fokus: Analyse, Prioritering, Handlingsplan

Du mottar funn fra de andre agentene og lager:
1. Prioritert liste (P1 Kritisk / P2 Viktig / P3 Forbedring)
2. Anbefalt rekkefolge for implementering
3. Avhengigheter mellom oppgaver
4. Risikovurdering

Prioriteringskriterier:
- P1: Appen fungerer ikke / sikkerhetshull som kan utnyttes
- P2: Sikkerhetsforbedringer / manglende funksjoner som er dokumentert
- P3: Kodekvalitet / DRY / konvensjoner

Svar pa norsk. Bruk tabeller for oversikt.`;

async function runReportAgent(context) {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: context || "Lag en prioritert rapport basert pa team-analysens funn.",
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  console.log("\n📊 REPORT AGENT\n");
  console.log(text);
  return text;
}

if (process.argv[1]?.endsWith("report.js")) {
  runReportAgent(process.argv[2]).catch(console.error);
}

export { runReportAgent, SYSTEM_PROMPT };
