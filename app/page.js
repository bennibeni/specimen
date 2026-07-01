/* eslint-disable react/no-unescaped-entities */
"use client";

// src/app/(qualunque-rotta)/page.js
//
// Rappresentazione interattiva della cellula T4 (t4SimpleCell.js).
// Adatta l'import sotto al percorso reale del modulo nel tuo progetto.
import { useMemo, useState } from "react";
import {
  TOTAL_LOCI,
  SHIFT_K,
  DEFAULT_GENOME_4X4,
  createInitialCell,
  runT4Tick,
  runT4Development,
  inspectT4Cell,
  t4Partner,
} from "./t4SimpleCell";
import AvatarPortrait from "./AvatarPortrait";

// ---------------------------------------------------------------------------
// Geometria dell'anello dei loci: 8 nodi su un cerchio, con un arco per ogni
// coppia (i, partner(i)). Con SHIFT_K = 2 e TOTAL_LOCI = 8, gli archi si
// scompongono in due quadrati indipendenti (0-2-4-6 e 1-3-5-7): la
// trasformazione non è una singola permutazione ciclica, ma due cicli
// separati. È il fatto strutturale più importante della regola, reso visibile.
// ---------------------------------------------------------------------------

const RING_RADIUS = 108;
const RING_CENTER = 130;

function nodePosition(index) {
  const angle = (index / TOTAL_LOCI) * Math.PI * 2 - Math.PI / 2;
  return {
    x: RING_CENTER + RING_RADIUS * Math.cos(angle),
    y: RING_CENTER + RING_RADIUS * Math.sin(angle),
  };
}

function buildEdges() {
  const seen = new Set();
  const edges = [];
  for (let i = 0; i < TOTAL_LOCI; i++) {
    const partner = t4Partner(i);
    const key = [i, partner].sort((a, b) => a - b).join("-");
    if (!seen.has(key)) {
      seen.add(key);
      edges.push([i, partner]);
    }
  }
  return edges;
}

const RING_EDGES = buildEdges();

const LOCUS_TOOLTIPS = [
  "L0 — Sesso",
  "L1 — Capelli",
  "L2 — Sesso + Pelle",
  "L3 — Capelli + Occhi",
  "L4 — Pelle + Lattosio",
  "L5 — Occhi + Vista",
  "L6 — Lattosio",
  "L7 — Vista",
];

function LociRing({ cell, activeTick }) {
  return (
    <svg
      viewBox="0 -16 260 292"
      className="ring-svg"
      role="img"
      aria-label="Anello dei loci con connessioni shift-2"
    >
      {RING_EDGES.map(([a, b]) => {
        const pa = nodePosition(a);
        const pb = nodePosition(b);
        const isActive =
          activeTick !== null &&
          ((a === activeTick && b === t4Partner(activeTick)) ||
            (b === activeTick && a === t4Partner(activeTick)));
        return (
          <line
            key={`${a}-${b}`}
            x1={pa.x}
            y1={pa.y}
            x2={pb.x}
            y2={pb.y}
            className={isActive ? "ring-edge ring-edge--active" : "ring-edge"}
          />
        );
      })}

      {Array.from({ length: TOTAL_LOCI }, (_, i) => {
        const pos = nodePosition(i);
        const value = cell.loci[i];
        const isActive = i === activeTick || t4Partner(activeTick) === i;
        return (
          <g key={i} className="ring-locus-group">
            <title>{LOCUS_TOOLTIPS[i]}</title>
            <circle
              cx={pos.x}
              cy={pos.y}
              r={16}
              className={`ring-node ${value ? "ring-node--on" : "ring-node--off"} ${
                isActive ? "ring-node--active" : ""
              }`}
            />
            <text x={pos.x} y={pos.y + 4} textAnchor="middle" className="ring-node-label">
              {value}
            </text>
            <text
              x={pos.x}
              y={pos.y + (pos.y > RING_CENTER ? 30 : -22)}
              textAnchor="middle"
              className="ring-index-label"
            >
              L{i}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// Mappa locus → etichetta dei fenotipi che determina (stessa logica di LOCUS_TOOLTIPS)
const LOCUS_PHENOTYPES = [
  "Sesso",
  "Capelli",
  "Sesso + Pelle",
  "Capelli + Occhi",
  "Pelle + Lattosio",
  "Occhi + Vista",
  "Lattosio",
  "Vista",
];

// Dato (r, c) restituisce il locus corrispondente e la lettera dell'allele.
// Colonne 0-1 → loci 0-3 (riga = indice locus); colonne 2-3 → loci 4-7.
function cellToLocus(r, c) {
  if (c < 2) return { locus: r, allele: c === 0 ? "A" : "B" };
  return { locus: r + 4, allele: c === 2 ? "A" : "B" };
}

function genomeTooltip(r, c, isSexChromosome) {
  const { locus, allele } = cellToLocus(r, c);
  const phenotypes = LOCUS_PHENOTYPES[locus];
  if (isSexChromosome) {
    return `Cromosoma ${allele === "A" ? "1" : "2"} di L${locus} → ${phenotypes}`;
  }
  return `Allele ${allele} di L${locus} → ${phenotypes}`;
}

function GenomeGrid({ genome, onToggle, highlightCells = [] }) {
  const isHighlighted = (r, c) => highlightCells.some(([hr, hc]) => hr === r && hc === c);

  return (
    <div className="genome-grid" role="group" aria-label="Genoma 4x4">
      {genome.map((row, r) =>
        row.map((value, c) => {
          const special = isHighlighted(r, c);
          const tooltip = genomeTooltip(r, c, special);
          return (
            <button
              key={`${r}-${c}`}
              type="button"
              onClick={() => onToggle(r, c)}
              className={`allele ${value ? "allele--on" : "allele--off"} ${
                special ? "allele--sex" : ""
              }`}
              aria-pressed={value === 1}
              aria-label={tooltip}
              title={tooltip}
            >
              {special ? (value ? "Y" : "X") : value}
            </button>
          );
        })
      )}
    </div>
  );
}

function MessageBits({ messageData, tick }) {
  return (
    <div className="bits-row" aria-label="Sequenza di output">
      {messageData.map((bit, i) => {
        const computed = i < tick;
        const inCode = i < 6;
        return (
          <div
            key={i}
            className={`bit-chip ${computed ? (bit ? "bit-chip--on" : "bit-chip--off") : "bit-chip--pending"} ${
              inCode ? "" : "bit-chip--unused"
            }`}
            title={inCode ? `messageData[${i}] — incluso nel codice` : `messageData[${i}] — non usato nel codice`}
          >
            {computed ? bit : "·"}
          </div>
        );
      })}
    </div>
  );
}

function PF8Grid({ pf8 }) {
  const cells = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      cells.push({ r, c, active: r === pf8.row && c === pf8.col });
    }
  }
  return (
    <div className="pf8-wrap">
      <div className="pf8-grid" role="img" aria-label={`Coordinata PF8: riga ${pf8.row}, colonna ${pf8.col}`}>
        {cells.map(({ r, c, active }) => (
          <div key={`${r}-${c}`} className={`pf8-cell ${active ? "pf8-cell--active" : ""}`} />
        ))}
      </div>
      <div className="pf8-caption">
        riga <strong>{pf8.rowBits}</strong> = {pf8.row} · colonna <strong>{pf8.colBits}</strong> = {pf8.col}
      </div>
    </div>
  );
}

// Secondo genoma di esempio: ~31% di alleli a 1 (5/16), scelto per
// compensare il bias dell'OR nella risoluzione di dominanza
// (P(locus=1) = 1-(1-p)^2 ⇒ p≈0.29 dà loci vicini al 50/50).
// Produce una sequenza di output più mista di DEFAULT_GENOME_4X4,
// dove i loci risolti sono quasi tutti 1.
const BALANCED_GENOME_4X4 = [
  [1, 0, 0, 0],
  [0, 0, 1, 0],
  [1, 0, 0, 0],
  [0, 1, 1, 0],
];

const GENOME_PRESETS = [
  { id: "default", label: "default", genome: DEFAULT_GENOME_4X4 },
  { id: "balanced", label: "bilanciato", genome: BALANCED_GENOME_4X4 },
];

// Il fenotipo è il codice a 6 bit finale, non i loci grezzi: 6 caratteri
// binari -> 2^6 = 64 combinazioni, che è esattamente la griglia PF8 8x8.
// I primi 3 bit (sesso, capelli, pelle) formano la riga; gli ultimi 3
// (occhi, lattosio, vista) formano la colonna.
//
// Ogni tratto dichiara un `mechanism`:
// - "dominance": vero locus mendeliano, bit=1 è la variante dominante
//   (OR fra due alleli in competizione). Vale per capelli, pelle, occhi,
//   lattosio, vista.
// - "chromosomal": il sesso NON è dominanza allelica. I due bit sorgente
//   (genome[0][0], genome[0][1]) qui rappresentano i due cromosomi sessuali,
//   non due alleli dello stesso gene. La regola "basta un Y per essere
//   maschio" coincide numericamente con un OR, ma il significato è diverso:
//   non c'è competizione fra varianti di un gene, solo presenza/assenza del
//   cromosoma Y. Per questo non viene mai colorato come "dominante".
//
// Dominanze codificate:
// - capelli ricci dominanti su lisci (semplificazione didattica standard;
//   in realtà il tratto è poligenico)
// - pelle scura dominante su chiara (idem, semplificazione)
// - occhi marroni dominanti su verdi
// - vista normale dominante sul daltonismo (recessivo, legato al cromosoma X)
// - tolleranza al lattosio dominante sull'intolleranza (persistenza della
//   lattasi in età adulta, gene LCT — uno dei pochi tratti umani reali a
//   singolo locus, come il daltonismo)
const PHENOTYPE_TRAITS = [
  { id: "sesso", label: "Sesso", off: "Femmina", on: "Maschio", mechanism: "chromosomal" },
  { id: "capelli", label: "Capelli", off: "Lisci", on: "Ricci", mechanism: "dominance" },
  { id: "pelle", label: "Pelle", off: "Chiara", on: "Scura", mechanism: "dominance" },
  { id: "occhi", label: "Occhi", off: "Verdi", on: "Marroni", mechanism: "dominance" },
  { id: "lattosio", label: "Lattosio", off: "Intollerante", on: "Tollerante", mechanism: "dominance" },
  { id: "vista", label: "Vista", off: "Daltonismo", on: "Normale", mechanism: "dominance" },
];

// Le due celle del genoma che alimentano il locus del Sesso: qui
// rappresentano i due cromosomi sessuali (0=X, 1=Y), non una coppia di
// alleli dominanza/recessività.
const SEX_CHROMOSOME_CELLS = [
  [0, 0],
  [0, 1],
];

function PhenotypeRow({ messageData, tick }) {
  return (
    <div className="phenotype-row" aria-label="Fenotipo: 6 caratteri decodificati dal codice">
      {PHENOTYPE_TRAITS.map((trait, i) => {
        const computed = i < tick;
        const value = messageData[i];
        const isChromosomal = trait.mechanism === "chromosomal";

        let stateClass = "trait-phenotype--pending";
        if (computed) {
          if (isChromosomal) {
            stateClass = "trait-phenotype--neutral";
          } else {
            stateClass = value ? "trait-phenotype--dominant" : "trait-phenotype--recessive";
          }
        }

        return (
          <div key={trait.id} className="trait-card">
            <p className="trait-label">
              {trait.label}
              {isChromosomal && <span className="trait-flag">†</span>}
            </p>
            <div className={`trait-phenotype ${stateClass}`}>
              {computed ? (value ? trait.on : trait.off) : "·"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Probabilità per allele scelta per compensare il bias dell'OR a valle
// (resolveDominance) e dello XOR finale. Con alleli a probabilità p:
// P(locus=1) = 1-(1-p)^2; per p = 1-sqrt(0.5) ≈ 0.2929, P(locus=1) ≈ 0.5,
// e quindi anche P(fenotipo=1) = 2*P(locus=1)*(1-P(locus=1)) ≈ 0.5 per
// ciascuno dei 6 caratteri (incluso il sesso). Con p=0.5 puro i fenotipi
// risulterebbero sbilanciati a ~37.5%/62.5% (verificato per simulazione).
const RANDOM_ALLELE_PROBABILITY = 1 - Math.sqrt(0.5);

function randomGenome() {
  return Array.from({ length: 4 }, () =>
    Array.from({ length: 4 }, () => (Math.random() < RANDOM_ALLELE_PROBABILITY ? 1 : 0))
  );
}

// Tabella di contribuzione: per ciascun fenotipo (tick 0-5), quali due loci
// concorrono alla regola write_t = L_t XOR L_(t+2 mod 8).
const LOCUS_CONTRIBUTIONS = PHENOTYPE_TRAITS.map((trait, i) => ({
  trait: trait.label,
  base: i,
  partner: t4Partner(i),
}));

function ExplainerSection() {
  return (
    <div className="panel explainer">
      <details className="log-details">
        <summary className="panel-title log-summary">
          Guida al modello
        </summary>

      <h3 className="explainer-h3">1 — Dal genoma al fenotipo</h3>
      <p className="explainer-p">
        Ogni cellula parte da un genoma 4×4 (16 alleli). Coppie di alleli vengono risolte per dominanza
        (<code>OR</code>: basta un allele dominante perché il locus si esprima) in 8 loci. Gli 8 loci
        attraversano una trasformazione XOR ciclica con shift 2 (<code>write_t = L_t ⊕ L_(t+2 mod 8)</code>),
        producendo 8 bit di output. I primi 6 di questi bit sono il <strong>codice</strong>, che è anche il
        fenotipo: 6 caratteri binari, 2⁶ = 64 combinazioni possibili, decodificate come coordinata riga/colonna
        in una griglia 8×8 (PF8).
      </p>

      <h3 className="explainer-h3">2 — I 6 caratteri e il loro meccanismo</h3>
      <table className="explainer-table">
        <thead>
          <tr>
            <th>Carattere</th>
            <th>bit 0</th>
            <th>bit 1</th>
            <th>Meccanismo</th>
          </tr>
        </thead>
        <tbody>
          {PHENOTYPE_TRAITS.map((trait) => (
            <tr key={trait.id}>
              <td>
                {trait.label}
                {trait.mechanism === "chromosomal" && <span className="trait-flag">†</span>}
              </td>
              <td>{trait.off}</td>
              <td>{trait.on}</td>
              <td
                className={`explainer-mechanism ${
                  trait.mechanism === "chromosomal" ? "explainer-mechanism--chromosomal" : ""
                }`}
              >
                {trait.mechanism === "chromosomal" ? "cromosomico (Y presente)" : "dominanza (OR alleli)"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="explainer-note">
        † il sesso non è un locus a dominanza mendeliana: i due bit sorgente rappresentano i due cromosomi
        sessuali (X/Y), non due alleli dello stesso gene in competizione. "Basta un Y per essere maschio"
        coincide numericamente con un OR, ma non c'è dominanza fra varianti — per questo nel pannello
        Fenotipo e nel genoma (celle in ciano) non viene mai colorato come "dominante". Capelli e pelle
        restano semplificazioni didattiche di tratti poligenici. Occhi, lattosio e vista sono gli esempi più
        fedeli a un vero locus mendeliano singolo.
      </p>

      <h3 className="explainer-h3">3 — Quali loci determinano quale fenotipo</h3>
      <table className="explainer-table">
        <thead>
          <tr>
            <th>Fenotipo</th>
            <th>Formula</th>
            <th>Loci coinvolti</th>
          </tr>
        </thead>
        <tbody>
          {LOCUS_CONTRIBUTIONS.map((row) => (
            <tr key={row.trait}>
              <td>{row.trait}</td>
              <td>
                L{row.base} ⊕ L{row.partner}
              </td>
              <td>
                L{row.base}, L{row.partner}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="explainer-p">
        I loci L2-L5 contribuiscono a <strong>due</strong> fenotipi ciascuno (una volta come base del proprio
        tick, una volta come partner del tick precedente di 2 posizioni). L0, L1, L6, L7 contribuiscono a un
        solo fenotipo ciascuno — i primi due solo come base, gli ultimi due solo come partner, dato che i tick
        6 e 7 esistono ma non producono un proprio carattere (il codice usa solo i primi 6 bit). I loci
        centrali hanno quindi un peso fenotipico maggiore di quelli alle estremità della sequenza.
      </p>

      <h3 className="explainer-h3">4 — L'anello dei loci</h3>
      <p className="explainer-p">
        Le 8 connessioni base→partner non formano un unico ciclo di lunghezza 8, ma si scompongono in due
        quadrati indipendenti (0-2-4-6 e 1-3-5-7), perché lo shift 2 non è coprimo con 8. Per questo la
        trasformazione non è iniettiva: genomi diversi possono produrre lo stesso fenotipo, e con alcuni
        genomi metà della sequenza collassa a zero (il caso "silent_message" nel pannello di ispezione).
      </p>

      <h3 className="explainer-h3">5 — Perché le 64 celle PF8 sono equiprobabili</h3>
      <p className="explainer-p">
        Con il genoma <strong>casuale</strong>, ogni allele ha probabilità <code>p = 1 − √0.5 ≈ 0.293</code>,
        non 0.5. Questo valore non è arbitrario: risolve esattamente l'equazione <code>1 − (1 − p)² = 0.5</code>,
        cioè rende ciascuno degli 8 loci un bit equiprobabile (probabilità esatta 0.5, non approssimata),
        nonostante <code>resolveDominance</code> usi un OR che normalmente sbilancia i loci verso 1.
      </p>
      <p className="explainer-p">
        Dato che gli 8 loci sono indipendenti fra loro (ciascuno deriva da una coppia di celle del genoma
        disgiunta dalle altre) e ciascuno è un bit equo, il vettore degli 8 loci è uniforme su tutti i
        2⁸ = 256 pattern possibili. La regola <code>bit_t = L_t ⊕ L_(t+2)</code> è una trasformazione lineare
        su GF(2) — lo XOR è l'addizione di quel campo. Una mappa lineare suriettiva applicata a un input
        uniforme produce un output uniforme su tutta la sua immagine: ogni fenotipo riceve esattamente
        256 / 64 = 4 dei 256 pattern di loci, nessuno escluso né favorito.
      </p>
      <p className="explainer-note">
        Risultato più forte di un semplice 50/50 per ciascun carattere preso singolarmente: qui anche tutte
        le <strong>combinazioni congiunte</strong> dei 6 caratteri sono equiprobabili, nonostante i bit
        condividano dei loci (es. L2 contribuisce sia a Pelle che a Sesso) e siano quindi correlati come
        funzioni — la linearità della trasformazione garantisce comunque l'uniformità esatta del vettore
        congiunto, non solo dei margini.
      </p>
      </details>
    </div>
  );
}

export default function T4CellPage() {
  const [presetId, setPresetId] = useState("default");
  const [genome, setGenome] = useState(() => DEFAULT_GENOME_4X4.map((row) => [...row]));
  const [cell, setCell] = useState(() => createInitialCell(genome));

  function handlePreset(id) {
    const preset = GENOME_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    const next = preset.genome.map((row) => [...row]);
    setPresetId(id);
    setGenome(next);
    setCell(createInitialCell(next));
  }

  function handleRandom() {
    const next = randomGenome();
    setPresetId("random");
    setGenome(next);
    setCell(createInitialCell(next));
  }

  const inspection = useMemo(() => inspectT4Cell(cell), [cell]);
  const isComplete = cell.tick >= TOTAL_LOCI;
  const activeTick = isComplete ? null : cell.tick;

  function handleToggleAllele(row, col) {
    const next = genome.map((r) => [...r]);
    next[row][col] = next[row][col] ? 0 : 1;
    setGenome(next);
    setPresetId(null);
    setCell(createInitialCell(next));
  }

  function handleStep() {
    setCell((c) => runT4Tick(c));
  }

  function handleRun() {
    setCell((c) => runT4Development(c));
  }

  function handleReset() {
    setCell(createInitialCell(genome));
  }

  return (
    <main className="page">
      <style jsx global>{`
        :root {
          --bg: #12151f;
          --surface: #1b1f2c;
          --surface-2: #232838;
          --border: #2c3142;
          --bone: #f2efe6;
          --bone-dim: #b9bcc8;
          --amber: #e8a33d;
          --amber-dim: #6a5430;
          --cyan: #5fb8b0;
          --muted: #4a5066;
        }

        * {
          box-sizing: border-box;
        }

        body {
          background: var(--bg);
          margin: 0;
        }
      `}</style>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: var(--bg);
          color: var(--bone);
          font-family: var(--font-body), sans-serif;
          padding: 48px 20px 80px;
          display: flex;
          justify-content: center;
        }

        .sheet {
          width: 100%;
          max-width: 880px;
        }

        .eyebrow {
          font-family: var(--font-mono), monospace;
          font-size: 12px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--cyan);
          margin: 0 0 8px;
        }

        .hero {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 24px;
          flex-wrap: wrap;
          border-bottom: 1px solid var(--border);
          padding-bottom: 28px;
          margin-bottom: 32px;
        }

        .hero h1 {
          font-family: var(--font-display), sans-serif;
          font-weight: 700;
          font-size: clamp(28px, 4vw, 40px);
          margin: 0;
          letter-spacing: -0.01em;
        }

        .hero-sub {
          font-size: 14px;
          color: var(--bone-dim);
          margin: 6px 0 0;
        }

        .status-pill {
          font-family: var(--font-mono), monospace;
          font-size: 13px;
          padding: 6px 14px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: var(--surface);
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--muted);
        }

        .status-pill--stable .status-dot {
          background: var(--cyan);
        }

        .code-readout {
          font-family: var(--font-mono), monospace;
          font-size: 13px;
          color: var(--bone-dim);
          margin-top: 10px;
        }

        .code-readout strong {
          color: var(--amber);
          font-size: 20px;
          letter-spacing: 0.08em;
        }

        .grid-two {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }

        @media (max-width: 680px) {
          .grid-two {
            grid-template-columns: 1fr;
          }
        }

        .panel {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 4px;
          padding: 20px;
        }

        .panel-title {
          font-family: var(--font-mono), monospace;
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--bone-dim);
          margin: 0 0 16px;
        }

        .panel-header {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .preset-toggle {
          display: flex;
          gap: 6px;
          margin-bottom: 16px;
        }

        .preset-btn {
          font-family: var(--font-mono), monospace;
          font-size: 11px;
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--bone-dim);
          cursor: pointer;
        }

        .preset-btn:hover {
          border-color: var(--cyan);
        }

        .preset-btn--active {
          border-color: var(--amber);
          color: var(--amber);
        }

        :global(.genome-grid) {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          max-width: 220px;
          margin: 0 auto;
        }

        :global(.allele) {
          aspect-ratio: 1;
          border-radius: 4px;
          border: 1px solid var(--border);
          font-family: var(--font-mono), monospace;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.12s ease, background 0.12s ease;
        }

        :global(.allele:hover) {
          transform: translateY(-1px);
        }

        :global(.allele:focus-visible) {
          outline: 2px solid var(--cyan);
          outline-offset: 2px;
        }

        :global(.allele--off) {
          background: var(--surface-2);
          color: var(--muted);
        }

        :global(.allele--on) {
          background: var(--amber-dim);
          color: var(--amber);
        }

        :global(.allele--sex) {
          border-color: var(--cyan);
          color: var(--cyan);
        }

        :global(.allele--sex.allele--on),
        :global(.allele--sex.allele--off) {
          background: var(--surface-2);
        }

        .genome-caption {
          text-align: center;
          font-size: 12px;
          color: var(--bone-dim);
          margin-top: 14px;
        }

        .genome-caption--sex {
          color: var(--cyan);
          opacity: 0.85;
          margin-top: 6px;
        }

        :global(.phenotype-row) {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        :global(.trait-card) {
          flex: 1 1 130px;
          min-width: 130px;
          border: 1px solid var(--border);
          border-radius: 4px;
          background: var(--surface-2);
          padding: 12px 10px;
          text-align: center;
        }

        :global(.trait-label) {
          font-family: var(--font-mono), monospace;
          font-size: 10px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--bone-dim);
          margin: 0 0 8px;
        }

        :global(.trait-phenotype) {
          font-family: var(--font-mono), monospace;
          font-size: 13px;
          letter-spacing: 0.02em;
          padding: 6px 4px;
          border-radius: 4px;
        }

        :global(.trait-phenotype--pending) {
          background: var(--surface);
          color: var(--muted);
          border: 1px solid var(--border);
        }

        :global(.trait-flag) {
          color: var(--cyan);
          margin-left: 3px;
        }

        :global(.trait-phenotype--neutral) {
          background: var(--surface);
          color: var(--cyan);
          border: 1px solid var(--cyan);
          opacity: 0.85;
        }

        :global(.trait-phenotype--recessive) {
          background: var(--surface);
          color: var(--bone-dim);
          border: 1px solid var(--border);
        }

        :global(.trait-phenotype--dominant) {
          background: var(--amber-dim);
          color: var(--amber);
          border: 1px solid var(--amber);
        }

        :global(.ring-svg) {
          width: 100%;
          max-width: 260px;
          display: block;
          margin: 0 auto;
        }

        :global(.ring-edge) {
          stroke: var(--border);
          stroke-width: 1.5;
        }

        :global(.ring-edge--active) {
          stroke: var(--cyan);
          stroke-width: 2.5;
        }

        :global(.ring-node) {
          stroke-width: 1.5;
          transition: stroke 0.15s ease, fill 0.15s ease;
        }

        :global(.ring-node--off) {
          fill: var(--surface-2);
          stroke: var(--border);
        }

        :global(.ring-node--on) {
          fill: var(--amber-dim);
          stroke: var(--amber);
        }

        :global(.ring-node--active) {
          stroke: var(--cyan);
          stroke-width: 3;
        }

        :global(.ring-node-label) {
          font-family: var(--font-mono), monospace;
          font-size: 11px;
          fill: var(--bone);
        }

        :global(.ring-index-label) {
          font-family: var(--font-mono), monospace;
          font-size: 9px;
          fill: var(--bone-dim);
        }

        :global(.ring-locus-group) {
          cursor: default;
        }

        .ring-caption {
          text-align: center;
          font-size: 12px;
          color: var(--bone-dim);
          margin-top: 10px;
        }

        .ring-formula {
          font-family: var(--font-mono), monospace;
          font-size: 12px;
          color: var(--bone-dim);
          text-align: center;
          margin: 0 0 10px;
        }

        .controls {
          display: flex;
          gap: 10px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .btn {
          font-family: var(--font-mono), monospace;
          font-size: 13px;
          padding: 10px 18px;
          border-radius: 4px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--bone);
          cursor: pointer;
          transition: border-color 0.12s ease, color 0.12s ease;
        }

        .btn:hover:not(:disabled) {
          border-color: var(--cyan);
        }

        .btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .btn--primary {
          background: var(--amber-dim);
          border-color: var(--amber);
          color: var(--amber);
        }

        :global(.bits-row) {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        :global(.bit-chip) {
          width: 32px;
          height: 32px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-mono), monospace;
          font-size: 14px;
          border: 1px solid var(--border);
        }

        :global(.bit-chip--pending) {
          color: var(--muted);
          background: var(--surface-2);
        }

        :global(.bit-chip--off) {
          color: var(--muted);
          background: var(--surface-2);
        }

        :global(.bit-chip--on) {
          color: var(--amber);
          background: var(--amber-dim);
          border-color: var(--amber);
        }

        :global(.bit-chip--unused) {
          opacity: 0.45;
        }

        .bits-caption {
          font-size: 12px;
          color: var(--bone-dim);
          margin-top: 12px;
        }

        :global(.pf8-panel-body) {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 24px;
          flex-wrap: wrap;
        }

        :global(.avatar-svg) {
          width: 96px;
          height: 120px;
          flex-shrink: 0;
        }

        :global(.avatar-badge-text) {
          font-family: var(--font-mono), monospace;
          font-size: 13px;
          font-weight: 600;
          fill: var(--cyan);
        }

        :global(.pf8-wrap) {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        :global(.pf8-grid) {
          display: grid;
          grid-template-columns: repeat(8, 14px);
          grid-template-rows: repeat(8, 14px);
          gap: 2px;
        }

        :global(.pf8-cell) {
          background: var(--surface-2);
          border-radius: 2px;
        }

        :global(.pf8-cell--active) {
          background: var(--amber);
        }

        :global(.pf8-caption) {
          font-family: var(--font-mono), monospace;
          font-size: 12px;
          color: var(--bone-dim);
        }

        :global(.pf8-caption strong) {
          color: var(--bone);
        }

        .log-summary {
          cursor: pointer;
          list-style: none;
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
          user-select: none;
        }

        .log-summary::-webkit-details-marker {
          display: none;
        }

        .log-summary::before {
          content: "▸";
          color: var(--cyan);
          font-size: 10px;
          transition: transform 0.12s ease;
        }

        .log-details[open] .log-summary::before {
          transform: rotate(90deg);
        }

        .log-details[open] .log-summary {
          margin-bottom: 16px;
        }

        .log-panel {
        }

        .log-row {
          font-family: var(--font-mono), monospace;
          font-size: 13px;
          padding: 7px 0;
          border-bottom: 1px solid var(--border);
          color: var(--bone-dim);
          display: flex;
          gap: 10px;
        }

        .log-row:last-child {
          border-bottom: none;
        }

        .log-tick {
          color: var(--cyan);
          width: 32px;
          flex-shrink: 0;
        }

        .log-result {
          color: var(--amber);
        }

        .log-empty {
          font-size: 13px;
          color: var(--muted);
          padding: 8px 0;
        }

        .footer-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        @media (max-width: 680px) {
          .footer-grid {
            grid-template-columns: 1fr;
          }
        }

        .stat-label {
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--bone-dim);
          margin: 0 0 4px;
        }

        .stat-value {
          font-family: var(--font-mono), monospace;
          font-size: 20px;
          color: var(--bone);
        }

        .notes {
          margin-top: 16px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .note-tag {
          font-family: var(--font-mono), monospace;
          font-size: 11px;
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid var(--border);
          color: var(--bone-dim);
        }

        :global(.explainer) {
          margin-top: 8px;
        }

        :global(.explainer-h3) {
          font-family: var(--font-display), sans-serif;
          font-weight: 700;
          font-size: 16px;
          color: var(--bone);
          margin: 28px 0 10px;
        }

        :global(.explainer-h3:first-of-type) {
          margin-top: 4px;
        }

        :global(.explainer-p) {
          font-size: 14px;
          line-height: 1.6;
          color: var(--bone-dim);
          margin: 0 0 8px;
        }

        :global(.explainer-p strong) {
          color: var(--bone);
        }

        :global(.explainer-p code) {
          font-family: var(--font-mono), monospace;
          font-size: 13px;
          background: var(--surface-2);
          color: var(--cyan);
          padding: 1px 5px;
          border-radius: 3px;
        }

        :global(.explainer-note) {
          font-size: 12px;
          line-height: 1.5;
          color: var(--bone-dim);
          margin: 10px 0 0;
        }

        :global(.explainer-table) {
          width: 100%;
          border-collapse: collapse;
          font-family: var(--font-mono), monospace;
          font-size: 13px;
          margin-top: 4px;
        }

        :global(.explainer-table th) {
          text-align: left;
          font-size: 10px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--bone-dim);
          font-weight: 500;
          padding: 8px 10px;
          border-bottom: 1px solid var(--border);
        }

        :global(.explainer-table td) {
          padding: 8px 10px;
          border-bottom: 1px solid var(--border);
          color: var(--bone);
        }

        :global(.explainer-table tr:last-child td) {
          border-bottom: none;
        }

        :global(.explainer-table td:first-child) {
          color: var(--bone-dim);
        }

        :global(.explainer-mechanism) {
          font-size: 11px;
          color: var(--bone-dim) !important;
        }

        :global(.explainer-mechanism--chromosomal) {
          color: var(--cyan) !important;
        }
      `}</style>

      <div className="sheet">
        <div className="hero">
          <div>
            <p className="eyebrow">Specimen · TTE-T4</p>
            <h1>Gioco Combinatorio · Specimen</h1>
            <p className="code-readout">
              codice fenotipo <strong>{cell.code}</strong>
            </p>
          </div>
          <span className={`status-pill ${inspection.status === "stable" ? "status-pill--stable" : ""}`}>
            <span className="status-dot" />
            {inspection.status === "stable" ? "stabile" : "in sviluppo"}
          </span>
        </div>

        <div className="controls">
          <button className="btn btn--primary" onClick={handleStep} disabled={isComplete}>
            Avanza un tick
          </button>
          <button className="btn" onClick={handleRun} disabled={isComplete}>
            Sviluppa tutto
          </button>
          <button className="btn" onClick={handleReset}>
            Reimposta
          </button>
        </div>

        <div className="grid-two">
          <div className="panel">
            <div className="panel-header">
              <p className="panel-title">Genoma — 4×4</p>
              <div className="preset-toggle">
                {GENOME_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={`preset-btn ${presetId === preset.id ? "preset-btn--active" : ""}`}
                    onClick={() => handlePreset(preset.id)}
                  >
                    {preset.label}
                  </button>
                ))}
                <button
                  type="button"
                  className={`preset-btn ${presetId === "random" ? "preset-btn--active" : ""}`}
                  onClick={handleRandom}
                  title="ogni allele a 0 o 1 con probabilità ~0.29, calibrata perché i 6 fenotipi risultino vicini al 50/50"
                >
                  casuale
                </button>
              </div>
            </div>
            <GenomeGrid genome={genome} onToggle={handleToggleAllele} highlightCells={SEX_CHROMOSOME_CELLS} />
            <p className="genome-caption">
              {presetId
                ? "tocca un allele per modificarlo. La cellula si reimposta."
                : "genoma personalizzato — tocca un preset per ripristinare."}
            </p>
            <p className="genome-caption genome-caption--sex">
              le due celle evidenziate in ciano (riga 1) sono i cromosomi sessuali, non alleli: X o Y.
            </p>
          </div>

          <div className="panel">
            <p className="panel-title" style={{ textAlign: "center" }}>Anello dei loci — shift {SHIFT_K}</p>
            <p className="ring-formula">
              write<sub>t</sub> = L<sub>t</sub> ⊕ L<sub>(t+{SHIFT_K}) mod {TOTAL_LOCI}</sub>
            </p>
            <LociRing cell={cell} activeTick={activeTick} />
            <p className="ring-caption">due quadrati indipendenti: 0-2-4-6 e 1-3-5-7</p>
          </div>
        </div>

        <div className="panel" style={{ marginBottom: 24 }}>
          <p className="panel-title">Fenotipo — 6 caratteri</p>
          <PhenotypeRow messageData={cell.messageData} tick={cell.tick} />
          <p className="bits-caption">
            sesso · capelli · pelle → riga PF8 — occhi · lattosio · vista → colonna PF8 (2⁶ = 64 fenotipi)
          </p>
          <p className="bits-caption">
            † il sesso non segue una dominanza mendeliana: è determinato dal sistema cromosomico XY, non
            da un singolo locus — qui è solo un'etichetta binaria del modello.
          </p>
        </div>

        <div className="grid-two">
          <div className="panel">
            <p className="panel-title">Sequenza di output</p>
            <MessageBits messageData={cell.messageData} tick={cell.tick} />
            <p className="bits-caption">i primi 6 bit (in piena luce) compongono il codice</p>
          </div>

          <div className="panel">
            <p className="panel-title">Coordinata PF8</p>
            <div className="pf8-panel-body">
              <AvatarPortrait messageData={cell.messageData} tick={cell.tick} traits={PHENOTYPE_TRAITS} />
              <PF8Grid pf8={cell.pf8} />
            </div>
          </div>
        </div>

        <div className="panel" style={{ marginBottom: 24 }}>
          <details className="log-details">
            <summary className="panel-title log-summary">
              Registro dei tick
              {cell.history.length > 0 ? ` (${cell.history.length})` : ""}
            </summary>
            <div className="log-panel">
              {cell.history.length === 0 ? (
                <p className="log-empty">nessun tick eseguito.</p>
              ) : (
                cell.history.map((event) => (
                  <div className="log-row" key={event.index}>
                    <span className="log-tick">t{event.index}</span>
                    <span>
                      L{event.index} ⊕ L{event.partnerIndex} = {event.locusValue} ⊕ {event.partnerValue} ={" "}
                      <span className="log-result">{event.writeValue}</span>
                    </span>
                  </div>
                ))
              )}
            </div>
          </details>
        </div>

        <div className="panel">
          <p className="panel-title">Ispezione</p>
          <div className="footer-grid">
            <div>
              <p className="stat-label">stato</p>
              <p className="stat-value">{inspection.complete ? "completa" : "incompleta"}</p>
            </div>
            <div>
              <p className="stat-label">massa del messaggio</p>
              <p className="stat-value">{inspection.messageMass} / 6</p>
            </div>
            <div>
              <p className="stat-label">tick</p>
              <p className="stat-value">
                {cell.tick} / {TOTAL_LOCI}
              </p>
            </div>
          </div>
          <div className="notes">
            {inspection.notes.map((note) => (
              <span className="note-tag" key={note}>
                {note}
              </span>
            ))}
          </div>
        </div>

        <ExplainerSection />
      </div>
    </main>
  );
}
