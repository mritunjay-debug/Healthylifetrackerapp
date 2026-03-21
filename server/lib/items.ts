/** Table name — must match Supabase `public.app_items` (see supabase/schema.sql). */
export const APP_ITEMS_TABLE = "app_items" as const;

export type AppItemRow = {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  created_at: string;
  updated_at: string;
};

export type AppItemInsert = {
  user_id: string;
  title: string;
  body?: string | null;
};

export type AppItemUpdate = {
  title?: string;
  body?: string | null;
};
