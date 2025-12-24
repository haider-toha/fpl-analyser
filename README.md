# FPL Analyser by Haider

An advanced Fantasy Premier League analytics platform that combines machine learning, Monte Carlo simulations, and mathematical optimization to provide data-driven insights for FPL managers. The application fetches real-time data from the official Fantasy Premier League API and applies sophisticated analytical techniques to help users make informed decisions about transfers, captaincy, and squad selection.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
  - [Player Analysis](#player-analysis)
  - [Squad Optimization](#squad-optimization)
  - [Transfer Predictions](#transfer-predictions)
  - [Monte Carlo Simulations](#monte-carlo-simulations)
  - [Live Gameweek Tracking](#live-gameweek-tracking)
  - [Mini-League Analytics](#mini-league-analytics)
  - [Advanced Analytics](#advanced-analytics)
- [Technical Implementation](#technical-implementation)
  - [Expected Points Model](#expected-points-model)
  - [Integer Linear Programming](#integer-linear-programming)
  - [Simulation Engine](#simulation-engine)
  - [Fixture Difficulty Analysis](#fixture-difficulty-analysis)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Deployment](#deployment)
- [License](#license)

---

## Overview

Fantasy Premier League is a game of decision-making under uncertainty. Managers must allocate a limited budget across 15 players, predict which players will perform well in upcoming gameweeks, and optimize transfers to maximize long-term points. Traditional approaches rely on intuition and basic statistics, but FPL Analyser takes a quantitative approach.

The platform addresses three fundamental challenges in FPL:

1. **Prediction**: Estimating how many points each player will score in future gameweeks, accounting for factors like form, fixture difficulty, expected goals, and playing time.

2. **Optimization**: Given point predictions, finding the mathematically optimal squad that maximizes expected returns while respecting all FPL constraints (budget, squad size, position limits, and club limits).

3. **Risk Assessment**: Understanding the uncertainty in predictions through probability distributions rather than single point estimates, enabling managers to make risk-aware decisions.

---

## Architecture

The application follows a decoupled architecture with a Python backend and a Next.js frontend, communicating via a RESTful API.

### Backend

The backend is built with FastAPI, a modern Python web framework optimized for high performance and automatic API documentation. It handles all data fetching from the official FPL API, applies machine learning models for predictions, runs optimization algorithms, and executes Monte Carlo simulations.

The backend is organized into several modules:

- **Data Layer**: Handles communication with the FPL API, including caching to reduce API calls and improve response times. Player data, fixtures, and live scores are fetched and normalized into consistent data structures.

- **Machine Learning Module**: Contains the expected points model, Bayesian inference for player performance, and fixture difficulty analysis. Models are designed to update predictions as new data becomes available throughout the season.

- **Optimization Module**: Implements integer linear programming for squad selection, transfer planning, and captain selection. Uses the PuLP library with the CBC solver for fast, exact solutions.

- **Simulation Module**: Runs Monte Carlo simulations to generate probability distributions for gameweek outcomes, season projections, and what-if scenarios.

- **API Layer**: Exposes all functionality through RESTful endpoints with automatic validation, error handling, and OpenAPI documentation.

### Frontend

The frontend is a Next.js application using the App Router pattern. It provides a responsive, modern interface for interacting with the analytics platform. The UI is built with React and styled using Tailwind CSS, with interactive charts powered by Recharts.

Data fetching is managed by TanStack Query, which provides caching, background refetching, and optimistic updates. This ensures the UI remains responsive even when making multiple API calls.

---

## Features

### Player Analysis

The player analysis module provides comprehensive statistics for every Premier League player in the FPL game. For each player, the platform displays:

- **Basic Information**: Name, team, position, current price, and ownership percentage across all FPL managers.

- **Performance Metrics**: Total points, points per game, form (average points over the last 5 gameweeks), goals, assists, clean sheets, and bonus points.

- **Advanced Statistics**: Expected goals (xG), expected assists (xA), and expected goal involvement (xGI) from underlying match data. These metrics often predict future performance better than actual goals and assists.

- **Predicted Points**: The expected points for upcoming gameweeks based on the machine learning model, accounting for fixture difficulty and recent form.

- **Historical Performance**: A complete gameweek-by-gameweek breakdown of points, minutes played, and bonus points system (BPS) scores.

- **Upcoming Fixtures**: The next 5 fixtures with difficulty ratings, allowing managers to assess whether a player has favorable or difficult matches ahead.

Players can be filtered by position, sorted by various metrics, and searched by name. This allows managers to quickly identify high-value options or compare alternatives.

### Squad Optimization

The squad optimizer uses integer linear programming to find the mathematically optimal squad given a set of constraints. Unlike heuristic approaches that might miss optimal solutions, ILP guarantees finding the best possible squad.

The optimizer can solve several problems:

- **New Squad Selection**: Given a budget of 100 million, select 15 players (2 goalkeepers, 5 defenders, 5 midfielders, 3 forwards) that maximize total expected points while respecting the constraint of maximum 3 players per club.

- **Transfer Optimization**: Given an existing squad and available transfers, find the optimal transfers to make. This accounts for transfer costs (4 points per additional transfer beyond free transfers) and can plan multiple gameweeks ahead.

- **Starting XI Selection**: Given a 15-player squad, select the optimal 11 starters and formation that maximizes expected points while respecting formation rules (at least 1 goalkeeper, 3 defenders, and 1 forward).

- **Captain Selection**: Identify the player most likely to score the highest points, accounting for the 2x captain multiplier.

The optimizer runs in under one second for typical problems, making it practical for interactive use.

### Transfer Predictions

The transfer predictions module provides multi-gameweek fixture analysis and data-driven transfer recommendations:

- **Fixture Swing Analysis**: Identifies teams whose fixtures are improving or worsening over the planning horizon, highlighting opportunities to buy players from teams entering easy runs and sell players facing difficult schedules.

- **Best Fixture Runs**: Ranks all Premier League teams by average fixture difficulty rating over the selected horizon (4, 6, 8, or 10 gameweeks), helping managers plan ahead.

- **Transfer Recommendations**: Generates actionable transfer suggestions with urgency levels (immediate, soon, plan ahead), expected point gains, and detailed reasoning based on fixture context.

- **Rotation Pairs**: Identifies player pairs at each position who complement each other's fixtures, enabling managers to rotate players effectively based on upcoming opponents.

- **Fixture-Based Differentials**: Surfaces low-ownership players with favorable upcoming fixtures, providing differential opportunities that can help managers gain rank.

- **Position-Based Top Picks**: Ranks the best goalkeeper, defender, midfielder, and forward options based on expected points over the planning horizon.

The module uses a clean black and white design with orange accent charts for clear visual hierarchy.

### Monte Carlo Simulations

Point predictions are inherently uncertain. A player expected to score 6 points might score anywhere from 0 to 20 depending on match events. Monte Carlo simulation addresses this uncertainty by running thousands of simulated gameweeks.

For each simulation:

1. Each player's points are sampled from a probability distribution centered on their expected points.
2. The total squad points are calculated, applying captain multipliers.
3. Results are aggregated across all simulations.

After 10,000 simulations, the platform provides:

- **Expected Points**: The mean outcome across all simulations.
- **Probability Distributions**: Histograms showing the likelihood of different point totals.
- **Confidence Intervals**: The range within which points are likely to fall with 90% probability.
- **Upside and Downside Risk**: The probability of exceeding certain thresholds or falling below others.
- **Captain Comparison**: Side-by-side simulation results for different captain choices.

This probabilistic approach helps managers understand not just what is likely to happen, but the full range of possible outcomes.

### Live Gameweek Tracking

During active gameweeks, the platform provides real-time tracking of scores and events:

- **Live Scores**: Current points for all players, updated as matches progress.
- **Bonus Point Predictions**: Estimated bonus points based on the current BPS standings in each match.
- **Squad Score Calculation**: Enter your team ID to see your current gameweek score with live updates.
- **Fixture Status**: Which matches are in progress, finished, or yet to start.

This allows managers to track their performance throughout the gameweek without manually calculating scores.

### Mini-League Analytics

FPL is often played competitively in mini-leagues with friends, colleagues, or online communities. The platform provides analytics for these leagues:

- **Current Standings**: Full league table with total points, gameweek points, and rank changes.
- **Manager Comparison**: Compare any two managers' squads to identify differentials.
- **Rank Projections**: Based on remaining fixtures and squad compositions, project likely final standings.

### Advanced Analytics

Beyond the core features, the platform includes several advanced analytical tools:

**Value Over Replacement (VOR) Rankings**: Rather than looking at total points, VOR measures how many more points a player scores compared to a replacement-level player at their position. This helps identify players who provide the most value relative to alternatives.

**Fixture Difficulty Analysis**: Aggregate fixture difficulty ratings over multiple gameweeks to identify teams with favorable or difficult runs. This informs decisions about which team's players to target for transfers.

**Captain Differential Analysis**: Identify low-ownership players with high expected points who could serve as differential captain choices to gain rank on the competition.

**Chip Strategy Recommendations**: Analyze when to use chips (Bench Boost, Triple Captain, Free Hit, Wildcard) based on fixture patterns, double gameweeks, and current squad state.

**Match Predictions**: Probabilistic predictions for upcoming matches including expected goals, clean sheet probability, and likely scorelines.

---

## Technical Implementation

### Expected Points Model

The expected points model predicts how many FPL points a player will score in an upcoming gameweek. The model uses gradient boosting (XGBoost) trained on historical gameweek data.

Input features include:

- **Form Metrics**: Recent points, minutes, goals, and assists over the last 5 gameweeks.
- **Underlying Statistics**: Expected goals (xG), expected assists (xA), shots, key passes, and expected goal involvement.
- **Fixture Context**: Home or away, opponent strength ratings, days since last match.
- **Season Aggregates**: Total points, points per 90 minutes, consistency measures.
- **Availability**: Injury news, chance of playing percentage, and recent playing time.

The model is trained using cross-validation to prevent overfitting and is regularly updated as new gameweek data becomes available. Separate models are trained for each position group (goalkeepers, defenders, midfielders, forwards) to capture position-specific patterns.

### Integer Linear Programming

Squad optimization is formulated as an integer linear programming problem. The objective is to maximize the sum of expected points across selected players, subject to constraints.

The mathematical formulation:

- **Decision Variables**: Binary variables indicating whether each player is selected.
- **Objective Function**: Maximize the sum of expected points multiplied by selection variables.
- **Budget Constraint**: Total cost of selected players must not exceed the available budget.
- **Squad Size Constraint**: Exactly 15 players must be selected.
- **Position Constraints**: Exactly 2 goalkeepers, 5 defenders, 5 midfielders, and 3 forwards.
- **Club Constraint**: Maximum 3 players from any single Premier League club.
- **Starting XI Constraints**: When selecting starters, formation rules apply (minimum 1 GK, 3 DEF, 2 MID, 1 FWD, maximum 11 total).

The PuLP library formulates the problem and the CBC solver finds the optimal solution. Because the problem has a special structure (it is a variant of the knapsack problem), solutions are found very quickly despite the large search space.

### Simulation Engine

The Monte Carlo simulation engine samples from probability distributions to model uncertainty. Player points are modeled using a negative binomial distribution, which captures the over-dispersion typically seen in FPL points (variance exceeds the mean).

The distribution parameters are derived from:

- **Expected Points**: Sets the mean of the distribution.
- **Historical Variance**: Calculated from the player's gameweek-to-gameweek volatility.
- **Contextual Adjustments**: Higher variance for attacking players in high-scoring matches.

Simulations are run in parallel using NumPy vectorization for efficiency. A typical 10,000-simulation run completes in under 2 seconds.

### Fixture Difficulty Analysis

Fixture difficulty is assessed using the official FPL Fixture Difficulty Rating (FDR) as a baseline, enhanced with team strength metrics derived from historical results. The analysis considers:

- **Attack Strength**: Goals scored per match, adjusted for opponent quality.
- **Defense Strength**: Goals conceded per match, adjusted for opponent quality.
- **Home and Away Splits**: Separate calculations for home and away performance.
- **Recent Form**: Greater weight on recent matches to capture current team quality.

For multi-gameweek planning, fixture difficulty is aggregated and teams are ranked by the favorability of their upcoming schedule.

---

## Technology Stack

### Backend Technologies

| Technology | Purpose |
|------------|---------|
| Python 3.11 | Core programming language |
| FastAPI | Async web framework for the REST API |
| Pydantic | Data validation and settings management |
| PuLP | Linear programming modeling and solving |
| NumPy | Numerical computing for simulations |
| HTTPX | Async HTTP client for FPL API requests |
| Uvicorn | ASGI server for production deployment |

### Frontend Technologies

| Technology | Purpose |
|------------|---------|
| Next.js 16 | React framework with server-side rendering |
| React 18 | UI component library |
| TypeScript | Type-safe JavaScript |
| Tailwind CSS | Utility-first CSS framework |
| TanStack Query | Data fetching and state management |
| Recharts | Charting library for visualizations |
| Radix UI | Accessible component primitives |

### Infrastructure

| Service | Purpose |
|---------|---------|
| Render | Cloud hosting for backend and frontend |
| GitHub | Source control and CI/CD integration |

---

## Getting Started

### Prerequisites

- Python 3.11 or higher
- Node.js 18 or higher
- npm or yarn package manager

### Backend Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Create and activate a virtual environment:
   ```
   python -m venv venv
   venv\Scripts\activate        # Windows
   source venv/bin/activate     # macOS/Linux
   ```

3. Install Python dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Start the development server:
   ```
   uvicorn app.main:app --reload
   ```

The API will be available at http://localhost:8000 with interactive documentation at http://localhost:8000/docs.

### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install Node.js dependencies:
   ```
   npm install
   ```

3. Create a local environment file:
   ```
   echo NEXT_PUBLIC_API_URL=http://localhost:8000 > .env.local
   ```

4. Start the development server:
   ```
   npm run dev
   ```

The frontend will be available at http://localhost:3000.

---

## API Reference

### Player Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/players/ | List all players with optional filters for position, team, price range, and sorting |
| GET | /api/players/{id} | Get detailed information for a specific player including history and fixtures |
| GET | /api/players/{id}/history | Get a player's complete gameweek history |

### Optimizer Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/optimizer/squad | Generate an optimal 15-player squad given budget and constraints |
| POST | /api/optimizer/transfers | Find optimal transfers for an existing squad |
| POST | /api/optimizer/captain | Recommend captain and vice-captain selections |
| POST | /api/optimizer/starting-xi | Select optimal starting XI from a 15-player squad |

### Simulation Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/simulation/gameweek | Run Monte Carlo simulation for a squad's gameweek performance |
| POST | /api/simulation/what-if | Analyze alternative decisions against actual outcomes |
| POST | /api/simulation/season-projection | Project end-of-season points and rank |

### Live Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/live/gameweek | Get current gameweek information |
| GET | /api/live/gameweek/{gw}/scores | Get live scores for a specific gameweek |
| GET | /api/live/gameweek/{gw}/fixtures | Get fixture status and results |
| GET | /api/live/manager/{id} | Get manager details and current squad |

### League Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/leagues/{id} | Get league information and current standings |

### Analytics Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/analytics/vor-rankings | Get Value Over Replacement rankings by position |
| GET | /api/analytics/fixtures/analysis | Get fixture difficulty analysis for upcoming gameweeks |
| GET | /api/analytics/differentials | Find captain differential opportunities |
| GET | /api/analytics/match-predictions | Get probabilistic match predictions |
| POST | /api/analytics/chip-strategy | Get chip usage recommendations |

---

## Deployment

The application is deployed on Render with the following configuration:

### Backend Service

- **Type**: Web Service
- **Runtime**: Python 3.11
- **Build Command**: pip install -r requirements.txt
- **Start Command**: uvicorn app.main:app --host 0.0.0.0 --port $PORT

### Frontend Service

- **Type**: Web Service
- **Runtime**: Node.js
- **Build Command**: npm install && npm run build
- **Start Command**: npm start

Environment variables required for production:

- **Backend**: PYTHONPATH set to the backend directory
- **Frontend**: NEXT_PUBLIC_API_URL set to the backend service URL

---

## License

This project is released under the MIT License. You are free to use, modify, and distribute the code for personal or commercial purposes.

---

## Disclaimer

This tool is intended for educational and entertainment purposes. Fantasy Premier League outcomes are inherently unpredictable, and no model can guarantee success. The predictions and recommendations provided by this platform should be used as one input among many when making FPL decisions. Past performance of players or the model does not guarantee future results.

---

## Acknowledgments

- Fantasy Premier League for providing the public API that makes this analysis possible
- The open-source community for the excellent libraries that power this application
- The FPL community for the discussions
