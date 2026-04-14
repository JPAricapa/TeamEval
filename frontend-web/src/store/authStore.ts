import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'

interface AuthStore {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  setAuth: (user: User, accessToken: string, refreshToken: string) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  logout: () => void
  setLoading: (v: boolean) => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,

      setAuth: (user, accessToken, refreshToken) => {
        localStorage.setItem('refreshToken', refreshToken)
        set({ user, accessToken, isAuthenticated: true, isLoading: false })
      },

      setTokens: (accessToken, refreshToken) => {
        localStorage.setItem('refreshToken', refreshToken)
        set({ accessToken })
      },

      logout: () => {
        localStorage.removeItem('refreshToken')
        set({ user: null, accessToken: null, isAuthenticated: false })
      },

      setLoading: (v) => set({ isLoading: v }),
    }),
    {
      name: 'teameval-auth',
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken, isAuthenticated: s.isAuthenticated }),
    }
  )
)
