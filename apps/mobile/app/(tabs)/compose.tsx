import { useFocusEffect, router } from 'expo-router'
import { useCallback } from 'react'

export default function ComposeActionRoute() {
  useFocusEffect(useCallback(() => {
    router.replace('/home')
  }, []))

  return null
}
