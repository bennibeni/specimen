// src/lib/t4-complete-cell/t4SimpleCell.js
// Cellula T4 semplificata: genoma -> 8 loci -> trasformazione XOR ciclica -> codice/PF8.
// Versione coerente con ciò che la regola TTE-T4 calcola realmente:
// un'unica trasformazione lineare su GF(2)^8 (shift 2), niente griglia di
// memoria 4x4 né tracciamento di conflitti, perché ogni indice viene scritto
// esattamente una volta.
//
// Regola TTE-T4:
// write_t = L_t XOR L_(t+2 mod 8)

export const TOTAL_LOCI = 8;
export const SHIFT_K = 2;

export const DEFAULT_GENOME_4X4 = [
  [1, 0, 1, 0],
  [1, 1, 0, 1],
  [0, 0, 1, 1],
  [1, 0, 0, 1],
];

export function toBit(value) {
  return Number(value) ? 1 : 0;
}

export function validateGenome4x4(genome) {
  if (!Array.isArray(genome) || genome.length !== 4) {
    throw new Error("Il genoma deve essere una matrice 4x4.");
  }

  for (let row = 0; row < 4; row++) {
    if (!Array.isArray(genome[row]) || genome[row].length !== 4) {
      throw new Error(`La riga ${row} del genoma deve contenere 4 valori.`);
    }
  }
}

export function cloneMatrix(matrix) {
  return matrix.map((row) => [...row]);
}

export function resolveDominance(alleleA, alleleB) {
  return toBit(alleleA) || toBit(alleleB) ? 1 : 0;
}

export function resolveGenomeToLoci(genome) {
  validateGenome4x4(genome);

  const loci = Array(TOTAL_LOCI).fill(0);

  for (let row = 0; row < 4; row++) {
    loci[row] = resolveDominance(genome[row][0], genome[row][1]);
    loci[row + 4] = resolveDominance(genome[row][2], genome[row][3]);
  }

  return loci;
}

export function t4Partner(index) {
  return (index + SHIFT_K) % TOTAL_LOCI;
}

export function messageDataToCode(messageData) {
  return messageData.slice(0, 6).map(toBit).join("");
}

export function codeToPF8(code) {
  const safeCode = String(code)
    .replace(/[^01]/g, "")
    .padEnd(6, "0")
    .slice(0, 6);

  return {
    code: safeCode,
    rowBits: safeCode.slice(0, 3),
    colBits: safeCode.slice(3, 6),
    row: parseInt(safeCode.slice(0, 3), 2),
    col: parseInt(safeCode.slice(3, 6), 2),
  };
}

export function createInitialCell(genome = DEFAULT_GENOME_4X4) {
  validateGenome4x4(genome);

  return {
    id: "T4-CELL-001",
    phase: "initialized",
    tick: 0,
    genome: cloneMatrix(genome),
    loci: resolveGenomeToLoci(genome),
    messageData: Array(TOTAL_LOCI).fill(0),
    code: "000000",
    pf8: codeToPF8("000000"),
    history: [],
    inspection: {
      status: "not_inspected",
      complete: false,
      messageMass: 0,
      notes: [],
    },
  };
}

// Un tick calcola un solo locus della trasformazione (utile per animare lo
// sviluppo passo-passo). Il valore scritto non dipende dai tick precedenti:
// ogni indice è indipendente, quindi l'ordine dei tick è solo presentazione.
export function runT4Tick(cell) {
  if (cell.tick >= TOTAL_LOCI) {
    return { ...cell, phase: "completed" };
  }

  const index = cell.tick;
  const partnerIndex = t4Partner(index);
  const locusValue = cell.loci[index];
  const partnerValue = cell.loci[partnerIndex];
  const writeValue = locusValue ^ partnerValue;

  const messageData = [...cell.messageData];
  messageData[index] = writeValue;

  const nextTick = index + 1;
  const phase = nextTick >= TOTAL_LOCI ? "completed" : "developing";
  const code = messageDataToCode(messageData);
  const pf8 = codeToPF8(code);

  const event = { index, partnerIndex, locusValue, partnerValue, writeValue };

  return {
    ...cell,
    phase,
    tick: nextTick,
    messageData,
    code,
    pf8,
    history: [...cell.history, event],
  };
}

export function runT4Development(cell) {
  let current = { ...cell, phase: "developing" };

  while (current.tick < TOTAL_LOCI) {
    current = runT4Tick(current);
  }

  return current;
}

export function inspectT4Cell(cell) {
  const messageData = cell.messageData;
  const code = messageDataToCode(messageData);
  const pf8 = codeToPF8(code);

  const messageMass = messageData.reduce((sum, value) => sum + Number(value), 0);
  const complete = cell.tick >= TOTAL_LOCI && cell.history.length === TOTAL_LOCI;

  const notes = [];

  if (!complete) {
    notes.push("development_incomplete");
  }

  if (messageMass === 0) {
    notes.push("silent_message");
  }

  if (complete) {
    notes.push("stable_t4_cell");
  }

  return {
    status: complete ? "stable" : "unstable",
    complete,
    messageMass,
    code,
    pf8,
    notes,
  };
}

export function runCompleteT4Cell(genome = DEFAULT_GENOME_4X4) {
  const initial = createInitialCell(genome);
  const developed = runT4Development(initial);
  const inspection = inspectT4Cell(developed);

  return { ...developed, inspection };
}

export function summarizeT4Cell(cell) {
  return {
    id: cell.id,
    phase: cell.phase,
    tick: cell.tick,
    loci: cell.loci.join(""),
    messageData: cell.messageData.join(""),
    code: cell.code,
    pf8: cell.pf8,
    inspection: cell.inspection,
  };
}
