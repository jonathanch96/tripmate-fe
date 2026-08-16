import type { Participant } from "@/features/trip/types"

// The per-trip nickname wins whenever it's set — mainly to tell apart participants who share the
// same real name on a trip — otherwise falls back to the member's real account name or email.
export function participantName(participant: Pick<Participant, "displayName" | "user">): string {
  const custom = participant.displayName?.trim()
  if (custom) return custom
  return participant.user?.name || participant.user?.email || "Participant"
}

export function participantNameMap(participants: Pick<Participant, "userId" | "displayName" | "user">[]): Map<string, string> {
  return new Map(participants.map((participant) => [participant.userId, participantName(participant)]))
}
