import { useState } from 'react'
import { Host } from '@expo/ui'
import {
  Box,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuPopup,
  Row,
  Spacer,
  Text as ComposeText,
  TextButton,
} from '@expo/ui/jetpack-compose'
import { fillMaxWidth, weight } from '@expo/ui/jetpack-compose/modifiers'
import { useHomeTheme } from './theme'
import {
  getCategoriesForList,
  getTaskListMenuLabel,
  type TaskListMenuProps,
} from './task-list-menu.shared'

export function TaskListMenu(props: TaskListMenuProps) {
  const colors = useHomeTheme()
  const [open, setOpen] = useState(false)
  const [submenuListId, setSubmenuListId] = useState<string | null>(null)
  const selectedLabel = getTaskListMenuLabel(props)
  const submenuList = props.lists.find((item) => item.id === submenuListId)

  function select(listId: string | null, categoryId: string | null) {
    props.onSelect(listId, categoryId)
    setOpen(false)
    setSubmenuListId(null)
  }

  return (
    <Host
      seedColor={colors.accent}
      style={{ flex: 1, minHeight: 40, justifyContent: 'center' }}
    >
      <Box>
        <Row
          verticalAlignment="center"
          modifiers={[fillMaxWidth()]}
        >
          <Spacer modifiers={[weight(1)]} />
          <TextButton
            enabled={!props.disabled}
            onClick={() => {
              setSubmenuListId(null)
              setOpen(true)
            }}
          >
            <Row verticalAlignment="center" horizontalArrangement={{ spacedBy: 4 }}>
              <ComposeText color={colors.secondary} maxLines={1} overflow="ellipsis">
                {selectedLabel}
              </ComposeText>
              <ComposeText color={colors.muted}>⌄</ComposeText>
            </Row>
          </TextButton>
        </Row>
        <DropdownMenuPopup
          expanded={open}
          onDismissRequest={() => {
            setOpen(false)
            setSubmenuListId(null)
          }}
        >
          <DropdownMenuGroup containerColor={colors.surfaceElevated}>
            {submenuList ? (
              <>
                <DropdownMenuItem onClick={() => setSubmenuListId(null)}>
                  <DropdownMenuItem.Text>
                    <ComposeText color={colors.secondary}>‹ Lists</ComposeText>
                  </DropdownMenuItem.Text>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => select(submenuList.id, null)}>
                  <DropdownMenuItem.Text>
                    <ComposeText color={colors.text}>No category</ComposeText>
                  </DropdownMenuItem.Text>
                </DropdownMenuItem>
                {getCategoriesForList(props.categories, submenuList.id).map((category) => (
                  <DropdownMenuItem
                    key={category.id}
                    onClick={() => select(submenuList.id, category.id)}
                  >
                    <DropdownMenuItem.Text>
                      <ComposeText color={colors.text}>{category.title}</ComposeText>
                    </DropdownMenuItem.Text>
                  </DropdownMenuItem>
                ))}
              </>
            ) : (
              <>
                <DropdownMenuItem onClick={() => select(null, null)}>
                  <DropdownMenuItem.Text>
                    <ComposeText color={colors.text}>Unsorted</ComposeText>
                  </DropdownMenuItem.Text>
                </DropdownMenuItem>
                {props.lists.map((list) => {
                  const categories = getCategoriesForList(props.categories, list.id)
                  const label = `${list.emoji ? `${list.emoji} ` : ''}${list.title}`
                  return (
                    <DropdownMenuItem
                      key={list.id}
                      onClick={() =>
                        categories.length
                          ? setSubmenuListId(list.id)
                          : select(list.id, null)
                      }
                    >
                      <DropdownMenuItem.Text>
                        <ComposeText color={colors.text} maxLines={1} overflow="ellipsis">
                          {categories.length ? `${label}  ›` : label}
                        </ComposeText>
                      </DropdownMenuItem.Text>
                    </DropdownMenuItem>
                  )
                })}
              </>
            )}
          </DropdownMenuGroup>
        </DropdownMenuPopup>
      </Box>
    </Host>
  )
}
