"use client";
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function SystemSettingsListener() {
  useEffect(() => {
    const channel = supabase.channel('system_settings_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_settings' },
        (payload) => {
          try {
            if (payload.new && (payload.new as any).id && (payload.new as any).value !== undefined) {
              const id = (payload.new as any).id;
              const value = (payload.new as any).value;
              localStorage.setItem(id, JSON.stringify(value));
              window.dispatchEvent(new Event('storage'));
            }
          } catch (e) {
            console.error('Error handling system_settings realtime update', e);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcements' },
        () => {
          window.dispatchEvent(new CustomEvent('announcements_updated'));
          window.dispatchEvent(new Event('storage'));
        }
      )
      .on(
        'broadcast',
        { event: 'announcement_updated' },
        () => {
          window.dispatchEvent(new CustomEvent('announcements_updated'));
          window.dispatchEvent(new Event('storage'));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return null;
}
