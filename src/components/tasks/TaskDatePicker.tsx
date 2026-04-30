'use client'

import { useState } from 'react'
import { Button } from '../ui/button'
import { Calendar } from '../ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { format } from 'date-fns'
import { FieldLabel } from '../ui/field'

export function TaskDatePicker({ taskDate }: { taskDate: string | null }) {
  const taskDueDate = taskDate ? new Date(taskDate + 'T00:00:00') : undefined
  const [date, setDate] = useState<Date | undefined>(taskDueDate)
  return (
    <>
      <FieldLabel htmlFor="due_date">Due Date</FieldLabel>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            id="date-picker-simple"
            className="justify-start font-normal"
          >
            {date ? format(date, 'PPP') : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date ?? taskDueDate}
            onSelect={setDate}
            defaultMonth={date ?? taskDueDate}
          />
        </PopoverContent>
      </Popover>
      <input
        id="due-date"
        type="hidden"
        name="due_date"
        value={date ? format(date, 'yyyy-MM-dd') : ''}
      />
    </>
  )
}
