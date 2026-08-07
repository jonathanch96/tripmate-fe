import { Suspense } from "react"
import { FinalPage } from "@/features/finance/final-page"
export default function Page() { return <Suspense fallback={<p>Loading final plan…</p>}><FinalPage /></Suspense> }
