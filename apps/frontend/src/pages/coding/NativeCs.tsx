import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router";
import { PageHeader } from "@/components/design-system/page-header";
import {
  BookOpen,
  Cpu,
  Database,
  Network,
  Server,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  Lightbulb,
  CheckCircle2,
  Tag as TagIcon,
  Search,
} from "lucide-react";

type CsQuestion = {
  topic: string;
  question: string;
  answer: string;
  tips: string;
  tags: string[];
};

type CsModule = {
  slug: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  topics: string[];
  questions: CsQuestion[];
};

const CS_MODULES: CsModule[] = [
  {
    slug: "os",
    title: "Operating Systems",
    icon: Cpu,
    description: "Processes, threads, synchronization, deadlocks, memory management, and virtual memory.",
    topics: [
      "Process vs Thread",
      "Mutex & Semaphores",
      "Deadlock Conditions",
      "Paging & Virtual Memory",
      "Context Switching",
      "CPU Scheduling",
    ],
    questions: [
      {
        topic: "Process vs Thread",
        question: "What is the key difference between a process and a thread?",
        answer:
          "A process is an executing program instance with its own private address space, heap, file descriptors, and OS resources. A thread is the smallest schedulable unit of execution within a process; multiple threads share the parent process's address space, code, and global heap while maintaining private stacks and program counters. Creating or context-switching threads is significantly faster than processes.",
        tips: "Highlight memory isolation (threads share memory, processes are isolated) and communication cost (IPC vs shared variables).",
        tags: ["processes", "threading", "concurrency"],
      },
      {
        topic: "Mutex & Semaphores",
        question: "What is the difference between a Mutex and a Counting Semaphore?",
        answer:
          "A Mutex (Mutual Exclusion Object) is a locking mechanism with ownership: only the thread that acquired the lock may release it. A Semaphore is a signaling mechanism with an integer counter (n available resources); any thread can post (increment) or wait (decrement) on a semaphore. A binary semaphore is like a mutex without ownership semantics.",
        tips: "Mention priority inversion risk with mutexes and how priority inheritance protocols solve it.",
        tags: ["synchronization", "locks"],
      },
      {
        topic: "Deadlock Conditions",
        question: "What are the four Coffman conditions required for a deadlock to occur?",
        answer:
          "1. Mutual Exclusion: At least one resource must be held in a non-shareable mode.\n2. Hold and Wait: A process holding at least one resource is waiting to acquire additional resources held by others.\n3. No Preemption: Resources cannot be forcibly taken from a process until it completes its task.\n4. Circular Wait: A closed chain of processes exists where each process holds resources needed by the next.",
        tips: "To prevent deadlocks, enforce strict global resource ordering to break the Circular Wait condition.",
        tags: ["deadlocks", "concurrency"],
      },
      {
        topic: "Paging & Virtual Memory",
        question: "How does Virtual Memory work and what causes a Page Fault?",
        answer:
          "Virtual memory gives each process the illusion of a contiguous, private address space. The CPU's Memory Management Unit (MMU) translates virtual addresses into physical frames using page tables and the Translation Lookaside Buffer (TLB). A Page Fault occurs when a program accesses a virtual page marked 'not present' in physical RAM. The OS trap handler fetches the page from disk into a physical frame.",
        tips: "Explain page replacement algorithms (LRU, FIFO, Clock) and the concept of Thrashing.",
        tags: ["virtual-memory", "paging"],
      },
      {
        topic: "Context Switching",
        question: "What happens under the hood during a CPU context switch?",
        answer:
          "The CPU saves the running thread's register state (program counter, stack pointer, general-purpose registers) into its Thread Control Block (TCB). The scheduler selects the next ready thread. If switching between different processes, the CPU also flushes the TLB and updates the page table register (CR3 on x86) to swap address spaces, restoring the new process's state before executing.",
        tips: "Explain why process switches are far more expensive than thread switches (TLB invalidation penalty).",
        tags: ["kernel", "cpu"],
      },
      {
        topic: "CPU Scheduling",
        question: "Compare Preemptive vs Non-Preemptive CPU Scheduling algorithms.",
        answer:
          "In non-preemptive scheduling (e.g., FCFS, Shortest Job First non-preemptive), once a process receives the CPU, it holds it until termination or I/O. In preemptive scheduling (e.g., Round Robin, Shortest Remaining Time First, Multi-Level Feedback Queue), the OS can interrupt a running process when its time quantum expires or a higher-priority task arrives.",
        tips: "Round Robin balances responsiveness for interactive systems; MLFQ adapts to CPU-bound vs I/O-bound tasks.",
        tags: ["scheduling", "algorithms"],
      },
    ],
  },
  {
    slug: "dbms",
    title: "Database Management Systems",
    icon: Database,
    description: "Relational models, SQL, indexing (B-Trees), normalization, transactions, and ACID properties.",
    topics: [
      "ACID Properties",
      "B-Tree vs B+ Tree",
      "Database Normalization",
      "Isolation Levels",
      "SQL Joins vs Subqueries",
      "Sharding & Replication",
    ],
    questions: [
      {
        topic: "ACID Properties",
        question: "Explain the four ACID properties in database transactions.",
        answer:
          "• Atomicity: 'All or nothing' — transactions execute completely or roll back entirely (WAL / undo logs).\n• Consistency: Database transitions from one valid state to another, enforcing schemas and constraints.\n• Isolation: Concurrent transactions do not interfere with one another (managed via locking or MVCC).\n• Durability: Once committed, state changes survive server crashes or power failures (flushed to non-volatile disk).",
        tips: "Highlight Write-Ahead Logging (WAL) and Multi-Version Concurrency Control (MVCC).",
        tags: ["acid", "transactions"],
      },
      {
        topic: "B-Tree vs B+ Tree",
        question: "Why do relational database indexes use B+ Trees instead of standard B-Trees?",
        answer:
          "In a standard B-Tree, keys and record pointers are stored in both internal and leaf nodes. In a B+ Tree, internal nodes only store navigation keys, allowing higher fanout and shallower trees (fewer disk I/O operations). Crucially, all leaf nodes in a B+ Tree are linked sequentially in a doubly-linked list, enabling fast O(log N + K) range scans.",
        tips: "Mention disk page size alignment and cache locality for range queries.",
        tags: ["indexing", "b-tree"],
      },
      {
        topic: "Database Normalization",
        question: "What is Database Normalization and explain 1NF, 2NF, 3NF, and BCNF?",
        answer:
          "Normalization structures tables to eliminate data redundancy and prevent insertion/update/deletion anomalies.\n• 1NF: Atomic values only (no repeating groups/arrays).\n• 2NF: In 1NF and no partial dependencies on composite primary keys.\n• 3NF: In 2NF and no transitive functional dependencies.\n• BCNF: Stricter 3NF where every determinant is a candidate key.",
        tips: "Discuss the trade-off: OLTP systems normalize to avoid anomalies; OLAP/data warehouses denormalize for read speed.",
        tags: ["normalization", "schema-design"],
      },
      {
        topic: "Isolation Levels",
        question: "Compare the standard SQL Isolation Levels and the read phenomena they prevent.",
        answer:
          "1. Read Uncommitted: Allows Dirty Reads (reading uncommitted data).\n2. Read Committed: Prevents Dirty Reads; allows Non-Repeatable Reads (row values change mid-transaction).\n3. Repeatable Read: Prevents Non-Repeatable Reads; may allow Phantom Reads (new rows inserted matching range).\n4. Serializable: Full serial execution guarantee; prevents all anomalies via strict locking or serializable snapshot isolation.",
        tips: "Explain how PostgreSQL uses MVCC (snapshots) vs MySQL InnoDB's Next-Key Locking.",
        tags: ["concurrency", "isolation"],
      },
      {
        topic: "SQL Joins vs Subqueries",
        question: "When should you use JOINs vs Correlated Subqueries?",
        answer:
          "JOINs (INNER, LEFT, RIGHT, FULL) allow relational query optimizers to apply efficient merge-joins or hash-joins across datasets in bulk. Correlated subqueries reference outer row columns and execute repeatedly for every candidate row (O(N*M) worst case) unless converted to a join by the query planner. For large datasets, indexed JOINs consistently outperform subqueries.",
        tips: "Show understanding of EXPLAIN ANALYZE and query optimizer execution plans.",
        tags: ["sql", "performance"],
      },
      {
        topic: "Sharding & Replication",
        question: "What is the difference between Database Replication and Horizontal Sharding?",
        answer:
          "Replication copies the complete dataset across multiple nodes (primary-replica) to scale read throughput and ensure high availability / failover. Sharding partitions the dataset horizontally across independent database servers based on a shard key (hash or range), scaling write throughput and storage capacity beyond the limits of a single machine.",
        tips: "Mention split-brain issues in replication and cross-shard join penalties in sharded setups.",
        tags: ["scaling", "distributed-systems"],
      },
    ],
  },
  {
    slug: "networks",
    title: "Computer Networks",
    icon: Network,
    description: "OSI and TCP/IP stack, routing, sockets, DNS, HTTP/1.1 vs HTTP/2 vs HTTP/3, and WebSockets.",
    topics: [
      "TCP 3-Way Handshake",
      "TCP vs UDP",
      "DNS Resolution Flow",
      "HTTP/1.1 vs HTTP/2 vs HTTP/3",
      "REST vs gRPC",
      "WebSockets vs Long Polling",
    ],
    questions: [
      {
        topic: "TCP 3-Way Handshake",
        question: "Explain the TCP 3-Way Handshake and 4-Way Teardown process.",
        answer:
          "Handshake:\n1. Client sends SYN (seq=x) to initiate connection.\n2. Server responds with SYN-ACK (seq=y, ack=x+1).\n3. Client replies with ACK (seq=x+1, ack=y+1). Connection is established.\n\nTeardown:\n1. Active closer sends FIN.\n2. Passive closer sends ACK.\n3. Passive closer finishes sending remaining data and sends its own FIN.\n4. Active closer replies with ACK and enters TIME_WAIT (2x Maximum Segment Lifetime).",
        tips: "Emphasize why TIME_WAIT is essential: to ensure the final ACK arrives and prevent old packets from contaminating new connections.",
        tags: ["tcp", "networking"],
      },
      {
        topic: "TCP vs UDP",
        question: "What are the core technical trade-offs between TCP and UDP?",
        answer:
          "TCP is connection-oriented, reliable, and provides in-order packet delivery, flow control (sliding window), and congestion control (slow start, AIMD) with connection overhead. UDP is connectionless, lightweight, and unordered without retransmissions or handshakes, minimizing latency for live media, DNS queries, and real-time multiplayer gaming.",
        tips: "Note that modern protocols like QUIC build reliability and multiplexing on top of UDP in userspace.",
        tags: ["protocols", "transport-layer"],
      },
      {
        topic: "DNS Resolution Flow",
        question: "Step through the recursive and iterative DNS resolution flow.",
        answer:
          "1. Browser checks local cache → OS hosts file & cache → Local Recursive Resolver (ISP or 8.8.8.8).\n2. If not cached, Resolver queries the DNS Root Server ('.').\n3. Root server returns TLD Nameserver (e.g., '.com').\n4. Resolver queries TLD server, which returns the Authoritative Nameserver (e.g., 'ns1.prepx.ai').\n5. Resolver queries Authoritative server, which returns the A/AAAA IP record.\n6. Resolver caches record and returns IP to browser.",
        tips: "Mention DNS TTL, Anycast routing, and CNAME vs A records.",
        tags: ["dns", "internet"],
      },
      {
        topic: "HTTP/1.1 vs HTTP/2 vs HTTP/3",
        question: "How do HTTP/1.1, HTTP/2, and HTTP/3 differ in transport and multiplexing?",
        answer:
          "• HTTP/1.1: Text-based, persistent connections, but suffers from Head-of-Line (HoL) blocking at application level.\n• HTTP/2: Binary framing, single TCP connection, multiplexed streams (no application HoL), server push, header compression (HPACK). However, TCP packet loss halts all streams (TCP HoL blocking).\n• HTTP/3: Built on QUIC (UDP), multiplexed streams without transport-level HoL blocking, faster 0-RTT/1-RTT handshakes, and seamless connection migration across network changes (IP changes).",
        tips: "The shift from TCP to QUIC/UDP in HTTP/3 is the most significant evolution in modern web infrastructure.",
        tags: ["http", "web-protocols"],
      },
      {
        topic: "REST vs gRPC",
        question: "When should you choose gRPC over traditional REST APIs?",
        answer:
          "REST uses JSON over HTTP/1.1 or HTTP/2, offering human-readable payloads and universal browser support. gRPC uses Protocol Buffers (compact binary serialization) over HTTP/2 with strongly-typed schemas (IDL), bidirectional streaming, and up to 5–10x faster serialization and lower network bandwidth. Choose gRPC for internal low-latency microservice-to-microservice communication.",
        tips: "Mention Protobuf backward compatibility, code generation, and client libraries in 10+ languages.",
        tags: ["api-design", "microservices"],
      },
      {
        topic: "WebSockets vs Long Polling",
        question: "Compare WebSockets, Server-Sent Events (SSE), and Long Polling for real-time web apps.",
        answer:
          "• Long Polling: Client sends HTTP request; server holds open until new data arrives, then responds and closes. High HTTP overhead.\n• SSE: Unidirectional (server-to-client) streaming over standard HTTP with automatic reconnection. Excellent for live dashboards and AI streaming responses.\n• WebSockets: Full-duplex, bidirectional persistent TCP socket upgraded from HTTP. Lowest framing overhead (2–10 bytes), ideal for chat, collaborative canvas, and games.",
        tips: "Use SSE for AI chatbot completions (like ChatGPT/PrepX) because it only requires server-to-client streaming.",
        tags: ["real-time", "websockets"],
      },
    ],
  },
  {
    slug: "oops",
    title: "Object-Oriented Programming",
    icon: Server,
    description: "Encapsulation, inheritance, polymorphism, abstraction, and SOLID design principles.",
    topics: [
      "Four OOP Pillars",
      "Polymorphism Types",
      "Diamond Problem",
      "SOLID Principles",
      "Composition vs Inheritance",
      "Key Design Patterns",
    ],
    questions: [
      {
        topic: "Four OOP Pillars",
        question: "Explain the four fundamental pillars of Object-Oriented Programming.",
        answer:
          "1. Encapsulation: Bundling data and methods into a single unit (class) and restricting direct access to internal state via private modifiers and getters/setters.\n2. Abstraction: Hiding internal complexity and exposing only essential interface contracts (interfaces / abstract classes).\n3. Inheritance: Reusing and extending behavior from a parent class.\n4. Polymorphism: The ability for different classes to respond to the same interface or method call in unique ways.",
        tips: "Give concrete examples in Java, TypeScript, or C++ rather than abstract definitions.",
        tags: ["oop", "fundamentals"],
      },
      {
        topic: "Polymorphism Types",
        question: "What is the difference between Compile-Time and Runtime Polymorphism?",
        answer:
          "• Compile-Time (Static): Method overloading (multiple methods same name, different signatures) and operator overloading. Resolved at compile-time by compiler signature matching.\n• Runtime (Dynamic): Method overriding via virtual methods and inheritance/interfaces. Resolved at runtime using dynamic dispatch (vtable / virtual method table lookups).",
        tips: "In C++, virtual functions add a pointer (vptr) to an instance pointing to the class's vtable.",
        tags: ["polymorphism", "runtime"],
      },
      {
        topic: "Diamond Problem",
        question: "What is the Diamond Problem in multiple inheritance and how is it resolved?",
        answer:
          "The Diamond Problem occurs when class D inherits from both B and C, and both B and C inherit from base class A. If A has a method `foo()`, and B and C override it, D does not know which method implementation to call. C++ resolves this using `virtual inheritance`. Java and C# prevent multiple class inheritance altogether, allowing multiple interface implementation instead.",
        tips: "Explain why modern languages favor single inheritance + multiple interfaces or traits.",
        tags: ["inheritance", "c-plus-plus"],
      },
      {
        topic: "SOLID Principles",
        question: "Explain the SOLID design principles with concise real-world examples.",
        answer:
          "• Single Responsibility (SRP): A class should have only one reason to change.\n• Open/Closed (OCP): Open for extension, closed for modification (use interfaces/strategies).\n• Liskov Substitution (LSP): Subtypes must be substitutable for their base types without altering correctness.\n• Interface Segregation (ISP): Clients should not be forced to depend on methods they do not use (lean interfaces).\n• Dependency Inversion (DIP): High-level modules should depend on abstractions, not concrete implementations.",
        tips: "Cite LSP classic violation: Rectangle vs Square inheriting width/height behavior.",
        tags: ["solid", "software-design"],
      },
      {
        topic: "Composition vs Inheritance",
        question: "Why is 'Composition over Inheritance' a celebrated design mantra?",
        answer:
          "Inheritance creates tight compile-time coupling ('is-a' relationship) where changes to parent classes inadvertently break child subclasses (fragile base class problem). Composition ('has-a' relationship) allows dynamic, runtime behavior swapping, cleaner unit testing with mocks, and avoids rigid, deep class hierarchies.",
        tips: "Demonstrate Strategy or Decorator pattern as classic applications of composition.",
        tags: ["design-patterns", "architecture"],
      },
      {
        topic: "Key Design Patterns",
        question: "Explain Singleton, Factory Method, and Observer patterns.",
        answer:
          "• Singleton: Ensures a class has only one instance and provides a global access point (use private constructor and double-checked locking for thread safety).\n• Factory Method: Defines an interface for creating objects, letting subclasses decide which class to instantiate.\n• Observer: Defines a one-to-many subscription model so that when a subject changes state, all registered observers are notified automatically (Pub/Sub backbone).",
        tips: "Mention why Singleton is often considered an anti-pattern (tight coupling, hidden state, hard to unit test).",
        tags: ["design-patterns", "architecture"],
      },
    ],
  },
];

export function NativeCs() {
  const location = useLocation();
  const navigate = useNavigate();
  const userPrefixMatch = location.pathname.match(/^(\/[a-f0-9]{24})\/coding/);
  const basePrefix = userPrefixMatch ? `${userPrefixMatch[1]}/coding` : "/coding";

  // URL-driven selected module support: /coding/cs/:slug
  const csMatch = location.pathname.match(/\/cs\/([^\/?#]+)/);
  const moduleFromUrl = csMatch ? CS_MODULES.find((m) => m.slug === csMatch[1]) : null;

  const [selectedModule, setSelectedModule] = useState<CsModule | null>(moduleFromUrl ?? null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  useEffect(() => {
    if (moduleFromUrl) {
      setSelectedModule(moduleFromUrl);
    } else if (!location.pathname.includes("/cs/")) {
      setSelectedModule(null);
    }
  }, [location.pathname, moduleFromUrl]);

  const handleSelectModule = (m: CsModule, topic?: string) => {
    setSelectedModule(m);
    setSelectedTopic(topic ?? null);
    setExpandedIndex(0);
    navigate(`${basePrefix}/cs/${m.slug}`);
  };

  const handleBackToAll = () => {
    setSelectedModule(null);
    setSelectedTopic(null);
    navigate(`${basePrefix}/cs`);
  };

  if (selectedModule) {
    const Icon = selectedModule.icon;

    // Filter questions by topic or search query
    const filteredQuestions = selectedModule.questions.filter((q) => {
      const matchesTopic = !selectedTopic || q.topic.toLowerCase() === selectedTopic.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesTopic && matchesSearch;
    });

    return (
      <div className="space-y-6 p-6 lg:p-8 max-w-5xl mx-auto w-full">
        <button
          onClick={handleBackToAll}
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-all duration-150 active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="size-4" />
          Back to all CS Subjects
        </button>

        <div className="flex items-center gap-3.5 mt-2">
          <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Icon className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">{selectedModule.title}</h1>
            <p className="text-sm text-zinc-400 mt-1">{selectedModule.description}</p>
          </div>
        </div>

        {/* Topic Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-2 pb-1">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium shrink-0 mr-1">
            <TagIcon className="size-3.5 text-zinc-400" />
            <span>Topics:</span>
          </div>
          <button
            onClick={() => setSelectedTopic(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 shrink-0 cursor-pointer ${
              !selectedTopic
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            All ({selectedModule.questions.length})
          </button>
          {selectedModule.topics.map((t) => {
            const isSelected = selectedTopic?.toLowerCase() === t.toLowerCase();
            return (
              <button
                key={t}
                onClick={() => setSelectedTopic(isSelected ? null : t)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 shrink-0 cursor-pointer ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>

        {/* Search inside module */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${selectedModule.title} interview questions…`}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-zinc-900/60 border border-zinc-800 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/60 transition-colors"
          />
        </div>

        {/* Interactive Questions Accordion */}
        <div className="space-y-3 mt-4">
          {filteredQuestions.length > 0 ? (
            filteredQuestions.map((q, idx) => {
              const isOpen = expandedIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden transition-all duration-150"
                >
                  <button
                    onClick={() => setExpandedIndex(isOpen ? null : idx)}
                    className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-zinc-800/30 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-zinc-500">Q{idx + 1}</span>
                      <div>
                        <span className="text-sm font-semibold text-zinc-100">{q.question}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] text-indigo-400 font-medium">{q.topic}</span>
                          <span className="text-zinc-600">·</span>
                          <div className="flex items-center gap-1">
                            {q.tags.map((t) => (
                              <span key={t} className="text-[10px] text-zinc-500">
                                #{t}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <ChevronDown
                      className={`size-4 text-zinc-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="border-t border-zinc-800/80 px-5 py-4 bg-zinc-950/40 space-y-4">
                      <div>
                        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                          Model Answer
                        </h4>
                        <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
                          {q.answer}
                        </p>
                      </div>

                      {q.tips && (
                        <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/[0.05] p-3.5">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300 mb-1">
                            <Lightbulb className="size-3.5" />
                            <span>Interview Tip</span>
                          </div>
                          <p className="text-xs text-zinc-400 leading-relaxed">{q.tips}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 rounded-xl border border-zinc-800 bg-zinc-900/30">
              <p className="text-sm text-zinc-400">No questions matched your search query or topic.</p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedTopic(null);
                }}
                className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2 cursor-pointer"
              >
                Reset filters
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 lg:p-8 max-w-6xl mx-auto w-full">
      <PageHeader
        title="Computer Science Core Subjects"
        description="Comprehensive revision for technical placement rounds and engineering interviews."
      />

      <div className="grid gap-6 md:grid-cols-2 mt-6">
        {CS_MODULES.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.slug}
              onClick={() => handleSelectModule(m)}
              className="group cursor-pointer rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 flex flex-col justify-between hover:border-indigo-500/50 hover:bg-zinc-900/90 transition-all duration-150 active:scale-[0.98]"
            >
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-zinc-100 group-hover:text-indigo-300 transition-colors">
                      {m.title}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">{m.description}</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-zinc-800/60">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 block mb-2.5">
                    Core Interview Topics (Click to Review)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {m.topics.map((t, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectModule(m, t);
                        }}
                        className="text-xs bg-zinc-950/80 hover:bg-indigo-900/40 hover:text-indigo-300 hover:border-indigo-500/40 border border-zinc-800 text-zinc-300 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-zinc-800/40 flex items-center justify-between text-xs text-zinc-400">
                <span className="text-emerald-400 font-medium">
                  {m.questions.length} Interview Q&A
                </span>
                <span className="text-indigo-400 group-hover:text-indigo-300 font-medium inline-flex items-center gap-1">
                  Start Revision <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
