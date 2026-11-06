import { ArrowLeft, BadgeCheck, FileSignature, Smartphone } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api, inr, type AdvisorResponse, type Order, type Quote } from '../api'
import SlideCommit from '../bits/SlideCommit'
import { ErrorNote } from '../components/ui'

export default function Pay({ sid, state, onBack, onOrdered }: { sid: string; state: AdvisorResponse; onBack: () => void; onOrdered: (o: Order) => void }) {
  const [quote, setQuote] = useState<Quote | null>(null)
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [signed, setSigned] = useState(false)
  const [upi, setUpi] = useState('')
  const [fail, setFail] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.resume(sid).then((r) => {
      const s = r as AdvisorResponse & { cart?: { quote: Quote } }
      const rec = s.recommendation
      setQuote(s.cart?.quote ?? (rec ? rec.tiers[s.selected_tier || rec.default_tier] : null))
    })
  }, [sid])

  const place = async () => {
    setBusy(true)
    setError(null)
    try {
      const o = await api.order(sid, fail)
      setTimeout(() => onOrdered(o), 700) // let the slide finish its tick
    } catch (e) {
      setError((e as Error).message)
      throw e
    } finally {
      setBusy(false)
    }
  }
  const name = state.profile.business_name || state.profile.business_type || 'your business'

  return (
    <div className="flex h-[34rem] flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <button onClick={onBack} className="flex items-center gap-1 text-xs text-muted"><ArrowLeft size={14} /> Verification</button>
        <h2 className="text-lg font-bold">Sign &amp; set up payment</h2>
        {quote && (
          <div className="rounded-xl bg-paper p-3 text-sm ring-1 ring-line">
            <div className="flex justify-between font-semibold"><span>{name}</span><span>{inr(quote.monthly_total)}/mo</span></div>
            <div className="text-xs text-muted">{quote.lines.length} services · {quote.term_months}-month plan · setup {inr(quote.one_time_setup)} · + GST {inr(quote.monthly_gst)}</div>
          </div>
        )}

        <div className="rounded-xl p-3 ring-1 ring-line">
          <div className="flex items-center gap-2 text-sm font-semibold"><FileSignature size={16} /> 1. e-Sign the order form</div>
          {signed ? (
            <div className="mt-2 flex items-center gap-1 text-xs text-leaf"><BadgeCheck size={14} /> Signed with Aadhaar OTP (simulated). Only the signature certificate is stored.</div>
          ) : !otpSent ? (
            <button onClick={() => setOtpSent(true)} className="btn-ghost mt-2 w-full text-xs">Send Aadhaar e-Sign OTP</button>
          ) : (
            <div className="mt-2 flex gap-2">
              <input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit OTP (any, demo)" className="min-w-0 flex-1 rounded-lg px-2 py-1.5 text-sm ring-1 ring-line" />
              <button disabled={otp.length !== 6} onClick={() => setSigned(true)} className="btn-primary !py-1.5 text-xs">Sign</button>
            </div>
          )}
        </div>

        <div className="rounded-xl p-3 ring-1 ring-line">
          <div className="flex items-center gap-2 text-sm font-semibold"><Smartphone size={16} /> 2. UPI AutoPay mandate</div>
          <p className="text-xs text-muted">Monthly bill is paid automatically on the 5th. Cancel anytime from your UPI app.</p>
          <div className="mt-2 grid grid-cols-4 gap-2 text-xs">
            {['GPay', 'PhonePe', 'Paytm', 'BHIM'].map((a) => (
              <button key={a} onClick={() => setUpi(a)} className={`rounded-lg py-2 ring-1 ${upi === a ? 'bg-brand-soft font-semibold text-brand ring-[var(--brand)]' : 'ring-line'}`}>{a}</button>
            ))}
          </div>
          <label className="mt-2 flex items-center gap-2 text-[11px] text-faint"><input type="checkbox" checked={fail} onChange={(e) => setFail(e.target.checked)} /> Demo: simulate a failed first payment</label>
        </div>
        <ErrorNote error={error} />
      </div>
      <div className="border-t border-line bg-surface px-4 py-3">
        <div className="flex justify-center">
          <SlideCommit
            key={`${signed}-${upi}-${fail}`}
            disabled={!signed || !upi || busy}
            label={signed && upi ? `Slide to order${quote ? ` · ${inr(quote.monthly_total)}/mo` : ''}` : 'Sign and pick a UPI app first'}
            doneLabel="Order placed"
            onConfirm={place}
            width={Math.min(360, window.innerWidth - 72)}
            height={56}
            trackColor="var(--color-paper)"
            handleColor="var(--brand)"
            successColor="var(--color-leaf)"
          />
        </div>
      </div>
    </div>
  )
}
