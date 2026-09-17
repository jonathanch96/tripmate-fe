import { apiFetch } from "@/lib/api-client"
import { qk } from "@/lib/query-keys"

export type Profile = {
  id: string
  name: string
  email: string
  avatarUrl?: string | null
  // False for an account created through Google sign-in, which has no password yet.
  hasPassword: boolean
}

// Shared so the account page and the change-password dialog read one cached profile rather than
// fetching /users/me twice with different keys.
export const profileQuery = () => ({
  queryKey: qk.profile(),
  queryFn: async () => (await apiFetch<Profile>("/api/users/me")).data!,
})
