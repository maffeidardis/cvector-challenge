"""Trading simulation service using D-1 (yesterday) data strategy."""

from typing import List, Dict, Optional
from datetime import datetime, timezone
import uuid

from ..infrastructure.external.gridstatus_client import GridStatusService

# In-memory storage for bids and trades (for demo purposes)
_bids: Dict[str, Dict] = {}
_trades: Dict[str, Dict] = {}


class Bid:
    """Simple bid representation."""
    
    def __init__(self, hour: int, price: float, quantity: float, side: str = "BUY", user_id: str = "demo_user"):
        self.id = str(uuid.uuid4())
        self.hour = hour  # 0-23
        self.price = price  # USD/MWh
        self.quantity = quantity  # MWh
        self.side = side  # BUY or SELL
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
        # Separate caches for D-1 and D0 data
        self._d1_day_ahead_cache: Optional[List] = None  # D-1 (September 2) data
        self._d1_real_time_cache: Optional[List] = None
        self._d0_day_ahead_cache: Optional[List] = None  # D0 (September 3) data
        self._d0_real_time_cache: Optional[List] = None
        self._cache_date: Optional[datetime] = None
        # Simulation controls
        self.phase: str = "BIDDING"  # BIDDING (D-1) | TRADING (D0)
        self._sim_now: Optional[datetime] = None  # Current simulated time clock head
        self._sim_anchor_utc: Optional[datetime] = None  # Real UTC when sim clock was set
        self._sim_anchor_sim: Optional[datetime] = None  # Simulated time at anchor
    
    @property
    def _day_ahead_cache(self):
        """Get the appropriate day-ahead cache based on current phase."""
        return self._d0_day_ahead_cache if self.phase == "TRADING" else self._d1_day_ahead_cache
    
    @property 
    def _real_time_cache(self):
        """Get the appropriate real-time cache based on current phase."""
        return self._d0_real_time_cache if self.phase == "TRADING" else self._d1_real_time_cache
    
    def get_reference_date(self) -> datetime:
        """Get reference date for data fetches based on phase.
        - BIDDING (D-1): use September 2, 2025 for charts
        - TRADING (D0): use September 3, 2025 for DA/RT data
        """
        if self.phase == "TRADING":
            # D0 = September 3, 2025
            return datetime(2025, 9, 3, tzinfo=timezone.utc)
        # BIDDING: D-1 = September 2, 2025 
        return datetime(2025, 9, 2, tzinfo=timezone.utc)

    def get_now(self) -> datetime:
        """Get current UTC time or simulated override."""
        if self._sim_now is None:
            return datetime.now(timezone.utc)
        # If we have anchors, progress simulated time relative to real elapsed time
        if self._sim_anchor_utc and self._sim_anchor_sim:
            delta = datetime.now(timezone.utc) - self._sim_anchor_utc
            return self._sim_anchor_sim + delta
        return self._sim_now

    def set_simulated_time(self, hour: int, minute: int = 0) -> Dict:
        """Set simulated current UTC time (maintains correct simulation date)."""
        # Clamp values
        hour = max(0, min(23, int(hour)))
        minute = max(0, min(59, int(minute)))
        
        # Use correct simulation date based on phase
        if self.phase == "BIDDING":
            # D-1 = September 2, 2025
            new_sim = datetime(2025, 9, 2, hour, minute, 0, 0, tzinfo=timezone.utc)
        else:
            # D0 = September 3, 2025
            new_sim = datetime(2025, 9, 3, hour, minute, 0, 0, tzinfo=timezone.utc)
            
        self._sim_now = new_sim
        self._sim_anchor_sim = new_sim
        self._sim_anchor_utc = datetime.now(timezone.utc)
        return {
            "status": "ok",
            "simulated_time": new_sim.isoformat(),
        }
    
    async def initialize_market_data(self) -> Dict:
        """Initialize market data for the reference date (D-1)."""
        reference_date = self.get_reference_date()
        
        # Check if we already have cached D-1 data
        if (self._cache_date and 
            self._cache_date.date() == reference_date.date() and 
            self._d1_day_ahead_cache and 
            self._d1_real_time_cache):
            return {
                "status": "cached",
                "reference_date": reference_date.strftime("%Y-%m-%d"),
                "day_ahead_points": len(self._d1_day_ahead_cache),
                "real_time_points": len(self._d1_real_time_cache)
            }
        
        try:
            # Fetch BOTH D-1 and D0 data upfront to avoid async issues later
            d1_date = datetime(2025, 9, 2, tzinfo=timezone.utc)  # D-1 = September 2
            d0_date = datetime(2025, 9, 3, tzinfo=timezone.utc)  # D0 = September 3
            
            print(f"DEBUG: Fetching D-1 data for {d1_date}")
            self._d1_day_ahead_cache = await self.gridstatus_service.fetch_day_ahead_lmp_data(
                market="PJM", reference_date=d1_date
            )
            self._d1_real_time_cache = await self.gridstatus_service.fetch_realtime_lmp_data(
                market="PJM", reference_date=d1_date
            )
            print(f"DEBUG: Fetched D-1 data: {len(self._d1_day_ahead_cache)} DA, {len(self._d1_real_time_cache)} RT")
            
            print(f"DEBUG: Fetching D0 data for {d0_date}")
            self._d0_day_ahead_cache = await self.gridstatus_service.fetch_day_ahead_lmp_data(
                market="PJM", reference_date=d0_date
            )
            self._d0_real_time_cache = await self.gridstatus_service.fetch_realtime_lmp_data(
                market="PJM", reference_date=d0_date
            )
            print(f"DEBUG: Fetched D0 data: {len(self._d0_day_ahead_cache)} DA, {len(self._d0_real_time_cache)} RT")
            
            # Debug: Check the time range of D-1 real-time data
            if self._d1_real_time_cache:
                first_rt = self._d1_real_time_cache[0].timestamp
                last_rt = self._d1_real_time_cache[-1].timestamp
                print(f"DEBUG: D-1 real-time data range: {first_rt} to {last_rt} ({len(self._d1_real_time_cache)} points)")
            
            self._cache_date = d1_date  # Use D-1 date as cache reference
            print(f"DEBUG: Both D-1 and D0 data cached successfully")
            
            # Default simulated time: 10:00 on September 2, 2025 (D-1) for UX
            if self.phase == "BIDDING" and self._sim_now is None:
                self._sim_now = datetime(2025, 9, 2, 10, 0, 0, 0, tzinfo=timezone.utc)
                self._sim_anchor_sim = self._sim_now
                self._sim_anchor_utc = datetime.now(timezone.utc)
            
            return {
                "status": "initialized",
                "reference_date": reference_date.strftime("%Y-%m-%d"),
                "day_ahead_points": len(self._d1_day_ahead_cache),
                "real_time_points": len(self._d1_real_time_cache)
            }
            
        except Exception as e:
            return {
                "status": "error",
                "message": str(e),
                "reference_date": reference_date.strftime("%Y-%m-%d")
            }
    
    def place_bid(self, hour: int, price: float, quantity: float, side: str = "BUY", user_id: str = "demo_user") -> Dict:
        """Place a bid for a specific hour."""
        # Enforce phase and cutoff (11:00 UTC) during BIDDING
        now = self.get_now()
        if self.phase != "BIDDING":
            return {"status": "error", "message": "Bids are closed. Current phase is TRADING (D0)."}
        if now.hour >= 11:
            return {"status": "error", "message": "Bidding cutoff passed (11:00 UTC)."}
        
        if not 0 <= hour <= 23:
            return {"status": "error", "message": "Hour must be between 0 and 23"}
        
        if price <= 0 or quantity <= 0:
            return {"status": "error", "message": "Price and quantity must be positive"}
        
        if side not in ["BUY", "SELL"]:
            return {"status": "error", "message": "Side must be BUY or SELL"}
        
        bid = Bid(hour=hour, price=price, quantity=quantity, side=side, user_id=user_id)
        _bids[bid.id] = {
            "id": bid.id,
            "hour": bid.hour,
            "price": bid.price,
            "quantity": bid.quantity,
            "side": bid.side,
            "user_id": bid.user_id,
            "timestamp": bid.timestamp.isoformat(),
            "status": "PENDING",  # Always PENDING on D-1
            "clearing_price": None  # Will be set when executed on D0
        }
        
        print(f"DEBUG: Placed {side} bid for hour {hour} at ${price}/MWh - Status: PENDING (awaiting D0 clearing)")
        
        return {
            "status": "success",
            "bid_id": bid.id,
            "message": f"Bid placed for D0 hour {hour}:00. Status: PENDING until DAM clearing."
        }
    
    def execute_bid(self, bid_id: str, ignore_time: bool = False) -> Dict:
        """Execute a bid using D-1 day-ahead clearing prices."""
        
        if bid_id not in _bids:
            return {"status": "error", "message": "Bid not found"}
        
        bid_data = _bids[bid_id]
        
        # Check if it's time to execute (current UTC hour >= bid hour) unless forced during advance
        if not ignore_time:
            current_hour = self.get_now().hour
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
        
        # Execute based on BUY vs SELL logic
        side = bid_data.get("side", "BUY")  # Default to BUY for backward compatibility
        should_execute = False
        
        if side == "BUY":
            # BUY: Execute if willing to pay >= clearing price
            should_execute = bid_data["price"] >= clearing_price
            print(f"DEBUG: BUY order - bid price {bid_data['price']} >= clearing price {clearing_price}: {should_execute}")
        elif side == "SELL":
            # SELL: Execute if willing to accept <= clearing price (market pays more than ask)
            should_execute = bid_data["price"] <= clearing_price
            print(f"DEBUG: SELL order - bid price {bid_data['price']} <= clearing price {clearing_price}: {should_execute}")
        
        if should_execute:
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
        
        # Get the original bid to determine side (BUY/SELL)
        bid_id = trade_data["bid_id"]
        if bid_id not in _bids:
            return {"status": "error", "message": "Original bid not found"}
        
        bid_data = _bids[bid_id]
        side = bid_data.get("side", "BUY")  # Default to BUY for backward compatibility
        
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
        
        # Calculate P&L based on BUY vs SELL
        day_ahead_price = trade_data["executed_price"]
        quantity = trade_data["quantity"]
        
        if side == "BUY":
            # BUY: Profit when real-time > day-ahead (bought cheap, market went up)
            pnl = (avg_real_time_price - day_ahead_price) * quantity
        elif side == "SELL":
            # SELL: Profit when day-ahead > real-time (sold high, market went down)
            pnl = (day_ahead_price - avg_real_time_price) * quantity
        else:
            # Default to BUY logic for unknown sides
            pnl = (avg_real_time_price - day_ahead_price) * quantity
        
        return {
            "status": "success",
            "trade_id": trade_id,
            "side": side,
            "day_ahead_price": day_ahead_price,
            "real_time_avg_price": avg_real_time_price,
            "quantity": quantity,
            "pnl": pnl,
            "real_time_data_points": len(real_time_prices)
        }
    
    def get_all_bids(self, user_id: str = "demo_user") -> List[Dict]:
        """Get all bids for a user."""
        # On D-1: All bids should remain PENDING until user advances to D0
        # On D0: Show the results of clearing that happened during advance
        return [bid for bid in _bids.values() if bid["user_id"] == user_id]
    
    
    def get_all_trades(self, user_id: str = "demo_user") -> List[Dict]:
        """Get all trades for a user with P&L."""
        # Trades only exist after advancing to D0 and clearing happens
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
        current_utc = self.get_now()
        current_hour = current_utc.hour
        current_minute = current_utc.minute
        cache_date = self._cache_date.strftime("%Y-%m-%d") if self._cache_date else "unknown"
        print(f"DEBUG: Current UTC time: {current_utc}, filtering RT data up to {current_hour:02d}:{current_minute:02d}")
        print(f"DEBUG: Cache date: {cache_date}, Phase: {self.phase}")
        
        # Day-ahead: show all 24 hours (this is known in advance)
        day_ahead_series = [
            {
                "timestamp": md.timestamp.isoformat(),
                "price": float(md.price.value),
            }
            for md in self._day_ahead_cache
        ]

        # Real-time: only show data up to current time to simulate progression
        # Since we're using D-1 data, we need to show progression as if D-1 data is "today"
        
        real_time_series = []
        for md in self._real_time_cache:
            # Get the time components from the D-1 data
            data_hour = md.timestamp.hour
            data_minute = md.timestamp.minute
            
            # Calculate total minutes since start of day for both data and current time
            data_minutes_since_start = data_hour * 60 + data_minute
            current_minutes_since_start = current_hour * 60 + current_minute
            
            # Show data if D-1 time point <= current time (simulating progression)
            if data_minutes_since_start <= current_minutes_since_start:
                real_time_series.append({
                    "timestamp": md.timestamp.isoformat(),
                    "price": float(md.price.value),
                })
            
        print(f"DEBUG: Current time {current_hour:02d}:{current_minute:02d}, showing {len(real_time_series)} RT points out of {len(self._real_time_cache)} total")

        # Debug: Show first few timestamps to verify dates
        if day_ahead_series:
            print(f"DEBUG: First few DA timestamps: {[p['timestamp'][:10] for p in day_ahead_series[:3]]}")
        if real_time_series:
            print(f"DEBUG: First few RT timestamps: {[p['timestamp'][:10] for p in real_time_series[:3]]}")

        return {
            "reference_date": self.get_reference_date().strftime("%Y-%m-%d"),
            "day_ahead": day_ahead_series,
            "real_time": real_time_series,
            "simulation_mode": True,
            "current_simulation_time": f"{current_hour:02d}:{current_minute:02d}",
        }

    def get_simulation_status(self) -> Dict:
        """Return enriched simulation status for frontend UX."""
        # Ensure a default simulated time exists (10:00 on appropriate simulation date)
        if self._sim_now is None:
            if self.phase == "BIDDING":
                target = datetime(2025, 9, 2, 10, 0, 0, 0, tzinfo=timezone.utc)
            else:
                target = datetime(2025, 9, 3, 10, 0, 0, 0, tzinfo=timezone.utc)
            self._sim_now = target
            self._sim_anchor_sim = target
            self._sim_anchor_utc = datetime.now(timezone.utc)
        now = self.get_now()
        # Compute cutoff for 11:00 on the current simulation day
        cutoff_dt = datetime(year=now.year, month=now.month, day=now.day, hour=11, minute=0, second=0, tzinfo=timezone.utc)
        seconds_to_cutoff = int((cutoff_dt - now).total_seconds()) if self.phase == "BIDDING" else 0
        # Fixed simulation dates
        bidding_date = datetime(2025, 9, 2, tzinfo=timezone.utc)
        delivery_date = datetime(2025, 9, 3, tzinfo=timezone.utc)
        return {
            "simulation_mode": True,
            "phase": self.phase,
            "bidding_date": bidding_date.strftime("%Y-%m-%d"),
            "delivery_date": delivery_date.strftime("%Y-%m-%d"),
            "cutoff_time_utc": "11:00",
            "can_place_bids": self.phase == "BIDDING" and now.hour < 11,
            "seconds_to_cutoff": max(seconds_to_cutoff, 0),
            "data_initialized": (self._d1_day_ahead_cache is not None and 
                                (self._d0_day_ahead_cache is not None if self.phase == "TRADING" else True)),
            "day_ahead_points": len(self._day_ahead_cache) if self._day_ahead_cache else 0,
            "real_time_points": len(self._real_time_cache) if self._real_time_cache else 0,
            "simulated_time": now.isoformat(),
            "current_simulation_time": f"{now.hour:02d}:{now.minute:02d}:{now.second:02d}",
            "pending_bids": sum(1 for b in _bids.values() if b["status"] == "PENDING"),
            "executed_bids": sum(1 for b in _bids.values() if b["status"] == "EXECUTED"),
            "rejected_bids": sum(1 for b in _bids.values() if b["status"] == "REJECTED"),
            "trades_count": len(_trades),
        }

    def advance_to_trading_day(self) -> Dict:
        """Advance phase to TRADING (D0) and perform batch DAM clearing."""
        # Switch phase to TRADING (D0 = September 3, 2025)
        self.phase = "TRADING"
        
        # Find the latest hour from ALL bids (including PENDING ones about to be cleared) for better UX
        bid_hours = []
        print(f"DEBUG: Checking {len(_bids)} total bids for latest delivery hour")
        
        for bid_id, bid in _bids.items():
            print(f"DEBUG: Bid {bid_id}: hour={bid['hour']}, status={bid['status']}")
            bid_hours.append(bid["hour"])
        
        # Use the maximum hour from all bids, or 10 as fallback if no bids
        latest_bid_hour = max(bid_hours) if bid_hours else 10
        print(f"DEBUG: Bid hours found: {bid_hours}, using latest: {latest_bid_hour}")
        
        # Set simulated time to the latest bid hour (or 10:00 if none)
        self._sim_now = datetime(2025, 9, 3, latest_bid_hour, 0, 0, 0, tzinfo=timezone.utc)
        self._sim_anchor_sim = self._sim_now
        self._sim_anchor_utc = datetime.now(timezone.utc)
        print(f"DEBUG: Advanced to D0, set time to {self._sim_now} (latest bid hour: {latest_bid_hour} from {len(_bids)} bids)")
        # D0 data should already be pre-loaded during initialization
        if self._d0_day_ahead_cache and self._d0_real_time_cache:
            print(f"DEBUG: Using pre-loaded D0 data: {len(self._d0_day_ahead_cache)} DA, {len(self._d0_real_time_cache)} RT points")
        else:
            print(f"DEBUG: WARNING - No D0 data available! Charts will show incorrect data.")
        # Clear all PENDING bids (this is when DAM clearing happens)
        cleared = 0
        rejected = 0
        print(f"DEBUG: Starting DAM clearing for {len([b for b in _bids.values() if b['status'] == 'PENDING'])} pending bids")
        
        for bid_id, bid in list(_bids.items()):
            if bid["status"] == "PENDING":
                print(f"DEBUG: Clearing bid {bid_id}: {bid['side']} {bid['quantity']} MWh @ ${bid['price']} for hour {bid['hour']}")
                result = self.execute_bid(bid_id, ignore_time=True)
                if result.get("status") == "executed":
                    _bids[bid_id]["status"] = "EXECUTED"
                    cleared += 1
                    print(f"DEBUG: ✓ EXECUTED - Clearing price: ${result.get('executed_price')}")
                elif result.get("status") == "rejected":
                    _bids[bid_id]["status"] = "REJECTED"
                    rejected += 1
                    print(f"DEBUG: ✗ REJECTED - Bid: ${bid['price']}, Clearing: ${result.get('clearing_price')}")
        
        print(f"DEBUG: DAM clearing complete - {cleared} executed, {rejected} rejected")
        return {
            "status": "advanced",
            "phase": self.phase,
            "cleared": cleared,
            "rejected": rejected,
            "trades_count": len(_trades),
        }

    def back_to_bidding_day(self) -> Dict:
        """Go back to BIDDING phase (D-1) to place more orders."""
        # Switch phase back to BIDDING (D-1 = September 2, 2025)
        self.phase = "BIDDING"
        # Set simulated time to 10:00 on September 2, 2025 (D-1) by default
        self._sim_now = datetime(2025, 9, 2, 10, 0, 0, 0, tzinfo=timezone.utc)
        self._sim_anchor_sim = self._sim_now
        self._sim_anchor_utc = datetime.now(timezone.utc)
        # D-1 data should already be cached from initialization
        print(f"DEBUG: Back to D-1 - using cached D-1 data")
        if self._d1_day_ahead_cache and self._d1_real_time_cache:
            print(f"DEBUG: D-1 data available: {len(self._d1_day_ahead_cache)} DA points, {len(self._d1_real_time_cache)} RT points")
        else:
            print(f"DEBUG: WARNING - No D-1 data cached! May need to re-initialize.")
        
        return {
            "status": "back_to_bidding",
            "phase": self.phase,
            "message": "Returned to bidding phase (D-1)"
        }

    def reset_order_book(self) -> Dict:
        """Clear all bids and trades from the order book."""
        global _bids, _trades
        
        # Store counts for response
        bid_count = len(_bids)
        trade_count = len(_trades)
        
        # Clear all orders and trades
        _bids.clear()
        _trades.clear()
        
        print(f"DEBUG: Order book reset - Cleared {bid_count} bids and {trade_count} trades")
        
        return {
            "status": "success",
            "message": f"Order book cleared successfully",
            "cleared_bids": bid_count,
            "cleared_trades": trade_count
        }


# Global simulation service instance
trading_simulation = TradingSimulationService()
