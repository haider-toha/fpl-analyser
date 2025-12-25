# FPL Analyser by Haider

An advanced Fantasy Premier League analytics platform combining machine learning, Monte Carlo simulations, and mathematical optimization for data-driven FPL decisions.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FPL ANALYSER PLATFORM                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│   │   Player    │    │    Squad    │    │   Monte     │    │    Live     │ │
│   │  Analysis   │    │ Optimization│    │   Carlo     │    │  Tracking   │ │
│   │             │    │             │    │ Simulations │    │             │ │
│   └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘ │
│                                                                             │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│   │  Transfer   │    │   League    │    │   Fixture   │    │    Chip     │ │
│   │  Planner    │    │  Analytics  │    │  Analysis   │    │  Strategy   │ │
│   │             │    │             │    │             │    │             │ │
│   └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Data Pipeline](#data-pipeline)
- [Machine Learning System](#machine-learning-system)
- [Optimization Engine](#optimization-engine)
- [Simulation Framework](#simulation-framework)
- [Frontend Architecture](#frontend-architecture)
- [Core Features](#core-features)
- [Performance](#performance)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Deployment](#deployment)

---

## Overview

Fantasy Premier League presents a **multi-period stochastic optimization problem**:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        THE THREE CORE CHALLENGES                         │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐ │
│  │                    │  │                    │  │                    │ │
│  │    PREDICTION      │  │   OPTIMIZATION     │  │  RISK ASSESSMENT   │ │
│  │                    │  │                    │  │                    │ │
│  │  How many points   │  │  Which 15 players  │  │  What's the range  │ │
│  │  will each player  │  │  maximize returns  │  │  of outcomes, not  │ │
│  │  score next GW?    │  │  under budget &    │  │  just the average? │ │
│  │                    │  │  squad rules?      │  │                    │ │
│  │  ┌──────────────┐  │  │  ┌──────────────┐  │  │  ┌──────────────┐  │ │
│  │  │ ML Models    │  │  │  │ Integer LP   │  │  │  │ Monte Carlo  │  │ │
│  │  │ xG, Form,    │  │  │  │ CBC Solver   │  │  │  │ 10,000 sims  │  │ │
│  │  │ Fixtures     │  │  │  │ <1 sec solve │  │  │  │ distributions│  │ │
│  │  └──────────────┘  │  │  └──────────────┘  │  │  └──────────────┘  │ │
│  │                    │  │                    │  │                    │ │
│  └────────────────────┘  └────────────────────┘  └────────────────────┘ │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Why Quantitative FPL?

| Traditional Approach | FPL Analyser Approach |
|---------------------|----------------------|
| "This player looks good" | Expected points model with 50+ features |
| Pick players you like | ILP solver guarantees mathematical optimum |
| Gut feel on transfers | Multi-gameweek rolling horizon planning |
| Hope for the best | Probability distributions & confidence intervals |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              HIGH-LEVEL ARCHITECTURE                        │
└─────────────────────────────────────────────────────────────────────────────┘

                            ┌───────────────────┐
                            │                   │
                            │   Next.js App     │
                            │   (Frontend)      │
                            │                   │
                            └─────────┬─────────┘
                                      │
                                      │ REST API (JSON)
                                      │
                            ┌─────────▼─────────┐
                            │                   │
                            │   FastAPI         │
                            │   (Backend)       │
                            │                   │
                            └─────────┬─────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
    ┌─────────▼─────────┐   ┌─────────▼─────────┐   ┌─────────▼─────────┐
    │                   │   │                   │   │                   │
    │   ML Module       │   │   Optimizer       │   │   Simulator       │
    │                   │   │                   │   │                   │
    │ • Expected Points │   │ • Squad ILP       │   │ • Monte Carlo     │
    │ • Bayesian Models │   │ • Transfer Plan   │   │ • Distributions   │
    │ • Fixture Rating  │   │ • Captain Pick    │   │ • Risk Analysis   │
    │                   │   │                   │   │                   │
    └───────────────────┘   └───────────────────┘   └───────────────────┘
              │                       │                       │
              └───────────────────────┼───────────────────────┘
                                      │
                            ┌─────────▼─────────┐
                            │                   │
                            │   Data Layer      │
                            │   (FPL Client)    │
                            │                   │
                            │ • Async Fetching  │
                            │ • TTL Caching     │
                            │ • Rate Limiting   │
                            │                   │
                            └─────────┬─────────┘
                                      │
                                      │ HTTPS
                                      │
                            ┌─────────▼─────────┐
                            │                   │
                            │   Official FPL    │
                            │   API             │
                            │                   │
                            └───────────────────┘
```

### Backend Module Structure

```
backend/
├── app/
│   ├── api/                    # REST endpoints
│   │   ├── players.py          # Player data & stats
│   │   ├── optimizer.py        # Squad optimization
│   │   ├── simulation.py       # Monte Carlo sims
│   │   ├── live.py             # Real-time scores
│   │   ├── leagues.py          # Mini-league data
│   │   └── analytics.py        # Advanced metrics
│   │
│   ├── data/                   # Data access layer
│   │   └── fpl_client.py       # FPL API wrapper
│   │
│   ├── ml/                     # Machine learning
│   │   ├── expected_points.py  # Point predictions
│   │   ├── bayesian_model.py   # Player ability estimation
│   │   ├── fixture_analyzer.py # Fixture difficulty
│   │   ├── player_value.py     # VOR calculations
│   │   ├── transfer_planner.py # Multi-GW planning
│   │   └── chip_strategy.py    # Chip timing
│   │
│   ├── optimizer/              # Mathematical optimization
│   │   └── squad_optimizer.py  # ILP solver
│   │
│   ├── simulation/             # Monte Carlo engine
│   │   └── monte_carlo.py      # Probability sampling
│   │
│   └── models/                 # Domain models
│       └── player.py           # Player entity
```

---

## Data Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA FLOW PIPELINE                                │
└─────────────────────────────────────────────────────────────────────────────┘

  FPL API                                                           Consumer
     │                                                                  ▲
     │                                                                  │
     ▼                                                                  │
┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐
│         │      │         │      │         │      │         │      │         │
│ INGEST  │ ──── │NORMALIZE│ ──── │ ENRICH  │ ──── │  CACHE  │ ──── │  SERVE  │
│         │      │         │      │         │      │         │      │         │
└─────────┘      └─────────┘      └─────────┘      └─────────┘      └─────────┘
     │                │                │                │                │
     ▼                ▼                ▼                ▼                ▼
┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐
│Raw JSON │      │ Convert │      │Calculate│      │ TTL-    │      │ JSON    │
│from FPL │      │ types,  │      │ derived │      │ based   │      │ response│
│endpoints│      │ resolve │      │ metrics,│      │ in-mem  │      │ with    │
│         │      │ FKs     │      │ run ML  │      │ storage │      │ schema  │
└─────────┘      └─────────┘      └─────────┘      └─────────┘      └─────────┘
```

### FPL API Endpoints Used

| Endpoint | Data | Update Frequency | Cache TTL |
|----------|------|------------------|-----------|
| `bootstrap-static` | All players, teams, GWs | Daily | 15-30 min |
| `element-summary/{id}` | Player history & fixtures | Daily | 30 min |
| `fixtures` | Match schedule & results | Daily | 15 min |
| `event/{gw}/live` | Live scores | Every few min | 60 sec |
| `entry/{id}` | Manager squad & history | On request | 5 min |
| `leagues-classic/{id}` | League standings | On request | 5 min |

### Caching Strategy

```
                    Request arrives
                          │
                          ▼
                   ┌──────────────┐
                   │ Cache lookup │
                   └──────┬───────┘
                          │
             ┌────────────┴────────────┐
             │                         │
             ▼                         ▼
      ┌─────────────┐          ┌─────────────┐
      │  HIT        │          │  MISS       │
      │  (fresh)    │          │             │
      └──────┬──────┘          └──────┬──────┘
             │                        │
             │                        ▼
             │                 ┌─────────────┐
             │                 │ In-flight?  │
             │                 └──────┬──────┘
             │                        │
             │           ┌────────────┴────────────┐
             │           │                         │
             │           ▼                         ▼
             │    ┌─────────────┐          ┌─────────────┐
             │    │ YES: Wait   │          │ NO: Fetch   │
             │    │ for pending │          │ from FPL    │
             │    └──────┬──────┘          └──────┬──────┘
             │           │                        │
             │           │                        ▼
             │           │                 ┌─────────────┐
             │           │                 │Store in     │
             │           │                 │cache + TTL  │
             │           │                 └──────┬──────┘
             │           │                        │
             └───────────┴────────────────────────┘
                                   │
                                   ▼
                            Return data
```

**Key Patterns:**
- **Request Deduplication**: Concurrent requests for same data coalesce
- **Conditional Fetching**: ETag headers avoid re-downloading unchanged data
- **Tiered TTL**: Live data = short TTL, static data = long TTL

---

## Machine Learning System

### Expected Points Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EXPECTED POINTS PREDICTION                           │
└─────────────────────────────────────────────────────────────────────────────┘

                              INPUT FEATURES
    ┌─────────────────────────────────────────────────────────────────────┐
    │                                                                     │
    │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐       │
    │  │   FORM    │  │UNDERLYING │  │  FIXTURE  │  │AVAILABILITY│       │
    │  │           │  │   STATS   │  │  CONTEXT  │  │           │       │
    │  ├───────────┤  ├───────────┤  ├───────────┤  ├───────────┤       │
    │  │ Points/5  │  │ xG, xA    │  │ Home/Away │  │ Injury %  │       │
    │  │ Goals/5   │  │ xGI       │  │ Opp str.  │  │ Minutes   │       │
    │  │ Assists/5 │  │ Shots     │  │ Days rest │  │ trend     │       │
    │  │ Minutes/5 │  │ Key passes│  │ FDR       │  │ News      │       │
    │  │ BPS/5     │  │ per 90    │  │           │  │           │       │
    │  └───────────┘  └───────────┘  └───────────┘  └───────────┘       │
    │                                                                     │
    └──────────────────────────────┬──────────────────────────────────────┘
                                   │
                                   │  ~50-80 features
                                   │
                                   ▼
    ┌─────────────────────────────────────────────────────────────────────┐
    │                                                                     │
    │                     POSITION-SPECIFIC MODELS                        │
    │                                                                     │
    │    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐   │
    │    │   GKP    │    │   DEF    │    │   MID    │    │   FWD    │   │
    │    │  Model   │    │  Model   │    │  Model   │    │  Model   │   │
    │    │          │    │          │    │          │    │          │   │
    │    │ Saves,   │    │ CS, Tckl │    │ Goals,   │    │ Goals,   │   │
    │    │ Pen Save │    │ BPS      │    │ Assists  │    │ Assists  │   │
    │    └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘   │
    │         │               │               │               │         │
    └─────────┼───────────────┼───────────────┼───────────────┼─────────┘
              │               │               │               │
              └───────────────┴───────┬───────┴───────────────┘
                                      │
                                      ▼
    ┌─────────────────────────────────────────────────────────────────────┐
    │                       GRADIENT BOOSTING (XGBoost)                   │
    │                                                                     │
    │   • 100-200 trees, max depth 4-6                                   │
    │   • L1/L2 regularization to prevent overfitting                    │
    │   • Learning rate decay for refined predictions                    │
    │   • Cross-validation for hyperparameter tuning                     │
    │                                                                     │
    └──────────────────────────────┬──────────────────────────────────────┘
                                   │
                                   ▼
    ┌─────────────────────────────────────────────────────────────────────┐
    │                        CALIBRATION LAYER                            │
    │                                                                     │
    │   Platt scaling ensures probabilistic validity:                    │
    │   If model predicts 5.0 xP, actual average ≈ 5.0 points            │
    │                                                                     │
    └──────────────────────────────┬──────────────────────────────────────┘
                                   │
                                   ▼
                         ┌─────────────────┐
                         │ Expected Points │
                         │   per Player    │
                         │   per Gameweek  │
                         └─────────────────┘
```

### Why Separate Models Per Position?

| Position | Primary Point Sources | Key Features |
|----------|----------------------|--------------|
| **GKP** | Saves, clean sheets, penalty saves | Goals conceded by opponent, shot volume faced |
| **DEF** | Clean sheets, goals, assists, BPS | Team defensive strength, set piece involvement |
| **MID** | Goals, assists, clean sheets | xG, xA, chance creation, goal threat |
| **FWD** | Goals, assists | xG, shots in box, service quality |

### Bayesian Player Modeling

```
                         BAYESIAN UPDATING OVER SEASON
    
    Early Season                    Mid-Season                    Late Season
    (GW 1-5)                       (GW 10-20)                    (GW 30+)
    
    ┌─────────────┐               ┌─────────────┐               ┌─────────────┐
    │             │               │             │               │             │
    │   Wide      │               │   Narrower  │               │   Tight     │
    │   Prior     │               │   Posterior │               │   Posterior │
    │             │               │             │               │             │
    │    ╱╲       │               │     ╱╲      │               │      │      │
    │   ╱  ╲      │     ────►     │    ╱  ╲     │     ────►     │     ╱╲      │
    │  ╱    ╲     │   Bayesian    │   ╱    ╲    │   Bayesian    │    ╱  ╲     │
    │ ╱      ╲    │    Update     │  ╱      ╲   │    Update     │   ╱    ╲    │
    │╱        ╲   │               │ ╱        ╲  │               │  ╱      ╲   │
    └─────────────┘               └─────────────┘               └─────────────┘
    
    High uncertainty               Moderate uncertainty          Low uncertainty
    → Shrink toward                → Individual data             → Trust observed
      position average               starts to dominate            performance
```

**Hierarchical Pooling:**
```
                    ┌─────────────────────┐
                    │   League Average    │
                    │   (all positions)   │
                    └──────────┬──────────┘
                               │
           ┌───────────────────┼───────────────────┐
           │                   │                   │
           ▼                   ▼                   ▼
    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
    │  Position   │     │  Position   │     │  Position   │
    │   Prior     │     │   Prior     │     │   Prior     │
    │   (MID)     │     │   (DEF)     │     │   (FWD)     │
    └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
           │                   │                   │
     ┌─────┴─────┐       ┌─────┴─────┐       ┌─────┴─────┐
     │           │       │           │       │           │
     ▼           ▼       ▼           ▼       ▼           ▼
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│Player A │ │Player B │ │Player C │ │Player D │ │Player E │
│Estimate │ │Estimate │ │Estimate │ │Estimate │ │Estimate │
└─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘
```

### Fixture Difficulty Rating

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      FIXTURE DIFFICULTY CALCULATION                         │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌──────────────────────────────────┐
                    │         OPPONENT METRICS         │
                    └──────────────────────────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 │                                       │
                 ▼                                       ▼
    ┌────────────────────────┐            ┌────────────────────────┐
    │    ATTACK DIFFICULTY   │            │   DEFENSE DIFFICULTY   │
    │                        │            │                        │
    │ How hard to score      │            │ How likely opponent    │
    │ against this team?     │            │ will score?            │
    │                        │            │                        │
    │ • Goals conceded/game  │            │ • Goals scored/game    │
    │ • xG conceded          │            │ • xG created           │
    │ • Shots allowed        │            │ • Shot quality         │
    │ • Home/Away split      │            │ • Home/Away split      │
    │                        │            │                        │
    └────────────────────────┘            └────────────────────────┘
                 │                                       │
                 └───────────────────┬───────────────────┘
                                     │
                                     ▼
                    ┌──────────────────────────────────┐
                    │   COMBINED FDR (1-5 scale)       │
                    │                                  │
                    │   1 = Very Easy (weak opponent)  │
                    │   5 = Very Hard (top 6 away)     │
                    │                                  │
                    │   Weighted by recency for        │
                    │   current team form              │
                    └──────────────────────────────────┘
```

**Multi-Gameweek Aggregation:**
```
    GW 20      GW 21      GW 22      GW 23      GW 24      GW 25
    ┌────┐     ┌────┐     ┌────┐     ┌────┐     ┌────┐     ┌────┐
    │FDR │     │FDR │     │FDR │     │FDR │     │FDR │     │FDR │
    │ 2  │     │ 3  │     │ 2  │     │ 4  │     │ 2  │     │ 2  │
    └────┘     └────┘     └────┘     └────┘     └────┘     └────┘
      │          │          │          │          │          │
      │ ×1.0     │ ×0.95    │ ×0.90    │ ×0.85    │ ×0.80    │ ×0.75
      │          │          │          │          │          │
      └──────────┴──────────┴──────────┴──────────┴──────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────────┐
                    │   Geometric Mean with Time       │
                    │   Discounting = 2.35 Avg FDR     │
                    │                                  │
                    │   (Near fixtures weighted more)  │
                    └──────────────────────────────────┘
```

---

## Optimization Engine

### Integer Linear Programming Formulation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SQUAD OPTIMIZATION AS ILP                           │
└─────────────────────────────────────────────────────────────────────────────┘

    OBJECTIVE:  Maximize  Σ (expected_points[i] × selected[i])
                         i∈players

    DECISION VARIABLES:
    
        selected[i] ∈ {0, 1}    for each player i
        
        0 = not in squad
        1 = in squad

    CONSTRAINTS:

    ┌─────────────────────────────────────────────────────────────────────────┐
    │                                                                         │
    │  BUDGET         Σ (price[i] × selected[i])  ≤  100.0m                  │
    │                i                                                        │
    │                                                                         │
    │  SQUAD SIZE    Σ selected[i]  =  15                                    │
    │               i                                                         │
    │                                                                         │
    │  GOALKEEPERS   Σ selected[i]  =  2      (where position[i] = GKP)      │
    │               i                                                         │
    │                                                                         │
    │  DEFENDERS     Σ selected[i]  =  5      (where position[i] = DEF)      │
    │               i                                                         │
    │                                                                         │
    │  MIDFIELDERS   Σ selected[i]  =  5      (where position[i] = MID)      │
    │               i                                                         │
    │                                                                         │
    │  FORWARDS      Σ selected[i]  =  3      (where position[i] = FWD)      │
    │               i                                                         │
    │                                                                         │
    │  MAX 3/CLUB    Σ selected[i]  ≤  3      (for each of 20 clubs)         │
    │               i∈club                                                    │
    │                                                                         │
    └─────────────────────────────────────────────────────────────────────────┘
```

### Solution Space Visualization

```
    ~700 players in FPL
         │
         │  Select 15 players
         │
         ▼
    ┌─────────────────────────────────────────────────┐
    │                                                 │
    │   Theoretical combinations: C(700, 15)          │
    │                                                 │
    │   = 10^30+ possibilities                        │
    │                                                 │
    │   Brute force: IMPOSSIBLE                       │
    │                                                 │
    └─────────────────────────────────────────────────┘
         │
         │  Apply ILP constraints
         │
         ▼
    ┌─────────────────────────────────────────────────┐
    │                                                 │
    │   Constraints define a convex polytope          │
    │                                                 │
    │   LP relaxation + Branch & Bound                │
    │                                                 │
    │   Optimal solution found in < 1 second          │
    │                                                 │
    └─────────────────────────────────────────────────┘
```

### Transfer Planning (Multi-Period)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ROLLING HORIZON OPTIMIZATION                         │
└─────────────────────────────────────────────────────────────────────────────┘

    Current GW                    Planning Horizon (4-8 GWs)
        │
        ▼
    ┌───────┐   ┌───────┐   ┌───────┐   ┌───────┐   ┌───────┐
    │ GW 20 │ → │ GW 21 │ → │ GW 22 │ → │ GW 23 │ → │ GW 24 │
    │       │   │       │   │       │   │       │   │       │
    │Squad A│   │Squad ?│   │Squad ?│   │Squad ?│   │Squad ?│
    │       │   │       │   │       │   │       │   │       │
    └───────┘   └───────┘   └───────┘   └───────┘   └───────┘
        │           │           │           │           │
        │           │           │           │           │
        ▼           ▼           ▼           ▼           ▼
    ┌─────────────────────────────────────────────────────────┐
    │                                                         │
    │   Multi-period ILP:                                     │
    │                                                         │
    │   Maximize: Σ (points[gw] - 4 × extra_transfers[gw])   │
    │            gw                                           │
    │                                                         │
    │   Subject to:                                           │
    │   • Squad validity each GW                              │
    │   • Transfer continuity between GWs                     │
    │   • Free transfer accumulation (max 2)                  │
    │                                                         │
    └─────────────────────────────────────────────────────────┘
                              │
                              ▼
    ┌─────────────────────────────────────────────────────────┐
    │                                                         │
    │   Output: Optimal transfer sequence                     │
    │                                                         │
    │   GW 20: Hold (bank transfer)                           │
    │   GW 21: Salah → Saka, Watkins → Haaland (2 FT)        │
    │   GW 22: Hold                                           │
    │   ...                                                   │
    │                                                         │
    └─────────────────────────────────────────────────────────┘
```

---

## Simulation Framework

### Monte Carlo Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MONTE CARLO SIMULATION ENGINE                       │
└─────────────────────────────────────────────────────────────────────────────┘

                         ┌─────────────────────┐
                         │   Squad (15 players)│
                         │   + Captain choice  │
                         └──────────┬──────────┘
                                    │
                                    ▼
    ┌─────────────────────────────────────────────────────────────────────────┐
    │                                                                         │
    │   FOR iteration = 1 to 10,000:                                         │
    │                                                                         │
    │   ┌───────────────────────────────────────────────────────────────────┐│
    │   │                                                                   ││
    │   │   For each player:                                                ││
    │   │       sample points from player's distribution                    ││
    │   │                                                                   ││
    │   │   Apply captain multiplier (2x)                                   ││
    │   │   Sum starting XI points                                          ││
    │   │   Handle auto-substitutions                                       ││
    │   │                                                                   ││
    │   │   Record: total_points[iteration]                                 ││
    │   │                                                                   ││
    │   └───────────────────────────────────────────────────────────────────┘│
    │                                                                         │
    └─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
    ┌─────────────────────────────────────────────────────────────────────────┐
    │                                                                         │
    │   AGGREGATE STATISTICS:                                                │
    │                                                                         │
    │   • Mean (expected points)                                             │
    │   • Median                                                             │
    │   • Standard deviation                                                 │
    │   • 5th/95th percentiles (90% confidence interval)                     │
    │   • Full histogram                                                     │
    │                                                                         │
    └─────────────────────────────────────────────────────────────────────────┘
```

### Why Monte Carlo?

```
    ANALYTICAL APPROACH                    MONTE CARLO APPROACH
    
    Sum of 11 non-normal                   Sample directly from
    distributions = ???                    joint distribution
    
    ┌─────────────────────┐               ┌─────────────────────┐
    │                     │               │                     │
    │  Player A: dist_A   │               │  Run 10,000 sims    │
    │  Player B: dist_B   │               │                     │
    │  Player C: dist_C   │   vs.         │  Each sim: sample   │
    │     ...             │               │  all 11 players     │
    │  Player K: dist_K   │               │                     │
    │                     │               │  Get empirical      │
    │  Σ = closed form?   │               │  distribution       │
    │     INTRACTABLE     │               │     ✓ FEASIBLE      │
    │                     │               │                     │
    └─────────────────────┘               └─────────────────────┘
```

### Point Distribution Modeling

```
    TYPICAL FPL POINT DISTRIBUTIONS BY POSITION

    GOALKEEPER                    MIDFIELDER                   FORWARD
    
    Points │                     Points │                     Points │
           │                            │                            │
    10%    │ █                   10%    │                     10%    │
           │ ██                         │                            │
     8%    │ ███                  8%    │                      8%    │
           │ ████                       │                            │     █
     6%    │ █████                6%    │    █                 6%    │    ██
           │ ██████                     │   ██                       │   ███
     4%    │ ███████              4%    │  ███                 4%    │  ████
           │ ████████                   │ ████                       │ █████
     2%    │ █████████            2%    │ █████ ██  █          2%    │ ██████ █  █  █
           │ ██████████                 │ ███████████████            │ ████████████████
     0%    └───────────────      0%    └───────────────────   0%    └───────────────────
           0  2  4  6  8               0  2  4  6  8 10 12 14       0  2  4  6  8 10 12 14
    
    Tight around 2-6 pts         Heavy right tail              Very heavy right tail
    (saves + CS)                 (goals/assists variance)      (goal-dependent)
```

**Distribution Choice: Negative Binomial**

```
    Why not Normal distribution?
    
    Normal                           Negative Binomial (actual)
    
         │    ╱╲                          │
         │   ╱  ╲                         │ █
         │  ╱    ╲                        │ ██
         │ ╱      ╲                       │ ████
         │╱        ╲                      │ ██████
    ─────┴──────────────             ─────┴────────────────────
        -2   0   2   4   6                 0   2   4   6   8  10  12
    
    ✗ Symmetric                      ✓ Right-skewed
    ✗ Allows negative points         ✓ Non-negative
    ✗ Thin tails                     ✓ Heavy tails (hauls)
```

### Performance Optimization

```
    NAIVE PYTHON                         NUMPY VECTORIZED
    
    for sim in range(10000):             samples = np.random.negative_binomial(
        for player in squad:                 n=params[:, 0],
            pts = random_sample()            p=params[:, 1],
            total += pts                     size=(10000, 11)
                                         )
    Time: ~30 seconds                    total = samples.sum(axis=1)
                                         
                                         Time: ~0.1 seconds
                                         
                                         300x speedup
```

---

## Frontend Architecture

### Rendering Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        NEXT.JS HYBRID RENDERING                             │
└─────────────────────────────────────────────────────────────────────────────┘

    Initial Request
         │
         ▼
    ┌─────────────────────────────────────────────────────────────────────────┐
    │                          SERVER                                         │
    │                                                                         │
    │   ┌─────────────────────┐                                              │
    │   │  Server Components  │  ← Render on server, no JS sent to client    │
    │   │                     │                                              │
    │   │  • Page layouts     │                                              │
    │   │  • Data fetching    │                                              │
    │   │  • Static content   │                                              │
    │   └─────────────────────┘                                              │
    │                                                                         │
    └─────────────────────────────────────────────────────────────────────────┘
         │
         │  HTML + minimal JS
         │
         ▼
    ┌─────────────────────────────────────────────────────────────────────────┐
    │                          CLIENT (Browser)                               │
    │                                                                         │
    │   ┌─────────────────────┐                                              │
    │   │  Client Components  │  ← Hydrate and run in browser                │
    │   │                     │                                              │
    │   │  • Interactive UI   │                                              │
    │   │  • Charts (Recharts)│                                              │
    │   │  • Filters/forms    │                                              │
    │   │  • Real-time updates│                                              │
    │   └─────────────────────┘                                              │
    │                                                                         │
    └─────────────────────────────────────────────────────────────────────────┘
```

### State Management

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         STATE MANAGEMENT PATTERN                            │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌────────────────────────────────────────────────────────────────────────┐
    │                           SERVER STATE                                 │
    │                                                                        │
    │   Managed by: TanStack Query                                           │
    │   Lives on: Backend API                                                │
    │                                                                        │
    │   • Player data           • Optimization results                       │
    │   • Fixture lists         • Simulation outputs                         │
    │   • League standings      • Live scores                                │
    │                                                                        │
    │   Features:                                                            │
    │   ✓ Automatic caching     ✓ Background refetch                         │
    │   ✓ Request deduplication ✓ Stale-while-revalidate                     │
    │                                                                        │
    └────────────────────────────────────────────────────────────────────────┘
    
    ┌────────────────────────────────────────────────────────────────────────┐
    │                            URL STATE                                   │
    │                                                                        │
    │   Managed by: Next.js router                                           │
    │   Lives in: Browser URL                                                │
    │                                                                        │
    │   • Filters (?position=MID&minPrice=8)                                 │
    │   • Sort order (?sort=points_desc)                                     │
    │   • Pagination (?page=2)                                               │
    │                                                                        │
    │   Features:                                                            │
    │   ✓ Bookmarkable          ✓ Back-button works                          │
    │   ✓ Shareable links       ✓ SEO friendly                               │
    │                                                                        │
    └────────────────────────────────────────────────────────────────────────┘
    
    ┌────────────────────────────────────────────────────────────────────────┐
    │                           LOCAL UI STATE                               │
    │                                                                        │
    │   Managed by: React useState                                           │
    │   Lives in: Component memory                                           │
    │                                                                        │
    │   • Modal open/closed                                                  │
    │   • Form input values                                                  │
    │   • Hover states                                                       │
    │                                                                        │
    │   Features:                                                            │
    │   ✓ Ephemeral (resets on navigate)                                     │
    │   ✓ No sync needed                                                     │
    │                                                                        │
    └────────────────────────────────────────────────────────────────────────┘
```

---

## Core Features

### Feature Matrix

| Feature | ML Model | Optimizer | Simulator | Live Data |
|---------|:--------:|:---------:|:---------:|:---------:|
| Player Analysis | ✓ | | | ✓ |
| Squad Optimizer | ✓ | ✓ | | |
| Transfer Planner | ✓ | ✓ | | |
| Captain Picker | ✓ | | ✓ | |
| Gameweek Sim | ✓ | | ✓ | |
| Live Tracking | | | | ✓ |
| League Analysis | | | | ✓ |
| Chip Strategy | ✓ | ✓ | ✓ | |
| VOR Rankings | ✓ | | | |
| Fixture Analysis | ✓ | | | |

### Live Gameweek System

```
                          DURING ACTIVE MATCHES
    
    ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
    │   FPL API    │      │   Backend    │      │   Frontend   │
    │   /live      │      │   Cache      │      │   Display    │
    └──────┬───────┘      └──────┬───────┘      └──────┬───────┘
           │                     │                     │
           │  Poll every 60s     │                     │
           │◄────────────────────│                     │
           │                     │                     │
           │  Live player data   │                     │
           │────────────────────►│                     │
           │                     │                     │
           │                     │  Webhook/poll       │
           │                     │◄────────────────────│
           │                     │                     │
           │                     │  Calculated scores  │
           │                     │────────────────────►│
           │                     │                     │
           │                     │                     │  Update UI
           │                     │                     │────────►
```

### Value Over Replacement (VOR)

```
    TRADITIONAL VIEW                 VOR VIEW
    
    "Haaland: 8 pts/game"           "Haaland VOR: 5.0"
    "Watkins: 5 pts/game"           "Watkins VOR: 2.0"
    
    Looks like Haaland              But consider opportunity cost:
    is 3 pts better                 Bench FWD averages 3 pts
                                    
                                    Haaland: 8 - 3 = 5 VOR
                                    Watkins: 5 - 3 = 2 VOR
                                    
                                    Per-million efficiency:
                                    Haaland (14m): 5/14 = 0.36 VOR/m
                                    Watkins (8m):  2/8  = 0.25 VOR/m
                                    
                                    Haaland is more efficient!
```

---

## Performance

### Target Response Times

| Operation | Target | Typical | Method |
|-----------|--------|---------|--------|
| Player list | < 200ms | ~100ms | Cached data |
| Player detail | < 200ms | ~150ms | Cached + computed |
| Squad optimization | < 1s | ~300ms | ILP solver |
| Simulation (10k) | < 3s | ~1.5s | Vectorized NumPy |
| Live scores | < 500ms | ~200ms | Short-TTL cache |

### Concurrency Model

```
    Request 1 ──────────┐
                        │
    Request 2 ──────────┼──────►  Event Loop  ──────►  Response Queue
                        │         (async I/O)
    Request 3 ──────────┤
                        │         No threads blocked
    Request N ──────────┘         on network I/O
    
    
    CPU-bound work (optimization, simulation):
    
    ┌─────────────┐
    │ Concurrency │  Limits simultaneous CPU-intensive
    │   Limiter   │  operations to prevent overload
    └──────┬──────┘
           │
           ▼
    ┌──────────────────────────────────────┐
    │  Worker Pool (2-4 concurrent tasks)  │
    └──────────────────────────────────────┘
```

---

## Technology Stack

### Backend

| Technology | Purpose | Why This Choice |
|------------|---------|-----------------|
| **Python 3.11** | Core language | Best ML/optimization ecosystem |
| **FastAPI** | Web framework | Native async, auto OpenAPI docs |
| **Pydantic** | Validation | Type-safe with clear errors |
| **PuLP + CBC** | Optimization | Fast, open-source ILP solver |
| **NumPy** | Numerics | Vectorized simulation speed |
| **HTTPX** | HTTP client | Async + HTTP/2 support |
| **Uvicorn** | ASGI server | High-performance async |

### Frontend

| Technology | Purpose | Why This Choice |
|------------|---------|-----------------|
| **Next.js 16** | Framework | App Router, Server Components |
| **React 18** | UI library | Suspense, concurrent features |
| **TypeScript** | Type safety | Catch errors at compile time |
| **Tailwind CSS** | Styling | Utility-first, consistent design |
| **TanStack Query** | Data fetching | Caching, deduplication, refetch |
| **Recharts** | Charts | React-native, composable |
| **Radix UI** | Primitives | Accessible, unstyled base |

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- npm or yarn

### Quick Start

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND SETUP                                  │
└─────────────────────────────────────────────────────────────────────────────┘

    1. cd backend
    2. python -m venv venv
    3. venv\Scripts\activate        (Windows)
       source venv/bin/activate     (macOS/Linux)
    4. pip install -r requirements.txt
    5. uvicorn app.main:app --reload
    
    → API at http://localhost:8000
    → Docs at http://localhost:8000/docs

┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND SETUP                                 │
└─────────────────────────────────────────────────────────────────────────────┘

    1. cd frontend
    2. npm install
    3. echo NEXT_PUBLIC_API_URL=http://localhost:8000 > .env.local
    4. npm run dev
    
    → App at http://localhost:3000
```

---

## API Reference

### Endpoints Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API STRUCTURE                                  │
└─────────────────────────────────────────────────────────────────────────────┘

    /api
    ├── /players
    │   ├── GET  /                    List all players (filterable)
    │   ├── GET  /{id}                Player details + fixtures
    │   └── GET  /{id}/history        Full gameweek history
    │
    ├── /optimizer
    │   ├── POST /squad               Optimal 15-player squad
    │   ├── POST /transfers           Best transfers for existing squad
    │   ├── POST /captain             Captain recommendation
    │   └── POST /starting-xi         Optimal starting XI + formation
    │
    ├── /simulation
    │   ├── POST /gameweek            Monte Carlo GW simulation
    │   ├── POST /what-if             Alternative decision analysis
    │   └── POST /season-projection   End-of-season projection
    │
    ├── /live
    │   ├── GET  /gameweek            Current GW info
    │   ├── GET  /gameweek/{gw}/scores Live scores
    │   ├── GET  /gameweek/{gw}/fixtures Fixture status
    │   └── GET  /manager/{id}        Manager squad
    │
    ├── /leagues
    │   └── GET  /{id}                League standings
    │
    └── /analytics
        ├── GET  /vor-rankings        Value Over Replacement
        ├── GET  /fixtures/analysis   Fixture difficulty
        ├── GET  /differentials       Captain differentials
        ├── GET  /match-predictions   Match outcome probabilities
        └── POST /chip-strategy       Chip timing recommendation
```

---

## Deployment

### Architecture on Render

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RENDER DEPLOYMENT                                 │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌───────────────┐
                              │   Internet    │
                              └───────┬───────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │                                   │
                    ▼                                   ▼
           ┌────────────────┐                 ┌────────────────┐
           │                │                 │                │
           │   Frontend     │                 │   Backend      │
           │   Service      │                 │   Service      │
           │                │                 │                │
           │   Next.js      │ ───────────────►│   FastAPI      │
           │   Node.js      │    REST API     │   Python 3.11  │
           │                │                 │                │
           └────────────────┘                 └────────────────┘
                    │                                   │
                    │                                   │
                    ▼                                   ▼
           ┌────────────────┐                 ┌────────────────┐
           │   Render CDN   │                 │   FPL API      │
           │   (static)     │                 │   (external)   │
           └────────────────┘                 └────────────────┘

    Environment Variables:
    
    Frontend:
    └── NEXT_PUBLIC_API_URL = https://backend.onrender.com
    
    Backend:
    └── PYTHONPATH = /app
```

---

## License

MIT License - free for personal and commercial use.

---

## Disclaimer

This tool is for educational and entertainment purposes. FPL outcomes are inherently unpredictable. Use predictions as one input among many. Past performance does not guarantee future results.

---

## Acknowledgments

- Fantasy Premier League for the public API
- Open-source community for the excellent libraries
- FPL community for insights and discussions
