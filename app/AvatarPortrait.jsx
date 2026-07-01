/* eslint-disable react/no-unescaped-entities */
// AvatarPortrait.jsx
// Ritratto SVG della cellula T4: traduce i 6 caratteri fenotipici in
// un'illustrazione che si rivela progressivamente tick per tick.
//
// Props:
//   messageData  — array di 8 bit (cell.messageData)
//   tick         — numero di tick eseguiti (cell.tick)
//   traits       — array PHENOTYPE_TRAITS importato da page.js (evita dipendenze circolari)

const HAIR_COLOR = "#c0392b";
const NEUTRAL = "var(--surface-2)";
const NEUTRAL_LINE = "var(--border)";

function getTraitState(id, traits, messageData, tick) {
  const index = traits.findIndex((t) => t.id === id);
  const trait = traits[index];
  const revealed = tick > index;
  const value = revealed ? messageData[index] : null;
  return { trait, value, revealed };
}

export default function AvatarPortrait({ messageData, tick, traits }) {
  const pelle    = getTraitState("pelle",   traits, messageData, tick);
  const capelli  = getTraitState("capelli", traits, messageData, tick);
  const occhi    = getTraitState("occhi",   traits, messageData, tick);
  const sesso    = getTraitState("sesso",   traits, messageData, tick);
  const lattosio = getTraitState("lattosio",traits, messageData, tick);
  const vista    = getTraitState("vista",   traits, messageData, tick);

  const skinFill    = pelle.revealed    ? (pelle.value    ? "#8a5a35"        : "#e3b78f")        : NEUTRAL;
  const eyeFill     = occhi.revealed    ? (occhi.value    ? "#6b4226"        : "#4f9e7a")        : "var(--muted)";
  const sexSymbol   = sesso.revealed    ? (sesso.value    ? "\u2642"         : "\u2640")         : "?";
  const lactoseColor = lattosio.revealed ? "var(--amber)" : NEUTRAL_LINE;
  const visionShown = vista.revealed && vista.value === 0;

  return (
    <svg viewBox="0 0 120 150" className="avatar-svg" role="img" aria-label="Ritratto del fenotipo">

      {/* capelli */}
      {capelli.revealed && capelli.value ? (
        <g fill={HAIR_COLOR}>
          <path d="M22 70 Q20 30 60 20 Q100 30 98 70 Q88 56 60 54 Q32 56 22 70 Z" />
          <circle cx="38" cy="34" r="12" />
          <circle cx="55" cy="24" r="12" />
          <circle cx="73" cy="28" r="12" />
          <circle cx="87" cy="42" r="10" />
          <circle cx="26" cy="46" r="10" />
        </g>
      ) : (
        <path
          d="M20 72 Q18 28 60 20 Q102 28 100 72 Q90 54 60 52 Q30 54 20 72 Z"
          fill={capelli.revealed ? HAIR_COLOR : NEUTRAL}
        />
      )}

      {/* testa */}
      <circle cx="60" cy="62" r="32" fill={skinFill} stroke={NEUTRAL_LINE} strokeWidth="1.5" />

      {/* occhi */}
      <circle cx="48" cy="62" r="4" fill={eyeFill} />
      <circle cx="72" cy="62" r="4" fill={eyeFill} />

      {/* bocca */}
      <path
        d="M50 78 Q60 84 70 78"
        stroke={capelli.revealed ? HAIR_COLOR : "var(--bone-dim)"}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />

      {/* occhiali (daltonismo) */}
      {visionShown && (
        <g transform="translate(48, 62)">
          <circle cx="0"  cy="0" r="8" fill="none" stroke="#12151f" strokeWidth="3" />
          <circle cx="24" cy="0" r="8" fill="none" stroke="#12151f" strokeWidth="3" />
          <line x1="8"  y1="0"  x2="16" y2="0"  stroke="#12151f" strokeWidth="3" />
          <line x1="-8" y1="-2" x2="-16" y2="-5" stroke="#12151f" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="32" y1="-2" x2="40"  y2="-5" stroke="#12151f" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      )}

      {/* badge sesso — basso destra */}
      <g transform="translate(94, 114)">
        <circle cx="9" cy="9" r="9" fill="var(--surface)" stroke="var(--cyan)" strokeWidth="1.5" />
        <text x="9" y="14" textAnchor="middle" className="avatar-badge-text avatar-badge-text--sex">
          {sexSymbol}
        </text>
      </g>

      {/* badge lattosio — basso sinistra */}
      <g transform="translate(8, 114)">
        {!lattosio.revealed && (
          <circle cx="9" cy="9" r="8" fill="none" stroke={NEUTRAL_LINE} strokeWidth="1.3" />
        )}

        {lattosio.revealed && !lattosio.value && (
          <g stroke={lactoseColor} strokeWidth="1.4" strokeLinecap="round" fill="none">
            <path d="M3 2 Q0 9 3 16" />
            <line x1="3"  y1="2"  x2="3"  y2="16" />
            <line x1="3"  y1="9"  x2="16" y2="9"  />
            <line x1="13" y1="6"  x2="16" y2="9"  />
            <line x1="13" y1="12" x2="16" y2="9"  />
            <line x1="4"  y1="9"  x2="2"  y2="6"  />
            <line x1="4"  y1="9"  x2="2"  y2="12" />
          </g>
        )}

        {lattosio.revealed && lattosio.value && (
          <g stroke={lactoseColor} strokeWidth="1.3" strokeLinecap="round" fill="none">
            <line x1="9" y1="0"  x2="9"  y2="18" />
            <line x1="9" y1="3"  x2="5"  y2="1"  />
            <line x1="9" y1="3"  x2="13" y2="1"  />
            <line x1="9" y1="7"  x2="4"  y2="5"  />
            <line x1="9" y1="7"  x2="14" y2="5"  />
            <line x1="9" y1="11" x2="4"  y2="9"  />
            <line x1="9" y1="11" x2="14" y2="9"  />
          </g>
        )}
      </g>

    </svg>
  );
}
