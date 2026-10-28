import { useFocusEffect } from 'expo-router'
import { useCallback } from 'react'
import { StyleSheet, View } from 'react-native'
import { openAddTask, getAddTaskReturnHref } from '@/features/navigation/add-task-navigation'
import { useHomeTheme } from '@/features/home/theme'

export default function ComposeActionScreen() {
  const colors = useHomeTheme()

  useFocusEffect(useCallback(() => {
    openAddTask(getAddTaskReturnHref())
  }, []))

  return <View style={[styles.screen, { backgroundColor: colors.background }]} />
}

const styles = StyleSheet.create({ screen: { flex: 1 } })
