import Document, { Html, Head, Main, NextScript } from 'next/document';

/**
 * Necessário para o Next gerar /404 e /500 no runtime Pages durante `next build`
 * (projeto é App Router; estas páginas evitam falhas de pré-render na CI/Render).
 */
export default class MyDocument extends Document {
  render() {
    return (
      <Html lang="pt-BR">
        <Head />
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
