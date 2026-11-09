import { Host } from '@expo/ui'
import { Button, Label, Menu } from '@expo/ui/swift-ui'
import { disabled as disabledModifier } from '@expo/ui/swift-ui/modifiers'
import { useHomeTheme } from './theme'
import {
  getCategoriesForList,
  getTaskListMenuLabel,
  type TaskListMenuProps,
} from './task-list-menu.shared'

export function TaskListMenu(props: TaskListMenuProps) {
  const colors = useHomeTheme()
  const selectedLabel = getTaskListMenuLabel(props)

  return (
    <Host
      matchContents
      seedColor={colors.accent}
      style={{ alignSelf: 'flex-end' }}
    >
      <Menu
        label={<Label title={selectedLabel} systemImage="list.bullet" />}
        modifiers={[disabledModifier(Boolean(props.disabled))]}
      >
        <Button
          label="Unsorted"
          systemImage={!props.listId ? 'checkmark' : undefined}
          onPress={() => props.onSelect(null, null)}
        />
        {props.lists.map((list) => {
          const categories = getCategoriesForList(props.categories, list.id)
          const label = `${list.emoji ? `${list.emoji} ` : ''}${list.title}`
          const selected = props.listId === list.id

          if (categories.length === 0)
            return (
              <Button
                key={list.id}
                label={label}
                systemImage={selected ? 'checkmark' : undefined}
                onPress={() => props.onSelect(list.id, null)}
              />
            )

          return (
            <Menu
              key={list.id}
              label={label}
              systemImage={selected ? 'checkmark' : undefined}
            >
              <Button
                label="No category"
                systemImage={selected && !props.categoryId ? 'checkmark' : undefined}
                onPress={() => props.onSelect(list.id, null)}
              />
              {categories.map((category) => (
                <Button
                  key={category.id}
                  label={category.title}
                  systemImage={props.categoryId === category.id ? 'checkmark' : undefined}
                  onPress={() => props.onSelect(list.id, category.id)}
                />
              ))}
            </Menu>
          )
        })}
      </Menu>
    </Host>
  )
}
