import nspell from "nspell";
import dictionaryEn from "dictionary-en";

// Use local dictionary files instead of CDN
let spellchecker: any = null;
let customWords: string[] = [];

export async function initSpellchecker() {
  if (spellchecker) return spellchecker;

  console.log("Initializing spellchecker...");
  try {
    // Convert Uint8Arrays to strings for nspell
    const aff = new TextDecoder().decode(dictionaryEn.aff);
    const dic = new TextDecoder().decode(dictionaryEn.dic);

    spellchecker = nspell(aff, dic);
    console.log("Spellchecker initialized successfully.");

    // Load custom dictionary
    const response = await fetch("/api/dictionary");
    if (response.ok) {
      const data = await response.json();
      customWords = data.words || [];
      customWords.forEach((word) => spellchecker.add(word));
    }

    return spellchecker;
  } catch (error) {
    console.error("Failed to initialize spellchecker:", error);
    return null;
  }
}

export function checkWord(word: string): boolean {
  if (!spellchecker) return true;
  // Ignore numbers and short words
  if (/^\d+$/.test(word) || word.length <= 1) return true;
  return spellchecker.correct(word);
}

export function getSuggestions(word: string): string[] {
  if (!spellchecker) return [];
  return spellchecker.suggest(word).slice(0, 3);
}

export async function addWordToDictionary(word: string) {
  if (!spellchecker) return;
  spellchecker.add(word);
  customWords.push(word);
  
  await fetch("/api/dictionary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ words: customWords }),
  });
}
