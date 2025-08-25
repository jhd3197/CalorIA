import re
from typing import Optional, Type as TypingType, TypeVar, Any, Dict, List
from uuid import UUID

from ... import types as Type

T = TypeVar('T', bound=Type.CalorIAModel)

class IngredientMixin:
    """Mixin class that provides ingredient-related MongoDB operations."""
    
    # No __init__ needed as it will use the parent class's __init__
    
    def create_ingredient(self, ingredient: Type.Ingredient) -> Optional[Any]:
        """Create a new ingredient in the ingredients collection.
        
        Args:
            ingredient: Ingredient model instance
            
        Returns:
            The inserted_id if successful, None otherwise
        """
        return self.create_document("ingredients", ingredient)
    
    def get_ingredient_by_id(self, ingredient_id: UUID) -> Optional[Type.Ingredient]:
        """Retrieve an ingredient by its ID.
        
        Args:
            ingredient_id: UUID of the ingredient to retrieve
            
        Returns:
            Ingredient instance if found, None otherwise
        """
        query = {"id": str(ingredient_id)}  # Convert UUID to string for MongoDB query
        return self.get_document("ingredients", query, Type.Ingredient)
    
    def get_all_ingredients(self, skip: int = 0, limit: Optional[int] = None) -> List[Type.Ingredient]:
        """Get all ingredients with optional pagination.
        
        Args:
            skip: Number of ingredients to skip for pagination (default: 0)
            limit: Maximum number of ingredients to return (default: None for all ingredients)
            
        Returns:
            List of Ingredient instances
        """
        try:
            db = self.get_db_connection()
            if db is None:
                return []
                
            collection = db["ingredients"]
            
            # Get all ingredients with optional pagination
            cursor = collection.find()
            
            # Sort ingredients by category first
            cursor = cursor.sort("category", 1)
            
            # Apply pagination
            cursor = cursor.skip(skip)
            if limit is not None:
                cursor = cursor.limit(limit)
            
            ingredients = []
            for doc in cursor:
                if '_id' in doc:
                    del doc['_id']
                try:
                    ingredient = Type.Ingredient.from_dict(doc)
                    ingredients.append(ingredient)
                except Exception as e:
                    print(f"Error parsing ingredient: {e}")
                    continue
                    
            return ingredients
        except Exception as e:
            print(f"Error getting all ingredients: {e}")
            return []
    
    def update_ingredient(self, ingredient_id: UUID, ingredient_data: Dict[str, Any]) -> bool:
        """Update an ingredient by its ID.
        
        Args:
            ingredient_id: UUID of the ingredient to update
            ingredient_data: Data to update (will be wrapped in $set)
            
        Returns:
            True if update was successful, False otherwise
        """
        query = {"id": str(ingredient_id)}  # Convert UUID to string for MongoDB query
        return self.update_document("ingredients", query, ingredient_data)
    
    def delete_ingredient(self, ingredient_id: UUID) -> bool:
        """Delete an ingredient by its ID.
        
        Args:
            ingredient_id: UUID of the ingredient to delete
            
        Returns:
            True if deletion was successful, False otherwise
        """
        query = {"id": str(ingredient_id)}  # Convert UUID to string for MongoDB query
        return self.delete_document("ingredients", query)
    
    def get_ingredient_by_name(self, name: str) -> Optional[Type.Ingredient]:
        """Get an ingredient by its name (case-insensitive).
        
        Args:
            name: Name of the ingredient to retrieve
            
        Returns:
            Ingredient instance if found, None otherwise
        """
        # Escape special regex characters to prevent regex errors
        escaped_name = re.escape(name)
        query = {"name": {"$regex": f"^{escaped_name}$", "$options": "i"}}  # Case-insensitive exact match
        return self.get_document("ingredients", query, Type.Ingredient)
    
    def search_ingredients(self, search_term: str, skip: int = 0, limit: Optional[int] = 20, is_system: Optional[bool] = None) -> List[Type.Ingredient]:
        """Search ingredients by name or aliases with optional system filter and pagination.
        
        Args:
            search_term: Term to search for in ingredient names and aliases
            skip: Number of ingredients to skip for pagination (default: 0)
            limit: Maximum number of ingredients to return (default: 20, None for no limit)
            is_system: If provided, filter by system status (True for system ingredients, False for user ingredients)
            
        Returns:
            List of matching Ingredient instances
        """
        try:
            db = self.get_db_connection()
            if db is None:
                return []
                
            collection = db["ingredients"]
            
            # Create regex pattern for case-insensitive search
            search_pattern = {"$regex": search_term, "$options": "i"}
            
            # Build base query for search in name and aliases fields
            search_query = {
                "$or": [
                    {"name": search_pattern},
                    {"aliases": {"$elemMatch": search_pattern}}
                ]
            }
            
            # Add is_system filter if provided
            if is_system is not None:
                query = {
                    "$and": [
                        search_query,
                        {"is_system": is_system}
                    ]
                }
            else:
                query = search_query
            
            cursor = collection.find(query)
            
            # Apply pagination
            cursor = cursor.skip(skip)
            if limit is not None:
                cursor = cursor.limit(limit)
            
            ingredients = []
            for doc in cursor:
                if '_id' in doc:
                    del doc['_id']
                try:
                    ingredient = Type.Ingredient.from_dict(doc)
                    ingredients.append(ingredient)
                except Exception as e:
                    print(f"Error parsing ingredient: {e}")
                    continue
                    
            return ingredients
        except Exception as e:
            print(f"Error searching ingredients with term '{search_term}': {e}")
            return []
            
    def count_ingredients(self, search_term: Optional[str] = None, is_system: Optional[bool] = None) -> int:
        """Count ingredients with optional search term and system filter.
        
        Args:
            search_term: Term to search for in ingredient names and aliases
            is_system: If provided, filter by system status (True for system ingredients, False for user ingredients)
            
        Returns:
            Total count of matching ingredients
        """
        try:
            db = self.get_db_connection()
            if db is None:
                return 0
                
            collection = db["ingredients"]
            
            # If there's no search term and no is_system filter, just count all documents
            if not search_term and is_system is None:
                return collection.count_documents({})
            
            # Build query based on parameters
            if search_term:
                # Create regex pattern for case-insensitive search
                search_pattern = {"$regex": search_term, "$options": "i"}
                
                # Build base query for search in name and aliases fields
                search_query = {
                    "$or": [
                        {"name": search_pattern},
                        {"aliases": {"$elemMatch": search_pattern}}
                    ]
                }
                
                # Add is_system filter if provided
                if is_system is not None:
                    query = {
                        "$and": [
                            search_query,
                            {"is_system": is_system}
                        ]
                    }
                else:
                    query = search_query
            else:
                # Only is_system filter is applied
                query = {"is_system": is_system}
            
            return collection.count_documents(query)
            
        except Exception as e:
            print(f"Error counting ingredients: {e}")
            return 0