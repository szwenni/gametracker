interface AuthUser {
  id: string
  username: string
  displayName: string
  avatarPath: string | null
  globalRole: string
}

export function useAuth() {
  const user = useState<AuthUser | null>('auth-user', () => null)
  const loading = useState<boolean>('auth-loading', () => false)

  function ssrFetch<T>(url: string, opts?: Record<string, unknown>): Promise<T> {
    if (import.meta.server) {
      const requestFetch = useRequestFetch()
      return requestFetch(url, opts as any) as Promise<T>
    }
    return $fetch<T>(url, { ...opts, credentials: 'include' } as any)
  }

  async function fetchUser(): Promise<AuthUser | null> {
    try {
      const data = await ssrFetch<{ user: AuthUser }>('/api/v1/auth/me')
      user.value = data.user
      return data.user
    } catch {
      user.value = null
      return null
    }
  }

  async function login(username: string, password: string): Promise<AuthUser> {
    const data = await ssrFetch<{ user: AuthUser }>('/api/v1/auth/login', {
      method: 'POST',
      body: { username, password }
    })
    user.value = data.user
    return data.user
  }

  async function register(inviteToken: string, username: string, password: string, displayName: string): Promise<AuthUser> {
    const data = await ssrFetch<{ user: AuthUser }>('/api/v1/auth/register', {
      method: 'POST',
      body: { inviteToken, username, password, displayName }
    })
    user.value = data.user
    return data.user
  }

  async function refresh(): Promise<boolean> {
    try {
      await ssrFetch('/api/v1/auth/refresh', { method: 'POST' })
      return true
    } catch {
      user.value = null
      return false
    }
  }

  async function logout(): Promise<void> {
    try {
      await ssrFetch('/api/v1/auth/logout', { method: 'POST' })
    } finally {
      user.value = null
    }
  }

  async function init(): Promise<void> {
    if (user.value) return
    loading.value = true
    const fetched = await fetchUser()
    if (!fetched) {
      const refreshed = await refresh()
      if (refreshed) {
        await fetchUser()
      }
    }
    loading.value = false
  }

  async function updateProfile(displayName: string): Promise<void> {
    const data = await ssrFetch<{ user: AuthUser }>('/api/v1/users/me', {
      method: 'PATCH',
      body: { displayName }
    })
    user.value = data.user
  }

  async function uploadAvatar(file: File): Promise<void> {
    const formData = new FormData()
    formData.append('avatar', file)
    const data = await $fetch<{ user: AuthUser }>('/api/v1/users/me/avatar', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    })
    user.value = data.user
  }

  return {
    user: readonly(user),
    loading: readonly(loading),
    fetchUser,
    login,
    register,
    refresh,
    logout,
    init,
    updateProfile,
    uploadAvatar
  }
}
