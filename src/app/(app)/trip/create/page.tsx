import { CreateTripForm } from "@/features/trip/create-form"

export default function CreateTripPage() {
  return <section><h1 className="font-heading text-[28px] font-extrabold">Create a trip</h1><p className="mb-7 mt-1.5 text-sm text-muted-foreground">Set the basics now. You can fine-tune permissions and currencies later.</p><CreateTripForm /></section>
}
