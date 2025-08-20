import pymongo
import os
from typing import Optional, Type as TypingType, TypeVar, Any, Dict
from uuid import UUID
from datetime import datetime, date
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from .. import types as Type

T = TypeVar('T', bound=Type.CalorIAModel)

class MongoMixin:
    """Mixin class that provides MongoDB operations and connection management."""
    
    def __init__(self):
        self._db = None
    
    def get_db_connection(self):
        """Get MongoDB connection using environment variable"""
        if self._db is None:
            try:
                mongo_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/caloria')
                client = pymongo.MongoClient(mongo_uri)
                self._db = client.caloria
            except Exception as e:
                print(f"Database connection error: {e}")
                return None
        return self._db
    
    # Generic CRUD methods
    def create_document(self, collection_name: str, doc: Type.CalorIAModel) -> Optional[Any]:
        """Create a document in the specified collection.
        
        Args:
            collection_name: Name of the MongoDB collection
            doc: Pydantic model instance to insert
            
        Returns:
            The inserted_id if successful, None otherwise
        """
        try:
            db = self.get_db_connection()
            if db is None:
                return None
                
            collection = db[collection_name]
            doc_dict = doc.to_dict()
            result = collection.insert_one(doc_dict)
            return result.inserted_id
        except Exception as e:
            print(f"Error creating document in {collection_name}: {e}")
            return None
    
    def get_document(self, collection_name: str, query: Dict[str, Any], model_class: TypingType[T]) -> Optional[T]:
        """Get a document from the specified collection.
        
        Args:
            collection_name: Name of the MongoDB collection
            query: MongoDB query dict
            model_class: Pydantic model class to convert result to
            
        Returns:
            Instance of model_class if found, None otherwise
        """
        try:
            db = self.get_db_connection()
            if db is None:
                return None
                
            collection = db[collection_name]
            doc = collection.find_one(query)
            if doc:
                # Remove MongoDB's _id field if it exists and is not part of our model
                if '_id' in doc and not hasattr(model_class, '_id'):
                    del doc['_id']
                return model_class.from_dict(doc)
            return None
        except Exception as e:
            print(f"Error getting document from {collection_name}: {e}")
            return None
    
    def update_document(self, collection_name: str, query: Dict[str, Any], update_data: Dict[str, Any]) -> bool:
        """Update a document in the specified collection.
        
        Args:
            collection_name: Name of the MongoDB collection
            query: MongoDB query dict to find document
            update_data: Data to update (will be wrapped in $set)
            
        Returns:
            True if update was successful, False otherwise
        """
        try:
            db = self.get_db_connection()
            if db is None:
                return False
                
            collection = db[collection_name]
            result = collection.update_one(query, {"$set": update_data})
            return result.modified_count > 0
        except Exception as e:
            print(f"Error updating document in {collection_name}: {e}")
            return False
    
    def delete_document(self, collection_name: str, query: Dict[str, Any]) -> bool:
        """Delete a document from the specified collection.
        
        Args:
            collection_name: Name of the MongoDB collection
            query: MongoDB query dict to find document to delete
            
        Returns:
            True if deletion was successful, False otherwise
        """
        try:
            db = self.get_db_connection()
            if db is None:
                return False
                
            collection = db[collection_name]
            result = collection.delete_one(query)
            return result.deleted_count > 0
        except Exception as e:
            print(f"Error deleting document from {collection_name}: {e}")
            return False
    
    # High-level, type-specific functions
    def create_user(self, user: Type.User) -> Optional[Any]:
        """Create a new user in the users collection.
        
        Args:
            user: User model instance
            
        Returns:
            The inserted_id if successful, None otherwise
        """
        return self.create_document("users", user)
    
    def get_user_by_id(self, user_id: UUID) -> Optional[Type.User]:
        """Retrieve a user by their ID.
        
        Args:
            user_id: UUID of the user to retrieve
            
        Returns:
            User instance if found, None otherwise
        """
        query = {"user_id": str(user_id)}  # Convert UUID to string for MongoDB query
        return self.get_document("users", query, Type.User)
    
    def add_meal_to_log(self, user_id: UUID, meal: Type.Meal) -> bool:
        """Find the user's daily log (or create one) and append a new meal to it.
        
        Args:
            user_id: UUID of the user
            meal: Meal instance to add
            
        Returns:
            True if meal was added successfully, False otherwise
        """
        try:
            # Get today's date
            today = datetime.now().date()
            
            # First, try to find existing daily log for today
            query = {
                "user_id": str(user_id),
                "log_date": today.isoformat()
            }
            
            daily_log = self.get_document("daily_logs", query, Type.DailyLog)
            
            if daily_log:
                # Add meal to existing log
                daily_log.meals.append(meal)
                update_data = daily_log.to_dict()
                return self.update_document("daily_logs", query, update_data)
            else:
                # Create new daily log with the meal
                new_log = Type.DailyLog(
                    user_id=user_id,
                    log_date=today,
                    meals=[meal]
                )
                result = self.create_document("daily_logs", new_log)
                return result is not None
                
        except Exception as e:
            print(f"Error adding meal to log for user {user_id}: {e}")
            return False
    
    def add_weight_entry(self, entry: Type.WeightEntry) -> Optional[Any]:
        """Add a new weight entry for a user.
        
        Args:
            entry: WeightEntry instance to add
            
        Returns:
            The inserted_id if successful, None otherwise
        """
        return self.create_document("weight_entries", entry)
    
    def get_user_daily_log(self, user_id: UUID, log_date: date) -> Optional[Type.DailyLog]:
        """Get a user's daily log for a specific date.
        
        Args:
            user_id: UUID of the user
            log_date: Date to get the log for
            
        Returns:
            DailyLog instance if found, None otherwise
        """
        query = {
            "user_id": str(user_id),
            "log_date": log_date.isoformat()
        }
        return self.get_document("daily_logs", query, Type.DailyLog)
    
    def get_user_weight_entries(self, user_id: UUID, limit: int = 30) -> list[Type.WeightEntry]:
        """Get recent weight entries for a user.
        
        Args:
            user_id: UUID of the user
            limit: Maximum number of entries to return
            
        Returns:
            List of WeightEntry instances, sorted by date (newest first)
        """
        try:
            db = self.get_db_connection()
            if db is None:
                return []
                
            collection = db["weight_entries"]
            query = {"user_id": str(user_id)}
            
            # Sort by date descending, limit results
            cursor = collection.find(query).sort("on_date", -1).limit(limit)
            
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
            print(f"Error getting weight entries for user {user_id}: {e}")
            return []
    
    def add_water_entry(self, entry: Type.WaterEntry) -> Optional[Any]:
        """Add a new water entry for a user.
        
        Args:
            entry: WaterEntry instance to add
            
        Returns:
            The inserted_id if successful, None otherwise
        """
        return self.create_document("water_entries", entry)
    
    def get_user_daily_water_log(self, user_id: UUID, log_date: date) -> Optional[Type.DailyWaterLog]:
        """Get a user's daily water log for a specific date.
        
        Args:
            user_id: UUID of the user
            log_date: Date to get the water log for
            
        Returns:
            DailyWaterLog instance if found, None otherwise
        """
        try:
            db = self.get_db_connection()
            if db is None:
                return None
                
            collection = db["water_entries"]
            query = {
                "user_id": str(user_id),
                "on_date": log_date.isoformat()
            }
            
            # Get all water entries for the date
            cursor = collection.find(query)
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
            
            if entries:
                return Type.DailyWaterLog(
                    user_id=user_id,
                    log_date=log_date,
                    entries=entries
                )
            return None
            
        except Exception as e:
            print(f"Error getting daily water log for user {user_id}: {e}")
            return None