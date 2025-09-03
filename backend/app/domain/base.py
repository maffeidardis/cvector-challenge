"""Base classes for domain entities and value objects."""

from abc import ABC
from datetime import datetime
from typing import Any, Dict
from uuid import UUID, uuid4
from pydantic import BaseModel, Field


class ValueObject(BaseModel, ABC):
    """Base class for value objects."""
    
    class Config:
        frozen = True  # Immutable


class EntityId(ValueObject):
    """Base entity identifier."""
    
    value: UUID = Field(default_factory=uuid4)
    
    def __str__(self) -> str:
        return str(self.value)


class BaseEntity(BaseModel, ABC):
    """Base class for domain entities."""
    
    id: EntityId = Field(default_factory=EntityId)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    def __eq__(self, other: Any) -> bool:
        if not isinstance(other, BaseEntity):
            return False
        return self.id == other.id
    
    def __hash__(self) -> int:
        return hash(self.id.value)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert entity to dictionary."""
        return self.model_dump()


class DomainEvent(BaseModel, ABC):
    """Base class for domain events."""
    
    event_id: UUID = Field(default_factory=uuid4)
    occurred_at: datetime = Field(default_factory=datetime.utcnow)
    aggregate_id: str
    event_type: str
