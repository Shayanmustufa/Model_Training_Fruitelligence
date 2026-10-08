import type { Metadata } from "next";
import { Playfair_Display, Plus_Jakarta_Sans, Noto_Naskh_Arabic, Noto_Nastaliq_Urdu } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import "./globals.css";
import ServerKeepAlive from "@/components/motion/ServerKeepAlive";

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  display: "swap",
});

const notoNaskhArabic = Noto_Naskh_Arabic({
  variable: "--font-noto-naskh-arabic",
  subsets: ["arabic"],
  display: "swap",
});

const notoNastaliqUrdu = Noto_Nastaliq_Urdu({
  variable: "--font-noto-nastaliq-urdu",
  subsets: ["arabic"],
  weight: ["400", "700"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return {
    title: t("title"),
    description: t("description"),
    keywords: ["Fruitelligence", "Date farming Pakistan", "Rabbi dates", "Ajwa dates", "Agriculture digitization", "Orchard traceability"],
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  const isRTL = locale === "ur" || locale === "ar";
  const dir = isRTL ? "rtl" : "ltr";

  let fontClass = `${playfairDisplay.variable} ${plusJakartaSans.variable}`;
  if (locale === "ur") {
    fontClass = `${notoNastaliqUrdu.variable} ${fontClass} font-urdu`;
  } else if (locale === "ar") {
    fontClass = `${notoNaskhArabic.variable} ${fontClass} font-arabic`;
  }

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${fontClass} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-body bg-background-light text-foreground">
        <NextIntlClientProvider messages={messages} locale={locale}>
          {/* Keep Render backend alive — pings /health every 14 min */}
          <ServerKeepAlive />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
