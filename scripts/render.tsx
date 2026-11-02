import { renderToStaticMarkup } from "react-dom/server";
import { writeFileSync } from "node:fs";
import { CAST, Character } from "../src/components/characters/Character";

const ids = ["mira", "theo", "ada", "kenji", "noor", "isha"];
const parts = ids.map((id, i) => {
  const cfg = CAST[id];
  const raw = renderToStaticMarkup(<Character config={cfg} title={cfg.name} />);
  const inner = raw.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
  const x = (i % 3) * 250 + 15;
  const y = Math.floor(i / 3) * 330 + 15;
  return `<rect x="${x - 10}" y="${y - 10}" width="240" height="320" fill="#f3ebdd" rx="12" />
  <svg x="${x}" y="${y}" width="220" height="300" viewBox="0 0 220 300" overflow="visible">${inner}</svg>
  <text x="${x + 110}" y="${y + 325}" font-family="sans-serif" font-size="17" text-anchor="middle" fill="#131c31">${cfg.name}</text>`;
});
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 690" width="750" height="690"><rect width="750" height="690" fill="#fbf6ee"/>${parts.join("")}</svg>`;
writeFileSync("scripts/cast.svg", svg);
console.log("written");
