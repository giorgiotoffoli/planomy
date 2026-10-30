import type { ReactNode } from 'react'
import { FlatList, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import type { Category, TaskWithList, TimeBlock } from '@planomy/types'
import { AppCheckbox, AppDivider, AppIcon, AppSurface, AppText, IconButton } from '@/components/ui/primitives'
import { CategoryIndicator, ListIndicator } from '@/components/lists'
import { DatePill, DeadlineIndicator, RecurrenceIndicator, ScheduledBlock, TimeLabel } from '@/components/scheduling'
import { useHomeTheme, spacing, radii } from '@/features/home/theme'

export type TaskRowVariant = 'compact' | 'expanded'

const TASK_ROW_DIVIDER_INSET = 44

export type TaskRowProps = {
  task: TaskWithList
  category?: Pick<Category, 'id' | 'title' | 'color'> | null
  variant?: TaskRowVariant
  metadataAppearance?: 'default' | 'plain'
  showDivider?: boolean
  showList?: boolean
  showCategory?: boolean
  showDeadline?: boolean
  showRecurrence?: boolean
  scheduledBlock?: Pick<TimeBlock, 'starts_at' | 'ends_at' | 'status'> | null
  deadlineLabel?: string
  deadlineTime?: string | null
  occurrenceLabel?: string
  occurrenceTime?: string | null
  today?: string
  completionDisabled?: boolean
  onPress?: () => void
  onToggleComplete?: () => void
  onActions?: () => void
}

export function TaskCompletionIndicator({
  task,
  disabled,
  onToggle,
}: {
  task: Pick<TaskWithList, 'id' | 'title' | 'completed'>
  disabled?: boolean
  onToggle?: () => void
}) {
  return (
    <AppCheckbox
      checked={task.completed}
      label={`${task.completed ? 'Reopen' : 'Complete'} ${task.title}`}
      disabled={disabled}
      onPress={onToggle}
    />
  )
}

export function TaskActions({ task, onPress, disabled }: { task: Pick<TaskWithList, 'title'>; onPress?: () => void; disabled?: boolean }) {
  return (
    <IconButton
      name={{ ios: 'ellipsis', android: 'more_horiz', web: 'more_horiz' }}
      label={`Actions for ${task.title}`}
      onPress={onPress}
      disabled={disabled}
    />
  )
}

export function TaskMetadata({
  task,
  category,
  showList = true,
  showCategory = true,
  showDeadline = true,
  showRecurrence = true,
  deadlineLabel,
  deadlineTime,
  occurrenceLabel,
  occurrenceTime,
  today,
  scheduledBlock,
  variant = 'compact',
  metadataAppearance = 'default',
}: Omit<TaskRowProps, 'onPress' | 'onToggleComplete' | 'onActions' | 'completionDisabled'>) {
  const metadata: ReactNode[] = []
  if (showList && task.list) metadata.push(<ListIndicator key="list" list={task.list} compact={variant === 'compact'} />)
  if (showCategory && category) metadata.push(<CategoryIndicator key="category" category={category} compact={variant === 'compact'} />)
  if (showRecurrence && task.recurrence_rule) metadata.push(<RecurrenceIndicator key="recurrence" rule={task.recurrence_rule} appearance={metadataAppearance} />)
  const hasDeadline = Boolean(deadlineLabel || task.due_date)
  const hasOccurrence = showDeadline && Boolean(occurrenceLabel)
  const hasMetadata =
    metadata.length > 0 ||
    (showDeadline && hasDeadline) ||
    hasOccurrence ||
    Boolean(scheduledBlock)

  if (!hasMetadata) return null

  return (
    <View style={styles.metadataBlock}>
      {metadata.length ? <View style={styles.metadataLine}>{metadata}</View> : null}
      {showDeadline && hasDeadline ? (
        <DeadlineIndicator dueDate={task.due_date} dueTime={deadlineTime ?? task.due_time} today={today} label={deadlineLabel} appearance={metadataAppearance} />
      ) : null}
      {showDeadline && occurrenceLabel ? (
        <View style={styles.metadataLine}>
          <DatePill icon="repeat" label={`Occurrence · ${occurrenceLabel}`} appearance={metadataAppearance} />
          {occurrenceTime && !task.due_date ? <View style={styles.metadataLine}><AppIcon name={{ ios: 'clock', android: 'schedule', web: 'schedule' }} size={13} /><TimeLabel time={occurrenceTime} accessibilityLabel="Due time" /></View> : null}
        </View>
      ) : null}
      {scheduledBlock ? <ScheduledBlock block={scheduledBlock} /> : null}
    </View>
  )
}

export function TaskRow({
  task,
  category,
  variant = 'compact',
  metadataAppearance = 'default',
  showDivider = true,
  showList,
  showCategory,
  showDeadline,
  showRecurrence,
  scheduledBlock,
  deadlineLabel,
  deadlineTime,
  occurrenceLabel,
  occurrenceTime,
  today,
  completionDisabled,
  onPress,
  onToggleComplete,
  onActions,
}: TaskRowProps) {
  const expanded = variant === 'expanded'
  const label = [
    task.title,
    task.list?.title,
    category?.title,
    deadlineLabel,
    occurrenceLabel,
    task.focused ? 'In Focus' : null,
  ].filter(Boolean).join(', ')
  return (
    <View>
      <View style={styles.row}>
        <TaskCompletionIndicator task={task} disabled={completionDisabled} onToggle={onToggleComplete} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityHint="Opens task details."
          disabled={!onPress}
          onPress={onPress}
          style={({ pressed }) => [styles.body, expanded && styles.expandedBody, pressed && { opacity: 0.65 }]}
        >
          <AppText variant={expanded ? 'title' : 'body'} weight={task.focused ? '600' : '500'}>
            {task.title}
          </AppText>
          <TaskMetadata
            task={task}
            category={category}
            variant={variant}
            metadataAppearance={metadataAppearance}
            showList={showList}
            showCategory={showCategory}
            showDeadline={showDeadline}
            showRecurrence={showRecurrence}
            deadlineLabel={deadlineLabel}
            deadlineTime={deadlineTime}
            occurrenceLabel={occurrenceLabel}
            occurrenceTime={occurrenceTime}
            today={today}
            scheduledBlock={scheduledBlock}
          />
        </Pressable>
        {onActions ? <TaskActions task={task} onPress={onActions} disabled={completionDisabled} /> : null}
      </View>
      {showDivider ? <TaskRowDivider /> : null}
    </View>
  )
}

export function TaskCard(props: TaskRowProps & { surface?: 'card' | 'elevated' }) {
  const { surface = 'card', ...rowProps } = props
  return (
    <AppSurface variant={surface} style={styles.card}>
      <TaskRow {...rowProps} variant={rowProps.variant ?? 'expanded'} />
    </AppSurface>
  )
}

export function TaskGroup({
  title,
  children,
  count,
}: {
  title: string
  children: ReactNode
  count?: number
}) {
  const colors = useHomeTheme()
  return (
    <View style={styles.group}>
      <View style={styles.groupHeader}>
        <AppText variant="footnote" weight="700" tone="secondary" accessibilityRole="header">{title}</AppText>
        {count !== undefined ? <AppText variant="caption" tone="muted">{count}</AppText> : null}
      </View>
      <AppSurface variant="card" style={styles.groupSurface}>{children}</AppSurface>
      <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.separator }} />
    </View>
  )
}

export function TaskList<T extends { id: string }>({
  tasks,
  renderTask,
  empty,
  contentContainerStyle,
}: {
  tasks: T[]
  renderTask: (task: T, index: number) => ReactNode
  empty?: ReactNode
  contentContainerStyle?: StyleProp<ViewStyle>
}) {
  return (
    <FlatList
      data={tasks}
      keyExtractor={(task) => task.id}
      renderItem={({ item, index }) => renderTask(item, index)}
      ListEmptyComponent={empty ? () => <>{empty}</> : undefined}
      contentContainerStyle={contentContainerStyle}
      initialNumToRender={12}
      maxToRenderPerBatch={8}
      windowSize={7}
      removeClippedSubviews
    />
  )
}

export function TaskRowDivider() {
  return <AppDivider inset={TASK_ROW_DIVIDER_INSET} />
}

export function FocusMark() {
  const colors = useHomeTheme()
  return <AppIcon name={{ ios: 'star.fill', android: 'star', web: 'star' }} size={15} color={colors.accent} />
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  body: { flex: 1, minHeight: 52, justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm },
  expandedBody: { minHeight: 74, paddingVertical: spacing.lg },
  metadataBlock: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs },
  metadataLine: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm, maxWidth: '100%' },
  card: { padding: spacing.xs },
  group: { gap: spacing.sm, marginTop: spacing.xl },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xs },
  groupSurface: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radii.lg },
})
