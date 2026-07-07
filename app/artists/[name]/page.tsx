"use client";

import { use, useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ChevronLeft, ExternalLink, Heart, X, Music, Calendar } from "lucide-react";

type SpotifyData = {
  artist: { id: string; name: string; image: string; spotify_url: string; genres: string[] };
  tracks: { id: string; name: string; spotify_url: string }[];
};

// Tinder風のカードコンポーネント
function SwipeCard({ event, onSwipe, active }: { event: any; onSwipe: (dir: 'left' | 'right', eventId: string) => void; active: boolean }) {
  const x = useMotionValue(0);
  // スワイプ量に応じて少し回転させる（Tinder風）
  const rotate = useTransform(x, [-200, 200], [-10, 10]);
  
  const handleDragEnd = (eventInfo: any, info: any) => {
    // 100px以上スワイプしたら発火
    if (info.offset.x > 100) {
      onSwipe('right', event.id);
    } else if (info.offset.x < -100) {
      onSwipe('left', event.id);
    }
  };

  return (
    <motion.div
      style={{ x, rotate }}
      drag={active ? "x" : false}
      dragConstraints={{ left: -1000, right: 1000 }}
      dragElastic={1}
      onDragEnd={handleDragEnd}
      className={`absolute w-full h-[400px] bg-[#12081d] border border-white/5 rounded-3xl p-6 shadow-2xl flex flex-col justify-between cursor-grab active:cursor-grabbing ${!active && 'pointer-events-none'}`}
      initial={{ scale: 0.95, opacity: 0, y: 20 }}
      animate={{ scale: active ? 1 : 0.95, opacity: active ? 1 : 0.6, y: active ? 0 : 20, zIndex: active ? 10 : 0 }}
      exit={{ x: x.get() > 0 ? 300 : -300, opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* 行く / パス のオーバーレイ表示（ドラッグ中のみ表示） */}
      <motion.div 
        style={{ opacity: useTransform(x, [50, 100], [0, 1]) }}
        className="absolute top-8 right-8 border-4 border-green-500 text-green-500 font-black text-2xl px-3 py-1 rounded-lg rotate-12 pointer-events-none"
      >
        興味あり
      </motion.div>
      <motion.div 
        style={{ opacity: useTransform(x, [-50, -100], [0, 1]) }}
        className="absolute top-8 left-8 border-4 border-zinc-500 text-zinc-500 font-black text-2xl px-3 py-1 rounded-lg -rotate-12 pointer-events-none"
      >
        興味なし
      </motion.div>

      <div>
        <div className="flex justify-between items-start mb-4">
          <span className="text-sm font-bold px-3 py-1 bg-white/10 rounded-full text-white/80">
            {new Date(event.event_date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' })}
          </span>
          <span className="text-xs font-bold px-3 py-1 bg-[#FF5200]/20 text-[#FF5200] rounded-full ring-1 ring-[#FF5200]/30">
            {event.genre}
          </span>
        </div>
        <h3 className="text-2xl font-bold text-white mb-2 leading-tight line-clamp-2">{event.event_title}</h3>
        <p className="text-[#FF5200] font-medium mb-4 flex items-center gap-2">
          <Calendar size={16} />
          {event.venue_name}
        </p>
        <p className="text-xs text-white/40 mb-1">出演</p>
        <p className="text-sm text-white/70 line-clamp-3 leading-relaxed">{event.artist_name}</p>
      </div>

      <div className="flex justify-center gap-6 mt-4">
        <button 
          onClick={() => onSwipe('left', event.id)} 
          className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-colors"
        >
          <X size={28} />
        </button>
        <button 
          onClick={() => onSwipe('right', event.id)} 
          className="w-16 h-16 rounded-full bg-[#FF5200]/10 flex items-center justify-center text-[#FF5200] hover:bg-[#FF5200]/20 hover:scale-110 transition-all shadow-[0_0_20px_rgba(255,82,0,0.2)]"
        >
          <Heart size={28} />
        </button>
      </div>
    </motion.div>
  );
}

export default function ArtistPage({ params }: { params: Promise<{ name: string }> }) {
  const { name: encodedName } = use(params);
  const artistName = decodeURIComponent(encodedName);
  const { toggleSaveEvent } = useAuth();
  
  const [spotifyData, setSpotifyData] = useState<SpotifyData | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      // 1. Spotify データの取得
      try {
        const res = await fetch(`/api/spotify/top-tracks?artist=${encodeURIComponent(artistName)}`);
        if (res.ok) {
          const data = await res.json();
          setSpotifyData(data);
        }
      } catch (err) {
        console.error("Failed to load Spotify data:", err);
      }

      // 2. このアーティストが出演するライブ一覧をSupabaseから取得
      const supabase = createSupabaseClient();
      const { data: dbEvents } = await supabase
        .from('events')
        .select('*')
        .ilike('artist_name', `%${artistName}%`)
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true })
        .limit(10);
        
      if (dbEvents) setEvents(dbEvents);
      setLoading(false);
    }
    loadData();
  }, [artistName]);

  const handleSwipe = async (dir: 'left' | 'right', eventId: string) => {
    if (dir === 'right') {
      // 保存する
      await toggleSaveEvent(eventId); // スワイプで保存
    }
    // スワイプされたカードを配列から消す
    setEvents(prev => prev.filter(e => e.id !== eventId));
  };

  if (loading) {
    return <div className="min-h-screen bg-[#08040d] flex items-center justify-center text-[#FF5200]">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-[#08040d] pb-24 text-white">
      {/* 戻るボタン */}
      <div className="fixed top-0 left-0 right-0 z-50 p-4 bg-gradient-to-b from-[#08040d] to-transparent">
        <button onClick={() => window.history.back()} className="w-10 h-10 bg-white/5 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-colors">
          <ChevronLeft size={24} />
        </button>
      </div>

      {/* アーティストヘッダー */}
      <div className="relative pt-24 pb-8 px-4 flex flex-col items-center border-b border-white/5 bg-[#12081d]/50">
        {spotifyData?.artist?.image ? (
          <img src={spotifyData.artist.image} alt={artistName} className="w-32 h-32 rounded-full object-cover mb-4 border-2 border-[#FF5200]/30 shadow-[0_0_30px_rgba(255,82,0,0.15)]" />
        ) : (
          <div className="w-32 h-32 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10 text-white/30">
            <Music size={40} />
          </div>
        )}
        <h1 className="text-3xl font-black mb-2 text-center">{spotifyData?.artist?.name || artistName}</h1>
        {spotifyData?.artist?.genres && spotifyData.artist.genres.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-4 max-w-sm">
            {spotifyData.artist.genres.slice(0, 3).map(g => (
              <span key={g} className="text-[10px] uppercase tracking-wider px-2 py-1 bg-white/5 rounded text-white/50">{g}</span>
            ))}
          </div>
        )}
        {spotifyData?.artist?.spotify_url && (
          <a href={spotifyData.artist.spotify_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-bold text-green-400 hover:text-green-300 transition-colors bg-green-400/10 px-4 py-2 rounded-full">
            <ExternalLink size={14} /> Open in Spotify
          </a>
        )}
      </div>

      <div className="max-w-md mx-auto px-4 py-8">
        
        {/* Tinder風 ライブ検索機能 */}
        {events.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-bold mb-6 flex items-center justify-between">
              Upcoming Live
              <span className="text-xs font-normal text-[#FF5200] bg-[#FF5200]/10 px-2 py-1 rounded-full">{events.length} Shows</span>
            </h2>
            <div className="relative h-[400px] w-full flex items-center justify-center">
              <AnimatePresence>
                {[...events].reverse().map((event, index) => (
                  <SwipeCard 
                    key={event.id} 
                    event={event} 
                    onSwipe={handleSwipe} 
                    active={index === events.length - 1} // 一番上のカードだけアクティブ
                  />
                ))}
              </AnimatePresence>
            </div>
            <p className="text-center text-xs text-white/30 mt-4">右スワイプで「興味あり」・左スワイプで「興味なし」</p>
          </div>
        )}

        {events.length === 0 && (
          <div className="mb-12 text-center p-8 bg-white/5 rounded-2xl border border-white/5">
            <Calendar size={32} className="mx-auto text-white/20 mb-3" />
            <p className="text-white/50 text-sm">現在予定されているライブはありません。</p>
          </div>
        )}

        {/* Top Tracks セクション */}
        {spotifyData?.artist && (
          <div>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Music className="text-[#FF5200]" size={20} />
              Top Tracks
            </h2>
            <div className="flex flex-col gap-3">
              {spotifyData.tracks?.length > 0 ? (
                spotifyData.tracks.map((track: any) => (
                  <div key={track.id} className="w-full h-[80px] rounded-xl overflow-hidden bg-black border border-white/5">
                    <iframe
                      src={`https://open.spotify.com/embed/track/${track.id}?utm_source=generator&theme=0`}
                      width="100%"
                      height="80"
                      frameBorder="0"
                      allowFullScreen={false}
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                    ></iframe>
                  </div>
                ))
              ) : (
                <div className="w-full rounded-xl overflow-hidden">
                  <iframe
                    src={`https://open.spotify.com/embed/artist/${spotifyData.artist.id}?utm_source=generator&theme=0`}
                    width="100%"
                    height="352"
                    frameBorder="0"
                    allowFullScreen={false}
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                  ></iframe>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
