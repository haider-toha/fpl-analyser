# FPL Analyser by Haider

> Advanced Fantasy Premier League analytics powered by machine learning, Monte Carlo simulations, and mathematical optimization.

![FPL Analyser Dashboard](https://via.placeholder.com/800x400?text=FPL+Analyser+by+Haider)

## Features

### Core Optimization
- **ILP Squad Optimizer**: Integer Linear Programming finds the mathematically optimal squad within all FPL constraints
- **ML Expected Points**: XGBoost model predicts player performance using historical data
- **Transfer Planner**: Multi-week lookahead optimization for transfer decisions
- **Captain Selection**: Data-driven captain and vice-captain recommendations

### Advanced Analytics
- **Monte Carlo Simulations**: 10,000+ simulations show probability distributions, not just point estimates
- **What-If Scenarios**: Analyze past decisions - "What if I had captained Haaland instead?"
- **Live Gameweek Tracker**: Real-time scores, bonus predictions, and rank projections
- **Mini-League Analytics**: Track rivals, project final standings, find differentials
- **Head-to-Head Comparisons**: Compare squads to find advantages

## Tech Stack

### Backend
- **FastAPI** - High-performance async Python API
- **PuLP** - Linear programming solver (CBC backend)
- **XGBoost** - Gradient boosting for expected points predictions
- **NumPy** - Monte Carlo simulations

### Frontend
- **Next.js 14** - React framework with App Router
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Beautiful component library
- **Recharts** - Interactive charts
- **Framer Motion** - Smooth animations
- **TanStack Query** - Data fetching and caching

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Run the API
uvicorn app.main:app --reload
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

### Environment Variables

Frontend (`.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## API Endpoints

### Players
- `GET /api/players/` - List all players with filters
- `GET /api/players/{id}` - Get player details
- `GET /api/players/{id}/history` - Get player history

### Optimizer
- `POST /api/optimizer/squad` - Optimize new squad
- `POST /api/optimizer/transfers` - Optimize transfers
- `POST /api/optimizer/captain` - Select captain
- `POST /api/optimizer/starting-xi` - Select starting XI

### Simulation
- `POST /api/simulation/gameweek` - Monte Carlo simulation
- `POST /api/simulation/what-if` - What-if analysis
- `POST /api/simulation/season-projection` - Season projection

### Live
- `GET /api/live/gameweek` - Current gameweek info
- `GET /api/live/gameweek/{gw}/scores` - Live scores
- `POST /api/live/gameweek/{gw}/squad-score` - Calculate live squad score

### Leagues
- `GET /api/leagues/{id}` - Get league info
- `GET /api/leagues/{id}/standings` - Get standings
- `POST /api/leagues/project` - Project final standings

## The Math

### Squad Optimization (ILP)

```
maximize  Σ E[pts_i] · y_i

subject to:
  Σ cost_i · x_i ≤ 100          (budget)
  Σ x_i = 15                     (squad size)
  y_i ≤ x_i                      (must own to start)
  Σ x_i ≤ 3  ∀ team              (max per club)
  + positional constraints        (formation rules)
```

Solved in <1 second using PuLP with CBC solver.

### Expected Points Model

```
E[pts_i] = f(form, xG, xA, xGI, minutes, FDR, home/away, rest_days)
```

XGBoost regressor trained on historical gameweek data with cross-validation.

### Monte Carlo Simulation

Points sampled from negative binomial distribution:
- Mean = expected points
- Variance > mean (accounts for uncertainty)

10,000+ simulations provide:
- Probability distributions
- Confidence intervals
- Risk metrics

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT License - feel free to use this for your own FPL domination.

## Acknowledgments

- Fantasy Premier League API
- PuLP linear programming library
- The FPL community for endless strategy discussions

---

**Disclaimer**: This tool is for educational and entertainment purposes. Past performance does not guarantee future results. Always make your own decisions!
