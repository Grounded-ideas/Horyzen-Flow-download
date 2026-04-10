import nspell from "nspell";

let spellchecker: any = null;
let customWords: string[] = [];

export async function initSpellchecker() {
  if (spellchecker) return spellchecker;

  console.log("Initializing spellchecker...");
  try {
    // Load dictionary files from local public folder
    const [affResponse, dicResponse] = await Promise.all([
      fetch("/dictionary/index.aff"),
      fetch("/dictionary/index.dic"),
    ]);

    if (!affResponse.ok || !dicResponse.ok) {
      throw new Error("Failed to load dictionary files");
    }

    const affBuffer = await affResponse.arrayBuffer();
    const dicBuffer = await dicResponse.arrayBuffer();
    const aff = new TextDecoder().decode(new Uint8Array(affBuffer));
    const dic = new TextDecoder().decode(new Uint8Array(dicBuffer));

    spellchecker = nspell(aff, dic);
    console.log("Spellchecker initialized successfully.");

    // Load custom dictionary from localStorage (no backend API)
    const storedWords = localStorage.getItem("custom_dictionary");
    if (storedWords) {
      customWords = JSON.parse(storedWords);
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
  if (!customWords.includes(word)) {
    customWords.push(word);
    localStorage.setItem("custom_dictionary", JSON.stringify(customWords));
  }
}