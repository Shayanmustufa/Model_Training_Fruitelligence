import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

/**
 * Supported locales for the Fruitelligence app.
 * Cookie name: "locale"  — set by LanguageSwitcher on the client.
 * Falls back to "en" for any unknown or missing value.
 */
const SUPPORTED_LOCALES = ["en", "ur", "ar"] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const raw = cookieStore.get("locale")?.value ?? "en";

  // Validate: only accept known locales, fall back to "en" before any import
  const locale: Locale = (SUPPORTED_LOCALES as readonly string[]).includes(raw)
    ? (raw as Locale)
    : "en";

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
