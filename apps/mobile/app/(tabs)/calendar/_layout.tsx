import { Stack } from 'expo-router'

export default function CalendarLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Calendar', headerLargeTitle: true }} />
    </Stack>
  )
}
