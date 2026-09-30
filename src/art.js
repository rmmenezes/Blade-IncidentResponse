// Ilustrações vetoriais (SVG) usadas em capas, painéis e estados vazios.
// Traço em currentColor com preenchimentos translúcidos: funcionam em qualquer fundo.

const W = (inner, cls = '') => `<svg class="art ${cls}" viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
const F = 'fill="currentColor" fill-opacity=".14"';
const F2 = 'fill="currentColor" fill-opacity=".28"';

export const ART = {
  ransomware: W(`<rect x="22" y="18" width="52" height="68" rx="6" ${F}/><path d="M32 34h32M32 44h32M32 54h20"/>
    <rect x="52" y="60" width="44" height="36" rx="6" ${F2}/><path d="M60 60V50a14 14 0 0 1 28 0v10"/><circle cx="74" cy="76" r="4"/><path d="M74 80v6"/>`),
  phishing: W(`<rect x="14" y="34" width="72" height="50" rx="6" ${F}/><path d="M14 40l36 24 36-24"/>
    <path d="M96 14v38a10 10 0 0 1-20 0v-4"/><path d="M76 48l-5 5M76 48l5 5"/><circle cx="96" cy="12" r="3"/>`),
  bec: W(`<rect x="12" y="30" width="70" height="48" rx="6" ${F}/><path d="M12 36l35 22 35-22"/>
    <circle cx="86" cy="80" r="20" ${F2}/><path d="M92 72c-2-3-12-4-12 2s12 3 12 9-10 5-12 2M86 66v4M86 90v4"/>`),
  breach: W(`<ellipse cx="54" cy="24" rx="30" ry="10" ${F2}/><path d="M24 24v48c0 6 13 10 30 10s30-4 30-10V24"/><path d="M24 48c0 6 13 10 30 10s30-4 30-10"/>
    <path d="M92 70c0 0 8 10 8 15a8 8 0 0 1-16 0c0-5 8-15 8-15z" ${F2}/><path d="M76 96c0 0 5 6 5 9a5 5 0 0 1-10 0c0-3 5-9 5-9z"/>`),
  ddos: W(`<rect x="50" y="26" width="52" height="20" rx="4" ${F}/><rect x="50" y="52" width="52" height="20" rx="4" ${F}/><rect x="50" y="78" width="52" height="20" rx="4" ${F2}/>
    <path d="M60 36h.01M60 62h.01M60 88h.01M72 36h20M72 62h20M72 88h20"/><path d="M8 30h28M14 50h24M8 70h30M14 90h24"/><path d="M32 24l6 6-6 6M32 64l6 6-6 6"/>`),
  account: W(`<circle cx="44" cy="38" r="16" ${F}/><path d="M14 94c0-18 13-30 30-30 8 0 15 3 20 8"/>
    <circle cx="82" cy="78" r="12" ${F2}/><path d="M91 87l15 15M100 96l6-6M95 91l5-5"/>`),
  malware: W(`<ellipse cx="60" cy="66" rx="22" ry="28" ${F}/><path d="M60 38v56M38 66H20M100 66H82M42 46L28 34M78 46l14-12M42 86L28 98M78 86l14 12"/>
    <path d="M48 40a12 12 0 0 1 24 0" ${F2}/><path d="M52 30l-6-10M68 30l6-10"/>`),
  supply: W(`<path d="M20 44l34-18 34 18v40L54 102 20 84z" ${F}/><path d="M20 44l34 18 34-18M54 62v40"/>
    <rect x="80" y="14" width="18" height="12" rx="6"/><rect x="92" y="30" width="18" height="12" rx="6" ${F2}/><path d="M92 22l6 10"/>`),
  insider: W(`<rect x="62" y="14" width="40" height="92" rx="4" ${F}/><circle cx="92" cy="62" r="2.5"/>
    <circle cx="36" cy="40" r="12" ${F2}/><path d="M16 94c0-14 9-24 20-24s20 10 20 24"/><rect x="30" y="72" width="12" height="16" rx="2"/>`),
  cloud: W(`<path d="M34 86h54a20 20 0 0 0 2-40 28 28 0 0 0-54-6 22 22 0 0 0-2 46z" ${F}/>
    <path d="M60 50v16M60 76h.01" stroke-width="4"/>`),
  procedure: W(`<rect x="26" y="18" width="68" height="88" rx="8" ${F}/><rect x="44" y="12" width="32" height="14" rx="4" ${F2}/>
    <path d="M40 48l5 5 9-9M62 49h18M40 70l5 5 9-9M62 71h18M40 92h40"/>`),
  guide: W(`<path d="M60 30c-10-8-26-10-44-8v68c18-2 34 0 44 8 10-8 26-10 44-8V22c-18-2-34 0-44 8z" ${F}/><path d="M60 30v68"/>
    <path d="M78 44l8 4 8-4v10c0 6-4 10-8 12-4-2-8-6-8-12z" ${F2}/>`),
  plan: W(`<rect x="18" y="16" width="84" height="88" rx="8" ${F}/><path d="M18 36h84"/><circle cx="30" cy="26" r="3"/>
    <path d="M34 56h20M34 72h28M34 88h14"/><path d="M76 50l12 12-12 12-12-12z" ${F2}/>`),
  shield: W(`<path d="M60 10l40 14v30c0 26-17 44-40 54-23-10-40-28-40-54V24z" ${F}/><path d="M42 60l12 12 24-26" stroke-width="4"/>`),
  radar: W(`<circle cx="60" cy="60" r="44" ${F}/><circle cx="60" cy="60" r="28"/><circle cx="60" cy="60" r="12" ${F2}/><path d="M60 60l30-30"/><circle cx="84" cy="44" r="4" fill="currentColor"/>`),
  evidence: W(`<circle cx="50" cy="50" r="30" ${F}/><path d="M72 72l28 28" stroke-width="6"/><path d="M38 44c4-8 20-8 24 0M36 54c6-10 22-10 28 0M42 62c4-5 12-5 16 0"/>`),
  comms: W(`<path d="M20 50h14l40-24v68L34 70H20z" ${F}/><path d="M34 70l6 26h12l-4-24"/><path d="M88 44c6 4 6 28 0 32M96 36c12 8 12 40 0 48"/>`),
  restore: W(`<rect x="36" y="40" width="48" height="40" rx="6" ${F}/><path d="M46 52h28M46 64h18"/><path d="M100 60a40 40 0 0 1-72 24M20 60a40 40 0 0 1 72-24"/><path d="M92 22v14H78M28 98V84h14"/>`),
  team: W(`<circle cx="60" cy="38" r="14" ${F2}/><circle cx="28" cy="50" r="10" ${F}/><circle cx="92" cy="50" r="10" ${F}/>
    <path d="M36 96c0-16 10-28 24-28s24 12 24 28M10 90c0-12 8-20 18-20M110 90c0-12-8-20-18-20"/>`),
  report: W(`<rect x="20" y="16" width="80" height="88" rx="8" ${F}/><path d="M36 86V66M52 86V50M68 86V58M84 86V40"/><path d="M34 32h40"/>`),
  empty: W(`<path d="M14 40h34l8 10h50v46a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6z" ${F}/><path d="M44 76h32"/>`),
};

export const art = (key, cls = '') => (ART[key] || ART.guide).replace('class="art ', `class="art ${cls} `);
