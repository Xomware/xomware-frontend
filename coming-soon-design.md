# Xomware Frontend — Coming Soon Section & Agent Blobs
## Full Design Specification

> **Document:** coming-soon-design.md  
> **Project:** xomware-frontend  
> **Stack:** Angular 18, GSAP 3.14, SCSS, SVG  
> **Status:** Design Complete — Ready for Implementation  
> **Created:** 2026-02-28

---

## Table of Contents
1. [Overview](#overview)
2. [Coming Soon Section — Design Spec](#coming-soon-section)
3. [Agent Blobs — Design Spec](#agent-blobs)
4. [Component Breakdown](#component-breakdown)
5. [Styling Approach](#styling-approach)
6. [Implementation Plan](#implementation-plan)
7. [Ticket Breakdown](#ticket-breakdown)

---

## 1. Overview

### What We're Building
Two major homepage features for `xomware.com`:

**A) Coming Soon Section**
A "🚧 Under Construction" section between the existing app cards and footer, showcasing **xomfit** and **Float** as unreleased products. Uses construction/caution tape aesthetic rendered in Xomware's dark design system.

**B) Agent Blob Scene**
An animated "office scene" on the homepage where the Xomware AI agents (Boris, Forge, Rocco, Winston, Stormy, Debo) are visible as named, distinct blob characters — each with unique designs, accessories, and idle/interaction animations. Extends and replaces the existing `MonsterComponent`.

### Design Principles
- **Playful but professional** — construction vibe without feeling broken
- **Performance first** — all animations GPU-accelerated, reduced-motion respected
- **Extends existing patterns** — builds on MonsterComponent + GSAP architecture
- **No new dependencies** — GSAP + SCSS is sufficient

---

## 2. Coming Soon Section — Design Spec

### 2.1 Layout Structure

```
SECTION: .coming-soon-section
├── .caution-tape-banner          ← scrolling marquee strip
├── .coming-soon-header
│   ├── h2.section-title         "🔧 The Build Queue"
│   └── p.section-subtitle       "Forge is working on it. Stand back."
├── .coming-soon-grid
│   ├── .coming-soon-card#xomfit
│   └── .coming-soon-card#float
└── .coming-soon-footer-hint
    └── small text: "Be first to know → coming soon to iOS"
```

### 2.2 Caution Tape Banner

**Visual Design:**
```scss
.caution-tape-banner {
  width: 100%;
  height: 36px;
  background: repeating-linear-gradient(
    -45deg,
    #FFD600 0px,
    #FFD600 22px,
    #1a1a1a 22px,
    #1a1a1a 44px
  );
  overflow: hidden;
  position: relative;
  box-shadow: 0 0 16px rgba(255, 214, 0, 0.25);
}

.caution-tape-text {
  display: flex;
  white-space: nowrap;
  animation: marquee 14s linear infinite;
  height: 100%;
  align-items: center;
}

.caution-tape-text span {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  font-weight: 700;
  color: #1a1a1a;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 0 24px;
  /* Repeating text for seamless scroll */
}

@keyframes marquee {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
```

**Tape Text Content (repeating loop):**
```
🚧 UNDER CONSTRUCTION · 🔧 COMING SOON · ⚡ XOMWARE LABS · 🤖 AGENTS BUILDING · 
```

**Two tape strips** — one at top of section, one rotated `-2deg` at 35% opacity as decorative element.

### 2.3 Coming Soon Card Design

**Dimensions:** `320px × 420px` (desktop), fluid on mobile

**Card Anatomy:**
```
┌─────────────────────────────────┐
│ ▒▒▒▒▒▒▒ COMING SOON ▒▒▒▒▒▒▒▒   │  ← caution pill badge (top stripe)
│                                 │
│         [APP LOGO]              │  ← blurred/grayscale → color on hover
│       (center, 96×96)           │
│                                 │
│       App Name                  │  ← bold, 24px, white
│       iOS  •  2026              │  ← meta row
│                                 │
│   Short description of the      │  ← 14px, text-secondary, 3 lines max
│   app — what it does and        │
│   why it's exciting.            │
│                                 │
│  ┌───────────────────────────┐  │
│  │  🍎  Coming to iOS        │  │  ← iOS platform badge
│  └───────────────────────────┘  │
│                                 │
│  [  🔔  Notify Me  ]            │  ← ghost button CTA
│                                 │
└─────────────────────────────────┘
```

**Card SCSS:**
```scss
.coming-soon-card {
  background: linear-gradient(135deg, rgba(26, 26, 46, 0.98) 0%, rgba(10, 10, 20, 0.98) 100%);
  border: 1px solid rgba(var(--app-rgb), 0.2);
  border-radius: 20px;
  padding: 0 0 28px;
  width: 320px;
  position: relative;
  overflow: hidden;
  transition: transform 300ms ease, box-shadow 300ms ease, border-color 300ms ease;
  
  // Diagonal shimmer sweep
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      105deg,
      transparent 40%,
      rgba(255, 255, 255, 0.03) 50%,
      transparent 60%
    );
    animation: shimmer 4s ease-in-out infinite;
    pointer-events: none;
  }
  
  &:hover {
    transform: translateY(-6px);
    box-shadow: 0 16px 40px rgba(var(--app-rgb), 0.18);
    border-color: rgba(var(--app-rgb), 0.5);
    
    .card-logo img {
      filter: none; // snap to color
      transform: scale(1.05);
    }
  }
}

@keyframes shimmer {
  0%, 100% { transform: translateX(-100%); }
  50%       { transform: translateX(200%); }
}

.card-caution-badge {
  background: repeating-linear-gradient(
    -45deg,
    #FFD600 0px, #FFD600 10px,
    #1a1a1a 10px, #1a1a1a 20px
  );
  color: #1a1a1a;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  text-align: center;
  padding: 6px 0;
  margin-bottom: 24px;
}

.card-logo img {
  width: 96px;
  height: 96px;
  border-radius: 20px;
  filter: grayscale(0.7) brightness(0.7);
  transition: filter 400ms ease, transform 300ms ease;
}

.ios-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 6px 14px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
}

.notify-btn {
  background: transparent;
  border: 1px solid rgba(var(--app-rgb), 0.4);
  border-radius: 10px;
  color: rgb(var(--app-rgb));
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 200ms ease;
  
  &:hover {
    background: rgba(var(--app-rgb), 0.12);
    border-color: rgba(var(--app-rgb), 0.7);
  }
}
```

### 2.4 App-Specific Data

**xomfit:**
```typescript
{
  id: 'xomfit',
  name: 'XomFit',
  tagline: 'Social fitness & lifting tracker',
  description: 'Track your lifts, challenge friends, follow AI-powered workout plans. Your gym crew, in your pocket.',
  color: '#34C759',
  colorRgb: '52, 199, 89',
  platform: 'iOS',
  logo: 'assets/img/xomfit-logo.png',  // placeholder needed
  url: 'https://xomfit.xomware.com',
}
```

**Float:**
```typescript
{
  id: 'float',
  name: 'Float',
  tagline: 'Real-time deals for bars & restaurants',
  description: 'Live happy hour pricing, rotating deals, and the best spots near you — updated in real time.',
  color: '#FFB800',
  colorRgb: '255, 184, 0',
  platform: 'iOS',
  logo: 'assets/img/float-logo.png',  // placeholder needed
  url: 'https://float.xomware.com',
}
```

### 2.5 Section Header

```html
<div class="coming-soon-header">
  <span class="section-eyebrow">🔧 The Build Queue</span>
  <h2 class="section-title">What's Coming Next</h2>
  <p class="section-subtitle">Forge is hard at work. These ship soon.</p>
</div>
```

```scss
.section-eyebrow {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: $caution-yellow;
  opacity: 0.9;
}

.section-title {
  font-size: clamp(28px, 4vw, 40px);
  font-weight: 800;
  color: $text-primary;
  margin: 8px 0 12px;
}

.section-subtitle {
  font-size: 16px;
  color: $text-secondary;
  font-style: italic;
}
```

---

## 3. Agent Blobs — Design Spec

### 3.1 Architecture

The existing `MonsterComponent` (anonymous blob swarm) gets **upgraded** to a named **AgentSceneComponent** where each blob has:
- Unique identity (name, color, role)
- Distinct accessories (SVG overlays)
- Role-specific idle animation
- Interaction behaviors (mouse hover, collision with other agents)

**Backward compatibility:** MonsterComponent stays as-is. AgentSceneComponent is a new sibling component. Landing page can host both or transition to the agent scene.

### 3.2 Agent Character Specs

#### Boris — iMessage Dispatcher
| Property | Value |
|----------|-------|
| Color | `#00b4d8` (Xomware cyan) |
| Size | Medium (scale 1.0) |
| Accessories | Chat bubble icon (top-right), phone nub |
| Role text | "Dispatching..." |
| Idle animation | Pacing left/right, 3s cycle |
| Signature | Chat bubble pops: "📨" then fades |
| Hover tooltip | "Boris · iMessage Dispatcher" |

#### Forge — Code Builder
| Property | Value |
|----------|-------|
| Color | `#FF6B35` (construction orange) |
| Size | Large (scale 1.2) |
| Accessories | Hard hat on top (SVG), wrench nub |
| Role text | "Building..." |
| Idle animation | Rhythmic bounce (hammering), 1.2s cycle |
| Signature | PR badge floats up + sparkles |
| Hover tooltip | "Forge · Code Builder" |

#### Rocco — Research Analyst
| Property | Value |
|----------|-------|
| Color | `#9C0ABF` (purple) |
| Size | Medium-small (scale 0.85) |
| Accessories | Magnifying glass (orbiting) |
| Role text | "Analyzing..." |
| Idle animation | Lean toward "screen" area, head tilt 10deg, 2s cycle |
| Signature | Data points orbit around blob |
| Hover tooltip | "Rocco · Research Analyst" |

#### Winston — CI Watchdog
| Property | Value |
|----------|-------|
| Color | `#00FFAB` (emerald) |
| Size | Medium (scale 1.0) |
| Accessories | Coffee cup (steaming), CI badge chip |
| Role text | "Monitoring builds..." |
| Idle animation | Slow patrol walk, coffee steam puffs |
| Signature | Green ✓ checkmark floats up |
| Hover tooltip | "Winston · CI/CD Watchdog" |

#### Stormy — Memory Curator
| Property | Value |
|----------|-------|
| Color | `#4A90D9` (sky blue) |
| Size | Small (scale 0.8) |
| Accessories | Quill pen nub, floating notebook |
| Role text | "Documenting..." |
| Idle animation | Quill oscillates (writing motion), notebook pages flutter |
| Signature | Memory card files into notebook |
| Hover tooltip | "Stormy · Memory Curator" |

#### Debo — Infrastructure Agent
| Property | Value |
|----------|-------|
| Color | `#E74C3C` (server red) |
| Size | Large (scale 1.15) |
| Accessories | Server rack icon overhead, Terraform chip |
| Role text | "Watching infra..." |
| Idle animation | Arms-crossed slow nod, very slow movement |
| Signature | Server glow pulses green → "✓ Online" |
| Hover tooltip | "Debo · Infrastructure Agent" |

### 3.3 SVG Blob Template (Per Agent)

Each agent blob extends the existing blob SVG pattern with an accessory group:

```svg
<!-- Agent Blob Template -->
<g class="agent-blob agent-{{name}}" data-agent="{{name}}">
  <!-- Body (ellipse, matches existing MonsterComponent) -->
  <ellipse class="b-body" cx="0" cy="0" rx="18" ry="15" fill="{{color}}"/>
  
  <!-- Eyes (two ellipses, existing pattern) -->
  <g class="b-eyes">
    <ellipse cx="-5" cy="-4" rx="3" ry="4" fill="white"/>
    <ellipse cx="5" cy="-4" rx="3" ry="4" fill="white"/>
    <ellipse cx="-5" cy="-3" rx="1.5" ry="2" fill="#0a0a14"/>
    <ellipse cx="5" cy="-3" rx="1.5" ry="2" fill="#0a0a14"/>
  </g>
  
  <!-- Mouth (path, existing pattern) -->
  <path class="b-mouth" d="M-3,5 Q0,8 3,5" fill="none" stroke="#0a0a14" stroke-width="1.5" stroke-linecap="round"/>
  
  <!-- Arms (nubs for waving) -->
  <ellipse class="arm-left" cx="-20" cy="2" rx="7" ry="4" fill="{{color}}" opacity="0.9"/>
  <ellipse class="arm-right" cx="20" cy="2" rx="7" ry="4" fill="{{color}}" opacity="0.9"/>
  
  <!-- Accessory Group (agent-specific SVG) -->
  <g class="accessory-group">
    <!-- Agent-specific icons added here -->
  </g>
  
  <!-- Name label (shown on hover) -->
  <text class="agent-label" y="28" text-anchor="middle" 
        font-size="7" font-weight="700" fill="{{color}}" opacity="0">
    {{NAME}}
  </text>
  
  <!-- Status bubble (shown during signature animation) -->
  <g class="status-bubble" opacity="0">
    <rect rx="4" fill="rgba(10,10,20,0.9)" stroke="{{color}}" stroke-width="0.5"/>
    <text font-size="8">{{status_emoji}}</text>
  </g>
</g>
```

### 3.4 Agent Accessory SVGs

**Boris — Chat Bubble:**
```svg
<g class="accessory-group accessory-boris">
  <!-- Speech bubble top-right -->
  <rect class="bubble-bg" x="12" y="-28" width="18" height="12" rx="4" 
        fill="#00b4d8" opacity="0.9"/>
  <polygon points="14,-16 18,-16 16,-12" fill="#00b4d8" opacity="0.9"/>
  <text x="21" y="-19" text-anchor="middle" font-size="6" fill="white">💬</text>
  <!-- Phone nub (right arm) -->
  <rect class="phone-nub" x="17" y="-2" width="6" height="9" rx="2" 
        fill="#1a1a2e" stroke="#00b4d8" stroke-width="0.7"/>
</g>
```

**Forge — Hard Hat + Wrench:**
```svg
<g class="accessory-group accessory-forge">
  <!-- Hard hat -->
  <ellipse cx="0" cy="-20" rx="16" ry="7" fill="#FF6B35"/>
  <rect x="-12" y="-17" width="24" height="4" rx="2" fill="#FF6B35"/>
  <rect x="-14" y="-15" width="28" height="2" rx="1" fill="#e05a28"/>
  <!-- Wrench (right arm accessory) -->
  <g class="wrench" transform="translate(18, 0) rotate(45)">
    <rect x="-2" y="-8" width="4" height="12" rx="1" fill="#aaa"/>
    <rect x="-4" y="-10" width="8" height="3" rx="1" fill="#aaa"/>
  </g>
</g>
```

**Winston — Coffee Cup:**
```svg
<g class="accessory-group accessory-winston">
  <!-- Coffee cup (left arm) -->
  <rect class="cup-body" x="-28" y="-4" width="10" height="10" rx="2" 
        fill="#5d4037"/>
  <rect x="-28" y="-4" width="10" height="3" rx="1" fill="#00FFAB" opacity="0.6"/>
  <!-- Steam puffs -->
  <path class="steam-1" d="M-24,-5 Q-22,-9 -24,-13" fill="none" 
        stroke="rgba(255,255,255,0.4)" stroke-width="1.5" stroke-linecap="round"/>
  <path class="steam-2" d="M-21,-5 Q-19,-9 -21,-13" fill="none" 
        stroke="rgba(255,255,255,0.4)" stroke-width="1.5" stroke-linecap="round"/>
  <!-- CI badge -->
  <rect x="15" y="-28" width="14" height="9" rx="3" fill="#00FFAB"/>
  <text x="22" y="-21" text-anchor="middle" font-size="5" fill="#0a0a14" font-weight="800">CI ✓</text>
</g>
```

**Rocco — Magnifying Glass:**
```svg
<g class="accessory-group accessory-rocco">
  <!-- Orbiting magnifying glass -->
  <circle class="mag-lens" cx="24" cy="-10" r="8" fill="none" 
          stroke="#9C0ABF" stroke-width="2"/>
  <line class="mag-handle" x1="30" y1="-4" x2="35" y2="1" 
        stroke="#9C0ABF" stroke-width="2.5" stroke-linecap="round"/>
  <!-- Data dots orbiting -->
  <circle class="data-dot-1" cx="0" cy="-30" r="2" fill="#9C0ABF" opacity="0.8"/>
  <circle class="data-dot-2" cx="30" cy="-20" r="1.5" fill="#9C0ABF" opacity="0.6"/>
  <circle class="data-dot-3" cx="-25" cy="-20" r="1.5" fill="#9C0ABF" opacity="0.6"/>
</g>
```

### 3.5 Animation Library (GSAP)

**Idle Animations per Agent:**

```typescript
// Boris: Pacing
private animateBorisPace(blob: Element): void {
  gsap.to(blob, {
    x: '+=40',
    duration: 1.8,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
  });
}

// Forge: Hammering bounce
private animateForgeHammer(blob: Element): void {
  const body = blob.querySelector('.b-body');
  gsap.to(blob, {
    y: '+=3',
    duration: 0.3,
    ease: 'power2.in',
    yoyo: true,
    repeat: -1,
  });
  gsap.to(body, {
    attr: { ry: 13 }, // squash on hammer down
    duration: 0.3,
    ease: 'power2.in',
    yoyo: true,
    repeat: -1,
  });
}

// Forge: PR badge floats up
private animateForgePR(blob: Element): void {
  const badge = blob.querySelector('.pr-badge');
  gsap.fromTo(badge,
    { opacity: 0, y: 0 },
    { 
      keyframes: [
        { opacity: 1, y: -15, duration: 0.5 },
        { opacity: 1, y: -30, duration: 1.0 },
        { opacity: 0, y: -45, duration: 0.5 }
      ],
      repeat: -1,
      repeatDelay: 8,
    }
  );
}

// Winston: Patrol walk
private animateWinstonPatrol(blob: Element): void {
  const steam1 = blob.querySelector('.steam-1');
  const steam2 = blob.querySelector('.steam-2');
  
  // Walk left-right
  gsap.to(blob, {
    x: '+=80',
    duration: 4,
    ease: 'none',
    yoyo: true,
    repeat: -1,
  });
  
  // Steam puffs
  gsap.to([steam1, steam2], {
    opacity: 0,
    y: '-=4',
    duration: 0.8,
    ease: 'sine.out',
    stagger: 0.2,
    repeat: -1,
    repeatDelay: 0.2,
  });
}

// Winston: CI checkmark float
private animateWinstonCheck(blob: Element): void {
  const check = blob.querySelector('.ci-check');
  gsap.fromTo(check,
    { opacity: 0, y: 0, scale: 0.5 },
    {
      keyframes: [
        { opacity: 1, y: -10, scale: 1.2, duration: 0.3 },
        { opacity: 0.8, y: -20, scale: 1, duration: 0.8 },
        { opacity: 0, y: -35, duration: 0.5 }
      ],
      repeat: -1,
      repeatDelay: 12,
    }
  );
}

// Rocco: Data dot orbit
private animateRoccoOrbit(blob: Element): void {
  const dots = blob.querySelectorAll('.data-dot-1, .data-dot-2, .data-dot-3');
  dots.forEach((dot, i) => {
    const startAngle = (i / dots.length) * Math.PI * 2;
    const radius = 28;
    let angle = startAngle;
    
    gsap.to({}, {
      duration: 3 + i * 0.5,
      repeat: -1,
      ease: 'none',
      onUpdate: function() {
        angle += 0.05;
        gsap.set(dot, {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius * 0.6,
        });
      }
    });
  });
}

// Stormy: Writing motion
private animateStormyWrite(blob: Element): void {
  const quill = blob.querySelector('.accessory-stormy');
  gsap.to(quill, {
    x: '+=4',
    y: '+=2',
    duration: 0.4,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
  });
}

// Debo: Slow nod, crossed arms static
private animateDeboNod(blob: Element): void {
  gsap.to(blob, {
    y: '+=2',
    duration: 2.5,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
  });
  // Arms always crossed — no nub movement
}
```

### 3.6 Interaction Patterns

**Mouse Hover on Individual Agent:**
```typescript
onAgentHover(agentName: string): void {
  const blob = this.getBlob(agentName);
  
  // Show name label
  gsap.to(blob.querySelector('.agent-label'), {
    opacity: 1,
    duration: 0.3,
    ease: 'power2.out',
  });
  
  // Scale up slightly
  gsap.to(blob, {
    scale: 1.15,
    duration: 0.3,
    ease: 'back.out(1.7)',
  });
  
  // Wave animation (arm up-down)
  const armRight = blob.querySelector('.arm-right');
  gsap.to(armRight, {
    rotation: -30,
    transformOrigin: 'left center',
    duration: 0.25,
    yoyo: true,
    repeat: 3,
    ease: 'sine.inOut',
  });
}
```

**Agent Collision / Interaction:**
```typescript
private checkAgentProximity(): void {
  // Called every 500ms via setInterval
  const agents = this.agentPositions;
  
  for (let i = 0; i < agents.length; i++) {
    for (let j = i + 1; j < agents.length; j++) {
      const dx = agents[i].x - agents[j].x;
      const dy = agents[i].y - agents[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < 30) { // Blobs touching
        this.triggerCollision(agents[i].name, agents[j].name);
      }
    }
  }
}

private triggerCollision(a: string, b: string): void {
  // Random interaction: bounce off, emoji pop, or secret handshake
  const interactions = ['bounce', 'emoji', 'wave'];
  const type = interactions[Math.floor(Math.random() * interactions.length)];
  
  if (type === 'emoji') {
    this.showEmoji(['😂', '🤝', '👋', '💪', '🎉'][Math.floor(Math.random() * 5)]);
  }
  // Bounce them apart
  this.bounceApart(a, b);
}
```

**Scroll Into View (Intersection Observer):**
```typescript
private setupScrollTrigger(): void {
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      // All agents notice viewer — wave simultaneously
      this.allAgentsWave();
      observer.disconnect();
    }
  }, { threshold: 0.3 });
  
  observer.observe(this.hostEl.nativeElement);
}
```

**Click on Agent (Status Modal):**
```typescript
onAgentClick(agentName: string): void {
  const agent = this.agents.find(a => a.name === agentName);
  this.selectedAgent = agent;
  // Modal shows: name, role, current task, last action, color-coded
}
```

---

## 4. Component Breakdown

### New Components to Create

```
src/app/components/
├── coming-soon/
│   ├── coming-soon-section/
│   │   ├── coming-soon-section.component.ts     ← Section orchestrator
│   │   ├── coming-soon-section.component.html
│   │   └── coming-soon-section.component.scss
│   ├── caution-tape/
│   │   ├── caution-tape.component.ts            ← Scrolling marquee
│   │   ├── caution-tape.component.html
│   │   └── caution-tape.component.scss
│   └── coming-soon-card/
│       ├── coming-soon-card.component.ts        ← Individual app card
│       ├── coming-soon-card.component.html
│       └── coming-soon-card.component.scss
└── agent-scene/
    ├── agent-scene/
    │   ├── agent-scene.component.ts             ← Scene orchestrator
    │   ├── agent-scene.component.html
    │   └── agent-scene.component.scss
    ├── agent-blob/
    │   ├── agent-blob.component.ts              ← Individual named blob
    │   ├── agent-blob.component.html
    │   └── agent-blob.component.scss
    └── agent-status-modal/
        ├── agent-status-modal.component.ts      ← Click popup
        ├── agent-status-modal.component.html
        └── agent-status-modal.component.scss
```

### Modified Components

| Component | Change |
|-----------|--------|
| `landing.component.html` | Add `<app-coming-soon-section>` + `<app-agent-scene>` |
| `landing.component.ts` | Import new components, add agent data |
| `_variables.scss` | Add caution yellow + agent color tokens |
| `app.module.ts` | Register all new components |

### Interfaces (TypeScript)

```typescript
// coming-soon.models.ts
export interface ComingSoonApp {
  id: string;
  name: string;
  tagline: string;
  description: string;
  color: string;
  colorRgb: string;  // e.g. "52, 199, 89" for CSS rgba()
  platform: 'iOS' | 'Android' | 'Web';
  logo: string;
  url: string;
  releaseHint?: string; // "Spring 2026"
}

// agent.models.ts
export interface AgentBlob {
  name: string;           // 'boris', 'forge', etc.
  displayName: string;    // 'Boris'
  role: string;           // 'iMessage Dispatcher'
  color: string;          // hex
  scale: number;          // 0.8 - 1.2
  startX: number;
  startY: number;
  idleAnimation: AgentAnimation;
  signatureAnimation: AgentAnimation;
  currentTask?: string;   // live status text
  lastAction?: string;
}

export type AgentAnimation = 
  | 'pace' | 'hammer' | 'patrol' | 'orbit' | 'write' | 'nod';
```

---

## 5. Styling Approach

### New Design Tokens (add to `_variables.scss`)

```scss
// ── Coming Soon ──────────────────────────────
$caution-yellow: #FFD600;
$caution-black: #1a1a1a;
$caution-stripe: repeating-linear-gradient(
  -45deg,
  #{$caution-yellow} 0px,
  #{$caution-yellow} 22px,
  #{$caution-black} 22px,
  #{$caution-black} 44px
);
$caution-glow: rgba(255, 214, 0, 0.25);

// App coming-soon colors
$xomfit-green: #34C759;
$xomfit-rgb: 52, 199, 89;
$float-gold: #FFB800;
$float-rgb: 255, 184, 0;

// ── Agent Colors ──────────────────────────────
$agent-boris: #00b4d8;
$agent-forge: #FF6B35;
$agent-rocco: #9C0ABF;
$agent-winston: #00FFAB;
$agent-stormy: #4A90D9;
$agent-debo: #E74C3C;
```

### Animation Performance Rules
- All GSAP animations target `x`, `y`, `scale`, `opacity` → GPU composited
- SVG `attr` tweens (for rx/ry morphing) acceptable for blob bodies
- Never tween `width`, `height`, `top`, `left` (forces reflow)
- Use `will-change: transform` on agent SVG containers
- `prefers-reduced-motion` media query: disable all non-essential animations

```scss
@media (prefers-reduced-motion: reduce) {
  .caution-tape-text,
  .agent-blob,
  .coming-soon-card::before {
    animation: none !important;
  }
}
```

### Responsive Breakpoints

| Viewport | Layout |
|----------|--------|
| ≥ 992px | Two-column card grid, full agent scene |
| 768–992px | Two-column cards, simplified agent scene (3 agents) |
| < 768px | Single column cards, agent scene hidden (replaced by static illustration) |

---

## 6. Implementation Plan

### Phase 1: Foundation (Week 1)
- Design tokens + variables update
- CautionTapeComponent (pure CSS/HTML, zero JS)
- ComingSoonCardComponent (static, no animation)
- ComingSoonSectionComponent (orchestrator)
- Landing page integration

### Phase 2: Coming Soon Polish (Week 1-2)
- Card shimmer animations
- Card hover interactions
- Placeholder logos (xomfit + float)
- Notify Me button (UI only, no backend)

### Phase 3: Agent Scene Foundation (Week 2)
- AgentBlobComponent (extends MonsterComponent pattern)
- Agent SVG designs for all 6 agents
- Basic idle animations (GSAP)
- AgentSceneComponent orchestrator

### Phase 4: Agent Interactions (Week 2-3)
- Hover tooltips + name labels
- Scroll-into-view wave trigger
- Agent collision detection + emoji pops
- Click → AgentStatusModal

### Phase 5: Polish & QA (Week 3)
- Mobile responsive behavior
- Reduced motion support
- Performance audit (60fps on mid-range devices)
- Cross-browser testing (Safari, Chrome, Firefox)

---

## 7. Ticket Breakdown

### TICKET 1: [xomware-frontend] Design Tokens — Coming Soon + Agent Colors
**Repo:** xomware-frontend  
**Type:** chore  
**Size:** XS (30 min)  
**Description:**
Add `$caution-yellow`, `$caution-stripe`, `$caution-glow`, `$xomfit-green`, `$float-gold`, and all 6 agent color tokens to `_variables.scss`. No visual changes, just token additions.

---

### TICKET 2: [xomware-frontend] CautionTapeComponent — Scrolling Marquee Banner
**Repo:** xomware-frontend  
**Type:** feature  
**Size:** S (2h)  
**Description:**
Build `CautionTapeComponent` — pure CSS + HTML scrolling marquee with yellow-black diagonal stripe background. Accepts `[text]` input for marquee content. Infinite scroll, reduced-motion safe.

**Acceptance Criteria:**
- [ ] Diagonal stripe background renders correctly
- [ ] Text scrolls infinitely at 14s cycle
- [ ] Works on mobile viewports
- [ ] Reduced motion: static (no scroll)

---

### TICKET 3: [xomware-frontend] ComingSoonCardComponent — App Teaser Card
**Repo:** xomware-frontend  
**Type:** feature  
**Size:** M (4h)  
**Description:**
Build `ComingSoonCardComponent` with: caution badge stripe header, blurred logo (color on hover), app name/tagline/description, iOS platform badge, "Notify Me" ghost button. Accepts `[app]` input of type `ComingSoonApp`.

**Acceptance Criteria:**
- [ ] Card renders with correct app data (xomfit + float)
- [ ] Logo transitions grayscale→color on hover
- [ ] Card lifts 6px on hover with glow
- [ ] Shimmer animation on card surface
- [ ] Notify Me button has hover state

---

### TICKET 4: [xomware-frontend] ComingSoonSectionComponent — Section Orchestrator
**Repo:** xomware-frontend  
**Type:** feature  
**Size:** S (2h)  
**Description:**
Build `ComingSoonSectionComponent` that hosts 2x `ComingSoonCardComponent` and 2x `CautionTapeComponent` strips. Section header with eyebrow/title/subtitle. Integrates into landing page between app cards and footer.

**Acceptance Criteria:**
- [ ] Section renders between existing app cards and footer
- [ ] Two caution tape strips (top + decorative angled)
- [ ] Two-column card grid (one-column on mobile)
- [ ] Section header copy correct

---

### TICKET 5: [xomware-frontend] Placeholder Logos for xomfit + Float
**Repo:** xomware-frontend  
**Type:** chore  
**Size:** XS (30 min)  
**Description:**
Create SVG placeholder logos for xomfit and Float that work in the coming-soon cards until real assets are provided. xomfit: dumbbell + lightning bolt silhouette in green. Float: martini glass silhouette in gold.

**Acceptance Criteria:**
- [ ] `assets/img/xomfit-placeholder.svg` created
- [ ] `assets/img/float-placeholder.svg` created
- [ ] Both look good at 96×96px
- [ ] Both look correct in dark card context

---

### TICKET 6: [xomware-frontend] AgentBlobComponent — Named Agent SVG Blobs
**Repo:** xomware-frontend  
**Type:** feature  
**Size:** L (8h)  
**Description:**
Build `AgentBlobComponent` that renders a named agent blob using SVG + GSAP. Supports all 6 agents (Boris, Forge, Rocco, Winston, Stormy, Debo). Each agent has unique: color, accessories SVG overlay, idle animation, name label. Accepts `[agent]` input of type `AgentBlob`.

**Acceptance Criteria:**
- [ ] All 6 agent designs rendered with correct colors + accessories
- [ ] Name label appears on hover
- [ ] Each agent has distinct idle animation running
- [ ] Blink loop works (inherited from MonsterComponent)
- [ ] Scale input applied correctly
- [ ] No TypeScript errors

---

### TICKET 7: [xomware-frontend] AgentSceneComponent — Scene Orchestrator
**Repo:** xomware-frontend  
**Type:** feature  
**Size:** M (4h)  
**Description:**
Build `AgentSceneComponent` that places all 6 agent blobs in an SVG scene with zone-based positioning. Orchestrates agent movement between zones, collision detection, and proximity interactions (emoji pops, bounce-apart).

**Acceptance Criteria:**
- [ ] All 6 agents rendered in correct starting positions
- [ ] Agents wander within their zones (don't cross entire scene)
- [ ] Collision detection triggers bounce + random emoji pop
- [ ] Scroll-into-view wave trigger (IntersectionObserver)
- [ ] Mobile: shows 3 agents only (Boris, Forge, Winston)

---

### TICKET 8: [xomware-frontend] Agent Hover + Click Interactions
**Repo:** xomware-frontend  
**Type:** feature  
**Size:** M (4h)  
**Description:**
Add interactive layer to agent blobs: hover shows name tooltip + scale-up + wave arm. Click opens `AgentStatusModal` with agent name, role, color, and "current task" text. Modal dismisses on backdrop click or Escape.

**Acceptance Criteria:**
- [ ] Hover: tooltip visible, blob scales 1.15x, arm waves 3x
- [ ] Click: modal opens with correct agent data
- [ ] Modal has agent color accent
- [ ] Modal closes on backdrop click + Escape key
- [ ] Works on touch (tap = click behavior)

---

### TICKET 9: [xomware-frontend] Agent Signature Animations
**Repo:** xomware-frontend  
**Type:** feature  
**Size:** M (4h)  
**Description:**
Implement each agent's signature animation that fires on a random interval (every 8–15 seconds): Boris chat bubble pop, Forge PR badge float, Winston CI checkmark, Rocco data dot orbit burst, Stormy memory card file, Debo server pulse.

**Acceptance Criteria:**
- [ ] All 6 signature animations implement
- [ ] Each fires on randomized interval (not synced)
- [ ] Animations are non-distracting (subtle opacity/float)
- [ ] Reduced motion: signature animations disabled

---

### TICKET 10: [xomware-frontend] Landing Page Integration + Responsive QA
**Repo:** xomware-frontend  
**Type:** feature + QA  
**Size:** M (4h)  
**Description:**
Integrate `AgentSceneComponent` and `ComingSoonSectionComponent` into `landing.component.html`. Full responsive testing across breakpoints. Performance audit: verify 60fps on throttled CPU. Reduced-motion compliance check. Cross-browser QA.

**Acceptance Criteria:**
- [ ] Both sections visible on landing page in correct order
- [ ] Mobile (< 768px): coming-soon cards stack, agent scene simplified
- [ ] Tablet (768–992px): two-column cards, 3-agent scene
- [ ] Desktop (≥ 992px): full layout
- [ ] 60fps on 4x CPU throttle in Chrome DevTools
- [ ] `prefers-reduced-motion` disables all animations
- [ ] No TS errors, no console errors
- [ ] Tested: Chrome, Safari, Firefox

---

## Appendix: File Paths Quick Reference

```
New Files:
  src/app/components/coming-soon/coming-soon-section/
  src/app/components/coming-soon/caution-tape/
  src/app/components/coming-soon/coming-soon-card/
  src/app/components/agent-scene/agent-scene/
  src/app/components/agent-scene/agent-blob/
  src/app/components/agent-scene/agent-status-modal/
  src/app/models/coming-soon.models.ts
  src/app/models/agent.models.ts
  src/assets/img/xomfit-placeholder.svg
  src/assets/img/float-placeholder.svg

Modified Files:
  src/styles/_variables.scss  (new tokens)
  src/app/components/landing/landing.component.html  (section additions)
  src/app/components/landing/landing.component.ts  (app data + imports)
  src/app/app.module.ts  (component registration)
```
