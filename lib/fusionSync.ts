import { supabase } from './supabase';

// --------------------------------------------------------------------------------
// SYSTEM SETTINGS (Blueprint, Packing List, Itinerary, Team)
// --------------------------------------------------------------------------------

export async function fetchSystemSetting(id: string) {
  const { data, error } = await supabase
    .from('system_settings')
    .select('value')
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }
  return data.value;
}

export async function saveSystemSetting(id: string, value: any) {
  const { error } = await supabase
    .from('system_settings')
    .upsert({ id, value, updated_at: new Date().toISOString() });

  if (error) {
    console.error(`Error saving system setting ${id}:`, error);
    return false;
  }
  
  try {
    supabase.channel("system_announcements").send({
      type: "broadcast",
      event: "announcement_updated",
      payload: {},
    });
  } catch(e) {}
  return true;

}

// --------------------------------------------------------------------------------
// ANNOUNCEMENTS
// --------------------------------------------------------------------------------

export async function fetchAnnouncements() {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: true }); // We want oldest to newest so the newest is at the end of the array, matching previous logic

  if (error) {
    // silently fail
    return [];
  }
  
  // Transform camelCase keys to match the frontend expectations
  return (data || []).map((item: any) => ({
    id: item.id,
    content: item.content,
    timestamp: item.created_at,
    isFeatured: item.is_featured,
    postId: item.post_id
  }));
}

export async function submitAnnouncement(announcement: any) {
  const { data, error } = await supabase
    .from('announcements')
    .insert({
      content: announcement.content,
      created_at: announcement.timestamp || new Date().toISOString(),
      is_featured: announcement.isFeatured || false,
      post_id: announcement.postId || null
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving announcement:', error.message, error.details, error.hint, error.code);
    return null;
  }
  
  
  notifyAnnouncementChange();

  return {
    id: data.id,
    content: data.content,
    timestamp: data.created_at,
    isFeatured: data.is_featured,
    postId: data.post_id
  };
}

export function notifyAnnouncementChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("announcements_updated"));
    window.dispatchEvent(new Event("storage"));
  }
  try {
    const broadcastChan = supabase.channel(`broadcast_ann_${Date.now()}`);
    broadcastChan.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        broadcastChan.send({
          type: 'broadcast',
          event: 'announcement_updated',
          payload: {}
        }).finally(() => {
          supabase.removeChannel(broadcastChan);
        });
      }
    });
  } catch(e) {}
}

export async function deleteAnnouncement(id: number) {
  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Error deleting announcement ${id}:`, error);
    return false;
  }

  notifyAnnouncementChange();
    
  return true;
}

// --------------------------------------------------------------------------------
// AUTOMATIC IMAGE COMPRESSOR & UPLOADER
// --------------------------------------------------------------------------------

/**
 * Uploads a base64 dataUrl image to Supabase Storage, returning the public URL.
 */
export async function uploadFusionTeamImage(dataUrl: string, memberName: string): Promise<string | null> {
  try {
    // Convert base64 dataUrl to Blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    // Generate a unique filename using timestamp and member name
    const safeName = memberName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const fileName = `${Date.now()}_${safeName}.jpg`;

    const { data, error } = await supabase.storage
      .from('fusion_team_images')
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.error('Error uploading image to Supabase:', error);
      return null;
    } 
    
    if (data) {
      const { data: urlData } = supabase.storage
        .from('fusion_team_images')
        .getPublicUrl(data.path);
      
      return urlData.publicUrl;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to upload image:', error);
    return null;
  }
}

export async function uploadExhibitImage(dataUrl: string, camp: string, category: string): Promise<string | null> {
  try {
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    const safeCamp = camp.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const safeCategory = category.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const fileName = `${Date.now()}_${safeCamp}_${safeCategory}.jpg`;

    const { data, error } = await supabase.storage
      .from('exhibit_images')
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.error('Error uploading exhibit image to Supabase:', error);
      return null;
    } 
    
    if (data) {
      const { data: urlData } = supabase.storage
        .from('exhibit_images')
        .getPublicUrl(data.path);
      
      return urlData.publicUrl;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to upload exhibit image:', error);
    return null;
  }
}

