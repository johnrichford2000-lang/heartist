import { supabase } from "./supabase";

export interface Announcement {
  id: string;
  author_id: string;
  author_name: string;
  content: string;
  post_id?: string;
  is_featured: boolean;
  created_at: string;
}

export const fetchAnnouncements = async () => {
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching announcements:", error);
    return [];
  }
  return data as Announcement[];
};

export const createAnnouncement = async (ann: Omit<Announcement, "id" | "created_at">) => {
  const { data, error } = await supabase
    .from("announcements")
    .insert([ann])
    .select();

  if (error) {
    console.error("Error creating announcement:", error);
    return null;
  }
  return data[0] as Announcement;
};

export const deleteAnnouncement = async (id: string) => {
  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", id);
  
  if (error) {
    console.error("Error deleting announcement:", error);
  }
};
