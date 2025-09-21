import re
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime, timezone

from ... import types as Type


class InventoryMixin:
    """Mixin class that provides inventory-related MongoDB operations."""

    def create_inventory_item(self, item: Type.InventoryItem) -> Optional[Any]:
        """Create a new inventory item in the inventory collection.
        
        Args:
            item: InventoryItem model instance
            
        Returns:
            The inserted_id if successful, None otherwise
        """
        return self.create_document("inventory", item)

    def get_inventory_item_by_id(self, item_id: UUID) -> Optional[Type.InventoryItem]:
        """Retrieve an inventory item by its ID.
        
        Args:
            item_id: UUID of the inventory item to retrieve
            
        Returns:
            InventoryItem instance if found, None otherwise
        """
        query = {"id": str(item_id)}
        return self.get_document("inventory", query, Type.InventoryItem)

    def get_all_inventory_items(self, skip: int = 0, limit: Optional[int] = None) -> List[Type.InventoryItem]:
        """Get all inventory items with optional pagination.
        
        Args:
            skip: Number of items to skip for pagination (default: 0)
            limit: Maximum number of items to return (default: None for all items)
            
        Returns:
            List of InventoryItem instances
        """
        try:
            db = self.get_db_connection()
            if db is None:
                return []

            collection = db["inventory"]
            cursor = collection.find()

            # Sort by location first, then ingredient name
            cursor = cursor.sort([("location", 1), ("ingredient.name", 1)])

            # Apply pagination
            cursor = cursor.skip(skip)
            if limit is not None:
                cursor = cursor.limit(limit)

            items = []
            for doc in cursor:
                if '_id' in doc:
                    del doc['_id']
                try:
                    item = Type.InventoryItem.from_dict(doc)
                    items.append(item)
                except Exception as e:
                    print(f"Error parsing inventory item: {e}")
                    continue

            return items
        except Exception as e:
            print(f"Error getting all inventory items: {e}")
            return []

    def update_inventory_item(self, item_id: UUID, item_data: Dict[str, Any]) -> bool:
        """Update an inventory item by its ID.
        
        Args:
            item_id: UUID of the inventory item to update
            item_data: Data to update (will be wrapped in $set)
            
        Returns:
            True if update was successful, False otherwise
        """
        query = {"id": str(item_id)}
        
        # Add updated_at timestamp
        if "updated_at" not in item_data:
            item_data["updated_at"] = datetime.now(timezone.utc)
            
        return self.update_document("inventory", query, item_data)

    def delete_inventory_item(self, item_id: UUID) -> bool:
        """Delete an inventory item by its ID.
        
        Args:
            item_id: UUID of the inventory item to delete
            
        Returns:
            True if deletion was successful, False otherwise
        """
        query = {"id": str(item_id)}
        return self.delete_document("inventory", query)

    def search_inventory_items(
        self, 
        search_term: str, 
        location: Optional[str] = None,
        needs_restock: Optional[bool] = None,
        skip: int = 0, 
        limit: Optional[int] = 20
    ) -> List[Type.InventoryItem]:
        """Search inventory items by ingredient name with optional filters and pagination.
        
        Args:
            search_term: Term to search for in ingredient names
            location: Optional filter by storage location
            needs_restock: Optional filter for items needing restock
            skip: Number of items to skip for pagination (default: 0)
            limit: Maximum number of items to return (default: 20, None for no limit)
            
        Returns:
            List of matching InventoryItem instances
        """
        try:
            db = self.get_db_connection()
            if db is None:
                return []

            collection = db["inventory"]

            # Create regex pattern for case-insensitive search
            search_pattern = {"$regex": search_term, "$options": "i"}

            # Build base query for search in ingredient name
            query = {
                "$or": [
                    {"ingredient.name": search_pattern},
                    {"location": search_pattern}
                ]
            }

            # Add location filter if provided
            if location:
                query["location"] = location

            # Add needs_restock filter if provided
            if needs_restock is not None:
                if needs_restock:
                    query["$expr"] = {
                        "$and": [
                            {"$ne": ["$min_quantity", None]},
                            {"$lte": ["$quantity", "$min_quantity"]}
                        ]
                    }
                else:
                    query["$or"] = [
                        {"min_quantity": None},
                        {
                            "$expr": {
                                "$gt": ["$quantity", "$min_quantity"]
                            }
                        }
                    ]

            cursor = collection.find(query)

            # Sort by location and ingredient name
            cursor = cursor.sort([("location", 1), ("ingredient.name", 1)])

            # Apply pagination
            cursor = cursor.skip(skip)
            if limit is not None:
                cursor = cursor.limit(limit)

            items = []
            for doc in cursor:
                if '_id' in doc:
                    del doc['_id']
                try:
                    item = Type.InventoryItem.from_dict(doc)
                    items.append(item)
                except Exception as e:
                    print(f"Error parsing inventory item: {e}")
                    continue

            return items
        except Exception as e:
            print(f"Error searching inventory items with term '{search_term}': {e}")
            return []

    def count_inventory_items(
        self, 
        search_term: Optional[str] = None,
        location: Optional[str] = None,
        needs_restock: Optional[bool] = None
    ) -> int:
        """Count inventory items with optional search term and filters.
        
        Args:
            search_term: Term to search for in ingredient names
            location: Optional filter by storage location
            needs_restock: Optional filter for items needing restock
            
        Returns:
            Total count of matching inventory items
        """
        try:
            db = self.get_db_connection()
            if db is None:
                return 0

            collection = db["inventory"]

            # Build query based on parameters
            query = {}

            if search_term:
                # Create regex pattern for case-insensitive search
                search_pattern = {"$regex": search_term, "$options": "i"}
                query["$or"] = [
                    {"ingredient.name": search_pattern},
                    {"location": search_pattern}
                ]

            if location:
                query["location"] = location

            if needs_restock is not None:
                if needs_restock:
                    query["$expr"] = {
                        "$and": [
                            {"$ne": ["$min_quantity", None]},
                            {"$lte": ["$quantity", "$min_quantity"]}
                        ]
                    }
                else:
                    query["$or"] = [
                        {"min_quantity": None},
                        {
                            "$expr": {
                                "$gt": ["$quantity", "$min_quantity"]
                            }
                        }
                    ]

            return collection.count_documents(query)

        except Exception as e:
            print(f"Error counting inventory items: {e}")
            return 0