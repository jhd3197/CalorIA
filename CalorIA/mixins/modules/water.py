import re
from typing import Optional, Type as TypingType, TypeVar, Any, Dict, List
from uuid import UUID
from datetime import date

from ... import types as Type

T = TypeVar('T', bound=Type.CalorIAModel)

class WaterMixin:
    """Mixin class that provides water-related MongoDB operations."""
    
    # No __init__ needed as it will use the parent class's __init__
    
    def add_water_entry(self, water_entry: Type.WaterEntry) -> Optional[Any]:
        """Add a new water entry to the water_entries collection.
        
        Args:
            water_entry: WaterEntry model instance
            
        Returns:
            The inserted_id if successful, None otherwise
        """
        return self.create_document("water_entries", water_entry)
    
    def get_water_entry_by_id(self, entry_id: UUID) -> Optional[Type.WaterEntry]:
        """Retrieve a water entry by its ID.
        
        Args:
            entry_id: UUID of the water entry to retrieve
            
        Returns:
            WaterEntry instance if found, None otherwise
        """
        query = {"id": str(entry_id)}  # Convert UUID to string for MongoDB query
        return self.get_document("water_entries", query, Type.WaterEntry)
    
    def get_user_daily_water_log(self, user_id: UUID, log_date: date) -> Optional[Type.DailyWaterLog]:
        """Get a user's water entries for a specific date.
        
        Args:
            user_id: UUID of the user
            log_date: Date to get entries for
            
        Returns:
            DailyWaterLog instance containing entries and total water amount if found, None otherwise
        """
        try:
            db = self.get_db_connection()
            if db is None:
                return None
                
            collection = db["water_entries"]
            
            # Query for water entries matching user_id and date
            query = {
                "user_id": str(user_id),  # Convert UUID to string for MongoDB query
                "on_date": log_date.isoformat()  # Store date as ISO format string
            }
            
            # Find all matching entries
            cursor = collection.find(query)
            
            entries = []
            total_ml = 0
            
            for doc in cursor:
                if '_id' in doc:
                    del doc['_id']
                try:
                    entry = Type.WaterEntry.from_dict(doc)
                    entries.append(entry)
                    total_ml += entry.amount_ml
                except Exception as e:
                    print(f"Error parsing water entry: {e}")
                    continue
            
            # If no entries found, return None
            if not entries:
                return None
                
            # Create and return DailyWaterLog instance
            water_log = Type.DailyWaterLog(
                user_id=user_id,
                log_date=log_date,
                entries=entries
            )
            
            return water_log
            
        except Exception as e:
            print(f"Error getting user daily water log: {e}")
            return None
    
    def update_water_entry(self, entry_id: UUID, entry_data: Dict[str, Any]) -> bool:
        """Update a water entry by its ID.
        
        Args:
            entry_id: UUID of the water entry to update
            entry_data: Data to update (will be wrapped in $set)
            
        Returns:
            True if update was successful, False otherwise
        """
        query = {"id": str(entry_id)}  # Convert UUID to string for MongoDB query
        return self.update_document("water_entries", query, entry_data)
    
    def delete_water_entry(self, entry_id: UUID) -> bool:
        """Delete a water entry by its ID.
        
        Args:
            entry_id: UUID of the water entry to delete
            
        Returns:
            True if deletion was successful, False otherwise
        """
        query = {"id": str(entry_id)}  # Convert UUID to string for MongoDB query
        return self.delete_document("water_entries", query)
    
    def get_user_water_entries(self, user_id: UUID, start_date: Optional[date] = None, 
                             end_date: Optional[date] = None, 
                             skip: int = 0, limit: Optional[int] = None) -> List[Type.WaterEntry]:
        """Get water entries for a user with optional date range and pagination.
        
        Args:
            user_id: UUID of the user
            start_date: Optional start date for filtering entries (inclusive)
            end_date: Optional end date for filtering entries (inclusive)
            skip: Number of entries to skip for pagination (default: 0)
            limit: Maximum number of entries to return (default: None for all entries)
            
        Returns:
            List of WaterEntry instances
        """
        try:
            db = self.get_db_connection()
            if db is None:
                return []
                
            collection = db["water_entries"]
            
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
            
            # Sort by date (descending) and time
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
                    entry = Type.WaterEntry.from_dict(doc)
                    entries.append(entry)
                except Exception as e:
                    print(f"Error parsing water entry: {e}")
                    continue
                    
            return entries
            
        except Exception as e:
            print(f"Error getting user water entries: {e}")
            return []
    
    def get_user_water_history(self, user_id: UUID, days: int = 7) -> List[Dict[str, Any]]:
        """Get a summary of daily water intake for a user over a number of days.
        
        Args:
            user_id: UUID of the user
            days: Number of days of history to retrieve (default: 7)
            
        Returns:
            List of daily water intake summary dictionaries, each containing:
            - date: The date (ISO format string)
            - total_ml: Total water intake in milliliters
        """
        try:
            db = self.get_db_connection()
            if db is None:
                return []
                
            collection = db["water_entries"]
            
            # Use MongoDB aggregation pipeline to group by date and sum amounts
            pipeline = [
                # Match entries for the specific user
                {"$match": {"user_id": str(user_id)}},
                
                # Group by date and sum the water amounts
                {"$group": {
                    "_id": "$on_date",
                    "total_ml": {"$sum": "$amount_ml"}
                }},
                
                # Sort by date (descending)
                {"$sort": {"_id": -1}},
                
                # Limit to specified number of days
                {"$limit": days},
                
                # Project to format the output
                {"$project": {
                    "_id": 0,
                    "date": "$_id",
                    "total_ml": 1
                }}
            ]
            
            # Execute the aggregation pipeline
            results = list(collection.aggregate(pipeline))
            
            return results
            
        except Exception as e:
            print(f"Error getting user water history: {e}")
            return []