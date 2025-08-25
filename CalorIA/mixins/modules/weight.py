import re
from typing import Optional, Type as TypingType, TypeVar, Any, Dict, List
from uuid import UUID
from datetime import date

from ... import types as Type

T = TypeVar('T', bound=Type.CalorIAModel)

class WeightMixin:
    """Mixin class that provides weight-related MongoDB operations."""
    
    # No __init__ needed as it will use the parent class's __init__
    
    def add_weight_entry(self, weight_entry: Type.WeightEntry) -> Optional[Any]:
        """Add a new weight entry to the weight_entries collection.
        
        Args:
            weight_entry: WeightEntry model instance
            
        Returns:
            The inserted_id if successful, None otherwise
        """
        return self.create_document("weight_entries", weight_entry)
    
    def get_weight_entry_by_id(self, entry_id: UUID) -> Optional[Type.WeightEntry]:
        """Retrieve a weight entry by its ID.
        
        Args:
            entry_id: UUID of the weight entry to retrieve
            
        Returns:
            WeightEntry instance if found, None otherwise
        """
        query = {"id": str(entry_id)}  # Convert UUID to string for MongoDB query
        return self.get_document("weight_entries", query, Type.WeightEntry)
    
    def update_weight_entry(self, entry_id: UUID, entry_data: Dict[str, Any]) -> bool:
        """Update a weight entry by its ID.
        
        Args:
            entry_id: UUID of the weight entry to update
            entry_data: Data to update (will be wrapped in $set)
            
        Returns:
            True if update was successful, False otherwise
        """
        query = {"id": str(entry_id)}  # Convert UUID to string for MongoDB query
        return self.update_document("weight_entries", query, entry_data)
    
    def delete_weight_entry(self, entry_id: UUID) -> bool:
        """Delete a weight entry by its ID.
        
        Args:
            entry_id: UUID of the weight entry to delete
            
        Returns:
            True if deletion was successful, False otherwise
        """
        query = {"id": str(entry_id)}  # Convert UUID to string for MongoDB query
        return self.delete_document("weight_entries", query)
    
    def get_user_weight_entries(self, user_id: UUID, start_date: Optional[date] = None, 
                              end_date: Optional[date] = None, 
                              skip: int = 0, limit: Optional[int] = None) -> List[Type.WeightEntry]:
        """Get weight entries for a user with optional date range and pagination.
        
        Args:
            user_id: UUID of the user
            start_date: Optional start date for filtering entries (inclusive)
            end_date: Optional end date for filtering entries (inclusive)
            skip: Number of entries to skip for pagination (default: 0)
            limit: Maximum number of entries to return (default: None for all entries)
            
        Returns:
            List of WeightEntry instances
        """
        try:
            db = self.get_db_connection()
            if db is None:
                return []
                
            collection = db["weight_entries"]
            
            # Build query with user_id
            query = {"user_id": str(user_id)}  # Convert UUID to string for MongoDB query
            
            # Add date range filters if provided
            if start_date or end_date:
                date_filter = {}
                if start_date:
                    date_filter["$gte"] = start_date.isoformat()
                if end_date:
                    date_filter["$lte"] = end_date.isoformat()
                    
                if date_filter:
                    query["on_date"] = date_filter
            
            # Find all matching entries
            cursor = collection.find(query)
            
            # Sort by date (descending)
            cursor = cursor.sort("on_date", -1)
            
            # Apply pagination
            cursor = cursor.skip(skip)
            if limit is not None:
                cursor = cursor.limit(limit)
            
            entries = []
            for doc in cursor:
                if '_id' in doc:
                    del doc['_id']
                try:
                    entry = Type.WeightEntry.from_dict(doc)
                    entries.append(entry)
                except Exception as e:
                    print(f"Error parsing weight entry: {e}")
                    continue
                    
            return entries
            
        except Exception as e:
            print(f"Error getting user weight entries: {e}")
            return []
    
    def get_user_weight_history(self, user_id: UUID, days: int = 30) -> List[Dict[str, Any]]:
        """Get a summary of weight entries for a user over a number of days.
        
        Args:
            user_id: UUID of the user
            days: Number of days of history to retrieve (default: 30)
            
        Returns:
            List of weight entry summary dictionaries, each containing:
            - date: The date (ISO format string)
            - weight_kg: Weight value in kilograms
            - notes: Any notes attached to the entry
        """
        try:
            db = self.get_db_connection()
            if db is None:
                return []
                
            collection = db["weight_entries"]
            
            # Use MongoDB aggregation pipeline to sort by date and get most recent entries
            pipeline = [
                # Match entries for the specific user
                {"$match": {"user_id": str(user_id)}},
                
                # Sort by date (descending)
                {"$sort": {"on_date": -1}},
                
                # Limit to specified number of days
                {"$limit": days},
                
                # Project to format the output
                {"$project": {
                    "_id": 0,
                    "date": "$on_date",
                    "weight_kg": 1,
                    "notes": 1
                }}
            ]
            
            # Execute the aggregation pipeline
            results = list(collection.aggregate(pipeline))
            
            return results
            
        except Exception as e:
            print(f"Error getting user weight history: {e}")
            return []
    
    def get_latest_weight_entry(self, user_id: UUID) -> Optional[Type.WeightEntry]:
        """Get the most recent weight entry for a user.
        
        Args:
            user_id: UUID of the user
            
        Returns:
            Most recent WeightEntry instance if found, None otherwise
        """
        try:
            db = self.get_db_connection()
            if db is None:
                return None
                
            collection = db["weight_entries"]
            
            # Query for weight entries matching user_id
            query = {"user_id": str(user_id)}  # Convert UUID to string for MongoDB query
            
            # Find the most recent entry (sort by date descending and limit to 1)
            cursor = collection.find(query).sort("on_date", -1).limit(1)
            
            # Get the first (and only) result, if any
            doc = next(cursor, None)
            if doc is None:
                return None
                
            if '_id' in doc:
                del doc['_id']
                
            try:
                entry = Type.WeightEntry.from_dict(doc)
                return entry
            except Exception as e:
                print(f"Error parsing weight entry: {e}")
                return None
                
        except Exception as e:
            print(f"Error getting latest weight entry: {e}")
            return None
    
    def get_user_weight_trend(self, user_id: UUID, period: str = "month") -> List[Dict[str, Any]]:
        """Get weight trend data for a user over a specified period.
        
        Args:
            user_id: UUID of the user
            period: Time period for the trend ("week", "month", "year")
            
        Returns:
            List of weight entries organized by the specified period for trend analysis
        """
        try:
            db = self.get_db_connection()
            if db is None:
                return []
                
            collection = db["weight_entries"]
            
            # Determine the limit based on the period
            if period == "week":
                limit = 7
            elif period == "month":
                limit = 30
            elif period == "year":
                limit = 365
            else:
                limit = 30  # Default to month
            
            # Use MongoDB aggregation pipeline
            pipeline = [
                # Match entries for the specific user
                {"$match": {"user_id": str(user_id)}},
                
                # Sort by date (descending)
                {"$sort": {"on_date": -1}},
                
                # Limit to specified number of days
                {"$limit": limit},
                
                # Project to format the output
                {"$project": {
                    "_id": 0,
                    "date": "$on_date",
                    "weight_kg": 1
                }}
            ]
            
            # Execute the aggregation pipeline
            results = list(collection.aggregate(pipeline))
            
            # Reverse the results to get chronological order (oldest to newest)
            results.reverse()
            
            return results
            
        except Exception as e:
            print(f"Error getting user weight trend: {e}")
            return []