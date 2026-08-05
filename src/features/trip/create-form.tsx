"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { tripSchema, type TripInput } from "@/features/trip/schema";
import type { Trip } from "@/features/trip/types";
import { apiFetch } from "@/lib/api-client";

export function CreateTripForm() {
  const router = useRouter();
  const form = useForm<TripInput>({
    resolver: zodResolver(tripSchema),
    defaultValues: {
      name: "",
      baseCurrency: "USD",
      startDate: "",
      endDate: "",
      editPermission: "everyone",
      approvalRequiredExpenses: false,
      approvalRequiredSettlements: true,
      multiCurrencyEnabled: true,
      allowSettlementBeforeEnd: true,
    },
  });

  async function submit(value: TripInput) {
    try {
      const result = await apiFetch<Trip>("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value),
      });
      if (result.data) router.push(`/trip/${result.data.code}/settings`);
    } catch (error) {
      form.setError("root", {
        message: error instanceof Error ? error.message : "Unable to create trip",
      });
    }
  }

  const toggles = [
    ["approvalRequiredExpenses", "Require expense approval"],
    ["approvalRequiredSettlements", "Require settlement approval"],
    ["multiCurrencyEnabled", "Allow multiple currencies"],
    ["allowSettlementBeforeEnd", "Allow early settlement"],
  ] as const;

  return (
    <form className="max-w-xl space-y-4" onSubmit={form.handleSubmit(submit)}>
      <label className="block">
        Trip name
        <Input {...form.register("name")} />
      </label>
      <label className="block">
        Base currency
        <Input maxLength={3} {...form.register("baseCurrency")} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label>
          Start
          <Input type="date" {...form.register("startDate")} />
        </label>
        <label>
          End
          <Input type="date" {...form.register("endDate")} />
        </label>
      </div>
      {toggles.map(([name, label]) => (
        <label key={name} className="flex gap-2">
          <input type="checkbox" {...form.register(name)} />
          {label}
        </label>
      ))}
      {form.formState.errors.endDate ? (
        <p className="text-destructive">{form.formState.errors.endDate.message}</p>
      ) : null}
      {form.formState.errors.root ? (
        <p role="alert" className="text-destructive">
          {form.formState.errors.root.message}
        </p>
      ) : null}
      <Button type="submit" disabled={form.formState.isSubmitting}>
        Create trip
      </Button>
    </form>
  );
}
