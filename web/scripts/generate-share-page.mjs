import { readFile, writeFile } from 'node:fs/promises';

const output = new URL('../dist/web/browser/', import.meta.url);
const index = await readFile(new URL('index.html', output), 'utf8');
const origin = 'https://lumen-umber.vercel.app';
const title = 'Clausura de Líderes · Álbum compartido';
const description = 'Comparte tus fotos y revive la Clausura de Líderes en el álbum del evento.';
const image = new URL('/assets/catedra-lideres.png', origin);
const metadata = [
  '<meta property="og:type" content="website">',
  `<meta property="og:url" content="${origin}/?e=clausura-lideres-2026">`,
  `<meta property="og:title" content="${title}">`,
  `<meta property="og:description" content="${description}">`,
  `<meta property="og:image" content="${image}">`,
  '<meta property="og:image:type" content="image/png">',
  '<meta property="og:image:width" content="1024">',
  '<meta property="og:image:height" content="278">',
  '<meta property="og:image:alt" content="Logo de la Cátedra Líderes">',
  '<meta name="twitter:card" content="summary_large_image">',
  `<meta name="twitter:title" content="${title}">`,
  `<meta name="twitter:description" content="${description}">`,
  `<meta name="twitter:image" content="${image}">`,
];

const page = index.replace(/<meta (?:property="og:|name="twitter:)[^>]+>\s*/g, '');
await writeFile(
  new URL('clausura-lideres-2026.html', output),
  page.replace('</head>', `  ${metadata.join('\n  ')}\n</head>`),
);
