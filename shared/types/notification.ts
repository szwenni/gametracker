export interface Notification {
  id: string
  userId: string
  title: string
  body: string
  type: string | null
  data: unknown
  read: boolean
  createdAt: string
}
