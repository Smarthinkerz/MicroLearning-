import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";

import {
  Clock,
  WifiOff,
  BarChart3,
  Shield,
  Zap,
  ArrowRight,
  Smartphone,
  Play,
  Pause,
  Volume2,
  VolumeX,
  CheckCircle2,
  Check,
  Star,
  Users,
  TrendingUp,
  Award,
  ChevronDown,
  ChevronUp,
  Lock,
  Globe,
  HeartHandshake,
  BookOpen,
  Sun,
  Moon,
  Building2,
  User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

const MAIN_VIDEO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663029149863/hiMSRR6jLFgWQvJW7KXFLZ/SmarthinkerzMainAdvrt_ce3b6444.mp4";
const BG_VIDEO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663029149863/hiMSRR6jLFgWQvJW7KXFLZ/Smarthinkerz-MicroLearneradv_8937c4ee.mp4";

const STATS = [
  { value: "10,000+", label: "Learners trained", icon: Users },
  { value: "94%", label: "Completion rate", icon: TrendingUp },
  { value: "3–10 min", label: "Per lesson", icon: Clock },
  { value: "125+", label: "Lessons in library", icon: BookOpen },
];

const FEATURES = [
  {
    icon: Clock,
    title: "Shift-Aware Delivery",
    description: "Lessons are scheduled around your work shifts, breaks, and rest periods. Never miss training during active work.",
  },
  {
    icon: Zap,
    title: "3–10 Minute Micro-Lessons",
    description: "Bite-sized training modules designed for busy frontline workers. Complete a lesson during a break.",
  },
  {
    icon: WifiOff,
    title: "Offline-First",
    description: "Download lessons and complete them without internet. Progress syncs automatically when you reconnect.",
  },
  {
    icon: BarChart3,
    title: "Smart Analytics",
    description: "Track completion rates, scores, and learning progress across your entire workforce in real-time.",
  },
  {
    icon: Shield,
    title: "SCORM/xAPI Compliant",
    description: "Enterprise-grade compliance with industry standards. Export data for your existing LMS.",
  },
  {
    icon: Smartphone,
    title: "Cross-Platform",
    description: "Works on any device. Install as a native app on iOS and Android, or use the web version.",
  },
];

const TESTIMONIALS = [
  {
    name: "Sarah M.",
    role: "L&D Manager, Hospitality Group",
    quote: "Our completion rates jumped from 41% to 89% in the first quarter. The shift-aware scheduling is a game changer for our 24/7 operation.",
    rating: 5,
  },
  {
    name: "James T.",
    role: "Operations Director, Logistics",
    quote: "We rolled out compliance training to 600 drivers in two weeks — offline-first meant zero excuses. Smarthinkerz is the only platform built for our reality.",
    rating: 5,
  },
  {
    name: "Priya K.",
    role: "HR Lead, Healthcare Network",
    quote: "The micro-lesson format fits perfectly into nursing handover gaps. Staff actually look forward to their daily training now.",
    rating: 5,
  },
];

const FAQ = [
  {
    q: "How does shift-aware scheduling work?",
    a: "You import your roster via CSV or webhook. Our engine maps each worker's shift pattern and automatically schedules lessons during breaks, pre-shift windows, or post-shift cool-downs — never during active work hours.",
  },
  {
    q: "Can learners complete lessons without internet?",
    a: "Yes. Lessons are cached on-device when the app is opened. Workers can complete full lessons, quizzes, and assessments offline. All progress syncs automatically the next time they connect.",
  },
  {
    q: "What compliance standards do you support?",
    a: "LearnShift is SCORM 1.2, SCORM 2004, and xAPI (Tin Can) compliant. You can export completion data to any LMS that supports these standards.",
  },
  {
    q: "How long does it take to get started?",
    a: "Most teams are live within 24 hours. Import your roster, pick lessons from our library or create your own in the authoring studio, assign to your team, and you're running.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes — the Starter plan is free forever for up to 5 learners. No credit card required. Upgrade anytime as your team grows.",
  },
];

const INDUSTRIES = ["Hospitality", "Healthcare", "Logistics", "Retail", "Manufacturing", "Food Service"];

const TRUST_ITEMS = [
  { icon: Lock, label: "SOC 2 Type II" },
  { icon: Globe, label: "GDPR Compliant" },
  { icon: Shield, label: "ISO 27001" },
  { icon: HeartHandshake, label: "99.9% Uptime SLA" },
];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const mainVideoRef = useRef<HTMLVideoElement>(null);
  const { theme, toggleTheme } = useTheme();

  const togglePlay = () => {
    const video = mainVideoRef.current;
    if (!video) return;
    if (video.paused) { video.play(); setIsPlaying(true); }
    else { video.pause(); setIsPlaying(false); }
  };

  const toggleMute = () => {
    const video = mainVideoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Navigation ── */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container flex items-center justify-between h-20">
          <div className="flex items-center gap-2">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310419663029149863/hiMSRR6jLFgWQvJW7KXFLZ/transparentlogo16bf8f59-9318-4def-865f-b865b1d67d4c-removebg-preview_04f6f9de.png"
              alt="Smarthinkerz LearnShift"
              className="h-14 w-auto object-contain"
            />
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <button onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-foreground transition-fast">Features</button>
            <button onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-foreground transition-fast">How It Works</button>
            <button onClick={() => setLocation("/pricing")} className="hover:text-foreground transition-fast">Pricing</button>
            <button onClick={() => document.getElementById("faq")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-foreground transition-fast">FAQ</button>
          </div>
          <div className="flex items-center gap-3">
            {/* Dark / Light mode toggle */}
            <button
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-fast border border-border/50"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
            {isAuthenticated ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => setLocation("/dashboard")}>Dashboard</Button>
                <Button size="sm" onClick={() => setLocation("/library")}>
                  Lesson Library <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => setLocation("/login")}>Sign in</Button>
                <Button size="sm" onClick={() => setLocation("/register")}>
                  Start Free Trial <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-24 min-h-[100vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <video autoPlay loop muted playsInline className="w-full h-full object-cover" src={BG_VIDEO_URL} />
          <div className="absolute inset-0 bg-background/75 backdrop-blur-[2px]" />
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent" />
        </div>

        <div className="relative z-10 container py-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 border border-primary/25 text-primary text-sm mb-6">
                <Zap className="h-3.5 w-3.5" />
                Adaptive Learning for Shift Workers
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight mb-6">
                Train Your Workforce
                <br />
                <span className="gradient-text">Without Disrupting Shifts</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-xl mb-8 leading-relaxed">
                Deliver schedule-aware micro-lessons that fit between shifts and breaks.
                AI-powered, offline-ready, and enterprise-compliant training for frontline teams.
              </p>
              {/* Social proof micro-line */}
              <div className="flex items-center gap-2 mb-6 justify-center lg:justify-start">
                <div className="flex -space-x-2">
                  {["S","J","P","A"].map((l, i) => (
                    <div key={i} className="h-7 w-7 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center text-[10px] font-bold text-primary">
                      {l}
                    </div>
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  <strong className="text-foreground tabular-nums">10,000+</strong> learners already trained
                </span>
              </div>
              {/* Employer vs Individual CTA split */}
              <div className="flex flex-col gap-3 w-full">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    size="lg"
                    className="flex-1 text-base min-h-[52px] gap-2"
                    onClick={() => setLocation("/register")}
                    aria-label="Start free trial for individual learners"
                  >
                    <User className="h-4 w-4" />
                    For Learners — Start Free
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="flex-1 text-base min-h-[52px] gap-2 bg-transparent border-primary/40 hover:bg-primary/10"
                    onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
                    aria-label="See employer team plans and pricing"
                  >
                    <Building2 className="h-4 w-4" />
                    For Employers — See Plans
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground justify-center lg:justify-start">
                  <span className="flex items-center gap-1"><Check className="h-3 w-3 text-success" /> Free forever up to 5 learners</span>
                  <span className="flex items-center gap-1"><Check className="h-3 w-3 text-success" /> No credit card required</span>
                  <span className="flex items-center gap-1"><Check className="h-3 w-3 text-success" /> Cancel anytime</span>
                </div>
              </div>
            </div>

            {/* Right: Featured Main Video */}
            <div className="relative group">
              <div className="relative rounded-2xl overflow-hidden border border-border/50 shadow-2xl shadow-primary/10">
                <video
                  ref={mainVideoRef}
                  src={MAIN_VIDEO_URL}
                  muted={isMuted}
                  playsInline
                  loop
                  className="w-full aspect-video object-cover"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
                {!isPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer transition-all" onClick={togglePlay}>
                    <div className="h-16 w-16 rounded-full bg-primary/90 flex items-center justify-center shadow-lg hover:bg-primary transition-colors">
                      <Play className="h-7 w-7 text-primary-foreground ml-1" />
                    </div>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between">
                  <button onClick={togglePlay} className="h-8 w-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/30 transition-colors">
                    {isPlaying ? <Pause className="h-4 w-4 text-white" /> : <Play className="h-4 w-4 text-white ml-0.5" />}
                  </button>
                  <button onClick={toggleMute} className="h-8 w-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/30 transition-colors">
                    {isMuted ? <VolumeX className="h-4 w-4 text-white" /> : <Volume2 className="h-4 w-4 text-white" />}
                  </button>
                </div>
              </div>
              <div className="absolute -inset-4 bg-primary/5 rounded-3xl blur-2xl -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="py-10 border-y border-border/30 bg-secondary/20">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <stat.icon className="w-4 h-4 text-primary" />
                  <span className="text-2xl font-extrabold tabular-nums text-foreground">{stat.value}</span>
                </div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Industries ── */}
      <section className="py-6 border-b border-border/20">
        <div className="container">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            <span className="text-sm text-muted-foreground font-medium">Built for:</span>
            {INDUSTRIES.map((ind) => (
              <span key={ind} className="text-sm font-semibold text-foreground/70">{ind}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-20 px-4">
        <div className="container">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything Your Workforce Needs</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              A complete platform for creating, delivering, and tracking micro-learning across your organization.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="glass-card rounded-xl p-6 hover:border-primary/30 transition-all duration-300">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-20 px-4 bg-secondary/30">
        <div className="container">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Live in 24 Hours</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">Three steps from sign-up to your first lesson delivered.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: "1", title: "Import Your Roster", desc: "Upload shifts or connect your WFM system via webhook. We map every worker's schedule automatically." },
              { step: "2", title: "Create or Pick Lessons", desc: "Use the authoring studio or AI to create micro-lessons, or choose from 125+ ready-made lessons in the library." },
              { step: "3", title: "Assign & Track", desc: "The engine schedules lessons around shifts. Workers learn offline. You track progress in real-time." },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="h-12 w-12 rounded-full bg-primary/20 text-primary font-bold text-lg flex items-center justify-center mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-20 px-4">
        <div className="container">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Trusted by Frontline Teams</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">Real results from real organizations.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="glass-card rounded-xl p-6 flex flex-col gap-4">
                <div className="flex gap-0.5">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">"{t.quote}"</p>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust Signals ── */}
      <section className="py-12 px-4 bg-secondary/20 border-y border-border/30">
        <div className="container">
          <div className="flex flex-wrap items-center justify-center gap-8">
            {TRUST_ITEMS.map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                <item.icon className="w-4 h-4 text-primary shrink-0" />
                <span className="font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-20 px-4">
        <div className="container max-w-3xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-3">
            {FAQ.map((item, i) => (
              <div key={i} className="glass-card rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-accent/30 transition-fast"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                >
                  <span className="font-medium text-sm text-foreground pr-4">{item.q}</span>
                  {openFaq === i ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border/30 pt-4">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-20 px-4 bg-primary/5 border-t border-primary/10">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <Award className="w-10 h-10 text-primary mx-auto mb-4" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Transform Workforce Training?</h2>
            <p className="text-muted-foreground text-lg mb-2">
              Join organizations delivering smarter, shift-aware training to their frontline teams.
            </p>
            <p className="text-sm text-muted-foreground mb-8">
              Free forever for up to 5 learners. No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="lg" className="text-base px-8" onClick={() => setLocation("/register")}>
                Get Started — It's Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" size="lg" className="text-base px-8 bg-transparent" onClick={() => setLocation("/pricing")}>
                View Pricing
              </Button>
            </div>
            <div className="flex items-center justify-center gap-6 mt-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-success" />No credit card</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-success" />Free forever plan</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-success" />Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-10 border-t border-border/30">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310419663029149863/hiMSRR6jLFgWQvJW7KXFLZ/smarthinkerz-logo-original_15b12a42.jpg"
                alt="Smarthinkerz LearnShift"
                className="h-12 w-auto object-contain"
              />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <button onClick={() => setLocation("/pricing")} className="hover:text-foreground transition-fast">Pricing</button>
              <button onClick={() => setLocation("/consent")} className="hover:text-foreground transition-fast">Privacy</button>
              <button onClick={() => setLocation("/login")} className="hover:text-foreground transition-fast">Sign in</button>
              <button onClick={() => setLocation("/admin-crm")} className="hover:text-foreground transition-fast text-xs opacity-40 hover:opacity-70">Admin</button>
            </div>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Smarthinkerz LearnShift. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
