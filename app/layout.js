export const metadata = {
  title: "Portefeuille — CELI & REER",
  description: "Suivi de portefeuille et répartition des dépôts, CELI et REER",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr-CA">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#F7F7F5" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;450;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, background: "#F7F7F5" }}>{children}</body>
    </html>
  );
}
