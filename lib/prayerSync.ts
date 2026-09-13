import { supabase } from "@/lib/supabase";
import { formatCapitalizedName } from "@/utils/formatName";

export interface PrayerData {
  id: string;
  author_id: string | null;
  author_name: string;
  request: string;
  category: string;
  likes: string[];
  is_private: boolean;
  status: string;
  hearts: string[];
  answer_comment: string | null;
  answered_timestamp: string | null;
  created_at: string;
  edit_count?: number;
}

// 1. Fetch Prayers
export const fetchPrayers = async (): Promise<PrayerData[]> => {
  const { data, error } = await supabase
    .from("prayers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching prayers:", error);
    return [];
  }
  
  return (data as PrayerData[]).map((p) => ({
    ...p,
    author_name: p.is_private ? "Anonymous Heartist" : formatCapitalizedName(p.author_name)
  }));
};

// 2. Submit New Prayer
export const submitPrayerToSupabase = async (
  authorId: string | null,
  authorName: string,
  request: string,
  category: string,
  isPrivate: boolean
) => {
  const formattedAuthorName = isPrivate ? "Anonymous Heartist" : formatCapitalizedName(authorName);
  const { data, error } = await supabase
    .from("prayers")
    .insert([
      {
        author_id: authorId,
        author_name: formattedAuthorName,
        request,
        category,
        is_private: isPrivate,
        status: 'active',
        likes: [],
        hearts: [],
        created_at: new Date().toISOString()
      }
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
};

// 3. Toggle "Pray" (Like)
export const togglePrayerLike = async (prayerId: string, userId: string, currentLikes: string[]) => {
  const hasLiked = currentLikes.includes(userId);
  let newLikes = [];

  if (hasLiked) {
    newLikes = currentLikes.filter((id) => id !== userId);
  } else {
    newLikes = [...currentLikes, userId];
  }

  const { error } = await supabase
    .from("prayers")
    .update({ likes: newLikes })
    .eq("id", prayerId);

  if (error) throw error;
  return newLikes;
};

// 4. Toggle "Heart" (for Answered Prayers)
export const togglePrayerHeart = async (prayerId: string, userId: string, currentHearts: string[]) => {
  const hasHearted = currentHearts.includes(userId);
  let newHearts = [];

  if (hasHearted) {
    newHearts = currentHearts.filter((id) => id !== userId);
  } else {
    newHearts = [...currentHearts, userId];
  }

  const { error } = await supabase
    .from("prayers")
    .update({ hearts: newHearts })
    .eq("id", prayerId);

  if (error) throw error;
  return newHearts;
};

// 5. Mark Prayer as Answered
export const markPrayerAsAnswered = async (prayerId: string, answerComment: string) => {
  const { error } = await supabase
    .from("prayers")
    .update({
      status: 'answered',
      answer_comment: answerComment,
      answered_timestamp: new Date().toISOString()
    })
    .eq("id", prayerId);

  if (error) throw error;
  return true;
};

// 6. Delete Prayer
export const deletePrayerFromSupabase = async (prayerId: string) => {
  const { error } = await supabase
    .from("prayers")
    .delete()
    .eq("id", prayerId);

  if (error) throw error;
  return true;
};

// 7. Update Prayer Status
export const updatePrayerStatus = async (prayerId: string, status: string) => {
  const { error } = await supabase
    .from("prayers")
    .update({ status })
    .eq("id", prayerId);

  if (error) throw error;
  return true;
};

// 8. Edit Prayer
export const editPrayerInSupabase = async (prayerId: string, newRequest: string, currentEditCount: number = 0) => {
  const { error } = await supabase
    .from("prayers")
    .update({ 
      request: newRequest,
      edit_count: currentEditCount + 1
    })
    .eq("id", prayerId);

  if (error) throw error;
  return true;
};
