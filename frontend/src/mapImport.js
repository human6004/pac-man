export const MAP_IMPORT_LIMITS = {
  minSize: 4,
  maxSize: 9,
  maxFood: 7,
};

const VALID_SYMBOLS = new Set(["%", ".", "P", " "]);

export function parseImportedMap(text) {
  const lines = text.replace(/\r/g, "").split("\n");
  while (lines.at(-1) === "") lines.pop();

  if (!lines.length) throw new Error("Map file is empty.");

  const height = lines.length;
  const width = lines[0].length;
  const { minSize, maxSize, maxFood } = MAP_IMPORT_LIMITS;

  if (height < minSize || height > maxSize || width < minSize || width > maxSize) {
    throw new Error(`Map must be from ${minSize}x${minSize} to ${maxSize}x${maxSize}.`);
  }
  if (lines.some((line) => line.length !== width)) {
    throw new Error("Every map row must have the same width.");
  }

  let pacman = 0;
  let food = 0;
  for (const line of lines) {
    for (const symbol of line) {
      if (!VALID_SYMBOLS.has(symbol)) throw new Error(`Invalid map symbol: ${JSON.stringify(symbol)}.`);
      if (symbol === "P") pacman += 1;
      if (symbol === ".") food += 1;
    }
  }
  if (pacman !== 1) throw new Error(`Map must contain exactly one P; found ${pacman}.`);
  if (food > maxFood) throw new Error(`Map can contain at most ${maxFood} food dots; found ${food}.`);

  return lines.join("\n");
}

export async function readImportedMap(file) {
  if (!file.name.toLowerCase().endsWith(".txt")) throw new Error("Choose a .txt map file.");
  return parseImportedMap(await file.text());
}
