export const performGlobalCleanup = () => {
  if (typeof window !== 'undefined') {
    const hasRunCleanup = localStorage.getItem("hasRunSupabaseCleanup");
    if (!hasRunCleanup) {
      console.log("Running Global LocalStorage Cleanup for Supabase Migration...");
      
      const keysToRemove = [
        "communityPosts",
        "communityBlocked",
        "communityPenalties",
        "communityWarnedPosts",
        "fusionWarningCounts",
        "communityPenaltyCounts",
        "communityAppeals",
        "fusionInbox",
        "communityNotifications",
        "communityAnnouncements",
        "fusionCountdownData",
        "fusionBlueprintData",
        "eventIterations",
        "fusionPackingList",
        "fusionItinerary",
        "fusionTeamMembers"
      ];

      // Remove iteration-specific keys (assuming max 20 iterations for cleanup)
      for (let i = 1; i <= 20; i++) {
        keysToRemove.push(`fusionLocationData_${i}`);
        keysToRemove.push(`fusionTheme_${i}`);
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      localStorage.setItem("hasRunSupabaseCleanup", "true");
      console.log("Cleanup Complete!");
    }
  }
};
