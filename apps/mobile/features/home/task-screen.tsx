import { useRef, useState } from 'react'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import {
  ActionSheetIOS,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { localDateKey } from '@planomy/lib/today'
import { getDeadlineLabel, getDueTimeLabel } from '@planomy/lib/home'
import { recurrenceLabel } from '@planomy/lib/recurrence'
import { useHome } from './provider'
import { useHomeTheme } from './theme'
import type { TaskDraft } from './model'

export function TaskScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  // Route keys give each presentation a fresh draft; the draft survives authoritative refreshes.
  const { data, busy, day, run } = useHome()
  const colors = useHomeTheme()
  const task = data?.tasks.find((item) => item.id === id)
  const [draft, setDraft] = useState<TaskDraft>(() => ({
    title: task?.title ?? '',
    notes: task?.notes ?? '',
    listId: task?.list_id ?? null,
    categoryId: task?.category_id ?? null,
    dueDate: task?.due_date ?? null,
    dueTime: task?.due_time?.slice(0, 5) ?? null,
  }))
  const [picker, setPicker] = useState<'date' | 'time' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const saving = useRef(false)
  if (!data || (id && !task))
    return (
      <View
        style={{ flex: 1, padding: 24, backgroundColor: colors.background }}
      >
        <Text style={{ color: colors.secondary }}>
          This task is no longer available.
        </Text>
      </View>
    )
  const list = data.lists.find((item) => item.id === draft.listId)
  const category = data.categories.find((item) => item.id === draft.categoryId)
  const categories = data.categories.filter(
    (item) => item.list_id === draft.listId,
  )
  function choose(
    title: string,
    options: { label: string; select: () => void }[],
  ) {
    if (Platform.OS === 'ios')
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title,
          options: [...options.map((item) => item.label), 'Cancel'],
          cancelButtonIndex: options.length,
        },
        (index) => options[index]?.select(),
      )
    else
      Alert.alert(title, undefined, [
        ...options.map((item) => ({ text: item.label, onPress: item.select })),
        { text: 'Cancel', style: 'cancel' },
      ])
  }
  async function save() {
    if (saving.current || busy || !data) return
    saving.current = true
    setError(null)
    // IDs in the memory-only preview are not backend identifiers. A vault adapter must return the persisted identity.
    const taskId =
      id ?? `native-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const ok = await run(
      { type: 'save', id: taskId, draft, creating: !id },
      id ? 'Task updated' : 'Task added',
    )
    saving.current = false
    if (ok) router.back()
    else
      setError(
        'Couldn’t save this task. Check the title and selected fields, then try again.',
      )
  }
  function field(label: string, value: string, action: () => void) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${value}`}
        disabled={busy}
        onPress={action}
        style={[styles.field, { borderBottomColor: colors.separator }]}
      >
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.value, { color: colors.secondary }]}>
          {value} ›
        </Text>
      </Pressable>
    )
  }
  return (
    <>
      <Stack.Screen
        options={{
          title: id ? 'Task' : 'New task',
          headerLeft: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel task editing"
              disabled={busy}
              onPress={() => router.back()}
              style={styles.headerButton}
            >
              <Text style={{ color: colors.accent, fontSize: 17 }}>Cancel</Text>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={id ? 'Save task changes' : 'Add task'}
              accessibilityState={{ disabled: busy || !draft.title.trim() }}
              disabled={busy || !draft.title.trim()}
              onPress={() => void save()}
              style={styles.headerButton}
            >
              <Text
                style={{
                  color:
                    busy || !draft.title.trim() ? colors.muted : colors.accent,
                  fontSize: 17,
                  fontWeight: '700',
                }}
              >
                {busy ? 'Saving…' : id ? 'Save' : 'Add'}
              </Text>
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
        style={{ flex: 1, backgroundColor: colors.background }}
      >
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          <View style={[styles.group, { backgroundColor: colors.surface }]}>
            <TextInput
              accessibilityLabel="Task title"
              autoFocus={!id}
              placeholder="What’s on your mind?"
              placeholderTextColor={colors.muted}
              multiline
              editable={!busy}
              value={draft.title}
              onChangeText={(title) =>
                setDraft((current) => ({ ...current, title }))
              }
              style={[styles.titleInput, { color: colors.text }]}
            />
            <TextInput
              accessibilityLabel="Task notes"
              placeholder="Add a note"
              placeholderTextColor={colors.muted}
              multiline
              editable={!busy}
              value={draft.notes}
              onChangeText={(notes) =>
                setDraft((current) => ({ ...current, notes }))
              }
              style={[
                styles.notesInput,
                { color: colors.secondary, borderTopColor: colors.separator },
              ]}
            />
          </View>
          <View style={[styles.group, { backgroundColor: colors.surface }]}>
            {field('List', list?.title ?? 'Unsorted', () =>
              choose('Choose a list', [
                {
                  label: 'Unsorted',
                  select: () =>
                    setDraft((current) => ({
                      ...current,
                      listId: null,
                      categoryId: null,
                    })),
                },
                ...data.lists.map((item) => ({
                  label: `${item.emoji ?? ''} ${item.title}`,
                  select: () =>
                    setDraft((current) => ({
                      ...current,
                      listId: item.id,
                      categoryId:
                        current.listId === item.id ? current.categoryId : null,
                    })),
                })),
              ]),
            )}
            {categories.length
              ? field('Category', category?.title ?? 'None', () =>
                  choose('Choose a category', [
                    {
                      label: 'None',
                      select: () =>
                        setDraft((current) => ({
                          ...current,
                          categoryId: null,
                        })),
                    },
                    ...categories.map((item) => ({
                      label: item.title,
                      select: () =>
                        setDraft((current) => ({
                          ...current,
                          categoryId: item.id,
                        })),
                    })),
                  ]),
                )
              : null}
          </View>
          <View style={[styles.group, { backgroundColor: colors.surface }]}>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.text }]}>
                Due date
              </Text>
              <Switch
                accessibilityLabel="Set a due date"
                disabled={busy}
                value={Boolean(draft.dueDate)}
                onValueChange={(enabled) => {
                  setDraft((current) => ({
                    ...current,
                    dueDate: enabled ? day : null,
                    dueTime: enabled ? current.dueTime : null,
                  }))
                  setPicker(enabled ? 'date' : null)
                }}
              />
            </View>
            {draft.dueDate ? (
              <>
                {field(
                  'Date',
                  getDeadlineLabel(draft.dueDate, day) ?? draft.dueDate,
                  () => setPicker(picker === 'date' ? null : 'date'),
                )}
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.text }]}>
                    Time
                  </Text>
                  <Switch
                    accessibilityLabel="Set a due time"
                    disabled={busy}
                    value={Boolean(draft.dueTime)}
                    onValueChange={(enabled) => {
                      setDraft((current) => ({
                        ...current,
                        dueTime: enabled ? '09:00' : null,
                      }))
                      setPicker(enabled ? 'time' : null)
                    }}
                  />
                </View>
                {draft.dueTime
                  ? field(
                      'At',
                      getDueTimeLabel(draft.dueTime) ?? draft.dueTime,
                      () => setPicker(picker === 'time' ? null : 'time'),
                    )
                  : null}
              </>
            ) : null}
            {picker && draft.dueDate ? (
              <DateTimePicker
                accessibilityLabel={picker === 'date' ? 'Due date' : 'Due time'}
                mode={picker}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                style={{ alignSelf: 'center' }}
                value={
                  new Date(`${draft.dueDate}T${draft.dueTime ?? '12:00'}:00`)
                }
                onChange={(_, date) => {
                  if (Platform.OS !== 'ios') setPicker(null)
                  if (date)
                    setDraft((current) =>
                      picker === 'date'
                        ? { ...current, dueDate: localDateKey(date) }
                        : {
                            ...current,
                            dueTime: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
                          },
                    )
                }}
              />
            ) : null}
          </View>
          {task?.recurrence_rule ? (
            <Text style={[styles.footnote, { color: colors.secondary }]}>
              {recurrenceLabel(task.recurrence_rule)}. Completing this task
              completes its scheduled occurrence. These fields describe the task
              series.
            </Text>
          ) : null}
          {task ? (
            <View style={[styles.group, { backgroundColor: colors.surface }]}>
              {!task.stashed ? (
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.text }]}>
                    Focus
                  </Text>
                  <Switch
                    accessibilityLabel="Pin this task to Focus"
                    disabled={busy}
                    value={task.focused}
                    onValueChange={(focused) =>
                      void run(
                        { type: 'focus', id: task.id, focused },
                        focused ? 'Added to Focus' : 'Removed from Focus',
                      )
                    }
                  />
                </View>
              ) : null}
              {field(
                task.stashed ? 'Unstash task' : 'Stash task',
                task.stashed ? 'Return to Home' : 'Keep in its list',
                () =>
                  void run(
                    { type: 'stash', id: task.id, stashed: !task.stashed },
                    task.stashed ? 'Task unstashed' : 'Task stashed',
                  ),
              )}
              {field(task.completed ? 'Restore task' : 'Complete task', '', async () => {
                if (
                  await run(
                    { type: 'complete', id: task.id, completed: !task.completed, day },
                    task.completed ? 'Task restored' : 'Task completed',
                    task.completed
                      ? undefined
                      : { type: 'complete', id: task.id, completed: false, day },
                  )
                )
                  router.back()
              })}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete task"
                disabled={busy}
                onPress={() => Alert.alert(
                  'Delete this task?',
                  task.recurrence_rule
                    ? 'This removes the task series and its scheduled occurrences from your account.'
                    : 'This removes the task from your account.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => {
                        void run({ type: 'delete', id: task.id }, 'Task deleted').then((ok) => {
                          if (ok) router.back()
                        })
                      },
                    },
                  ],
                )}
                style={[styles.deleteAction, { borderTopColor: colors.separator }]}
              >
                <Text style={{ color: colors.danger, fontSize: 16, fontWeight: '600' }}>Delete task</Text>
              </Pressable>
            </View>
          ) : null}
          {error ? (
            <Text
              accessibilityRole="alert"
              style={{ color: colors.danger, fontSize: 15 }}
            >
              {error}
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  )
}
const styles = StyleSheet.create({
  content: { padding: 20, gap: 20, paddingBottom: 64 },
  group: { borderRadius: 16, overflow: 'hidden' },
  titleInput: {
    padding: 18,
    minHeight: 74,
    fontSize: 23,
    fontWeight: '600',
    lineHeight: 30,
  },
  notesInput: {
    padding: 18,
    minHeight: 96,
    fontSize: 16,
    lineHeight: 23,
    borderTopWidth: StyleSheet.hairlineWidth,
    textAlignVertical: 'top',
  },
  field: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: { fontSize: 16, flexShrink: 1 },
  value: { fontSize: 15, flexShrink: 1 },
  headerButton: { minHeight: 44, minWidth: 44, justifyContent: 'center' },
  footnote: { fontSize: 13, lineHeight: 19 },
  deleteAction: { minHeight: 52, justifyContent: 'center', paddingHorizontal: 18, borderTopWidth: StyleSheet.hairlineWidth },
})
