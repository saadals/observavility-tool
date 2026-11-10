import { Head, Html, Main, NextScript } from 'next/document';
import { storageKey } from '@/config/brand';

/**
 * Applies the saved theme, language and direction before first paint,
 * so Arabic/RTL and dark mode never flash on load.
 */
const prePaint = `(function(){var d=document.documentElement;try{var raw=localStorage.getItem(${JSON.stringify(
  storageKey('settings'),
)});var s=(raw&&JSON.parse(raw).state)||{};var t=s.theme||'dark';var l=s.lang||'ar';d.classList.toggle('dark',t==='dark');d.lang=l;d.dir=l==='ar'?'rtl':'ltr';}catch(e){d.classList.add('dark');}})();`;

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export default function Document() {
  return (
    <Html lang="ar" dir="rtl" className="dark" suppressHydrationWarning>
      <Head>
        <meta charSet="utf-8" />
        <meta name="color-scheme" content="dark light" />
        <meta name="robots" content="noindex" />
        <link rel="icon" href={`${basePath}/favicon.svg`} type="image/svg+xml" />
        <script dangerouslySetInnerHTML={{ __html: prePaint }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
