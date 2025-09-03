# Virtual Energy Trading API Backend

FastAPI backend for the Virtual Energy Trading platform with Domain-Driven Design architecture.

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- pip or poetry

### Installation

1. **Create virtual environment:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install dependencies:**
```bash
pip install -r requirements.txt
```

3. **Set up environment:**
```bash
cp env.example .env
# Edit .env with your settings
```

4. **Run the application:**
```bash
python run.py
```

The API will be available at: http://localhost:8000

## 📚 API Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🏗️ Architecture

### Domain-Driven Design Structure
```
app/
├── domain/           # Core business logic
│   ├── trading/     # Trading domain (Orders, Bids, Trades)
│   ├── market/      # Market domain (MarketData, Sessions)
│   └── portfolio/   # Portfolio domain (Positions, P&L)
├── application/     # Use cases and application services
├── infrastructure/  # External concerns (DB, APIs, WebSocket)
└── api/            # HTTP interfaces and WebSocket endpoints
```

## 🔌 WebSocket Endpoints

Connect to: `ws://localhost:8000/ws`

### Message Types

**Subscribe to Market Data:**
```json
{
  "type": "subscribe_market",
  "market_type": "DAY_AHEAD" // or "REAL_TIME"
}
```

**Register User:**
```json
{
  "type": "register_user",
  "user_id": "user123"
}
```

## 📊 API Endpoints

### Orders
- `POST /api/v1/orders` - Create order
- `GET /api/v1/orders` - List orders
- `GET /api/v1/orders/{id}` - Get order
- `POST /api/v1/orders/{id}/submit` - Submit order
- `DELETE /api/v1/orders/{id}` - Cancel order

### Market Data
- `GET /api/v1/market/data` - Get market data
- `GET /api/v1/market/latest` - Get latest price
- `GET /api/v1/market/summary` - Market summary

### Portfolio
- `GET /api/v1/portfolio/{user_id}` - Get portfolio
- `GET /api/v1/portfolio/{user_id}/contracts` - Get contracts
- `GET /api/v1/portfolio/{user_id}/pnl` - Get P&L summary

## 🔧 Development

### Run in development mode:
```bash
python run.py
```

### Run tests:
```bash
pytest
```

### Code formatting:
```bash
black app/
isort app/
```

## 🌐 Environment Variables

See `env.example` for all available configuration options.

## 📈 Next Steps

1. Implement gridstatus.io API integration
2. Add background tasks for market data fetching
3. Implement trading engine and order matching
4. Add authentication and user management
5. Deploy with Docker
