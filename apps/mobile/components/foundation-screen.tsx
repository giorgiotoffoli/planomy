import { SymbolView } from 'expo-symbols'
import { ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native'

import { GlassSurface } from '@/components/glass-surface'

type FoundationScreenProps = {
  symbol: 'house.fill' | 'calendar'
  eyebrow: string
  description: string
  detail: string
}

export function FoundationScreen({
  symbol,
  eyebrow,
  description,
  detail,
}: FoundationScreenProps) {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const colors = isDark ? darkColors : lightColors

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      style={[styles.screen, { backgroundColor: colors.background }]}
    >
      <View style={styles.intro}>
        <SymbolView
          name={{ ios: symbol, android: 'check', web: 'check' }}
          tintColor={colors.accent}
          size={24}
        />
        <Text style={[styles.eyebrow, { color: colors.accent }]}>{eyebrow}</Text>
        <Text style={[styles.description, { color: colors.secondary }]}>{description}</Text>
      </View>

      <GlassSurface>
        <Text style={[styles.cardEyebrow, { color: colors.accent }]}>FOUNDATION READY</Text>
        <Text style={[styles.cardDetail, { color: colors.primary }]}>{detail}</Text>
      </GlassSurface>

      <Text style={[styles.footer, { color: colors.tertiary }]}>Private by design. Built for iPhone.</Text>
    </ScrollView>
  )
}

const lightColors = {
  accent: '#4169E1',
  background: '#F6F6F3',
  primary: '#151618',
  secondary: '#606169',
  tertiary: '#888991',
}

const darkColors = {
  accent: '#9BB4FF',
  background: '#101113',
  primary: '#F3F4F7',
  secondary: '#B8BAC3',
  tertiary: '#858894',
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    gap: 26,
    padding: 22,
    paddingBottom: 132,
  },
  intro: {
    gap: 12,
    maxWidth: 520,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  description: {
    fontSize: 18,
    lineHeight: 27,
  },
  cardEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  cardDetail: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 23,
  },
  footer: {
    fontSize: 13,
    fontWeight: '500',
  },
})
