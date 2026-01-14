/**
 * Internationalization (i18n) support
 */

export type Language = 'en' | 'hi' | 'ta' | 'te' | 'bn' | 'mr' | 'gu';

export const SUPPORTED_LANGUAGES: Language[] = ['en', 'hi', 'ta', 'te', 'bn', 'mr', 'gu'];

export const LANGUAGE_NAMES: Record<Language, string> = {
    en: 'English',
    hi: 'Hindi',
    ta: 'Tamil',
    te: 'Telugu',
    bn: 'Bengali',
    mr: 'Marathi',
    gu: 'Gujarati'
};

// Simple translations (in production, use a proper i18n library)
const translations: Record<string, Record<Language, string>> = {
    'dashboard.title': {
        en: 'Dashboard',
        hi: 'डैशबोर्ड',
        ta: 'டாஷ்போர்டு',
        te: 'డాష్బోర్డ్',
        bn: 'ড্যাশবোর্ড',
        mr: 'डॅशबोर्ड',
        gu: 'ડેશબોર્ડ'
    },
    'drivers.title': {
        en: 'Drivers',
        hi: 'ड्राइवर',
        ta: 'ஓட்டுநர்கள்',
        te: 'డ్రైవర్లు',
        bn: 'ড্রাইভার',
        mr: 'ड्रायव्हर',
        gu: 'ડ્રાઇવર્સ'
    },
    'calls.title': {
        en: 'Call History',
        hi: 'कॉल इतिहास',
        ta: 'அழைப்பு வரலாறு',
        te: 'కాల్ హిస్టరీ',
        bn: 'কল ইতিহাস',
        mr: 'कॉल इतिहास',
        gu: 'કોલ ઇતિહાસ'
    },
    'analytics.title': {
        en: 'Analytics',
        hi: 'विश्लेषण',
        ta: 'பகுப்பாய்வு',
        te: 'విశ్లేషణ',
        bn: 'বিশ্লেষণ',
        mr: 'विश्लेषण',
        gu: 'વિશ્લેષણ'
    }
};

export function t(key: string, lang: Language = 'en'): string {
    return translations[key]?.[lang] || translations[key]?.['en'] || key;
}

/**
 * Detect language from phone number (Indian numbers)
 */
export function detectLanguageFromPhone(phone: string): Language {
    // Simple heuristic: could be enhanced with actual data
    // For now, default to Hindi for Indian numbers
    if (phone.startsWith('+91') || phone.startsWith('91')) {
        return 'hi';
    }
    return 'en';
}

/**
 * Get language code for telephony provider
 */
export function getTelephonyLanguageCode(lang: Language): string {
    const codes: Record<Language, string> = {
        en: 'en-US',
        hi: 'hi-IN',
        ta: 'ta-IN',
        te: 'te-IN',
        bn: 'bn-IN',
        mr: 'mr-IN',
        gu: 'gu-IN'
    };
    return codes[lang] || 'en-US';
}






