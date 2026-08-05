export type AuthAction = "login" | "register"

const messages: Partial<Record<AuthAction, Record<string, string>>> = {
  login: {
    INVALID_CREDENTIALS: "Email or password is incorrect",
    VALIDATION_FAILED: "Check the highlighted fields",
  },
  register: {
    EMAIL_ALREADY_REGISTERED: "That email already has an account",
    VALIDATION_FAILED: "Check the highlighted fields",
  },
}

export function authErrorCopy(action: AuthAction, code: string | null | undefined) {
  return (code && messages[action]?.[code]) || "TripMate is unavailable right now. Please try again."
}
