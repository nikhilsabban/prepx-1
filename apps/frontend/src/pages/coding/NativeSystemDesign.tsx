import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router";
import { PageHeader } from "@/components/design-system/page-header";
import { Cpu, Server, Database, Layers, ShieldCheck, Zap, ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";

export type DesignTopic = {
  slug: string;
  title: string;
  scale: string;
  description: string;
  keyComponents: string[];
  requirements?: string;
  architecture?: string[];
  tradeoffs?: string;
};

const DESIGN_TOPICS: DesignTopic[] = [
  {
    slug: "scalability",
    title: "System Scalability Fundamentals",
    scale: "Global Web Scale",
    description: "Vertical vs horizontal scaling, stateless microservices, load balancing (L4/L7), database read replicas, and sharding.",
    keyComponents: ["Load Balancers (L4/L7)", "Stateless App Tier", "Distributed Cache (Redis)", "Database Read Replicas", "Consistent Hashing"],
    requirements: "Design architectures that can seamlessly scale from 1,000 to 100,000,000 concurrent requests without single points of failure.",
    architecture: [
      "Clients resolve domains via Anycast DNS and connect through CDNs for static media caching.",
      "Dynamic traffic arrives at Layer 7 Load Balancers (ALBs) performing SSL termination and round-robin/least-connections balancing.",
      "Stateless Application Tier handles business logic; user session tokens are stored in distributed Redis clusters rather than local memory.",
      "Database tier leverages primary-replica replication for 10x read scaling and consistent hashing for horizontal write sharding.",
      "Asynchronous message brokers (Kafka/RabbitMQ) absorb traffic spikes and decouple time-intensive background processing.",
    ],
    tradeoffs: "Vertical scaling hits physical cost & RAM limits; horizontal scaling introduces network latency, distributed consensus (Raft/Paxos), and eventual consistency.",
  },
  {
    slug: "tinyurl",
    title: "URL Shortener (TinyURL)",
    scale: "100M Daily Active Users",
    description: "Hashing, Base62 encoding, collision resolution, cache tier (Redis), and database schema.",
    keyComponents: ["API Gateway", "Base62 Encoding", "Redis Cache", "Cassandra / MySQL Shards"],
    requirements: "Generate high-entropy 7-character short URLs, guarantee <10ms redirection latency, and handle 10:1 read/write ratio.",
    architecture: [
      "Client requests short URL creation via POST /api/v1/shorten with long URL.",
      "Distributed ID Generator (Snowflake) generates unique 64-bit integer, encoded into 7-character Base62 string (62^7 = 3.5 trillion URLs).",
      "Short-to-long URL mappings are persisted in NoSQL Key-Value store (DynamoDB or Cassandra) with partition key = short_url.",
      "Redirect requests (GET /{shortCode}) hit multi-region Redis caches with 80/20 Pareto caching, achieving sub-5ms 301/302 redirects.",
    ],
    tradeoffs: "301 Permanent Redirects minimize server traffic but disable analytics; 302 Temporary Redirects enable tracking at the cost of every click hitting your infrastructure.",
  },
  {
    slug: "rate-limiter",
    title: "Distributed Rate Limiter",
    scale: "Distributed Gateway",
    description: "Token Bucket, Leaky Bucket, Sliding Window Log, and Redis sliding counter implementation.",
    keyComponents: ["Token Bucket", "Redis Lua Scripts", "Race Condition Handling", "HTTP 429 Retry-After"],
    requirements: "Prevent DDoS attacks, API abuse, and resource starvation across distributed microservices with millisecond latency.",
    architecture: [
      "API Gateway intercepts incoming requests and extracts client identifier (IP address, User ID, or API Key).",
      "Gateway runs an atomic Redis Lua script executing the Sliding Window Counter algorithm to check consumption within the current window.",
      "If within limit, the counter increments and request passes downstream with X-RateLimit-Remaining headers.",
      "If exceeded, the gateway immediately terminates request with HTTP 429 Too Many Requests and a Retry-After timestamp.",
    ],
    tradeoffs: "Token bucket allows controlled traffic bursts; Sliding Window Log has high memory overhead; Sliding Window Counter provides optimal balance of precision and memory efficiency.",
  },
  {
    slug: "chat-app",
    title: "Real-Time Chat Application",
    scale: "50M Concurrent Connections",
    description: "WebSockets, pub/sub message brokers (Kafka/Redis), message ordering, and presence service.",
    keyComponents: ["WebSocket Gateway", "Kafka Pub/Sub", "HBase / Cassandra Chat Logs", "Presence Service"],
    requirements: "Deliver 1-on-1 and group messages with <100ms latency, persistent chat history, and real-time online/offline presence.",
    architecture: [
      "Clients maintain full-duplex WebSocket connections to dedicated WebSocket Gateway nodes.",
      "Presence Service tracks heartbeat pings in distributed Redis Key-Value store with TTLs.",
      "Outbound messages publish to Kafka message brokers partitioned by conversation_id to guarantee strict chronological message ordering.",
      "Chat messages are written concurrently to Cassandra/ScyllaDB (wide-column store optimized for sequential time-series reads).",
    ],
    tradeoffs: "WebSockets require persistent stateful server connections requiring sticky routing; HTTP polling wastes mobile battery and bandwidth.",
  },
  {
    slug: "distributed-cache",
    title: "Distributed Cache",
    scale: "Terabytes In-Memory",
    description: "Consistent hashing, virtual nodes, eviction policies (LRU/LFU), and write-through vs write-back.",
    keyComponents: ["Consistent Hashing", "Virtual Nodes", "LRU Eviction", "Replication & Failover"],
    requirements: "Provide microsecond in-memory key-value lookups with dynamic cluster resizing and high cache hit ratios.",
    architecture: [
      "Clients or proxies use a Consistent Hashing ring with 100-200 virtual nodes per physical server to distribute keys evenly.",
      "When a cache node joins or fails, only K/N keys are remapped rather than the entire keyspace.",
      "Nodes manage in-memory key eviction using Doubly Linked List + Hash Map (LRU) or Min-Heap (LFU).",
      "Data consistency strategies include Cache-Aside (lazy load), Write-Through (strong consistency), and Write-Back (maximum write throughput).",
    ],
    tradeoffs: "Cache-Aside is resilient to cache crashes but risks stale reads; Write-Through adds write latency; Write-Back risks data loss on node crashes.",
  },
  {
    slug: "video-streaming",
    title: "Video Streaming Platform (YouTube/Netflix)",
    scale: "Petabytes Daily Egress",
    description: "Chunked upload, video transcoding pipelines, CDN caching hierarchy, and adaptive bitrate streaming.",
    keyComponents: ["CDN Edge Nodes", "HLS/DASH Streaming", "Transcoding Workers", "Object Storage (S3)"],
    requirements: "Support seamless multi-resolution video playback (1080p, 4K) across varying network bandwidths worldwide.",
    architecture: [
      "Creators upload raw video files in multipart chunks to AWS S3 / Cloud Storage.",
      "Object upload triggers message events to a distributed Transcoding Task Queue (Kafka/SQS).",
      "Worker pools transcode source video into multiple resolutions (360p, 720p, 1080p, 4K) using HLS (HTTP Live Streaming) and MPEG-DASH chunks (typically 2-6 second segments).",
      "Video chunks and manifest files (.m3u8) are distributed to Points of Presence (PoPs) on global Edge CDNs for low-latency playback.",
    ],
    tradeoffs: "Pre-transcoding all resolutions costs compute and storage upfront; on-demand transcoding causes unacceptable initial video start delays.",
  },
  {
    slug: "notification-system",
    title: "Notification System",
    scale: "Billions of Daily Alerts",
    description: "Priority queues, rate limits per recipient, push notifications (APNs/FCM), email, and SMS gateways.",
    keyComponents: ["RabbitMQ / Kafka", "Rate Limiting", "APNs / FCM Workers", "Template Engine"],
    requirements: "Deliver transactional and promotional push notifications, SMS, and emails reliably at scale without duplicate delivery.",
    architecture: [
      "Internal microservices send notification requests to Notification Service via gRPC.",
      "Service validates user notification preferences and deduplicates requests using Redis idempotency keys.",
      "Requests are enqueued into prioritized message queues (Critical, Transactional, Marketing).",
      "Worker clusters consume queues and forward to third-party providers (Apple APNs, Google FCM, Twilio SMS, SendGrid Email).",
    ],
    tradeoffs: "At-least-once delivery semantics require client-side or provider-side idempotency keys to prevent duplicate notifications.",
  },
];

export function NativeSystemDesign({ initialSlug }: { initialSlug?: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  const userPrefixMatch = location.pathname.match(/^(\/[a-f0-9]{24})\/coding/);
  const basePrefix = userPrefixMatch ? `${userPrefixMatch[1]}/coding` : "/coding";

  // URL matching: /coding/system-design/:slug or /coding/dsa/scalability
  const designMatch = location.pathname.match(/\/(?:system-design|dsa)\/([^\/?#]+)/);
  const slugFromUrl = initialSlug || (designMatch ? designMatch[1] : null);
  const matchedTopic = slugFromUrl
    ? DESIGN_TOPICS.find((t) => t.slug === slugFromUrl.toLowerCase())
    : null;

  const [selectedTopic, setSelectedTopic] = useState<DesignTopic | null>(matchedTopic ?? null);

  useEffect(() => {
    if (matchedTopic) {
      setSelectedTopic(matchedTopic);
    } else if (!location.pathname.includes("/system-design/")) {
      setSelectedTopic(null);
    }
  }, [location.pathname, matchedTopic]);

  const handleSelect = (topic: DesignTopic) => {
    setSelectedTopic(topic);
    navigate(`${basePrefix}/system-design/${topic.slug}`);
  };

  const handleBackToAll = () => {
    setSelectedTopic(null);
    navigate(`${basePrefix}/system-design`);
  };

  if (selectedTopic) {
    return (
      <div className="space-y-6 p-6 lg:p-8 max-w-5xl mx-auto w-full">
        <button
          onClick={handleBackToAll}
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-all duration-150 active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="size-4" />
          Back to all System Design Blueprints
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
                {selectedTopic.scale}
              </span>
              <span className="text-xs text-zinc-500 font-medium">Interview Blueprint</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mt-2">{selectedTopic.title}</h1>
            <p className="text-sm text-zinc-400 mt-1 max-w-3xl leading-relaxed">{selectedTopic.description}</p>
          </div>
        </div>

        {/* Deep Dive Sections */}
        <div className="space-y-6">
          {/* Core Building Blocks */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-3">
              Essential System Components
            </h3>
            <div className="flex flex-wrap gap-2">
              {selectedTopic.keyComponents.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-medium text-zinc-200"
                >
                  <Layers className="size-3.5 text-indigo-400" />
                  <span>{c}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Architectural Walkthrough */}
          {selectedTopic.architecture && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                End-to-End Architectural Flow
              </h3>
              <div className="space-y-2.5 mt-2">
                {selectedTopic.architecture.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-zinc-950/40 border border-zinc-800/80">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-[11px] font-mono text-indigo-400 border border-indigo-500/20">
                      {idx + 1}
                    </span>
                    <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trade-offs & Deep Engineering Considerations */}
          {selectedTopic.tradeoffs && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-300 uppercase tracking-wider mb-2">
                <Zap className="size-4" />
                <span>Trade-offs & Edge Cases</span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">{selectedTopic.tradeoffs}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 lg:p-8 max-w-6xl mx-auto w-full">
      <PageHeader
        title="System Design Architecture"
        description="High-level and low-level system design patterns for engineering interviews."
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-6">
        {DESIGN_TOPICS.map((t, idx) => (
          <div
            key={t.slug}
            onClick={() => handleSelect(t)}
            className="group cursor-pointer rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 flex flex-col justify-between hover:border-indigo-500/50 hover:bg-zinc-900/90 transition-all duration-150 active:scale-[0.98]"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
                  {t.scale}
                </span>
                <span className="text-zinc-600 font-mono text-xs">#{idx + 1}</span>
              </div>
              <h3 className="text-base font-semibold text-zinc-100 mt-2 group-hover:text-indigo-300 transition-colors">
                {t.title}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed mt-1.5">{t.description}</p>

              <div className="mt-4 pt-3 border-t border-zinc-800/60">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 block mb-2">
                  Key Building Blocks
                </span>
                <div className="flex flex-wrap gap-1">
                  {t.keyComponents.map((c, cIdx) => (
                    <span
                      key={cIdx}
                      className="text-[11px] bg-zinc-950 border border-zinc-800 text-zinc-300 px-2 py-0.5 rounded"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-zinc-800/40 flex items-center justify-between text-xs text-zinc-400">
              <span className="text-emerald-400 font-medium">Standard Blueprint</span>
              <span className="text-indigo-400 group-hover:text-indigo-300 font-medium inline-flex items-center gap-1">
                Explore Blueprint <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
