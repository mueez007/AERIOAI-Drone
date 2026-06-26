"use client";

import Link from "next/link";
import ThemeToggle from "@/components/layout/ThemeToggle";
import ScrollReveal from "@/components/landing/ScrollReveal";
import GlassFeatureCard from "@/components/landing/GlassFeatureCard";
import AnimatedCounter from "@/components/landing/AnimatedCounter";
import TechArchitecture from "@/components/landing/TechArchitecture";
import SpecTable from "@/components/landing/SpecTable";
import TimelineSection from "@/components/landing/TimelineSection";
import ApplicationsGrid from "@/components/landing/ApplicationsGrid";
import dynamic from "next/dynamic";
import { useState } from "react";
import {
  RocketIcon, EyeIcon, MicrophoneIcon, BrainIcon, MapPinIcon,
  PackageIcon, AlertIcon, ChartIcon, DevicesIcon,
  GearIcon, CodeIcon, CheckIcon, ArrowRightIcon, ChevronDownIcon,
  GithubIcon, LinkedInIcon, MailIcon,
} from "@/components/ui/Icons";

const SplineScene = dynamic(() => import("@/components/landing/SplineScene"), {
  ssr: false,
  loading: () => <div style={{ position: "fixed", inset: 0, zIndex: 0, background: "var(--bg-primary)" }} />,
});

/* ═══════════════════════════════════════════════
   NAV LINKS — smooth-scroll to sections
   ═══════════════════════════════════════════════ */
const navLinks = [
  { label: "Platform", href: "#platform" },
  { label: "Features", href: "#features" },
  { label: "Technology", href: "#technology" },
  { label: "Applications", href: "#applications" },
  { label: "Team", href: "#team" },
];

/* ═══════════════════════════════════════════════
   FEATURES DATA
   ═══════════════════════════════════════════════ */
const features = [
  {
    icon: <EyeIcon size={24} />,
    title: "Live Aerial Intelligence",
    description: "Real-time video feed processed by onboard AI. See what the drone sees, with instant object detection and scene understanding.",
    accentColor: "var(--accent-cyan)",
  },
  {
    icon: <MicrophoneIcon size={24} />,
    title: "Voice Conversations",
    description: "Talk to your drone like a copilot. Ask what it sees, request situation reports, get spoken briefings in natural language.",
    accentColor: "var(--accent-purple)",
  },
  {
    icon: <BrainIcon size={24} />,
    title: "Mission Memory",
    description: "Every flight becomes searchable intelligence. Compare missions, track patterns, ask 'How many vehicles were detected this week?'",
    accentColor: "var(--accent-green)",
  },
  {
    icon: <MapPinIcon size={24} />,
    title: "Autonomous Navigation",
    description: "GPS waypoint missions with intelligent Return-to-Home. The drone navigates itself while you focus on the mission.",
    accentColor: "var(--accent-yellow)",
  },
  {
    icon: <PackageIcon size={24} />,
    title: "Smart Payload Delivery",
    description: "Modular payload system for delivery missions. Precision landing with real-time adjustments and computer vision confirmation.",
    accentColor: "var(--accent-pink)",
  },
  {
    icon: <AlertIcon size={24} />,
    title: "Emergency Response",
    description: "Fire detection, crowd assessment, disaster monitoring. AI that understands urgency and alerts operators in real time.",
    accentColor: "var(--accent-red)",
  },
  {
    icon: <ChartIcon size={24} />,
    title: "Intelligence Reports",
    description: "After every mission: auto-generated PDF reports with flight stats, object counts, threat assessments, and AI summaries.",
    accentColor: "var(--accent-cyan)",
  },
  {
    icon: <DevicesIcon size={24} />,
    title: "Multi-Device Command",
    description: "Web dashboard on desktop, Flutter app on phone. Same powerful experience, any device, anywhere.",
    accentColor: "var(--accent-purple)",
  },
];

/* ═══════════════════════════════════════════════
   TEAM DATA
   ═══════════════════════════════════════════════ */
const teamMembers = [
  {
    name: "Mohammed Huzaif Mueez",
    role: "Team Lead",
    initials: "MH",
    gradient: "from-[var(--accent-cyan)] to-[var(--accent-purple)]",
  },
  {
    name: "Mohammed Adnan",
    role: "Team Member",
    initials: "MA",
    gradient: "from-[var(--accent-purple)] to-[var(--accent-pink)]",
  },
  {
    name: "Afnan Habeeb",
    role: "Team Member",
    initials: "AH",
    gradient: "from-[var(--accent-green)] to-[var(--accent-cyan)]",
  },
  {
    name: "Harshavardhana D K",
    role: "Team Member",
    initials: "HD",
    gradient: "from-[var(--accent-yellow)] to-[var(--accent-red)]",
  },
];

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>

      <main className="relative bg-[var(--bg-primary)] selection:bg-[var(--accent-cyan)]/20 selection:text-[var(--text-primary)]">

        {/* ══════════════════════════════════════════
            FULL-SCREEN SPLINE 3D — Native WebGL with camera zoom
        ══════════════════════════════════════════ */}
        <SplineScene />

        {/* ══════════════════════════════════════════
            NAVIGATION
        ══════════════════════════════════════════ */}
        <nav
          style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100 }}
          className="p-3 md:p-4"
        >
          <div className="max-w-7xl mx-auto glass-nav flex justify-between items-center px-5 md:px-7 py-3">
            {/* Logo */}
            <a href="#" className="flex items-center gap-2">
              <span
                className="text-[15px] font-black tracking-[0.18em] font-[family-name:var(--font-heading)] text-[var(--text-primary)]"
              >
                AERIOAI
              </span>
            </a>

            {/* Desktop Links */}
            <div className="hidden md:flex items-center gap-0.5">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="px-4 py-2 text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-300 rounded-full hover:bg-[var(--text-primary)]/[0.04]"
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link
                href="/login"
                className="hidden sm:inline-flex items-center gap-1.5 px-5 py-2 text-[13px] font-semibold rounded-full bg-[var(--text-primary)] text-[var(--bg-primary)] hover:opacity-90 transition-all duration-300"
              >
                Launch Dashboard
              </Link>
              {/* Mobile hamburger */}
              <button
                className="md:hidden w-8 h-8 flex flex-col items-center justify-center gap-1.5"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
              >
                <span className={`w-5 h-0.5 bg-[var(--text-primary)] transition-all duration-300 ${mobileMenuOpen ? "rotate-45 translate-y-1" : ""}`} />
                <span className={`w-5 h-0.5 bg-[var(--text-primary)] transition-all duration-300 ${mobileMenuOpen ? "-rotate-45 -translate-y-1" : ""}`} />
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-2 mx-4 glass-panel p-4 space-y-1">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-3 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl hover:bg-[var(--text-primary)]/[0.04] transition-colors duration-300"
                >
                  {link.label}
                </a>
              ))}
              <Link
                href="/login"
                className="block px-4 py-3 text-sm font-semibold text-center rounded-xl bg-[var(--text-primary)] text-[var(--bg-primary)] mt-2"
              >
                Launch Dashboard
              </Link>
            </div>
          )}
        </nav>

        {/* ══════════════════════════════════════════
            SECTION 1: HERO
        ══════════════════════════════════════════ */}
        <section
          style={{ position: "relative", zIndex: 1, height: "130vh" }}
          className="flex flex-col items-center justify-end pb-16 md:pb-20 px-6 pointer-events-none"
        >
          {/* Smoke gradient blend */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background: "linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.45) 60%, var(--bg-primary) 100%)",
              zIndex: 1,
            }}
          />

          {/* Hero content */}
          <div
            style={{ position: "relative", zIndex: 2, pointerEvents: "auto" }}
            className="text-center max-w-4xl mx-auto"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 glass-pill px-5 py-2 mb-8">
              <RocketIcon size={14} className="text-[var(--accent-cyan)]" />
              <span className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--text-primary)]">
                Built from Scratch
              </span>
            </div>

            {/* Headline */}
            <h1
              className="text-5xl md:text-7xl lg:text-8xl font-black font-[family-name:var(--font-heading)] tracking-tight mb-6 text-white leading-[0.95]"
              style={{ textShadow: "0 4px 80px rgba(0,0,0,1), 0 2px 30px rgba(0,0,0,0.8)" }}
            >
              Intelligence{" "}
              <span className="gradient-text">Takes Flight</span>
            </h1>

            {/* Subheadline */}
            <p
              className="text-lg md:text-xl text-white/85 mb-10 font-medium leading-relaxed max-w-2xl mx-auto"
              style={{ textShadow: "0 2px 30px rgba(0,0,0,1)" }}
            >
              An autonomous drone platform built from scratch — combining custom hardware,
              edge AI, and cloud intelligence into one unified system.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="#features"
                className="group inline-flex items-center gap-2 px-8 py-4 text-[15px] font-semibold rounded-full bg-white text-black hover:scale-[1.03] transition-all duration-300 shadow-[0_0_40px_rgba(255,255,255,0.15)] hover:shadow-[0_0_60px_rgba(255,255,255,0.25)]"
              >
                Explore Features
                <ChevronDownIcon size={16} className="transition-transform duration-300 group-hover:translate-y-0.5" />
              </a>
              <Link
                href="/login"
                className="group inline-flex items-center gap-2 px-8 py-4 text-[15px] font-medium rounded-full text-white border border-white/20 hover:bg-white/10 transition-all duration-300"
                style={{ backdropFilter: "blur(20px)", background: "rgba(0,0,0,0.25)" }}
              >
                Try Dashboard
                <ArrowRightIcon size={16} className="transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            ALL CONTENT — solid bg, scrolls over Spline
        ══════════════════════════════════════════ */}
        <div style={{ position: "relative", zIndex: 10, backgroundColor: "var(--bg-primary)" }}>

          {/* ── SECTION 2: The Complete System ── */}
          <section id="platform" className="py-24 md:py-32 px-6">
            <div className="max-w-7xl mx-auto">
              <ScrollReveal>
                <div className="text-center mb-16">
                  <div className="inline-flex items-center gap-2 glass-pill px-4 py-1.5 mb-6">
                    <span className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--accent-cyan)]">
                      One Integrated Product
                    </span>
                  </div>
                  <h2 className="text-4xl md:text-6xl font-black font-[family-name:var(--font-heading)] tracking-tight mb-5">
                    The <span className="gradient-text">Complete System</span>
                  </h2>
                  <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
                    Not just software. Not just hardware. AERIOAI is a fully integrated autonomous drone platform — every component designed to work together.
                  </p>
                </div>
              </ScrollReveal>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Hardware Pillar */}
                <ScrollReveal delay={100} direction="left">
                  <div className="glass-card p-8 h-full">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-[var(--accent-cyan)]/8 flex items-center justify-center border border-[var(--accent-cyan)]/15">
                        <GearIcon size={20} className="text-[var(--accent-cyan)]" />
                      </div>
                      <h3 className="text-2xl font-bold font-[family-name:var(--font-heading)] tracking-tight">Hardware</h3>
                    </div>
                    <ul className="space-y-4">
                      {[
                        "Custom airframe with professional-grade components",
                        "Raspberry Pi 4 + SpeedyBee F405 dual-computer architecture",
                        "BN-880 GPS navigation with GLONASS",
                        "Telemetry radio & failsafe return-to-home",
                        "Modular payload system — camera, delivery, sensors",
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-3 text-[15px]">
                          <span className="w-5 h-5 rounded-full bg-[var(--accent-cyan)]/8 text-[var(--accent-cyan)] flex items-center justify-center mt-0.5 flex-shrink-0">
                            <CheckIcon size={12} strokeWidth={2.5} />
                          </span>
                          <span className="text-[var(--text-secondary)]">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </ScrollReveal>

                {/* Software Pillar */}
                <ScrollReveal delay={200} direction="right">
                  <div className="glass-card p-8 h-full">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-[var(--accent-purple)]/8 flex items-center justify-center border border-[var(--accent-purple)]/15">
                        <CodeIcon size={20} className="text-[var(--accent-purple)]" />
                      </div>
                      <h3 className="text-2xl font-bold font-[family-name:var(--font-heading)] tracking-tight">Software</h3>
                    </div>
                    <ul className="space-y-4">
                      {[
                        "YOLOv8n edge AI — real-time detection on the drone",
                        "Google Gemini 2.5 — deep scene understanding",
                        "Groq + ElevenLabs — voice conversations",
                        "Next.js command center + Flutter mobile app",
                        "Mission intelligence database — every flight queryable",
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-3 text-[15px]">
                          <span className="w-5 h-5 rounded-full bg-[var(--accent-purple)]/8 text-[var(--accent-purple)] flex items-center justify-center mt-0.5 flex-shrink-0">
                            <CheckIcon size={12} strokeWidth={2.5} />
                          </span>
                          <span className="text-[var(--text-secondary)]">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </ScrollReveal>
              </div>
            </div>
          </section>

          {/* ── SECTION 3: Features ── */}
          <section id="features" className="py-24 md:py-32 px-6 bg-[var(--bg-secondary)]">
            <div className="section-divider" style={{ position: "absolute", left: 0, right: 0, top: 0 }} />
            <div className="max-w-7xl mx-auto">
              <ScrollReveal>
                <div className="text-center mb-16">
                  <h2 className="text-4xl md:text-6xl font-black font-[family-name:var(--font-heading)] tracking-tight mb-5">
                    <span className="gradient-text">8 Core Capabilities</span>
                  </h2>
                  <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
                    Product features that combine hardware and software into something no single component could achieve alone.
                  </p>
                </div>
              </ScrollReveal>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {features.map((f, i) => (
                  <ScrollReveal key={i} delay={i * 80}>
                    <GlassFeatureCard {...f} />
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>

          {/* ── SECTION 4: AI Copilot ── */}
          <section className="py-24 md:py-32 px-6">
            <div className="max-w-5xl mx-auto">
              <ScrollReveal>
                <div className="text-center mb-12">
                  <div className="w-16 h-16 mx-auto glass-card flex items-center justify-center mb-8 !rounded-2xl">
                    <BrainIcon size={28} className="text-[var(--accent-purple)]" />
                  </div>
                  <h2 className="text-4xl md:text-6xl font-black font-[family-name:var(--font-heading)] tracking-tight mb-6">
                    The <span className="gradient-text">AI Copilot</span>
                  </h2>
                  <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
                    Ask AERIOAI anything about your mission. It analyzes footage, reads telemetry, and speaks back in natural language — like having an expert co-pilot on every flight.
                  </p>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={200}>
                <div className="glass-card p-8 md:p-10 max-w-3xl mx-auto">
                  <div className="space-y-5">
                    {[
                      { role: "user", msg: "What do you see in the eastern sector?" },
                      { role: "ai", msg: "I can see three individuals near a stationary white vehicle. No weapons detected. Threat level: Low. I'll continue the sweep." },
                      { role: "user", msg: "Summarize this mission for the report." },
                      { role: "ai", msg: "Mission Alpha-7 lasted 22 minutes. 8 vehicles detected, 3 persons of interest flagged in Sector E. All delivery checkpoints confirmed. No critical anomalies." },
                    ].map((m, i) => (
                      <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] px-5 py-3.5 rounded-2xl ${m.role === "user"
                            ? "bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-tr-sm"
                            : "glass-panel rounded-tl-sm text-[var(--text-primary)] !rounded-2xl !rounded-tl-sm"
                          }`}>
                          <p className="text-[15px] leading-relaxed font-medium">{m.msg}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Voice waveform */}
                  <div className="flex items-center justify-center gap-1 mt-8 h-10 opacity-30">
                    {[4, 8, 16, 24, 20, 12, 6, 20, 14, 8, 4, 12, 20, 8, 4].map((h, i) => (
                      <div key={i} className="w-1.5 bg-[var(--accent-cyan)] rounded-full animate-pulse" style={{ height: h, animationDelay: `${i * 80}ms` }} />
                    ))}
                  </div>
                  <p className="text-xs font-mono text-[var(--text-muted)] text-center mt-3 tracking-wider">
                    Groq Whisper STT · ElevenLabs TTS
                  </p>
                </div>
              </ScrollReveal>
            </div>
          </section>

          {/* ── SECTION 5: Technology Deep-Dive ── */}
          <section id="technology" className="py-24 md:py-32 px-6 bg-[var(--bg-secondary)]">
            <div className="max-w-7xl mx-auto">
              <ScrollReveal>
                <div className="text-center mb-16">
                  <div className="inline-flex items-center gap-2 glass-pill px-4 py-1.5 mb-6">
                    <span className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--accent-purple)]">
                      Architecture
                    </span>
                  </div>
                  <h2 className="text-4xl md:text-6xl font-black font-[family-name:var(--font-heading)] tracking-tight mb-5">
                    Technology <span className="gradient-text">Stack</span>
                  </h2>
                  <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
                    Three layers working in harmony — edge computing on the drone, cloud AI for deep analysis, and ground control for the operator.
                  </p>
                </div>
              </ScrollReveal>

              <TechArchitecture />
            </div>
          </section>

          {/* ── SECTION 6: How We Built It ── */}
          <section className="py-24 md:py-32 px-6">
            <div className="max-w-7xl mx-auto">
              <ScrollReveal>
                <div className="text-center mb-16">
                  <h2 className="text-4xl md:text-6xl font-black font-[family-name:var(--font-heading)] tracking-tight mb-5">
                    How <span className="gradient-text">We Built It</span>
                  </h2>
                  <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
                    From component selection to AI deployment — every phase of bringing AERIOAI to life.
                  </p>
                </div>
              </ScrollReveal>

              <TimelineSection />
            </div>
          </section>

          {/* ── SECTION 7: Applications ── */}
          <section id="applications" className="py-24 md:py-32 px-6 bg-[var(--bg-secondary)]">
            <div className="max-w-7xl mx-auto">
              <ScrollReveal>
                <div className="text-center mb-16">
                  <h2 className="text-4xl md:text-6xl font-black font-[family-name:var(--font-heading)] tracking-tight mb-5">
                    Real-World <span className="gradient-text">Applications</span>
                  </h2>
                  <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
                    AERIOAI adapts to any mission — from precision agriculture to emergency response.
                  </p>
                </div>
              </ScrollReveal>

              <ApplicationsGrid />
            </div>
          </section>

          {/* ── SECTION 8: Specifications ── */}
          <section className="py-24 md:py-32 px-6">
            <div className="max-w-4xl mx-auto">
              <ScrollReveal>
                <div className="text-center mb-16">
                  <div className="inline-flex items-center gap-2 glass-pill px-4 py-1.5 mb-6">
                    <span className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--text-secondary)]">
                      Technical Specs
                    </span>
                  </div>
                  <h2 className="text-4xl md:text-5xl font-black font-[family-name:var(--font-heading)] tracking-tight mb-5">
                    Under <span className="gradient-text">the Hood</span>
                  </h2>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={200}>
                <SpecTable />
              </ScrollReveal>
            </div>
          </section>

          {/* ── SECTION 9: Stats ── */}
          <section className="py-24 md:py-32 px-6 bg-[var(--bg-secondary)]">
            <div className="max-w-5xl mx-auto">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-5 md:gap-4">
                <ScrollReveal delay={0}>
                  <AnimatedCounter value="1" suffix="" label="Drone Built" />
                </ScrollReveal>
                <ScrollReveal delay={100}>
                  <AnimatedCounter value="8" suffix="" label="Core Features" />
                </ScrollReveal>
                <ScrollReveal delay={200}>
                  <AnimatedCounter value="99.8" suffix="%" label="Detection Accuracy" />
                </ScrollReveal>
                <ScrollReveal delay={300}>
                  <AnimatedCounter value="50" suffix="ms" label="AI Response" />
                </ScrollReveal>
                <ScrollReveal delay={400} className="col-span-2 md:col-span-1">
                  <AnimatedCounter value="24/7" suffix="" label="Mission Recording" />
                </ScrollReveal>
              </div>
            </div>
          </section>

          {/* ── SECTION 10: Team ── */}
          <section id="team" className="py-24 md:py-32 px-6">
            <div className="max-w-5xl mx-auto">
              <ScrollReveal>
                <div className="text-center mb-16">
                  <h2 className="text-4xl md:text-6xl font-black font-[family-name:var(--font-heading)] tracking-tight mb-5">
                    The <span className="gradient-text">Team</span>
                  </h2>
                  <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
                    A collaborative effort — every line of code, every solder joint, every flight. Built together from the ground up.
                  </p>
                </div>
              </ScrollReveal>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                {teamMembers.map((member, i) => (
                  <ScrollReveal key={i} delay={i * 100}>
                    <div className="glass-card p-6 text-center group">
                      {/* Avatar */}
                      <div className={`w-20 h-20 rounded-full mx-auto mb-5 bg-gradient-to-br ${member.gradient} flex items-center justify-center text-white text-xl font-black font-[family-name:var(--font-heading)] transition-transform duration-500 group-hover:scale-105`}>
                        {member.initials}
                      </div>

                      <h3 className="text-[15px] font-bold font-[family-name:var(--font-heading)] mb-1 text-[var(--text-primary)] tracking-tight leading-tight">
                        {member.name}
                      </h3>
                      <p className="text-xs font-medium text-[var(--accent-cyan)]">
                        {member.role}
                      </p>
                    </div>
                  </ScrollReveal>
                ))}
              </div>

              {/* Team description */}
              <ScrollReveal delay={500}>
                <div className="mt-10 glass-card p-8 md:p-10 text-center max-w-3xl mx-auto">
                  <p className="text-[var(--text-secondary)] leading-relaxed max-w-xl mx-auto">
                    This project was conceived, designed, and built as a demonstration of integrated hardware-software engineering, edge AI deployment, and autonomous systems design. Every line of code. Every solder joint. Every flight.
                  </p>
                  <div className="flex items-center justify-center gap-3 mt-6">
                    <a href="https://github.com/mueez007/AERIOAI-Drone" target="_blank" rel="noopener noreferrer" className="glass-pill p-2.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-300">
                      <GithubIcon size={18} />
                    </a>
                    <a href="#" className="glass-pill p-2.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-300">
                      <LinkedInIcon size={18} />
                    </a>
                    <a href="#" className="glass-pill p-2.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-300">
                      <MailIcon size={18} />
                    </a>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </section>

          {/* ── SECTION 11: Final CTA ── */}
          <section className="py-32 md:py-40 px-6 text-center bg-[var(--bg-secondary)]">
            <div className="max-w-3xl mx-auto">
              <ScrollReveal>
                <h2 className="text-5xl md:text-7xl font-black font-[family-name:var(--font-heading)] tracking-tight mb-6 leading-[0.95]">
                  See It{" "}
                  <span className="gradient-text">In Action</span>
                </h2>
                <p className="text-xl text-[var(--text-secondary)] mb-12 leading-relaxed max-w-xl mx-auto">
                  The drone is real. The AI is real. The intelligence is real.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link
                    href="/login"
                    className="group inline-flex items-center gap-2 px-10 py-5 text-lg font-semibold rounded-full bg-[var(--text-primary)] text-[var(--bg-primary)] hover:scale-[1.03] transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
                  >
                    Launch Dashboard
                    <ArrowRightIcon size={18} className="transition-transform duration-300 group-hover:translate-x-0.5" />
                  </Link>
                  <a
                    href="#technology"
                    className="px-10 py-5 text-lg font-medium rounded-full glass-button text-[var(--text-primary)]"
                  >
                    View Documentation
                  </a>
                </div>
              </ScrollReveal>
            </div>
          </section>

          {/* ── FOOTER ── */}
          <footer className="py-16 px-6 bg-[var(--bg-primary)]">
            <div className="section-divider mb-12" />
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row justify-between items-start gap-10 mb-12">
                {/* Logo & tagline */}
                <div>
                  <span className="text-lg font-black tracking-[0.18em] font-[family-name:var(--font-heading)] text-[var(--text-primary)]">
                    AERIOAI
                  </span>
                  <p className="text-sm text-[var(--text-secondary)] mt-2.5 max-w-xs leading-relaxed">
                    Intelligence in the Sky — An AI-powered autonomous drone platform built from scratch.
                  </p>
                </div>

                {/* Links */}
                <div className="grid grid-cols-2 gap-x-16 gap-y-3">
                  {[
                    { label: "Dashboard", href: "/login" },
                    { label: "Features", href: "#features" },
                    { label: "Technology", href: "#technology" },
                    { label: "Applications", href: "#applications" },
                    { label: "Team", href: "#team" },
                    { label: "Documentation", href: "#" },
                  ].map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-300"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>

              {/* Tech badges */}
              <div className="flex flex-wrap gap-2 mb-10">
                {["Python", "FastAPI", "Next.js", "Flutter", "YOLOv8", "Gemini 2.5", "Groq", "ElevenLabs", "INAV", "Raspberry Pi"].map((tech) => (
                  <span
                    key={tech}
                    className="px-3 py-1 text-[11px] font-mono font-medium rounded-full text-[var(--text-muted)] border border-[var(--border-color)] hover:text-[var(--text-secondary)] hover:border-[var(--text-muted)]/30 transition-colors duration-300"
                  >
                    {tech}
                  </span>
                ))}
              </div>

              {/* Bottom */}
              <div className="section-divider mb-8" />
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-xs text-[var(--text-muted)] font-mono">
                  © 2026 AERIOAI · Built from scratch. Every line of code. Every solder joint. Every flight.
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  Mohammed Huzaif Mueez · Mohammed Adnan · Afnan Habeeb · Harshavardhana D K
                </p>
              </div>
            </div>
          </footer>
        </div>
      </main>
    </>
  );
}
