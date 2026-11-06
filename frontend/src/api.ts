// Typed client for the UdyamSync API.

export type Chip = { label: string; value: string; selected?: boolean; primary?: boolean }

export type QuoteLine = {
  product_id: string
  name: string
  category: string
  description: string
  unit: string
  quantity: number
  unit_price: number
  monthly: number
  setup_fee: number
  setup_fee_after_waiver: number
  contract_months: number
  install_days: number
  eta: string
  added_by: 'user' | 'advisor' | 'dependency'
  note: string
  requires_gstin: boolean
  reasons?: string[]
  reason_texts?: string[]
  why?: string
}

export type Blocked = { product_id: string; name: string; reasons: { code: string; message: string }[] }

export type Quote = {
  term_months: number
  lines: QuoteLine[]
  blocked: Blocked[]
  auto_added: { product_id: string; name: string; because_of: string }[]
  monthly_total: number
  monthly_gst: number
  monthly_total_incl_gst: number
  one_time_setup: number
  list_monthly_total: number
  commitment_saving_per_month: number
  connectivity_monthly: number
  full_activation_days: number
  activation_eta: string | null
  products_count: number
  price_valid_until: string
  current_monthly_spend?: number
  connectivity_vs_current?: number
}

export type Profile = {
  business_name?: string | null
  business_type?: string | null
  segment?: string | null
  segment_name?: string | null
  city?: string | null
  city_tier?: number | null
  state?: string | null
  pincode?: string | null
  employees?: number | null
  sites?: number | null
  gstin_masked?: string | null
  gstin_status: string
  gstin_constitution?: string | null
  udyam_masked?: string | null
  udyam_type?: string | null
  current_internet?: string | null
  current_spend?: number | null
  needs: string[]
  fibre_feasible: boolean
  source: string
  prefilled_from?: string[]
}

export type Recommendation = { default_tier: string; term_months: number; tiers: Record<string, Quote> }

export type AdvisorResponse = {
  session_id: string
  lang: string
  stage: string
  replies: string[]
  chips: Chip[]
  profile: Profile
  recommendation: Recommendation | null
  selected_tier: string | null
  lead_id: string | null
  llm: boolean
  go?: string
  handoff?: string
  select_tier?: string
  mobile_only?: boolean
  resume_link?: string
  messages?: { role: 'user' | 'assistant'; text: string }[]
}

export type Check = { id: string; label: string; status: 'pass' | 'warn' | 'fail'; message: string; doc: string | null; fix: string | null; evidence: Record<string, unknown> }
export type KycResult = {
  verdict: 'verified' | 'verified_with_notes' | 'action_needed'
  verdict_label: string
  summary: { pass: number; warn: number; fail: number }
  checks: Check[]
  fixes: { doc: string; message: string; fix: string }[]
  registry: Record<string, string> | null
  gstin_masked: string | null
}
export type KycCase = {
  session_id: string
  docs: Record<string, { label: string; uploaded_at: string; fields: Record<string, string>; quality: Record<string, unknown>; detected_type: string | null; purge_after: string | null }>
  digilocker: boolean
  result: KycResult | null
  missing: string[]
}

export type Stage = { key: string; label: string; status: 'done' | 'active' | 'pending'; at: string | null; eta: string | null; slot?: string }
export type Order = {
  id: string
  business: string
  city: string
  status: string
  quote: Quote
  payment: { method: string; status: string; attempts: number }
  stages: Stage[]
  products: { product_id: string; name: string; quantity: number; eta: string; status: string; why: string }[]
  technician: { name: string; rating: string; phone_masked: string }
  notifications: { at: string; channel: string; text: string }[]
  eta_live: string
  sla_due: string
  current_stage: string
  progress: number
  sla_breach_risk: boolean
  days_left: number
  slots: string[]
  assisted: boolean
  partner_id: string | null
  commission_illustrative?: number
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { headers: init?.body instanceof FormData ? undefined : { 'Content-Type': 'application/json' }, ...init })
  if (!res.ok) {
    let msg = `${res.status}`
    try {
      const j = await res.json()
      msg = typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail)
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }
  return res.json() as Promise<T>
}

const post = <T,>(path: string, body?: unknown) => req<T>(path, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body ?? {}) })

export const api = {
  health: () => req<{ status: string; llm_provider: string; reference_date: string }>('/api/health'),
  meta: () => req<{ languages: Record<string, string>; llm: Record<string, unknown> }>('/api/advisor/meta'),
  start: (lang: string, channel = 'web', partner_id?: string | null, source?: string | null) =>
    post<AdvisorResponse>('/api/advisor/sessions', { lang, channel, partner_id, source }),
  resume: (sid: string) => req<AdvisorResponse>(`/api/advisor/sessions/${sid}`),
  send: (sid: string, text: string) => post<AdvisorResponse>(`/api/advisor/sessions/${sid}/messages`, { text }),
  select: (sid: string, tier?: string, term_months?: number) => post<AdvisorResponse>(`/api/advisor/sessions/${sid}/select`, { tier, term_months }),
  patchProfile: (sid: string, body: Partial<Profile>) => req<AdvisorResponse>(`/api/advisor/sessions/${sid}/profile`, { method: 'PATCH', body: JSON.stringify(body) }),
  eval: () => req<{ total: number; passed: number; pass_rate: number; results: { id: string; lang: string; passed: boolean; failures: string[]; tier: string; monthly: number }[] }>('/api/advisor/eval'),
  catalogue: () => req<{ id: string; name: string; category: string; description: string; unit: string; price_min: number; price_max: number; setup_fee: number; requires_gstin: boolean; requires_one_of: string[]; install_days: number }[]>('/api/catalogue'),
  quote: (session_id: string, lines: { product_id: string; quantity: number }[], term_months: number) => post<Quote>('/api/quote', { session_id, lines, term_months }),
  notice: () => req<{ version: string; controller: string; grievance_officer: string; rights: string[]; purposes: Record<string, { required: boolean; title: string; what: string[]; why: string; retention: string; shared_with: string }> }>('/api/kyc/notice'),
  consent: (sid: string, purposes: Record<string, boolean>, actor = 'customer') => post<{ state: Record<string, { granted: boolean }>; receipt: unknown }>(`/api/kyc/${sid}/consent`, { purposes, actor }),
  getConsent: (sid: string) => req<{ state: Record<string, { granted: boolean; at: string }>; receipt: { records: { n: number; purpose: string; granted: boolean; at: string; hash: string }[]; integrity: { valid: boolean; records: number; head: string } } }>(`/api/kyc/${sid}/consent`),
  kycCase: (sid: string) => req<KycCase>(`/api/kyc/${sid}`),
  upload: (sid: string, slot: string, file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return post<KycCase>(`/api/kyc/${sid}/documents/${slot}`, fd)
  },
  removeDoc: (sid: string, slot: string) => req<KycCase>(`/api/kyc/${sid}/documents/${slot}`, { method: 'DELETE' }),
  digilocker: (sid: string, name: string, designation: string) => post<KycCase>(`/api/kyc/${sid}/digilocker`, { name, designation }),
  useSample: (sid: string, applicant: string) => post<KycCase>(`/api/kyc/${sid}/use-sample/${applicant}`),
  samples: () => req<{ applicant: string; verdict: string; verdict_label: string; summary: { pass: number; warn: number; fail: number }; business: string }[]>('/api/kyc/samples'),
  sample: (k: string) => req<KycResult & { applicant: string; files: Record<string, string | null>; extracted: Record<string, Record<string, unknown> | null> }>(`/api/kyc/samples/${k}`),
  order: (session_id: string, simulate_payment_failure = false) => post<Order>('/api/orders', { session_id, simulate_payment_failure, esign: true }),
  getOrder: (id: string) => req<Order>(`/api/orders/${id}`),
  advance: (id: string) => post<Order>(`/api/orders/${id}/advance`),
  retryPayment: (id: string) => post<Order>(`/api/orders/${id}/retry-payment`),
  reschedule: (id: string, date: string, slot: string) => post<Order>(`/api/orders/${id}/reschedule`, { date, slot }),
  slaAlerts: () => req<{ order_id: string; business: string; city: string; reason: string; eta_live: string; sla_due: string }[]>('/api/orders/ops/sla-alerts'),
  partners: () => req<Record<string, { name: string; type: string }>>('/api/partner/partners'),
  inbox: (q: Record<string, string | number | undefined>) => {
    const qs = new URLSearchParams(Object.entries(q).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)]))
    return req<Inbox>(`/api/partner/inbox?${qs}`)
  },
  leadAction: (id: string, action: string, note = '') => post<{ ok: boolean; status: string }>(`/api/partner/leads/${id}/action`, { action, note }),
  earnings: (pid: string) => req<{ partner: { name: string }; leads_submitted: number; assisted_checkouts: number; orders: { id: string; business: string; monthly: number; commission: number; status: string; created: string }[]; commission_total_illustrative: number; policy_note: string }>(`/api/partner/${pid}/earnings`),
  kycQueue: () => req<{ session_id: string; business: string; city: string; verdict: string; issues: string[] }[]>('/api/partner/kyc-queue'),
  baseline: () => req<Baseline>('/api/analytics/baseline'),
  replay: (body: { recovery?: Record<string, number>; chase_calls_new?: number; field_cost_avoided_pct?: number; platform_cost_per_lead?: number }) => post<Replay>('/api/analytics/replay', body),
  compliance: () => req<Compliance>('/api/analytics/compliance'),
  segments: () => req<Segment[]>('/api/analytics/segments'),
  live: () => req<{ funnel: Record<string, number>; avg_minutes_to_order: number | null; handoffs: number; orders_live: number; by_lang: Record<string, number>; by_channel: Record<string, number>; llm: { provider: string; calls: number; failures: number } }>('/api/analytics/live'),
  myData: (sid: string) => req<MyData>(`/api/me/${sid}`),
  erase: (sid: string) => post<{ erased: boolean; files_deleted: number }>(`/api/me/${sid}/erase`),
}

export type InboxLead = {
  id: string
  live: boolean
  business: string
  business_type?: string
  segment?: string
  city?: string
  lang?: string
  source?: string
  stage?: string
  reason?: string
  score: number
  propensity_pct?: number
  factors: { feature: string; effect: 'up' | 'down'; weight: number }[]
  summary?: string
  quote_monthly?: number | null
  status?: string
  contact?: string
  phone?: string
  next_action: { channel: string; text: string }
  recovered_by?: string
  created?: string
}
export type Inbox = { live: InboxLead[]; historical: InboxLead[]; historical_total: number; pages: number; model: { auc: number; base_rate_pct: number } }

export type Baseline = {
  leads: number
  activations: number
  conversion_pct: number
  avg_days_to_activate: number
  avg_chase_calls: number
  total_acquisition_cost: number
  cac_per_activation: number
  churn_6m_pct: number
  avg_nps: number
  median_bundle_value: number
  activation_with_gstin_pct: number
  activation_without_gstin_pct: number
  funnel: { stage: string; count: number; pct_prev: number | null }[]
  drops: { stage: string; reason: string; count: number; feature: string | null; default_recovery: number }[]
  churn_by_calls: { calls: number; n: number; churn_pct: number; nps: number }[]
  by_source: { lead_source: string; leads: number; activated: number; conversion_pct: number; cac_per_activation: number | null }[]
}
export type Metrics = { activations: number; conversion_pct: number; days_to_activate: number; chase_calls: number; cac: number; churn_6m_pct: number; nps: number }
export type Replay = {
  assumptions: { recovery: Record<string, number>; notes: string[] }
  stages: { from: string; to: string; old_rate_pct: number; new_rate_pct: number }[]
  before: Metrics
  after: Metrics
  impact: { extra_activations_per_quarter: number; extra_annual_recurring_revenue_inr: number; blended_monthly_bundle_value: number }
}
export type Compliance = {
  activations_checked: number
  violating_activations: number
  blocked_by_rules_engine: number
  after: number
  by_rule: Record<string, number>
  monthly_revenue_at_risk: number
  cases: { lead_id: string; business_type: string; segment: string; city: string; gstin_status: string; bundle: string; monthly_value: number; violations: { product: string; rule: string; message: string }[] }[]
}
export type Segment = { segment: string; code: string; leads: number; share_of_leads_pct: number; conversion_pct: number; median_mrr: number; churn_6m_pct: number; nps: number; cac_per_activation: number; payback_months: number; value_12m_per_activation: number; avg_days: number; priority: number; play: string }
export type MyData = {
  profile: Profile & { erased?: boolean }
  chat_messages: number
  documents: { type: string; uploaded_at: string; purge_after: string | null; purged: boolean }[]
  consents: Record<string, { granted: boolean; at: string; notice_version: string }>
  consent_receipt: { records: { n: number; purpose: string; granted: boolean; at: string; hash: string }[]; integrity: { valid: boolean; records: number; head: string } }
  orders: { id: string; status: string; created: string }[]
  shared_with_partner: boolean
  activity: { at: string; action: string }[]
  erased: boolean
}

export const inr = (n: number | null | undefined) => (n == null ? '—' : '₹' + Math.round(n).toLocaleString('en-IN'))
export const fmtDate = (s?: string | null) => (s ? new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—')
