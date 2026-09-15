"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { CurrencyRateDraftList } from "@/features/finance/currency-rate-draft";
import type { RateDraft } from "@/features/finance/rate-pair-helpers";
import { tripSchema, type TripInput } from "@/features/trip/schema";
import type { Trip } from "@/features/trip/types";
import { apiFetch } from "@/lib/api-client";
import { COUNTRIES } from "@/lib/countries";
import { SUPPORTED_CURRENCIES } from "@/lib/currencies";

export function CreateTripForm() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<RateDraft[]>([]);
  const form = useForm<TripInput>({
    resolver: zodResolver(tripSchema),
    defaultValues: {
      name: "",
      baseCurrency: "USD",
      country: "",
      startDate: "",
      endDate: "",
      editPermission: "everyone",
      // Approvals start off: a new trip should not block its own first expense or settlement.
      approvalRequiredExpenses: false,
      approvalRequiredSettlements: false,
      // Neither of these is a choice any more — every trip may hold several currencies and may
      // settle up before it ends — so they are sent as fixed values rather than shown as toggles.
      multiCurrencyEnabled: true,
      allowSettlementBeforeEnd: true,
    },
  });
  // useWatch rather than form.watch(): the compiler cannot memoize around watch()'s returned
  // function, and this value feeds the drafted-rates editor on every keystroke.
  const baseCurrency = useWatch({ control: form.control, name: "baseCurrency" });
  // A drafted rate is pinned to the base currency it was entered against, so switching the base
  // afterwards would silently reinterpret it — drop the drafts instead of keeping a wrong rate.
  function baseCurrencyChanged() {
    if (drafts.length) setDrafts([]);
  }

  async function submit(value: TripInput) {
    try {
      const result = await apiFetch<Trip>("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value),
      });
      const trip = result.data;
      if (!trip) return;
      // Rates need a trip to hang off, so they are saved one PUT at a time right after creation.
      // A rate that fails must not swallow the trip that was created — say which ones missed and
      // land the planner on the settings page where they can be re-entered.
      const failed: string[] = [];
      for (const draft of drafts) {
        try {
          await apiFetch(`/api/trips/${trip.code}/exchange-rates`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(draft),
          });
        } catch {
          failed.push(`${draft.from} → ${draft.to}`);
        }
      }
      if (failed.length) {
        toast.error(`Trip created, but ${failed.join(", ")} could not be saved. Add ${failed.length === 1 ? "it" : "them"} under Currencies & exchange rates.`);
      }
      router.push(`/trip/${trip.code}/settings`);
    } catch (error) {
      form.setError("root", {
        message: error instanceof Error ? error.message : "Unable to create trip",
      });
    }
  }

  const toggles = [
    ["approvalRequiredExpenses", "Require expense approval"],
    ["approvalRequiredSettlements", "Require settlement approval"],
  ] as const;

  return (
    <form className="max-w-xl space-y-5" method="post" onSubmit={form.handleSubmit(submit)}>
      <div className="space-y-1.5">
        <Label htmlFor="trip-name">Trip name</Label>
        <Input id="trip-name" {...form.register("name")} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="trip-currency">Base currency</Label>
        <NativeSelect
          id="trip-currency"
          className="w-32"
          {...form.register("baseCurrency", { onChange: baseCurrencyChanged })}
        >
          {SUPPORTED_CURRENCIES.map((code) => (
            <NativeSelectOption key={code} value={code}>{code}</NativeSelectOption>
          ))}
        </NativeSelect>
        <p className="text-xs text-muted-foreground">
          Your own everyday currency — the one you want to be owed and settled up in. Living in Indonesia? Pick IDR. Every balance on this trip is converted back to it.
        </p>
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
      <div className="space-y-2.5">
        <Label>Currencies &amp; rates (optional)</Label>
        <p className="text-xs text-muted-foreground">
          Add the currencies you&apos;ll actually be spending in and what they are worth in {baseCurrency}. You can add, change or remove these later under Settings → Currencies &amp; exchange rates.
        </p>
        <CurrencyRateDraftList baseCurrency={baseCurrency} drafts={drafts} onChange={setDrafts} />
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
