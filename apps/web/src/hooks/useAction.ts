import { useCallback } from "react"
import { useAppStore } from "@/store/useAppStore"

export function useAction() {
  const setMessage = useAppStore((state) => state.setMessage)

  const runAction = useCallback(
    async <T,>(
      action: () => Promise<T>,
      successMessage: string,
      onSuccess?: (result: T) => void
    ): Promise<T | null> => {
      try {
        setMessage("Working...")
        const result = await action()
        setMessage(successMessage)
        if (onSuccess) {
          onSuccess(result)
        }
        return result
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unknown error")
        return null
      }
    },
    [setMessage]
  )

  return { runAction }
}
