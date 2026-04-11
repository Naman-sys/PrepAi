export const LANGUAGES = [
  { code: 'en-US', label: 'English', flag: '🇺🇸', name: 'English' },
  { code: 'hi-IN', label: 'हिन्दी', flag: '🇮🇳', name: 'Hindi' },
  { code: 'es-ES', label: 'Español', flag: '🇪🇸', name: 'Spanish' },
  { code: 'fr-FR', label: 'Français', flag: '🇫🇷', name: 'French' },
  { code: 'de-DE', label: 'Deutsch', flag: '🇩🇪', name: 'German' },
  { code: 'ar-SA', label: 'العربية', flag: '🇸🇦', name: 'Arabic' },
]

export const DEFAULT_LANGUAGE = LANGUAGES[0]

/**
 * Pick a voice for a given language code from available browser voices.
 * Prefers female voices when available.
 */
export function pickVoiceForLanguage(langCode) {
  const voices = window.speechSynthesis?.getVoices() || []
  if (!voices.length) return null

  const base = langCode.split('-')[0] // e.g. 'en', 'hi', 'es'

  // Language-specific known-good female voice names
  const femaleVoicesByLang = {
    'en': ['Google UK English Female', 'Microsoft Jenny Online (Natural) - English (United States)', 'Microsoft Zira - English (United States)', 'Samantha', 'Karen'],
    'hi': ['Google हिन्दी', 'Microsoft Swara Online (Natural) - Hindi (India)', 'Lekha'],
    'es': ['Google español', 'Microsoft Elvira - Spanish (Spain)', 'Monica', 'Paulina'],
    'fr': ['Google français', 'Microsoft Hortense - French (France)', 'Amelie', 'Thomas'],
    'de': ['Google Deutsch', 'Microsoft Hedda - German (Germany)', 'Anna'],
    'ar': ['Google العربية', 'Microsoft Naayf - Arabic (Saudi Arabia)', 'Maged'],
  }

  const preferred = femaleVoicesByLang[base] || []

  // 1. Try exact preferred name
  for (const name of preferred) {
    const match = voices.find((v) => v.name === name)
    if (match) return match
  }

  // 2. Try any voice matching the language code
  const langMatch = voices.find((v) => v.lang === langCode)
  if (langMatch) return langMatch

  // 3. Try any voice matching the base language
  const baseMatch = voices.find((v) => v.lang?.startsWith(base))
  if (baseMatch) return baseMatch

  return null
}
