"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { tripSchema, type TripInput } from "@/features/trip/schema";
import type { Trip } from "@/features/trip/types";
import { apiFetch } from "@/lib/api-client";
import { COUNTRIES } from "@/lib/countries";
import { SUPPORTED_CURRENCIES } from "@/lib/currencies";

export function CreateTripForm() {
  const router = useRouter();
  const form = useForm<TripInput>({
    resolver: zodResolver(tripSchema),
    defaultValues: {
      name: "",
      baseCurrency: "USD",
      country: "",
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
    <form className="max-w-xl space-y-5" method="post" onSubmit={form.handleSubmit(submit)}>
      <div className="space-y-1.5">
        <Label htmlFor="trip-name">Trip name</Label>
        <Input id="trip-name" {...form.register("name")} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="trip-currency">Base currency</Label>
        <NativeSelect id="trip-currency" className="w-32" {...form.register("baseCurrency")}>
          {SUPPORTED_CURRENCIES.map((code) => (
            <NativeSelectOption key={code} value={code}>{code}</NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="trip-country">Country (optional)</Label>
        <NativeSelect id="trip-country" className="w-full" {...form.register("country")}>
          <NativeSelectOption value="">Not set</NativeSelectOption>
          {COUNTRIES.map((country) => (
            <NativeSelectOption key={country} value={country}>{country}</NativeSelectOption>
          ))}
        </NativeSelect>
        <p className="text-xs text-muted-foreground">Only used to group trips on the analytics page.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="trip-start">Start</Label>
          <Input id="trip-start" type="date" {...form.register("startDate")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="trip-end">End</Label>
          <Input id="trip-end" type="date" {...form.register("endDate")} />
        </div>
      </div>
      <div className="space-y-3 rounded-lg border p-4">
        {toggles.map(([name, label]) => (
          <div key={name} className="flex items-center gap-2.5">
            <Controller
              control={form.control}
              name={name}
              render={({ field }) => (
                <Checkbox
                  id={name}
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked)}
                />
              )}
            />
            <Label htmlFor={name} className="text-sm font-normal">{label}</Label>
          </div>
        ))}
      </div>
      {form.formState.errors.endDate ? (
        <p className="text-sm text-destructive">{form.formState.errors.endDate.message}</p>
      ) : null}
      {form.formState.errors.root ? (
        <p role="alert" className="text-sm text-destructive">
          {form.formState.errors.root.message}
        </p>
      ) : null}
      <Button type="submit" disabled={form.formState.isSubmitting}>
        Create trip
      </Button>
    </form>
  );
}
