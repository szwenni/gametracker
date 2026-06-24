export type GlobalRole = 'user' | 'admin'

export interface User {
  id: string
  username: string
  displayName: string
  avatarPath: string | null
  globalRole: GlobalRole
  createdAt: string
  updatedAt: string
}
