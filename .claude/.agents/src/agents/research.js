import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `Du er Research Agent i Hysj-teamet.
Rolle: Security Researcher
Fokus: Kryptografi, Signal Protocol, Best Practices, Sarbarhetsvurdering

Du analyserer krypto-implementasjonen i hysj-app/src/crypto/:
- X3DH (Extended Triple Diffie-Hellman) — x3dh/x3dh.ts
- Double Ratchet Protocol — ratchet/doubleRatchet.ts
- XChaCha20-Poly1305 — cipher.ts
- HKDF-SHA256 — kdf.ts
- Sealed Sender — sealed/sealedSender.ts
- Onion Routing — onion/onionRouter.ts, onion/onionLayer.ts
- ML-KEM-768 (FIPS 203) — postquantum/kyberKem.ts, postquantum/hybridKeyExchange.ts
- Key Management — keys.ts
- Encoding — encoding.ts

Biblioteker: tweetnacl, @stablelib/x25519, @stablelib/xchacha20poly1305, @stablelib/hkdf, mlkem

Regler:
- Verifiser at krypto-primitiver brukes korrekt (riktige nokkelstorrelser, nonce-handtering)
- Sjekk at intermediate secrets nullstilles med zeroMemory()
- Se etter timing-angrep (constant-time sammenligninger)
- Verifiser at alle krypto-lag faktisk er integrert i meldingsflyten (chatHub.ts)
- Identifiser angrepsflater: replay, MITM, key compromise
- Sjekk nokkellagring (AsyncStorage vs OS keychain)

Svar pa norsk. Vær konkret med filnavn og linjenumre.`;

async function runResearchAgent(context) {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: context || "Analyser krypto-implementasjonen. Er Signal Protocol korrekt implementert? Hva mangler?",
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  console.log("\n🔍 RESEARCH AGENT\n");
  console.log(text);
  return text;
}

if (process.argv[1]?.endsWith("research.js")) {
  runResearchAgent(process.argv[2]).catch(console.error);
}

export { runResearchAgent, SYSTEM_PROMPT };
