"""Market data API endpoints."""

from datetime import datetime, timedelta
from fastapi import APIRouter, Query

from ....infrastructure.external.gridstatus_client import GridStatusService
from ....services.trading_simulation import trading_simulation
from ..schemas import MarketDataSchema
from ....domain.trading.value_objects import MarketType

router = APIRouter()


def convert_domain_to_response(market_data) -> MarketDataSchema:
    """Convert domain MarketData to response schema."""
    volume = None
    if market_data.volume is not None:
        volume = {
            "value": market_data.volume.value,
            "unit": market_data.volume.unit
        }
    
    load = None
    if market_data.load is not None:
        load = {
            "value": market_data.load.value,
            "unit": market_data.load.unit
        }
    
    return MarketDataSchema(
        id=str(market_data.id.value),
        price={
            "value": market_data.price.value,
            "currency": market_data.price.currency
        },
        volume=volume,
        load=load,
        market_type=market_data.market_type,
        timestamp=market_data.timestamp,
        source=market_data.source
    )





@router.get("/summary")
async def get_market_summary() -> dict:
    """Get market summary using D-1 simulation strategy."""
    
    # Use D-1 simulation service
    summary = trading_simulation.get_market_summary_d1()
    
    # Do not auto-initialize here to avoid repeated external API calls
    # Frontend should explicitly call /initialize once
    
    return summary


@router.post("/refresh")
async def refresh_simulation_data() -> dict:
    """Refresh the D-1 simulation data."""
    
    try:
        # Re-initialize the simulation with fresh D-1 data
        result = await trading_simulation.initialize_market_data()
        
        return {
            "message": "D-1 simulation data refreshed",
            "timestamp": datetime.utcnow().isoformat(),
            "initialization_result": result,
            "status": "success"
        }
        
    except Exception as e:
        return {
            "message": "Error refreshing simulation data",
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e),
            "status": "error"
        }


@router.get("/markets")
async def get_available_markets() -> dict:
    """Get list of available markets from GridStatus."""
    
    service = GridStatusService()
    markets = await service.get_available_markets()
    
    return {
        "markets": markets,
        "count": len(markets),
        "description": "Available electricity markets for trading"
    }


@router.post("/initialize")
async def initialize_simulation() -> dict:
    """Initialize the D-1 simulation with yesterday's market data."""
    return await trading_simulation.initialize_market_data()


@router.post("/bids")
async def place_bid(
    hour: int = Query(..., ge=0, le=23, description="Hour slot (0-23)"),
    price: float = Query(..., gt=0, description="Bid price in USD/MWh"),
    quantity: float = Query(..., gt=0, description="Quantity in MWh"),
    side: str = Query(..., regex="^(BUY|SELL)$", description="Order side: BUY or SELL"),
    user_id: str = Query("demo_user", description="User ID")
) -> dict:
    """Place a bid for a specific hour slot."""
    return trading_simulation.place_bid(hour=hour, price=price, quantity=quantity, side=side, user_id=user_id)


@router.get("/bids")
async def get_user_bids(
    user_id: str = Query("demo_user", description="User ID")
) -> dict:
    """Get all bids for a user."""
    bids = trading_simulation.get_all_bids(user_id=user_id)
    return {
        "bids": bids,
        "count": len(bids),
        "user_id": user_id
    }


@router.get("/trades")
async def get_user_trades(
    user_id: str = Query("demo_user", description="User ID")
) -> dict:
    """Get all trades for a user with P&L calculations."""
    trades = trading_simulation.get_all_trades(user_id=user_id)
    total_pnl = sum(trade.get("pnl", 0) for trade in trades)
    
    return {
        "trades": trades,
        "count": len(trades),
        "total_pnl": total_pnl,
        "user_id": user_id,
        "reference_date": trading_simulation.get_reference_date().strftime("%Y-%m-%d")
    }


@router.get("/simulation/status")
async def get_simulation_status() -> dict:
    """Get the current simulation status and reference date."""
    reference_date = trading_simulation.get_reference_date()
    
    return {
        "simulation_mode": True,
        "reference_date": reference_date.strftime("%Y-%m-%d"),
        "display_date": "Today (Simulated)",
        "description": f"Simulating energy trading using data from {reference_date.strftime('%B %d, %Y')}",
        "data_initialized": trading_simulation._day_ahead_cache is not None,
        "day_ahead_points": len(trading_simulation._day_ahead_cache) if trading_simulation._day_ahead_cache else 0,
        "real_time_points": len(trading_simulation._real_time_cache) if trading_simulation._real_time_cache else 0
    }


@router.get("/timeseries")
async def get_timeseries() -> dict:
    """Get D-1 day-ahead (hourly) and real-time (5-min) timeseries for charts."""
    series = trading_simulation.get_timeseries()
    return series
