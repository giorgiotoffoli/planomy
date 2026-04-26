import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export default async function getStatuses(listId: string) {
  const supabase = await createClient()

  const { data: statuses, error } = await supabase
    .from('statuses')
    .select('*')
    .eq('list_id', listId)

  if (error) {
    throw new Error(error.message)
  }

  return statuses

  revalidatePath('/')
}
