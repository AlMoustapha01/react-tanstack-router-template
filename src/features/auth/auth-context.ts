import { createContext } from "react"

export type User = {
  id: string
  email: string
  name: string
}

export type Credentials = {
  email: string
  password: string
}

export type AuthContextValue = {
  user: User | null
  isAuthenticated: boolean
  login: (credentials: Credentials) => Promise<void>
  logout: () => void
}

export const AUTH_STORAGE_KEY = "template.auth.user"

/** Mot de passe accepté par l'auth de démonstration. */
export const DEMO_PASSWORD = "password"

export const AuthContext = createContext<AuthContextValue | null>(null)
