"use client"

import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { CreateTripForm } from "@/features/trip/create-form"

export function CreateTripDialog() {
  return (
    <Dialog>
      <DialogTrigger render={<Button className="font-bold" />}><Plus />Create trip</DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle>Create a trip</DialogTitle>
          <DialogDescription>Give your trip a name, dates, and a base currency. You can change its preferences later.</DialogDescription>
        </DialogHeader>
        <CreateTripForm embedded />
      </DialogContent>
    </Dialog>
  )
}
