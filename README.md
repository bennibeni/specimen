# Specimen — Gioco Combinatorio

Un simulatore interattivo ispirato alla genetica umana, costruito con Next.js 15 e React 19.

La cellula **T4** parte da un genoma 4×4 (16 alleli), lo risolve per dominanza mendeliana in 8 loci, applica una trasformazione XOR ciclica (regola **TTE-T4**) e produce un fenotipo a 6 caratteri codificato come coordinata in una griglia 8×8 (64 fenotipi possibili).

---

## Demo

```
genoma 4×4 (alleli)
      ?  resolveGenomeToLoci (OR per dominanza)
loci L0–L7
      ?  write_t = L_t ? L_(t+2 mod 8)
messageData [8 bit]
      ?  primi 6 bit
codice fenotipo ? riga PF8 (bit 0–2) · colonna PF8 (bit 3–5)
```

### I 6 caratteri fenotipici

| # | Carattere | bit 0 | bit 1 | Meccanismo |
|---|-----------|-------|-------|------------|
| 0 | Sesso | Femmina | Maschio | Cromosomico (Y presente) |
| 1 | Capelli | Lisci | Ricci | Dominanza allelica |
| 2 | Pelle | Chiara | Scura | Dominanza allelica |
| 3 | Occhi | Verdi | Marroni | Dominanza allelica |
| 4 | Lattosio | Intollerante | Tollerante | Dominanza allelica (gene LCT) |
| 5 | Vista | Daltonismo | Normale | Dominanza allelica (legato X) |

---

## Struttura del progetto

```
specimen/
+-- app/
¦   +-- layout.js          # Root layout, metadata, font Google
¦   +-- page.js            # Componente principale (orchestrazione, stato, UI)
¦   +-- AvatarPortrait.jsx # Ritratto SVG del fenotipo
¦   +-- t4SimpleCell.js    # Modello T4 (puro JS, nessuna dipendenza React)
+-- next.config.mjs
+-- eslint.config.mjs
+-- package.json
```

### `t4SimpleCell.js`
Logica pura della cellula T4: validazione del genoma, risoluzione di dominanza, trasformazione XOR ciclica tick per tick, ispezione finale. Nessuna dipendenza da React — testabile in isolamento.

### `AvatarPortrait.jsx`
Componente SVG che traduce i 6 caratteri fenotipici in un ritratto che si rivela progressivamente man mano che i tick vengono eseguiti. Dipende solo dal prop `traits` (array dei caratteri) e dai dati `messageData`/`tick` della cellula.

### `page.js`
Orchestrazione: stato della cellula, preset di genoma (default / bilanciato / casuale), controlli tick-by-tick, pannelli di ispezione e guida al modello.

---

## Installazione

```bash
git clone https://github.com/bennibeni/specimen.git
cd specimen
npm install
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

---

## Note matematiche

### Bias dell'OR e correzione della probabilità casuale

`resolveDominance` usa un OR tra i due alleli: `P(locus=1) = 1 - (1-p)²`. Con alleli a `p = 0.5`, i loci risulterebbero sbilanciati verso 1 con probabilità 0.75, e i fenotipi sbilanciati verso la variante recessiva con probabilità ~62.5%.

Il preset **casuale** usa `p = 1 - v0.5 ˜ 0.293` — la soluzione esatta di `1 - (1-p)² = 0.5` — che rende ogni locus equiprobabile e, per la linearità della trasformazione XOR su GF(2), rende tutte le 64 celle della griglia PF8 **esattamente equiprobabili** (non solo i margini, ma anche le combinazioni congiunte).

### L'anello dei loci

La trasformazione `write_t = L_t ? L_(t+2 mod 8)` con shift 2 su un ciclo di 8 si scompone in **due quadrati indipendenti**: `{0, 2, 4, 6}` e `{1, 3, 5, 7}`. Questo perché `gcd(2, 8) = 2`, quindi la mappa non è iniettiva: genomi diversi possono produrre lo stesso fenotipo.

### Contributo dei loci al fenotipo

| Locus | Fenotipi determinati |
|-------|---------------------|
| L0 | Sesso |
| L1 | Capelli |
| L2 | **Sesso + Pelle** |
| L3 | **Capelli + Occhi** |
| L4 | **Pelle + Lattosio** |
| L5 | **Occhi + Vista** |
| L6 | Lattosio |
| L7 | Vista |

I loci L2–L5 (centrali) contribuiscono a due fenotipi ciascuno e hanno quindi peso fenotipico doppio rispetto a L0, L1, L6, L7.

---

## Roadmap

Questo è un **gioco combinatorio ispirato alla genetica**, non un simulatore biologico preciso. I prossimi sviluppi previsti:

- Due genitori con genomi distinti
- Meiosi con crossing-over e segregazione casuale
- Ereditarietà della progenie
- Visualizzazione di popolazione (distribuzione dei 64 fenotipi)

---

## Autore

[bennibeni](https://github.com/bennibeni)
