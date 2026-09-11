import { supabase } from './supabase';

export async function fetchCommunityPosts() {
  // Fetch posts with author profiles
  const { data: postsData, error: postsError } = await supabase
    .from('posts')
    .select(`
      *,
      profiles:author_id (
        first_name,
        last_name,
        email,
        avatar_url,
        badge
      )
    `)
    .order('created_at', { ascending: false });

  if (postsError) {
    console.error('Error fetching posts:', postsError);
    return [];
  }

  // Fetch comments with author profiles
  const { data: commentsData, error: commentsError } = await supabase
    .from('comments')
    .select(`
      *,
      profiles:author_id (
        first_name,
        last_name,
        email,
        avatar_url,
        badge
      )
    `)
    .order('created_at', { ascending: true });

  if (commentsError) {
    console.error('Error fetching comments:', commentsError);
    return [];
  }

  // Map data to the expected UI structure
  const mappedPosts = postsData.map((post: any) => {
    // Determine author info
    const isAnon = post.is_anonymous;
    const authorName = isAnon ? "Anonymous Heartist" : `${post.profiles?.first_name} ${post.profiles?.last_name}`;
    const authorAvatar = isAnon ? "https://zdnmideipijqfehgzmos.supabase.co/storage/v1/object/public/avatars/default_avatar.jpg" : (post.profiles?.avatar_url || "https://zdnmideipijqfehgzmos.supabase.co/storage/v1/object/public/avatars/default_avatar.jpg");
    const authorRole = isAnon ? "Anonymous" : (post.profiles?.badge || "Heart-Seeker");

    // Group comments and replies
    const postComments = commentsData.filter((c: any) => c.post_id === post.id && !c.parent_id);
    
    const mappedComments = postComments.map((c: any) => {
      const cAuthorName = `${c.profiles?.first_name} ${c.profiles?.last_name}`;
      const cAuthorAvatar = c.profiles?.avatar_url || "https://zdnmideipijqfehgzmos.supabase.co/storage/v1/object/public/avatars/default_avatar.jpg";
      
      const replies = commentsData.filter((r: any) => r.parent_id === c.id);
      const mappedReplies = replies.map((r: any) => ({
        id: r.id,
        authorId: r.author_id,
        author: `${r.profiles?.first_name} ${r.profiles?.last_name}`,
        avatar: r.profiles?.avatar_url || "https://zdnmideipijqfehgzmos.supabase.co/storage/v1/object/public/avatars/default_avatar.jpg",
        content: r.content,
        timestamp: new Date(r.created_at).getTime(),
        likes: r.likes || [],
        isEdited: r.edit_count > 0,
        editCount: r.edit_count || 0,
        editHistory: r.edit_history || []
      }));

      return {
        id: c.id,
        authorId: c.author_id,
        author: cAuthorName,
        avatar: cAuthorAvatar,
        content: c.content,
        timestamp: new Date(c.created_at).getTime(),
        likes: c.likes || [],
        isEdited: c.edit_count > 0,
        editCount: c.edit_count || 0,
        editHistory: c.edit_history || [],
        replies: mappedReplies
      };
    });

    return {
      id: post.id,
      name: authorName,
      avatar: authorAvatar,
      role: authorRole,
      category: post.category,
      content: post.content,
      timestamp: new Date(post.created_at).getTime(),
      liked: false, // UI logic checks likedBy array
      likesCount: (post.likes || []).length,
      likes: post.likes || [],
      likedBy: post.likes || [],
      comments: mappedComments,
      reports: [], 
      isEdited: post.edit_count > 0,
      editCount: post.edit_count || 0,
      editHistory: post.edit_history || [],
      realName: `${post.profiles?.first_name} ${post.profiles?.last_name}`,
      username: post.profiles?.email ? `@${post.profiles.email.split('@')[0]}` : `@${post.profiles?.first_name?.toLowerCase().replace(/\s+/g, '')}`,
      authorId: post.author_id,
      isAnonymous: post.is_anonymous,
      isPinned: post.is_featured,
      status: post.status || 'active',
      disableComments: post.disable_comments || false
    };
  });

  return mappedPosts;
}

export async function submitPostToSupabase(postData: any, authorId: string) {
  const { data, error } = await supabase.from('posts').insert([{
    author_id: authorId,
    content: postData.content,
    category: postData.category,
    is_anonymous: postData.isAnonymous,
    likes: [],
    is_featured: false,
    disable_comments: postData.disableComments || false
  }]).select().single();
  
  if (error) throw error;
  return data;
}

export async function submitCommentToSupabase(postId: string, content: string, authorId: string) {
  const { data, error } = await supabase.from('comments').insert([{
    post_id: postId,
    author_id: authorId,
    content: content,
    likes: []
  }]).select().single();
  
  if (error) throw error;
  return data;
}

export async function submitReplyToSupabase(postId: string, commentId: string, content: string, authorId: string) {
  const { data, error } = await supabase.from('comments').insert([{
    post_id: postId,
    author_id: authorId,
    content: content,
    parent_id: commentId,
    likes: []
  }]).select().single();
  
  if (error) throw error;
  return data;
}

export async function deletePostFromSupabase(postId: string) {
  const { error } = await supabase.from('posts').delete().eq('id', postId);
  if (error) throw error;
  return true;
}

export async function updatePostStatus(postId: string, status: string) {
  const { error } = await supabase.from('posts').update({ status }).eq('id', postId);
  if (error) throw error;
  return true;
}

export async function updateCommentStatus(commentId: string, status: string) {
  const { error } = await supabase.from('comments').update({ status }).eq('id', commentId);
  if (error) throw error;
  return true;
}

export async function deleteCommentFromSupabase(commentId: string) {
  const { error } = await supabase.from('comments').delete().eq('id', commentId);
  if (error) throw error;
  return true;
}

export async function editPostInSupabase(postId: string, newContent: string, currentEditCount: number = 0, previousContent?: string, currentEditHistory: any[] = []) {
  const newHistory = previousContent ? [...currentEditHistory, { content: previousContent, timestamp: new Date().toISOString() }] : currentEditHistory;
  
  const { error } = await supabase.from('posts').update({ 
    content: newContent, 
    edit_count: currentEditCount + 1,
    edit_history: newHistory
  }).eq('id', postId);
  if (error) throw error;
  return true;
}

export async function editCommentInSupabase(commentId: string, newContent: string, currentEditCount: number = 0, previousContent?: string, currentEditHistory: any[] = []) {
  const newHistory = previousContent ? [...currentEditHistory, { content: previousContent, timestamp: new Date().toISOString() }] : currentEditHistory;
  
  const { error } = await supabase.from('comments').update({ 
    content: newContent,
    edit_count: currentEditCount + 1,
    edit_history: newHistory
  }).eq('id', commentId);
  if (error) throw error;
  return true;
}
export async function togglePostLike(postId: string, currentLikes: string[], userId: string) {
  const hasLiked = currentLikes.includes(userId);
  const newLikes = hasLiked ? currentLikes.filter(id => id !== userId) : [...currentLikes, userId];
  const { error } = await supabase.from('posts').update({ likes: newLikes }).eq('id', postId);
  if (error) throw error;
  return newLikes;
}

export async function toggleCommentLike(commentId: string, currentLikes: string[], userId: string) {
  const hasLiked = currentLikes.includes(userId);
  const newLikes = hasLiked ? currentLikes.filter(id => id !== userId) : [...currentLikes, userId];
  const { error } = await supabase.from('comments').update({ likes: newLikes }).eq('id', commentId);
  if (error) throw error;
  return newLikes;
}

export async function toggleReplyLike(replyId: string, currentLikes: string[], userId: string) {
  const hasLiked = currentLikes.includes(userId);
  const newLikes = hasLiked ? currentLikes.filter(id => id !== userId) : [...currentLikes, userId];
  const { error } = await supabase.from('comments').update({ likes: newLikes }).eq('id', replyId);
  if (error) throw error;
  return newLikes;
}

export async function togglePostPin(postId: string, isPinned: boolean) {
  const { error } = await supabase.from('posts').update({ 
    is_featured: isPinned 
  }).eq('id', postId);
  if (error) throw error;
  return true;
} 
