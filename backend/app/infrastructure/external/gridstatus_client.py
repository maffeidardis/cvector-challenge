"""GridStatus.io API client for real-time market data."""

import os
import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from decimal import Decimal
import pandas as pd

try:
    import gridstatusio
except ImportError:
    gridstatusio = None

from ...domain.trading.value_objects import Price, Quantity, MarketType
from dataclasses import dataclass
import uuid

logger = logging.getLogger(__name__)


@dataclass
class MarketDataId:
    """Simple market data identifier."""
    value: str
    
    def __init__(self):
        self.value = str(uuid.uuid4())


@dataclass
class MarketData:
    """Simple market data representation."""
    id: MarketDataId
    price: Price
    volume: Optional[Quantity] = None
    load: Optional[Quantity] = None
    market_type: MarketType = MarketType.REAL_TIME
    timestamp: datetime = None
    source: str = "gridstatus"
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.utcnow()


class GridStatusService:
    """Service for fetching market data from GridStatus.io API."""
    
    def __init__(self, api_key: Optional[str] = None):
        """Initialize GridStatus service."""
        self.api_key = api_key or os.getenv("GRIDSTATUS_API_KEY")
        self.client = None
        
        if gridstatusio and self.api_key:
            try:
                # Set API key in environment for gridstatusio
                os.environ["GRIDSTATUS_API_KEY"] = self.api_key
                self.client = gridstatusio.GridStatusClient()
                logger.info("GridStatus client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize GridStatus client: {e}")
        else:
            logger.warning("GridStatus client not available - using mock data")
    
    async def fetch_realtime_lmp_data(
        self, 
        market: str = "PJM", 
        limit: int = 288,  # 1 day of 5-minute data (24 * 60 / 5)
        reference_date: Optional[datetime] = None
    ) -> List[MarketData]:
        """Fetch real-time LMP data for a specific date (D-1 strategy)."""
        
        if not self.client:
            logger.error("GridStatus client not available - cannot fetch real PJM data")
            return []
        
        # Use yesterday as reference date (D-1 strategy)
        if reference_date is None:
            reference_date = datetime.utcnow() - timedelta(days=1)
        
        # Format dates for API call - extend into next day for simulation progression
        start_date = reference_date.strftime("%Y-%m-%d") + "T00:00:00Z"
        next_day = reference_date + timedelta(days=1)
        end_date = next_day.strftime("%Y-%m-%d") + "T06:00:00Z"  # Get 6 hours into next day
        
        try:
            # Focus on PJM only - use PJM Western Hub as single region
            dataset_name = "pjm_lmp_real_time_5_min"
            logger.info(f"Fetching PJM real-time LMP data for {reference_date.strftime('%Y-%m-%d')} (limit: {limit})")
            
            # Run in thread pool since gridstatusio is synchronous
            loop = asyncio.get_event_loop()
            df = await loop.run_in_executor(
                None,
                lambda: self.client.get_dataset(
                    dataset_name,
                    start=start_date,
                    end=end_date,
                    limit=limit,
                    filter_column="location_type",
                    filter_value="HUB"
                )
            )

            print(df)
            
            # Filter for single location to avoid duplicates
            if not df.empty and 'location' in df.columns:
                # Take only the first location to ensure we get clean time series data
                first_location = df['location'].iloc[0]
                df = df[df['location'] == first_location]
                logger.info(f"Using PJM real-time location: {first_location} with {len(df)} records")
                
                # Debug: Check if we still have duplicates after location filtering
                if len(df) > 0:
                    print(f"After location filtering - First 5 timestamps:")
                    print(df['interval_start_utc'].head().tolist())
                    print(f"Last 5 timestamps:")
                    print(df['interval_start_utc'].tail().tolist())
                    
                    # Check for duplicate timestamps
                    duplicates = df['interval_start_utc'].duplicated().sum()
                    print(f"Duplicate timestamps after location filter: {duplicates}")
            
            return self._convert_lmp_dataframe_to_market_data(df, MarketType.REAL_TIME)
            
        except Exception as e:
            logger.error(f"Error fetching real-time PJM LMP data: {e}")
            return []
    
    async def fetch_day_ahead_lmp_data(
        self, 
        market: str = "PJM", 
        reference_date: Optional[datetime] = None,
        limit: int = 24  # 1 day of hourly data
    ) -> List[MarketData]:
        """Fetch day-ahead LMP data for a specific date (D-1 strategy)."""
        
        if not self.client:
            logger.error("GridStatus client not available - cannot fetch real PJM data")
            return []
        
        # Use yesterday as reference date (D-1 strategy)
        if reference_date is None:
            reference_date = datetime.utcnow() - timedelta(days=1)
        
        # Format date for API call
        date_str = reference_date.strftime("%Y-%m-%d")
        
        try:
            # Focus on PJM day-ahead data only
            dataset_name = "pjm_lmp_day_ahead_hourly"
            logger.info(f"Fetching PJM day-ahead LMP data for {date_str} (limit: {limit})")
            
            loop = asyncio.get_event_loop()
            df = await loop.run_in_executor(
                None,
                lambda: self.client.get_dataset(
                    dataset_name,
                    start=f"{date_str}T00:00:00Z",
                    end=f"{date_str}T23:59:59Z",
                    limit=limit,
                    filter_column="location_type",
                    filter_value="HUB"
                )
            )
            
            # Filter for single location to avoid duplicates
            if not df.empty and 'location' in df.columns:
                # Take only the first location to ensure we get clean hourly data
                first_location = df['location'].iloc[0]
                df = df[df['location'] == first_location]
                logger.info(f"Using PJM day-ahead location: {first_location} with {len(df)} records")
            
            return self._convert_lmp_dataframe_to_market_data(df, MarketType.DAY_AHEAD)
            
        except Exception as e:
            logger.error(f"Error fetching day-ahead PJM LMP data: {e}")
            return []
    
    async def fetch_load_data(
        self, 
        market: str = "PJM", 
        limit: int = 288  # 1 day of 5-minute data
    ) -> List[MarketData]:
        """Fetch real-time load data."""
        
        if not self.client:
            logger.error("GridStatus client not available - cannot fetch real PJM data")
            return []
        
        try:
            # Focus on PJM load data only
            dataset_name = "pjm_load"
            logger.info(f"Fetching PJM load data (limit: {limit})")
            
            loop = asyncio.get_event_loop()
            df = await loop.run_in_executor(
                None,
                lambda: self.client.get_dataset(dataset_name, limit=limit)
            )
            
            return self._convert_load_dataframe_to_market_data(df)
            
        except Exception as e:
            logger.error(f"Error fetching PJM load data: {e}")
            return []
    
    def _convert_lmp_dataframe_to_market_data(
        self, 
        df: pd.DataFrame, 
        market_type: MarketType
    ) -> List[MarketData]:
        """Convert LMP DataFrame to MarketData entities."""
        
        market_data_list = []
        
        for _, row in df.iterrows():
            try:
                # Extract price - LMP is typically in 'lmp' or 'price' column
                price_value = None
                for col in ['lmp', 'price', 'marginal_cost', 'clearing_price']:
                    if col in row and pd.notna(row[col]):
                        price_value = float(row[col])
                        break
                
                if price_value is None:
                    continue
                
                # Extract timestamp
                timestamp = None
                for col in ['interval_start_utc', 'timestamp', 'datetime', 'interval_start', 'time']:
                    if col in row and pd.notna(row[col]):
                        if isinstance(row[col], str):
                            timestamp = datetime.fromisoformat(row[col].replace('Z', '+00:00'))
                        else:
                            timestamp = pd.to_datetime(row[col]).to_pydatetime()
                        break
                
                if timestamp is None:
                    timestamp = datetime.utcnow()
                
                # Extract volume if available
                volume = None
                for col in ['mw', 'volume', 'quantity']:
                    if col in row and pd.notna(row[col]):
                        volume = Quantity(value=Decimal(str(float(row[col]))), unit="MW")
                        break
                
                market_data = MarketData(
                    id=MarketDataId(),
                    price=Price(value=Decimal(str(price_value)), currency="USD"),
                    volume=volume,
                    market_type=market_type,
                    timestamp=timestamp,
                    source="gridstatus"
                )
                
                market_data_list.append(market_data)
                
            except Exception as e:
                logger.warning(f"Error converting row to MarketData: {e}")
                continue
        
        return market_data_list
    
    def _convert_load_dataframe_to_market_data(self, df: pd.DataFrame) -> List[MarketData]:
        """Convert load DataFrame to MarketData entities."""
        
        market_data_list = []
        
        for _, row in df.iterrows():
            try:
                # Extract load value
                load_value = None
                for col in ['load', 'demand', 'mw', 'total_load']:
                    if col in row and pd.notna(row[col]):
                        load_value = float(row[col])
                        break
                
                if load_value is None:
                    continue
                
                # Extract timestamp
                timestamp = None
                for col in ['interval_start_utc', 'timestamp', 'datetime', 'interval_start', 'time']:
                    if col in row and pd.notna(row[col]):
                        if isinstance(row[col], str):
                            timestamp = datetime.fromisoformat(row[col].replace('Z', '+00:00'))
                        else:
                            timestamp = pd.to_datetime(row[col]).to_pydatetime()
                        break
                
                if timestamp is None:
                    timestamp = datetime.utcnow()
                
                # Use a nominal price for load data (we'll get actual prices from LMP)
                market_data = MarketData(
                    id=MarketDataId(),
                    price=Price(value=Decimal("0.00"), currency="USD"),  # Load data doesn't have price
                    load=Quantity(value=Decimal(str(load_value)), unit="MW"),
                    market_type=MarketType.REAL_TIME,
                    timestamp=timestamp,
                    source="gridstatus"
                )
                
                market_data_list.append(market_data)
                
            except Exception as e:
                logger.warning(f"Error converting load row to MarketData: {e}")
                continue
        
        return market_data_list
    

    
    async def get_available_markets(self) -> List[str]:
        """Get list of available markets - focused on PJM only."""
        
        # Focus on PJM only for this implementation
        return ["PJM"]
