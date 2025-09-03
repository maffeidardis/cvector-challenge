"""API schemas for request/response models."""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field

from ...domain.trading.value_objects import MarketType


# Base schemas
class PriceSchema(BaseModel):
    """Price schema."""
    value: Decimal
    currency: str = "USD"


class QuantitySchema(BaseModel):
    """Quantity schema."""
    value: Decimal
    unit: str = "MWh"


# Market data schemas
class MarketDataSchema(BaseModel):
    """Schema for market data."""
    id: str
    price: PriceSchema
    volume: Optional[QuantitySchema] = None
    load: Optional[QuantitySchema] = None
    market_type: MarketType
    timestamp: datetime
    source: str

    class Config:
        from_attributes = True


# Bid schemas for D-1 simulation
class BidCreateSchema(BaseModel):
    """Schema for creating bids in D-1 simulation."""
    hour: int = Field(..., ge=0, le=23, description="Hour slot (0-23)")
    price: float = Field(..., gt=0, description="Bid price in USD/MWh")
    quantity: float = Field(..., gt=0, description="Quantity in MWh")
    user_id: str = "demo_user"


class BidResponseSchema(BaseModel):
    """Schema for bid responses."""
    id: str
    hour: int
    price: float
    quantity: float
    user_id: str
    status: str  # PENDING, EXECUTED, REJECTED
    timestamp: str


class TradeResponseSchema(BaseModel):
    """Schema for trade responses with P&L."""
    id: str
    bid_id: str
    hour: int
    executed_price: float
    quantity: float
    pnl: float
    real_time_avg_price: float
    timestamp: str



