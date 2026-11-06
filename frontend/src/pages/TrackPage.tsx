import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, type Order } from '../api'
import Tracker from '../components/Tracker'
import { ErrorNote, Spinner } from '../components/ui'

export default function TrackPage() {
  const { orderId } = useParams()
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { if (orderId) api.getOrder(orderId).then(setOrder).catch((e) => setError(e.message)) }, [orderId])
  return (
    <div className="mx-auto max-w-md p-4">
      <div className="card overflow-hidden">{error ? <div className="p-4"><ErrorNote error={error} /></div> : order ? <Tracker order={order} onChange={setOrder} /> : <div className="p-6"><Spinner /></div>}</div>
    </div>
  )
}
