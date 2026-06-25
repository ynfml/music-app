"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseClient } from "@/lib/supabase/client";
import type { Genre, Profile } from "@/lib/types";
import { safeStartViewTransition } from "@/lib/transitions";

type AuthContextValue = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  savedEventIds: string[];
  attendedEventIds: string[];
  attendedComments: Record<string, string>;
  followingIds: string[];
  followerIds: string[];
  refreshProfile: () => Promise<void>;
  updateFavoriteGenres: (genres: Genre[]) => Promise<{ error: string | null }>;
  updateProfileBio: (bio: string) => Promise<{ error: string | null }>;
  toggleSaveEvent: (eventId: string) => Promise<{ error: string | null }>;
  toggleAttendEvent: (eventId: string, comment?: string) => Promise<{ error: string | null }>;
  toggleFollow: (targetUserId: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchProfile(userId: string): Promise<Profile | null> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, favorite_genres, bio")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch profile:", error.message);
    return null;
  }

  return data;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [savedEventIds, setSavedEventIds] = useState<string[]>([]);
  const [attendedEventIds, setAttendedEventIds] = useState<string[]>([]);
  const [attendedComments, setAttendedComments] = useState<Record<string, string>>({});
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [followerIds, setFollowerIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const fetchSavedEvents = useCallback(async (userId: string) => {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from("saved_events")
      .select("event_id")
      .eq("user_id", userId);

    if (error) {
      console.error("Failed to fetch saved events:", error.message);
      return [];
    }

    return data.map((item) => item.event_id);
  }, []);

  const fetchAttendedEvents = useCallback(async (userId: string) => {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from("attended_events")
      .select("event_id, comment")
      .eq("user_id", userId);

    if (error) {
      console.error("Failed to fetch attended events:", error.message);
      return { ids: [], comments: {} };
    }

    const ids = data.map((item) => item.event_id);
    const comments: Record<string, string> = {};
    data.forEach((item) => {
      if (item.comment) {
        comments[item.event_id] = item.comment;
      }
    });

    return { ids, comments };
  }, []);

  const fetchFollows = useCallback(async (userId: string) => {
    const supabase = createSupabaseClient();
    // 自分がフォローしている人
    const { data: followingData } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", userId);
    // 自分をフォローしている人
    const { data: followerData } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("following_id", userId);

    return {
      following: followingData?.map((f) => f.following_id) || [],
      followers: followerData?.map((f) => f.follower_id) || [],
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    setProfileLoading(true);
    const nextProfile = await fetchProfile(user.id);
    safeStartViewTransition(() => {
      setProfile(nextProfile);
    });
    setProfileLoading(false);
  }, [user]);

  useEffect(() => {
    const supabase = createSupabaseClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      safeStartViewTransition(() => {
        setProfile(null);
        setSavedEventIds([]);
        setAttendedEventIds([]);
        setAttendedComments({});
        setFollowingIds([]);
        setFollowerIds([]);
      });
      return;
    }

    refreshProfile();
    fetchSavedEvents(user.id).then((ids) => {
      safeStartViewTransition(() => {
        setSavedEventIds(ids);
      });
    });
    fetchAttendedEvents(user.id).then(({ ids, comments }) => {
      safeStartViewTransition(() => {
        setAttendedEventIds(ids);
        setAttendedComments(comments);
      });
    });
    fetchFollows(user.id).then(({ following, followers }) => {
      safeStartViewTransition(() => {
        setFollowingIds(following);
        setFollowerIds(followers);
      });
    });
  }, [user, refreshProfile, fetchSavedEvents, fetchAttendedEvents, fetchFollows]);

  const updateFavoriteGenres = useCallback(
    async (genres: Genre[]) => {
      if (!user) {
        return { error: "ログインが必要です" };
      }

      const supabase = createSupabaseClient();
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        favorite_genres: genres,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        return { error: error.message };
      }

      safeStartViewTransition(() => {
        setProfile((prev) =>
          prev
            ? { ...prev, favorite_genres: genres }
            : { id: user.id, display_name: null, favorite_genres: genres, bio: null }
        );
      });
      return { error: null };
    },
    [user],
  );

  const updateProfileBio = useCallback(
    async (bio: string) => {
      if (!user) {
        return { error: "ログインが必要です" };
      }

      const supabase = createSupabaseClient();
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        bio: bio,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        return { error: error.message };
      }

      safeStartViewTransition(() => {
        setProfile((prev) =>
          prev
            ? { ...prev, bio: bio }
            : { id: user.id, display_name: null, favorite_genres: null, bio: bio }
        );
      });
      return { error: null };
    },
    [user],
  );

  const toggleSaveEvent = useCallback(
    async (eventId: string) => {
      if (!user) {
        return { error: "ログインが必要です" };
      }

      const supabase = createSupabaseClient();
      const isSaved = savedEventIds.includes(eventId);

      if (isSaved) {
        const { error } = await supabase
          .from("saved_events")
          .delete()
          .eq("user_id", user.id)
          .eq("event_id", eventId);

        if (error) {
          return { error: error.message };
        }

        safeStartViewTransition(() => {
          setSavedEventIds((prev) => prev.filter((id) => id !== eventId));
        });
      } else {
        const { error } = await supabase.from("saved_events").insert({
          user_id: user.id,
          event_id: eventId,
        });

        if (error) {
          return { error: error.message };
        }

        safeStartViewTransition(() => {
          setSavedEventIds((prev) => [...prev, eventId]);
        });
      }

      return { error: null };
    },
    [user, savedEventIds],
  );

  const toggleAttendEvent = useCallback(
    async (eventId: string, comment?: string) => {
      if (!user) {
        return { error: "ログインが必要です" };
      }

      const supabase = createSupabaseClient();
      const isAttended = attendedEventIds.includes(eventId);

      if (isAttended) {
        const { error } = await supabase
          .from("attended_events")
          .delete()
          .eq("user_id", user.id)
          .eq("event_id", eventId);

        if (error) {
          return { error: error.message };
        }

        safeStartViewTransition(() => {
          setAttendedEventIds((prev) => prev.filter((id) => id !== eventId));
          setAttendedComments((prev) => {
            const next = { ...prev };
            delete next[eventId];
            return next;
          });
        });
      } else {
        const { error } = await supabase.from("attended_events").insert({
          user_id: user.id,
          event_id: eventId,
          comment: comment || null,
        });

        if (error) {
          return { error: error.message };
        }

        safeStartViewTransition(() => {
          setAttendedEventIds((prev) => [...prev, eventId]);
          if (comment) {
            setAttendedComments((prev) => ({ ...prev, [eventId]: comment }));
          }
        });
      }

      return { error: null };
    },
    [user, attendedEventIds],
  );

  const toggleFollow = useCallback(
    async (targetUserId: string) => {
      if (!user) {
        return { error: "ログインが必要です" };
      }

      const supabase = createSupabaseClient();
      const isFollowing = followingIds.includes(targetUserId);

      if (isFollowing) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", targetUserId);

        if (error) {
          return { error: error.message };
        }

        safeStartViewTransition(() => {
          setFollowingIds((prev) => prev.filter((id) => id !== targetUserId));
        });
      } else {
        const { error } = await supabase.from("follows").insert({
          follower_id: user.id,
          following_id: targetUserId,
        });

        if (error) {
          return { error: error.message };
        }

        safeStartViewTransition(() => {
          setFollowingIds((prev) => [...prev, targetUserId]);
        });
      }

      return { error: null };
    },
    [user, followingIds],
  );

  const signOut = useCallback(async () => {
    const supabase = createSupabaseClient();
    await supabase.auth.signOut();
    safeStartViewTransition(() => {
      setProfile(null);
      setSavedEventIds([]);
      setAttendedEventIds([]);
      setAttendedComments({});
      setFollowingIds([]);
      setFollowerIds([]);
    });
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      profileLoading,
      savedEventIds,
      attendedEventIds,
      attendedComments,
      followingIds,
      followerIds,
      refreshProfile,
      updateFavoriteGenres,
      updateProfileBio,
      toggleSaveEvent,
      toggleAttendEvent,
      toggleFollow,
      signOut,
    }),
    [
      user,
      profile,
      loading,
      profileLoading,
      savedEventIds,
      attendedEventIds,
      attendedComments,
      followingIds,
      followerIds,
      refreshProfile,
      updateFavoriteGenres,
      updateProfileBio,
      toggleSaveEvent,
      toggleAttendEvent,
      toggleFollow,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
