"""Trading simulation service using D-1 (yesterday) data strategy."""

from typing import List, Dict, Optional
from datetime import datetime, timedelta
from decimal import Decimal
import uuid

from ..infrastructure.external.gridstatus_client import GridStatusService
from ..domain.trading.value_objects import MarketType

# In-memory storage for bids and trades (for demo purposes)
_bids: Dict[str, Dict] = {}
_trades: Dict[str, Dict] = {}


class Bid:
    """Simple bid representation."""
    
    def __init__(self, hour: int, price: float, quantity: float, user_id: str = "demo_user"):
        self.id = str(uuid.uuid4())
        self.hour = hour  # 0-23
        self.price = price  # USD/MWh
        self.quantity = quantity  # MWh
        self.user_id = user_id
        self.timestamp = datetime.utcnow()
        self.status = "PENDING"  # PENDING, EXECUTED, REJECTED


class Trade:
    """Simple trade representation."""
    
    def __init__(self, bid_id: str, executed_price: float, quantity: float, hour: int):
        self.id = str(uuid.uuid4())
        self.bid_id = bid_id
        self.executed_price = executed_price  # Day-ahead clearing price
        self.quantity = quantity
        self.hour = hour
        self.timestamp = datetime.utcnow()


class TradingSimulationService:
    """Service for D-1 trading simulation."""
    
    def __init__(self):
        self.gridstatus_service = GridStatusService()
        self._day_ahead_cache: Optional[List] = None
        self._real_time_cache: Optional[List] = None
        self._cache_date: Optional[datetime] = None
    
    def get_reference_date(self) -> datetime:
        """Get the reference date (D-1) for simulation."""
        # Always return yesterday (D-1) - current UTC date minus 1 day
        return datetime.utcnow() - timedelta(days=1)
    
    async def initialize_market_data(self) -> Dict:
        """Initialize market data for the reference date (D-1)."""
        reference_date = self.get_reference_date()
        
        # Check if we already have cached data for this date
        if (self._cache_date and 
            self._cache_date.date() == reference_date.date() and 
            self._day_ahead_cache and 
            self._real_time_cache):
            return {
                "status": "cached",
                "reference_date": reference_date.strftime("%Y-%m-%d"),
                "day_ahead_points": len(self._day_ahead_cache),
                "real_time_points": len(self._real_time_cache)
            }
        
        try:
            # Fetch day-ahead data (24 hourly points)
            self._day_ahead_cache = await self.gridstatus_service.fetch_day_ahead_lmp_data(
                market="PJM", 
                reference_date=reference_date,
                limit=50  # Increased to ensure we get 24 hours
            )
            
            # Fetch real-time data (288 5-minute points, but limit to 300 to get full day coverage)
            self._real_time_cache = await self.gridstatus_service.fetch_realtime_lmp_data(
                market="PJM", 
                reference_date=reference_date,
                limit=300  # Increased to get full day + some next day coverage
            )
            
            # Debug: Check the time range of real-time data
            if self._real_time_cache:
                first_rt = self._real_time_cache[0].timestamp
                last_rt = self._real_time_cache[-1].timestamp
                print(f"DEBUG: Real-time data range: {first_rt} to {last_rt} ({len(self._real_time_cache)} points)")
            
            self._cache_date = reference_date
            
            return {
                "status": "initialized",
                "reference_date": reference_date.strftime("%Y-%m-%d"),
                "day_ahead_points": len(self._day_ahead_cache),
                "real_time_points": len(self._real_time_cache)
            }
            
        except Exception as e:
            return {
                "status": "error",
                "message": str(e),
                "reference_date": reference_date.strftime("%Y-%m-%d")
            }
    
    def place_bid(self, hour: int, price: float, quantity: float, user_id: str = "demo_user") -> Dict:
        """Place a bid for a specific hour."""
        
        if not 0 <= hour <= 23:
            return {"status": "error", "message": "Hour must be between 0 and 23"}
        
        if price <= 0 or quantity <= 0:
            return {"status": "error", "message": "Price and quantity must be positive"}
        
        bid = Bid(hour=hour, price=price, quantity=quantity, user_id=user_id)
        _bids[bid.id] = {
            "id": bid.id,
            "hour": bid.hour,
            "price": bid.price,
            "quantity": bid.quantity,
            "user_id": bid.user_id,
            "timestamp": bid.timestamp.isoformat(),
            "status": bid.status,
            "clearing_price": None  # Will be set when executed
        }
        
        # Immediately try to execute the bid using D-1 data
        execution_result = self.execute_bid(bid.id)
        
        return {
            "status": "success",
            "bid_id": bid.id,
            "execution": execution_result
        }
    
    def execute_bid(self, bid_id: str) -> Dict:
        """Execute a bid using D-1 day-ahead clearing prices."""
        
        if bid_id not in _bids:
            return {"status": "error", "message": "Bid not found"}
        
        bid_data = _bids[bid_id]
        
        # Check if it's time to execute (current UTC hour >= bid hour)
        current_hour = datetime.utcnow().hour
        print(f"DEBUG: Current UTC hour: {current_hour}, Bid hour: {bid_data['hour']}")
        if current_hour < bid_data["hour"]:
            return {"status": "pending", "message": f"Waiting for hour {bid_data['hour']}. Current hour: {current_hour}"}
        
        if not self._day_ahead_cache:
            return {"status": "error", "message": "No day-ahead data available"}
        
        # Find the day-ahead clearing price for the bid hour
        clearing_price = None
        for market_data in self._day_ahead_cache:
            # Extract hour from timestamp
            data_hour = market_data.timestamp.hour
            if data_hour == bid_data["hour"]:
                clearing_price = float(market_data.price.value)
                break
        
        if clearing_price is None:
            return {"status": "error", "message": f"No clearing price found for hour {bid_data['hour']}"}
        
        # Store clearing price in bid record
        _bids[bid_id]["clearing_price"] = clearing_price
        
        # Execute if bid price >= clearing price
        print(f"DEBUG: Comparing bid price {bid_data['price']} >= clearing price {clearing_price}")
        if bid_data["price"] >= clearing_price:
            # Create trade
            trade = Trade(
                bid_id=bid_id,
                executed_price=clearing_price,
                quantity=bid_data["quantity"],
                hour=bid_data["hour"]
            )
            
            _trades[trade.id] = {
                "id": trade.id,
                "bid_id": trade.bid_id,
                "executed_price": trade.executed_price,
                "quantity": trade.quantity,
                "hour": trade.hour,
                "timestamp": trade.timestamp.isoformat()
            }
            
            # Update bid status
            _bids[bid_id]["status"] = "EXECUTED"
            print(f"DEBUG: Order EXECUTED - Bid: ${bid_data['price']}, Clearing: ${clearing_price}")
            
            return {
                "status": "executed",
                "trade_id": trade.id,
                "executed_price": clearing_price,
                "bid_price": bid_data["price"],
                "quantity": bid_data["quantity"]
            }
        else:
            # Bid rejected
            _bids[bid_id]["status"] = "REJECTED"
            print(f"DEBUG: Order REJECTED - Bid: ${bid_data['price']}, Clearing: ${clearing_price}")
            
            return {
                "status": "rejected",
                "clearing_price": clearing_price,
                "bid_price": bid_data["price"],
                "reason": "Bid price below clearing price"
            }
    
    def calculate_pnl(self, trade_id: str) -> Dict:
        """Calculate P&L for a trade using real-time vs day-ahead prices."""
        
        if trade_id not in _trades:
            return {"status": "error", "message": "Trade not found"}
        
        trade_data = _trades[trade_id]
        
        if not self._real_time_cache:
            return {"status": "error", "message": "No real-time data available"}
        
        # Find real-time prices for the trade hour
        hour = trade_data["hour"]
        real_time_prices = []
        
        for market_data in self._real_time_cache:
            data_hour = market_data.timestamp.hour
            if data_hour == hour:
                real_time_prices.append(float(market_data.price.value))
        
        if not real_time_prices:
            return {"status": "error", "message": f"No real-time prices found for hour {hour}"}
        
        # Calculate average real-time price for the hour
        avg_real_time_price = sum(real_time_prices) / len(real_time_prices)
        
        # Calculate P&L
        day_ahead_price = trade_data["executed_price"]
        quantity = trade_data["quantity"]
        
        pnl = (avg_real_time_price - day_ahead_price) * quantity
        
        return {
            "status": "success",
            "trade_id": trade_id,
            "day_ahead_price": day_ahead_price,
            "real_time_avg_price": avg_real_time_price,
            "quantity": quantity,
            "pnl": pnl,
            "real_time_data_points": len(real_time_prices)
        }
    
    def get_all_bids(self, user_id: str = "demo_user") -> List[Dict]:
        """Get all bids for a user, checking for executions."""
        # First, check and execute any pending bids that should be executed
        self._check_and_execute_pending_bids()
        
        return [bid for bid in _bids.values() if bid["user_id"] == user_id]
    
    def _check_and_execute_pending_bids(self):
        """Check and execute any pending bids whose time has come."""
        current_hour = datetime.utcnow().hour
        
        for bid_id, bid_data in _bids.items():
            if bid_data["status"] == "PENDING" and current_hour >= bid_data["hour"]:
                execution_result = self.execute_bid(bid_id)
                print(f"DEBUG: Execution result for bid {bid_id}: {execution_result}")
                if execution_result.get("status") == "executed":
                    _bids[bid_id]["status"] = "EXECUTED"
                elif execution_result.get("status") == "rejected":
                    _bids[bid_id]["status"] = "REJECTED"
    
    def get_all_trades(self, user_id: str = "demo_user") -> List[Dict]:
        """Get all trades for a user with P&L."""
        # First, check and execute any pending bids that should be executed
        self._check_and_execute_pending_bids()
        
        user_bids = {bid["id"] for bid in _bids.values() if bid["user_id"] == user_id}
        trades = [trade for trade in _trades.values() if trade["bid_id"] in user_bids]
        
        # Add P&L to each trade
        for trade in trades:
            pnl_result = self.calculate_pnl(trade["id"])
            if pnl_result["status"] == "success":
                trade["pnl"] = pnl_result["pnl"]
                trade["real_time_avg_price"] = pnl_result["real_time_avg_price"]
            else:
                trade["pnl"] = 0.0
                trade["real_time_avg_price"] = trade["executed_price"]
        
        return trades
    
    def get_market_summary_d1(self) -> Dict:
        """Get market summary using D-1 data strategy."""
        
        if not self._day_ahead_cache or not self._real_time_cache:
            return {
                "status": "no_data",
                "message": "Market data not initialized. Call /initialize first."
            }
        
        # Get latest prices from cached data
        latest_day_ahead = self._day_ahead_cache[-1] if self._day_ahead_cache else None
        latest_real_time = self._real_time_cache[-1] if self._real_time_cache else None
        
        day_ahead_price = float(latest_day_ahead.price.value) if latest_day_ahead else 45.00
        real_time_price = float(latest_real_time.price.value) if latest_real_time else 52.00
        
        return {
            "day_ahead": {
                "price": day_ahead_price,
                "currency": "USD",
                "timestamp": latest_day_ahead.timestamp if latest_day_ahead else datetime.utcnow(),
                "data_points": len(self._day_ahead_cache)
            },
            "real_time": {
                "price": real_time_price,
                "currency": "USD",
                "timestamp": latest_real_time.timestamp if latest_real_time else datetime.utcnow(),
                "data_points": len(self._real_time_cache)
            },
            "spread": real_time_price - day_ahead_price,
            "reference_date": self.get_reference_date().strftime("%Y-%m-%d"),
            "simulation_mode": True
        }

    def get_timeseries(self) -> Dict:
        """Return D-1 day-ahead (hourly) and real-time (5-min) timeseries for charts."""
        if not self._day_ahead_cache or not self._real_time_cache:
            return {
                "status": "no_data",
                "message": "Market data not initialized. Call /initialize first.",
            }

        # Get current UTC time for simulation (to match D-1 data timestamps)
        current_utc = datetime.utcnow()
        current_hour = current_utc.hour
        current_minute = current_utc.minute
        print(f"DEBUG: Current UTC time: {current_utc}, filtering RT data up to {current_hour:02d}:{current_minute:02d}")
        
        # Day-ahead: show all 24 hours (this is known in advance)
        day_ahead_series = [
            {
                "timestamp": md.timestamp.isoformat(),
                "price": float(md.price.value),
            }
            for md in self._day_ahead_cache
        ]

        # Real-time: only show data up to current time to simulate progression
        real_time_series = []
        for md in self._real_time_cache:
            data_hour = md.timestamp.hour
            data_minute = md.timestamp.minute
            
            # Show data if it's from a past hour, or current hour up to current minute
            if (data_hour < current_hour) or (data_hour == current_hour and data_minute <= current_minute):
                real_time_series.append({
                    "timestamp": md.timestamp.isoformat(),
                    "price": float(md.price.value),
                })

        return {
            "reference_date": self.get_reference_date().strftime("%Y-%m-%d"),
            "day_ahead": day_ahead_series,
            "real_time": real_time_series,
            "simulation_mode": True,
            "current_simulation_time": f"{current_hour:02d}:{current_minute:02d}",
        }


# Global simulation service instance
trading_simulation = TradingSimulationService()
