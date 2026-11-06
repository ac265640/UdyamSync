const LANG_NAME: Record<string, string> = { en: 'English', hi: 'हिन्दी', mr: 'मराठी', gu: 'ગુજરાતી', ta: 'தமிழ்', te: 'తెలుగు', kn: 'ಕನ್ನಡ', bn: 'বাংলা', ml: 'മലയാളം', pa: 'ਪੰਜਾਬੀ' }

/** Shown while the mic is open: a live level meter and which language we're listening for. */
export default function Listening({ lang, onStop, dark = false }: { lang: string; onStop: () => void; dark?: boolean }) {
  return (
    <div className={`flex items-center gap-3 px-3 py-2 text-xs ${dark ? 'bg-[#e9e1d2]' : 'bg-brand-soft'}`} role="status" aria-live="polite">
      <span className="flex h-5 items-end gap-[3px]" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="w-[3px] rounded-full bg-brand" style={{ height: '100%', animation: `level .6s ${i * 0.09}s ease-in-out infinite alternate`, transformOrigin: 'bottom' }} />
        ))}
      </span>
      <span className="flex-1 font-medium text-ink">Listening in {LANG_NAME[lang] ?? lang}…</span>
      <button onClick={onStop} className="rounded-full bg-surface px-2.5 py-1 font-semibold text-ink ring-1 ring-line">Done</button>
    </div>
  )
}
