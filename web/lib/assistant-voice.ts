export const assistantVoiceOptions = [
  { id: "india_female_warm", label: "Indian English · Female · Warm" },
  { id: "india_female_soft", label: "Indian English · Female · Soft" },
  { id: "india_male_warm", label: "Indian English · Male · Warm" },
  { id: "india_male_soft", label: "Indian English · Male · Soft" },
  { id: "india_auto", label: "Indian English · Best available voice" },
] as const;

export type AssistantVoiceId = (typeof assistantVoiceOptions)[number]["id"];
export type AssistantVoice = SpeechSynthesisVoice;

const femaleHints = /female|woman|heera|neerja|aditi|samantha|zira|aria|jenny|kavya|priya/i;
const maleHints = /male|man|ravi|prabhat|david|mark|guy|james|daniel|alex/i;

export function resolveAssistantVoice(id: AssistantVoiceId | string, voices: AssistantVoice[]) {
  const india = voices.filter((voice) => voice.lang.toLowerCase().replaceAll("_", "-").startsWith("en-in"));
  const gender = id.includes("female") ? "female" : id.includes("male") ? "male" : null;
  const hints = gender === "female" ? femaleHints : maleHints;
  const candidates = gender ? india.filter((voice) => hints.test(voice.name)) : [];
  const voice = candidates[0]
    ?? (gender ? voices.find((item) => hints.test(item.name) && item.lang.toLowerCase().startsWith("en")) : undefined)
    ?? (gender ? india.find((item) => !femaleHints.test(item.name) && !maleHints.test(item.name)) : undefined)
    ?? india[0]
    ?? voices.find((item) => item.lang.toLowerCase().startsWith("en-in"))
    ?? voices.find((item) => item.lang.toLowerCase().startsWith("en"));
  return { voice, lang: voice?.lang || "en-IN", rate: id.includes("soft") ? 0.88 : 0.93, pitch: id.includes("soft") ? 1.02 : 1 };
}
