"""Trading domain value objects - simplified for D-1 simulation."""

from decimal import Decimal
from enum import Enum

from ..base import ValueObject


class MarketType(str, Enum):
    """Market type enumeration."""
    DAY_AHEAD = "DAY_AHEAD"
    REAL_TIME = "REAL_TIME"


class Price(ValueObject):
    """Price value object."""
    
    value: Decimal
    currency: str = "USD"
    
    def __str__(self) -> str:
        return f"{self.value:.2f} {self.currency}"


class Quantity(ValueObject):
    """Quantity value object."""
    
    value: Decimal
    unit: str = "MWh"
    
    def __str__(self) -> str:
        return f"{self.value} {self.unit}"
