import re
from typing import Optional, Type as TypingType, TypeVar, Any, Dict, List
from uuid import UUID
from datetime import date

from ... import types as Type

T = TypeVar('T', bound=Type.CalorIAModel)

class ActivityMixin:
    """Mixin class that provides activity-related MongoDB operations."""
    
    # No __init__ needed as it will use the parent class's __init__
    
    def add_activity_entry(self, activity_entry: Type.ActivityEntry) -> Optional[Any]:
        """Add a new activity entry to the activity_entries collection.
        
        Args:
            activity_entry: ActivityEntry model instance
            
        Returns:
            The inserted_id if successful, None otherwise
        """
        return self.create_document("activity_entries", activity_entry)
    
    def get_activity_entry_by_id(self, entry_id: UUID) -> Optional[Type.ActivityEntry]:
        """Retrieve an activity entry by its ID.
        
        Args:
            entry_id: UUID of the activity entry to retrieve
            
        Returns:
            ActivityEntry instance if found, None otherwise
        """
        query = {"id": str(entry_id)}  # Convert UUID to string for MongoDB query
        return self.get_document("activity_entries", query, Type.ActivityEntry)
    
    def update_activity_entry(self, entry_id: UUID, entry_data: Dict[str, Any]) -> bool:
        """Update an activity entry by its ID.
        
        Args:
            entry_id: UUID of the activity entry to update
            entry_data: Data to update (will be wrapped in $set)
            
        Returns:
            True if update was successful, False otherwise
        """
        query = {"id": str(entry_id)}  # Convert UUID to string for MongoDB query
        return self.update_document("activity_entries", query, entry_data)
    
    def delete_activity_entry(self, entry_id: UUID) -> bool:
        """Delete an activity entry by its ID.
        
        Args:
            entry_id: UUID of the activity entry to delete
            
        Returns:
            True if deletion was successful, False otherwise
        """
        query = {"id": str(entry_id)}  # Convert UUID to string for MongoDB query
        return self.delete_document("activity_entries", query)
    
    def get_user_activity_entries(self, user_id: UUID, start_date: Optional[date] = None, 
                               end_date: Optional[date] = None, 
                               skip: int = 0, limit: Optional[int] = None) -> List[Type.ActivityEntry]:
        """Get activity entries for a user with optional date range and pagination.
        
        Args:
            user_id: UUID of the user
            start_date: Optional start date for filtering entries (inclusive)
            end_date: Optional end date for filtering entries (inclusive)
            skip: Number of entries to skip for pagination (default: 0)
            limit: Maximum number of entries to return (default: None for all entries)
            
        Returns:
            List of ActivityEntry instances
        """
        try:
            db = self.get_db_connection()
            if db is None:
                return []
                
            collection = db["activity_entries"]
            
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
                    entry = Type.ActivityEntry.from_dict(doc)
                    entries.append(entry)
                except Exception as e:
                    print(f"Error parsing activity entry: {e}")
                    continue
                    
            return entries
            
        except Exception as e:
            print(f"Error getting user activity entries: {e}")
            return []
    
    def get_user_daily_activity(self, user_id: UUID, log_date: date) -> int:
        """Get a user's total calories burned for a specific date.
        
        Args:
            user_id: UUID of the user
            log_date: Date to get entries for
            
        Returns:
            Total calories burned for that day
        """
        try:
            db = self.get_db_connection()
            if db is None:
                return 0
                
            collection = db["activity_entries"]
            
            # Query for activity entries matching user_id and date
            query = {
                "user_id": str(user_id),  # Convert UUID to string for MongoDB query
                "on_date": log_date.isoformat()  # Store date as ISO format string
            }
            
            # Use MongoDB aggregation pipeline to sum calories burned
            pipeline = [
                # Match entries for the specific user and date
                {"$match": query},
                
                # Group all entries and sum the calories_burned
                {"$group": {
                    "_id": None,
                    "total_burned": {"$sum": "$calories_burned"}
                }}
            ]
            
            # Execute the aggregation pipeline
            result = list(collection.aggregate(pipeline))
            
            # If no entries found, return 0
            if not result:
                return 0
                
            # Return the total calories burned
            return result[0].get("total_burned", 0)
            
        except Exception as e:
            print(f"Error getting user daily activity: {e}")
            return 0
    
    def get_latest_activity_entry(self, user_id: UUID) -> Optional[Type.ActivityEntry]:
        """Get the most recent activity entry for a user.
        
        Args:
            user_id: UUID of the user
            
        Returns:
            Most recent ActivityEntry instance if found, None otherwise
        """
        try:
            db = self.get_db_connection()
            if db is None:
                return None
                
            collection = db["activity_entries"]
            
            # Query for activity entries matching user_id
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
                entry = Type.ActivityEntry.from_dict(doc)
                return entry
            except Exception as e:
                print(f"Error parsing activity entry: {e}")
                return None
                
        except Exception as e:
            print(f"Error getting latest activity entry: {e}")
            return None