import { BadgeCheck, FileSignature } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, inr } from '../api'
import { ErrorNote, Spinner } from '../components/ui'

/** What the absent signatory sees on their own phone. */
export default function Sign() {
  const { token = '' } = useParams()
  const [v, setV] = useState<Awaited<ReturnType<typeof api.esignView>> | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [ref, setRef] = useState<string | null>(null)
  useEffect(() => { api.esignView(token).then((x) => { setV(x); if (x.status === 'signed') setRef('done') }).catch((e) => setErr(e.message)) }, [token])
  if (err) return <div className="mx-auto max-w-md p-6"><ErrorNote error={err} /></div>
  if (!v) return <div className="mx-auto max-w-md p-6"><Spinner /></div>
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="card p-6">
        <FileSignature className="text-brand" />
        <h1 className="display mt-3 text-3xl">Please sign this order</h1>
        <p className="mt-2 text-sm text-muted">Hi {v.signatory} — the {v.business?.toLowerCase()} in {v.city} has asked you, as authorised signatory, to approve this Accel Business order.</p>
        <div className="khata mt-5 rounded-xl bg-[#fffdf6] py-2 pl-10 pr-4 ring-1 ring-line">
          {v.lines.map((l) => <div key={l} className="py-1.5 text-sm">{l}</div>)}
          <div className="mt-1 flex justify-between border-t-2 border-double border-ink/50 py-2 font-semibold"><span>Per month</span><span className="num">{inr(v.monthly)}</span></div>
          <div className="pb-1 text-xs text-muted">{v.term_months}-month plan · setup {inr(v.setup)} · + GST</div>
        </div>
        {ref ? (
          <div className="mt-6 flex flex-col items-center gap-3">
            <div className="stamp stamp-in text-[20px] text-leaf"><span lang="hi" className="text-[16px] normal-case tracking-normal">हस्ताक्षरित</span>Signed</div>
            <p className="flex items-center gap-1 text-sm text-leaf"><BadgeCheck size={16} /> Done. The owner's screen has updated, and you can close this page.</p>
          </div>
        ) : !otpSent ? (
          <button onClick={() => setOtpSent(true)} className="btn-primary mt-6 w-full">e-Sign with Aadhaar OTP</button>
        ) : (
          <div className="mt-6 flex gap-2">
            <input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="6-digit OTP (any, demo)" className="field" />
            <button disabled={otp.length !== 6} onClick={() => api.esignSign(token, otp).then((r) => setRef(r.certificate_ref)).catch((e) => setErr(e.message))} className="btn-primary">Sign</button>
          </div>
        )}
        <p className="mt-4 text-[11px] text-faint">Simulated Aadhaar e-Sign. Accel stores only the signature reference, never your Aadhaar number.</p>
      </div>
    </div>
  )
}
