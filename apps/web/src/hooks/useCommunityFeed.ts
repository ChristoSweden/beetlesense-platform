import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { isDemo } from '@/lib/demoData';

// ─── Types ───

export type PostType = 'alert' | 'tip' | 'request' | 'offer' | 'discussion';
export type SortMode = 'newest' | 'most_discussed' | 'nearby';

export interface CommunityComment {
  id: string;
  author_label: string;
  content: string;
  created_at: string;
  helpful_count: number;
}

export interface CommunityPost {
  id: string;
  type: PostType;
  content: string;
  author_label: string;
  is_anonymous: boolean;
  municipality: string;
  county: string;
  created_at: string;
  helpful_count: number;
  comment_count: number;
  comments: CommunityComment[];
  image_url?: string | null;
}

export interface NewPostPayload {
  type: PostType;
  content: string;
  municipality?: string;
  county: string;
  is_anonymous: boolean;
  image_url?: string | null;
}

// ─── Demo data ───

const DEMO_COMMENTS: Record<string, CommunityComment[]> = {
  'demo-post-1': [
    {
      id: 'dc-1a',
      author_label: 'Skogsagare i Kronoberg',
      content: 'Yes, I spotted bore dust on several spruces near Hovmantorp last week. Reported to Skogsstyrelsen already.',
      created_at: '2026-03-15T11:30:00Z',
      helpful_count: 4,
    },
    {
      id: 'dc-1b',
      author_label: 'Skogsagare i Kronoberg',
      content: 'Same here, south side of Lessebo. Set up pheromone traps two days ago.',
      created_at: '2026-03-15T14:20:00Z',
      helpful_count: 2,
    },
  ],
  'demo-post-2': [
    {
      id: 'dc-2a',
      author_label: 'Skogsagare i Kronoberg',
      content: 'Can you share their name here? Or is it against rules?',
      created_at: '2026-03-14T16:00:00Z',
      helpful_count: 1,
    },
  ],
  'demo-post-5': [
    {
      id: 'dc-5a',
      author_label: 'Skogsagare i Kronoberg',
      content: 'Welcome! The most important thing is timing. Best to thin when the trees are around 30-40 years old for spruce. Also make sure the soil is frozen or dry to avoid root damage.',
      created_at: '2026-03-12T10:00:00Z',
      helpful_count: 7,
    },
    {
      id: 'dc-5b',
      author_label: 'Skogsagare i Smaland',
      content: 'Get a forest management plan from Skogsstyrelsen or Sodra first. It is free for new owners and gives you a complete overview of what to do.',
      created_at: '2026-03-12T12:45:00Z',
      helpful_count: 5,
    },
    {
      id: 'dc-5c',
      author_label: 'Skogsagare i Kronoberg',
      content: 'Join Sodra or Norra Skog if you haven not already. Good courses for beginners and you get better prices when selling timber.',
      created_at: '2026-03-12T15:10:00Z',
      helpful_count: 3,
    },
  ],
};

const DEMO_POSTS: CommunityPost[] = [
  {
    id: 'demo-post-1',
    type: 'alert',
    content: 'Beetle damage spotted near Lessebo \u2014 anyone else seeing this? Found bore dust on 4-5 spruce trunks along the south-facing slope. Looks like Ips typographus based on the gallery patterns.',
    author_label: 'Skogsagare i Kronoberg',
    is_anonymous: true,
    municipality: 'Lessebo',
    county: 'Kronoberg',
    created_at: '2026-03-15T08:24:00Z',
    helpful_count: 12,
    comment_count: 2,
    comments: DEMO_COMMENTS['demo-post-1'] ?? [],
  },
  {
    id: 'demo-post-2',
    type: 'tip',
    content: 'Found a great logging contractor in Kronoberg \u2014 DM me for details. They did gallring on my 15ha plot in just 3 days, very careful with the remaining stand and fair pricing.',
    author_label: 'Skogsagare i Kronoberg',
    is_anonymous: true,
    municipality: 'Vaxjo',
    county: 'Kronoberg',
    created_at: '2026-03-14T14:05:00Z',
    helpful_count: 8,
    comment_count: 1,
    comments: DEMO_COMMENTS['demo-post-2'] ?? [],
  },
  {
    id: 'demo-post-3',
    type: 'request',
    content: 'Looking for planting crew, 20ha in April. Any recommendations? Area is near Alvesta, mostly cleared spruce land that needs replanting with a mix of spruce and birch.',
    author_label: 'Skogsagare i Kronoberg',
    is_anonymous: true,
    municipality: 'Alvesta',
    county: 'Kronoberg',
    created_at: '2026-03-13T09:30:00Z',
    helpful_count: 5,
    comment_count: 0,
    comments: [],
  },
  {
    id: 'demo-post-4',
    type: 'offer',
    content: 'Helicopter spraying group buy \u2014 5 landowners needed for Alvesta area. I have been in contact with a certified operator. If we pool 50+ hectares, per-hectare cost drops by 40%. Treatment window is mid-May.',
    author_label: 'Skogsagare i Kronoberg',
    is_anonymous: true,
    municipality: 'Alvesta',
    county: 'Kronoberg',
    created_at: '2026-03-12T17:45:00Z',
    helpful_count: 15,
    comment_count: 0,
    comments: [],
  },
  {
    id: 'demo-post-5',
    type: 'discussion',
    content: 'First-time owner here \u2014 what should I know about gallring? Just inherited 35ha of mixed forest outside Vaxjo. Most of the spruce seems to be 35-40 years old. When is the right time, and what should I watch out for?',
    author_label: 'Skogsagare i Kronoberg',
    is_anonymous: true,
    municipality: 'Vaxjo',
    county: 'Kronoberg',
    created_at: '2026-03-12T07:15:00Z',
    helpful_count: 22,
    comment_count: 3,
    comments: DEMO_COMMENTS['demo-post-5'] ?? [],
  },
  {
    id: 'demo-post-6',
    type: 'alert',
    content: 'Storm damage on road to Urshult \u2014 several trees down across the forest road after last night is wind. If you have parcels in the area, check for windthrow. I have reported to Trafikverket.',
    author_label: 'Skogsagare i Kronoberg',
    is_anonymous: true,
    municipality: 'Tingsryd',
    county: 'Kronoberg',
    created_at: '2026-03-11T06:00:00Z',
    helpful_count: 9,
    comment_count: 0,
    comments: [],
  },
  {
    id: 'demo-post-7',
    type: 'tip',
    content: 'Sodra just raised the pulpwood price by 15 SEK/m3sk effective April 1. If you have thinning planned this spring, might be worth waiting a couple of weeks for the new price list.',
    author_label: 'Skogsagare i Smaland',
    is_anonymous: true,
    municipality: 'Ljungby',
    county: 'Kronoberg',
    created_at: '2026-03-10T12:00:00Z',
    helpful_count: 18,
    comment_count: 0,
    comments: [],
  },
  {
    id: 'demo-post-8',
    type: 'request',
    content: 'Anyone have experience with continuous cover forestry (hyggesfritt)? Thinking about transitioning a 10ha plot near Markaryd. Looking for advice or someone who has done it in Smaland.',
    author_label: 'Skogsagare i Kronoberg',
    is_anonymous: true,
    municipality: 'Markaryd',
    county: 'Kronoberg',
    created_at: '2026-03-09T15:30:00Z',
    helpful_count: 11,
    comment_count: 0,
    comments: [],
  },
  {
    id: 'demo-post-9',
    type: 'offer',
    content: 'Free firewood \u2014 freshly felled birch and some spruce tops. About 10 cubic meters. Pick up in Almhult area. First come, first served. Will be available this weekend.',
    author_label: 'Skogsagare i Kronoberg',
    is_anonymous: false,
    municipality: 'Almhult',
    county: 'Kronoberg',
    created_at: '2026-03-08T11:20:00Z',
    helpful_count: 6,
    comment_count: 0,
    comments: [],
  },
  {
    id: 'demo-post-10',
    type: 'discussion',
    content: 'How are you all preparing for bark beetle season this year? Last year was brutal in our area. I am planning to set pheromone traps in April and do a thorough walkthrough of all spruce-heavy parcels. Any other tips?',
    author_label: 'Skogsagare i Kronoberg',
    is_anonymous: true,
    municipality: 'Vaxjo',
    county: 'Kronoberg',
    created_at: '2026-03-07T09:00:00Z',
    helpful_count: 25,
    comment_count: 0,
    comments: [],
  },
];

// ─── Swedish counties (Lan) ───

export const SWEDISH_COUNTIES = [
  'Blekinge',
  'Dalarna',
  'Gavleborg',
  'Gotland',
  'Halland',
  'Jamtland',
  'Jonkoping',
  'Kalmar',
  'Kronoberg',
  'Norrbotten',
  'Orebro',
  'Ostergotland',
  'Skane',
  'Sodermanland',
  'Stockholm',
  'Uppsala',
  'Varmland',
  'Vasterbotten',
  'Vasternorrland',
  'Vastmanland',
  'Vastra Gotaland',
] as const;

export type SwedishCounty = (typeof SWEDISH_COUNTIES)[number];

// ─── Hook ───

interface UseCommunityFeedOptions {
  county?: string;
  typeFilter?: PostType | null;
  sortMode?: SortMode;
}

interface UseCommunityFeedReturn {
  posts: CommunityPost[];
  isLoading: boolean;
  error: string | null;
  toggleHelpful: (postId: string) => void;
  addComment: (postId: string, content: string) => void;
  createPost: (payload: NewPostPayload) => void;
  helpfulSet: Set<string>;
}

export function useCommunityFeed(options: UseCommunityFeedOptions = {}): UseCommunityFeedReturn {
  const { county = 'Kronoberg', typeFilter = null, sortMode = 'newest' } = options;

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [helpfulSet, setHelpfulSet] = useState<Set<string>>(new Set());
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Load posts
  useEffect(() => {
    setIsLoading(true);
    setError(null);

    if (isDemo() || !isSupabaseConfigured) {
      // Demo mode
      let filtered = [...DEMO_POSTS];
      if (county) {
        filtered = filtered.filter((p) => p.county === county);
      }
      if (typeFilter) {
        filtered = filtered.filter((p) => p.type === typeFilter);
      }

      switch (sortMode) {
        case 'most_discussed':
          filtered.sort((a, b) => b.comment_count - a.comment_count);
          break;
        case 'nearby':
          // In demo mode, just shuffle slightly
          filtered.sort((a, b) => a.municipality.localeCompare(b.municipality));
          break;
        case 'newest':
        default:
          filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          break;
      }

      // Simulate loading delay
      const timer = setTimeout(() => {
        setPosts(filtered);
        setIsLoading(false);
      }, 300);
      return () => clearTimeout(timer);
    }

    // Supabase mode
    async function fetchPosts() {
      try {
        let query = supabase
          .from('community_posts')
          .select('*')
          .eq('county', county);

        if (typeFilter) {
          query = query.eq('type', typeFilter);
        }

        switch (sortMode) {
          case 'most_discussed':
            query = query.order('comment_count', { ascending: false });
            break;
          case 'newest':
          default:
            query = query.order('created_at', { ascending: false });
            break;
        }

        const { data, error: fetchError } = await query.limit(50);

        if (fetchError) {
          setError(fetchError.message);
          setPosts([]);
        } else {
          setPosts((data as CommunityPost[]) ?? []);
        }
      } catch (err: any) {
        setError(err.message ?? 'Failed to load community feed');
      } finally {
        setIsLoading(false);
      }
    }

    fetchPosts();

    // Real-time subscription
    if (isSupabaseConfigured) {
      const channel = supabase
        .channel('community_posts_realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'community_posts',
            filter: `county=eq.${county}`,
          },
          (payload) => {
            const newPost = payload.new as CommunityPost;
            if (!typeFilter || newPost.type === typeFilter) {
              setPosts((prev) => [{ ...newPost, comments: [] }, ...prev]);
            }
          },
        )
        .subscribe();

      subscriptionRef.current = channel;
    }

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [county, typeFilter, sortMode]);

  const toggleHelpful = useCallback(
    (postId: string) => {
      setHelpfulSet((prev) => {
        const next = new Set(prev);
        if (next.has(postId)) {
          next.delete(postId);
        } else {
          next.add(postId);
        }
        return next;
      });

      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p;
          const isCurrentlyHelpful = helpfulSet.has(postId);
          return {
            ...p,
            helpful_count: isCurrentlyHelpful ? p.helpful_count - 1 : p.helpful_count + 1,
          };
        }),
      );

      // In production, persist to Supabase
      if (isSupabaseConfigured && !isDemo()) {
        supabase.rpc('toggle_community_helpful', { post_id: postId }).then(({ error: rpcError }) => {
          if (rpcError) console.error('Failed to toggle helpful:', rpcError.message);
        });
      }
    },
    [helpfulSet],
  );

  const addComment = useCallback(
    (postId: string, content: string) => {
      const newComment: CommunityComment = {
        id: `local-${Date.now()}`,
        author_label: 'You',
        content,
        created_at: new Date().toISOString(),
        helpful_count: 0,
      };

      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p;
          return {
            ...p,
            comment_count: p.comment_count + 1,
            comments: [...p.comments, newComment],
          };
        }),
      );

      if (isSupabaseConfigured && !isDemo()) {
        supabase
          .from('community_comments')
          .insert({ post_id: postId, content })
          .then(({ error: insertError }) => {
            if (insertError) console.error('Failed to add comment:', insertError.message);
          });
      }
    },
    [],
  );

  const createPost = useCallback(
    (payload: NewPostPayload) => {
      const newPost: CommunityPost = {
        id: `local-${Date.now()}`,
        type: payload.type,
        content: payload.content,
        author_label: payload.is_anonymous
          ? `Forest owner in ${payload.county}`
          : 'You',
        is_anonymous: payload.is_anonymous,
        municipality: payload.municipality ?? '',
        county: payload.county,
        created_at: new Date().toISOString(),
        helpful_count: 0,
        comment_count: 0,
        comments: [],
        image_url: payload.image_url ?? null,
      };

      setPosts((prev) => [newPost, ...prev]);

      if (isSupabaseConfigured && !isDemo()) {
        supabase
          .from('community_posts')
          .insert(payload)
          .then(({ error: insertError }) => {
            if (insertError) console.error('Failed to create post:', insertError.message);
          });
      }
    },
    [],
  );

  return { posts, isLoading, error, toggleHelpful, addComment, createPost, helpfulSet };
}
