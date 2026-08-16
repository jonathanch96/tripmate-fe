import { Suspense } from "react"
import { LedgerPage } from "@/features/finance/ledger-page"
export default function Page() { return <Suspense fallback={<p>Loading ledger…</p>}><LedgerPage /></Suspense> }
