# Virtual Energy Trading Platform

A sophisticated virtual energy trading platform that simulates day-ahead energy markets using real PJM (Pennsylvania, Jersey, Maryland) market data. The platform implements a complete trading workflow from bidding to settlement with real-time P&L calculations.

## Architecture Overview

The project follows a **Domain-Driven Design (DDD)** architecture with clear separation between backend and frontend responsibilities:

```
├── backend/           # FastAPI + Domain-Driven Design
│   ├── app/
│   │   ├── domain/           # Core business logic
│   │   ├── infrastructure/   # External APIs & data sources
│   │   ├── services/         # Application services
│   │   └── api/             # HTTP endpoints
├── frontend/          # React + TypeScript + Modular Architecture
│   └── src/
│       ├── modules/         # Domain-specific modules
│       │   ├── market/      # Market data management
│       │   ├── orders/      # Order management
│       │   └── pnl/         # P&L calculations
│       └── shared/          # Cross-cutting concerns
```

## Technology Stack

### Backend
- **FastAPI**: Modern, fast Python web framework with automatic API documentation
- **GridStatus.io API**: Real PJM market data integration
- **Pydantic**: Data validation and serialization
- **Domain-Driven Design**: Clean architecture with clear domain boundaries

### Frontend
- **React 19**: Latest React with improved performance and features
- **TypeScript**: Type safety and better developer experience
- **Arco Design**: Professional UI component library
- **Tailwind CSS**: Utility-first CSS framework
- **Recharts**: Responsive charting library
- **Vite**: Fast build tool and development server

## Market Simulation Strategy

### D-1 (Day-Ahead) Strategy
The platform uses a **"D-1" simulation strategy** that leverages historical data to create a realistic trading environment:

- **Reference Date**: September 2-3, 2025 (Tuesday-Wednesday)
- **D-1 Phase (Bidding)**: Users place bids for September 3rd delivery using September 2nd as the bidding day
- **D0 Phase (Trading)**: Market clearing and real-time settlement using September 3rd data

### Why This Approach?
1. **Data Availability**: GridStatus.io provides comprehensive historical PJM data
2. **API Rate Limiting**: Real-time data fetching hits API limits and also requires wait times until the next day for proper order clearing and P&L computation
3. **Realistic Simulation**: Uses actual market conditions and price volatility from historical data
4. **Educational Value**: Demonstrates real market dynamics and price relationships
5. **Reproducible Results**: Same data set ensures consistent simulation outcomes
6. **Immediate Testing**: Historical data allows instant simulation without waiting for live market data

### Market Data Sources
- **Day-Ahead Prices**: PJM LMP day-ahead hourly data (24 hourly prices)
- **Real-Time Prices**: PJM LMP real-time 5-minute data (288 data points per day)
- **Location**: PJM Western Hub (primary trading location)
- **Data Provider**: GridStatus.io API

## Trading Simulation Workflow

### Phase 1: Bidding (D-1)
1. **Market Setup**: Initialize with September 2nd, 2025 market data
2. **Bid Submission**: Users can place up to 10 bids per hour (0-23 UTC)
3. **Bid Types**: Both BUY and SELL orders supported
4. **Cutoff Time**: 11:00 UTC (industry standard for day-ahead markets)
5. **Validation**: Price and quantity validation with realistic limits

### Phase 2: Market Clearing (D0 Transition)
1. **Batch Processing**: All pending bids processed simultaneously
2. **Price Discovery**: Uses actual day-ahead clearing prices from September 3rd
3. **Order Matching**: 
   - BUY orders execute if bid price ≥ clearing price
   - SELL orders execute if bid price ≤ clearing price
4. **Trade Generation**: Successful bids become trades with execution details

### Phase 3: Real-Time Settlement (D0)
1. **Real-Time Pricing**: Uses 5-minute interval prices from September 3rd
2. **P&L Calculation**: 
   - BUY: Profit when RT price > DA price (bought cheap, market went up)
   - SELL: Profit when DA price > RT price (sold high, market went down)
3. **Portfolio Tracking**: Continuous P&L updates and position monitoring

## Key Design Decisions

### 1. Simulation Time Management
- **Simulated Clock**: Independent time system for realistic market progression
- **Time Controls**: Users can advance time or jump between phases
- **Real-Time Feel**: Charts update progressively as simulated time advances

### 2. Data Architecture
```python
# Backend: Domain-driven entities
class MarketData:
    price: Price
    volume: Optional[Quantity]
    market_type: MarketType
    timestamp: datetime

# Frontend: TypeScript interfaces
interface MarketSummary {
    dayAheadPrice: number
    realTimePrice: number
    spread: number
    isInitialized: boolean
}
```

### 3. State Management
- **Backend**: In-memory storage for demo (easily extensible to database)
- **Frontend**: React hooks with domain-specific modules
- **Real-Time Updates**: Polling-based updates (WebSocket-ready architecture)

### 4. Error Handling & UX
- **Graceful Degradation**: Mock data fallback when API unavailable
- **User Feedback**: Comprehensive toast notifications and loading states
- **Validation**: Client and server-side input validation

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- GridStatus.io API key (optional - has fallback)

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Optional: Set up environment variables
cp env.example .env
# Edit .env with your GridStatus API key

# Run the backend
python run.py
```

Backend will be available at: `http://localhost:8000`
- API Documentation: `http://localhost:8000/docs`
- Alternative docs: `http://localhost:8000/redoc`

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Frontend will be available at: `http://localhost:5173`

### Quick Start (Both Services)
```bash
# Terminal 1 - Backend
cd backend && python run.py

# Terminal 2 - Frontend  
cd frontend && npm run dev
```

## Using the Platform

### 1. Market Initialization
- Platform auto-initializes with D-1 market data on first load
- View day-ahead and real-time price charts
- Monitor market summary metrics

### 2. Placing Bids
- **Quick Trade**: Fast single-bid submission
- **Bulk Orders**: Submit multiple bids via order form
- **Validation**: Real-time price and quantity validation
- **Cutoff Enforcement**: Bidding disabled after 11:00 UTC

### 3. Market Progression
- **Advance to D0**: Trigger market clearing and see execution results
- **View Trades**: Monitor executed positions and P&L
- **Real-Time Updates**: Watch P&L change as RT prices evolve

### 4. Portfolio Management
- **Order Book**: Track all bids (pending, executed, rejected)
- **P&L Summary**: Real-time profit/loss calculations
- **Performance Metrics**: Success rates and average prices

## Market Data Details

### PJM Market Structure
- **Day-Ahead Market**: Financial positions settled against real-time
- **Real-Time Market**: Physical delivery and imbalance settlement
- **LMP Components**: Energy, congestion, and loss components
- **Price Volatility**: Realistic price swings and market dynamics

### Data Quality Assurance
- **Source Validation**: GridStatus.io provides cleaned, validated data
- **Fallback Mechanisms**: Mock data ensures platform always functional
- **Error Handling**: Graceful handling of API failures and data gaps

## Technical Highlights

### Backend Architecture
```python
# Domain-driven service structure
class TradingSimulationService:
    def place_bid(self, hour, price, quantity, side, user_id)
    def execute_bid(self, bid_id, ignore_time=False)
    def calculate_pnl(self, trade_id)
    def advance_to_trading_day()
```

### Frontend Architecture
```typescript
// Modular hook-based architecture
export function useMarketData() {
  // Market data management
}

export function useOrders() {
  // Order lifecycle management  
}

export function usePnL() {
  // P&L calculations and tracking
}
```

### API Design
- **RESTful Endpoints**: Clear, resource-based API structure
- **Comprehensive Documentation**: Auto-generated OpenAPI/Swagger docs
- **Error Responses**: Consistent error handling and status codes
- **Validation**: Pydantic models ensure data integrity

## Educational Value

This platform demonstrates:
- **Energy Market Mechanics**: Real day-ahead and real-time market interactions
- **Risk Management**: P&L calculation and position tracking
- **Market Timing**: Impact of bid timing and market clearing processes
- **Price Discovery**: How supply/demand affects clearing prices
- **Financial Settlement**: Real-world energy trading settlement processes

## Future Enhancements

### Technical Improvements
- **Database Integration**: PostgreSQL for persistent storage
- **WebSocket Updates**: Real-time data streaming
- **Authentication**: User management and multi-tenant support
- **Caching Layer**: Redis for improved performance

### Trading Features
- **Advanced Order Types**: Stop-loss, limit orders, portfolio optimization
- **Risk Metrics**: VaR, position limits, exposure monitoring
- **Market Analysis**: Technical indicators, price forecasting
- **Multi-Market Support**: CAISO, ERCOT, NYISO integration

### Platform Features
- **Mobile Responsive**: Enhanced mobile trading experience
- **Export/Import**: Trade data export and analysis tools
- **Backtesting**: Historical strategy testing capabilities
- **Educational Mode**: Guided tutorials and market explanations

## Implementation Notes

### Performance Considerations
- **Efficient Data Structures**: Optimized for real-time calculations
- **Caching Strategy**: Smart caching of market data and calculations
- **Lazy Loading**: Progressive data loading for better UX

### Security & Reliability
- **Input Validation**: Comprehensive validation at all layers
- **Error Boundaries**: Graceful error handling in React components
- **Rate Limiting**: API protection against abuse
- **Data Integrity**: Consistent state management across components

### Testing Strategy
- **Unit Tests**: Core business logic validation
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Complete user workflow validation
- **Performance Tests**: Load testing for scalability

---

## Support

For questions about the implementation, architecture decisions, or energy market concepts, please refer to the comprehensive API documentation at `/docs` or examine the well-documented codebase.

The platform serves as both a functional trading simulator and an educational tool for understanding modern energy markets and software architecture principles.