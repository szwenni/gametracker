export interface Toast {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  duration?: number
}

export function useToast() {
  const toasts = useState<Toast[]>('toasts', () => [])

  function add(toast: Omit<Toast, 'id'>) {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
    const item: Toast = { ...toast, id }
    toasts.value = [...toasts.value, item]

    const duration = toast.duration ?? 5000
    if (duration > 0) {
      setTimeout(() => remove(id), duration)
    }
  }

  function remove(id: string) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  return { toasts: readonly(toasts), add, remove }
}
