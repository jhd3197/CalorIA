import pymongo
import os
import re
from typing import Optional, Type as TypingType, TypeVar, Any, Dict
from uuid import UUID
from datetime import datetime, date

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