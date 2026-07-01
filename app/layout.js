export const metadata = {
  title: "Specimen — Gioco Combinatorio",
  description: "Simulazione combinatoria ispirata alla genetica umana: genoma 4×4, regola TTE-T4, fenotipo a 6 caratteri.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <style>{`
          :root {
            --font-display: 'Space Grotesk', system-ui, sans-serif;
            --font-body: 'Inter', system-ui, sans-serif;
            --font-mono: 'IBM Plex Mono', ui-monospace, monospace;
          }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
