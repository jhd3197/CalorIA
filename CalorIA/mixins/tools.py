
from typing import Optional
from slugify import slugify
from .. import types as Type

class ToolsMixin:
    """
    ToolsMixin - Provides utility functions used throughout the application
    """

    def file_get_contents(self, file_path):
        """Read the contents of a file and return it as a string."""
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read()
    
    def _parse_unit(self, unit_str: str) -> Type.IngredientUnit:
        """Parse unit string to IngredientUnit enum."""
        unit_map = {
            'g': Type.IngredientUnit.G,
            'ml': Type.IngredientUnit.ML,
            'unit': Type.IngredientUnit.UNIT,
            'tbsp': Type.IngredientUnit.TBSP,
            'tsp': Type.IngredientUnit.TSP,
            'cup': Type.IngredientUnit.CUP,
            'oz': Type.IngredientUnit.OZ
        }
        return unit_map.get(unit_str.lower(), Type.IngredientUnit.G)
    
    def _parse_meal_type(self, type_str: str) -> Type.MealType:
        """Parse meal type string to MealType enum."""
        type_map = {
            'breakfast': Type.MealType.BREAKFAST,
            'lunch': Type.MealType.LUNCH,
            'dinner': Type.MealType.DINNER,
            'snack': Type.MealType.SNACK
        }
        return type_map.get(type_str.lower(), Type.MealType.SNACK)


    def _parse_difficulty_level(self, difficulty_str: str) -> Type.DifficultyLevel:
        """Parse difficulty level string to DifficultyLevel enum."""
        difficulty_map = {
            'easy': Type.DifficultyLevel.EASY,
            'medium': Type.DifficultyLevel.MEDIUM,
            'hard': Type.DifficultyLevel.HARD
        }
        return difficulty_map.get(difficulty_str.lower(), Type.DifficultyLevel.MEDIUM)
    
    def _safe_float(self, value: str) -> Optional[float]:
        """Safely parse float value, return None if empty or invalid."""
        if not value or value.strip() == '':
            return None
        try:
            return float(value)
        except ValueError:
            return None
    
    def _safe_int(self, value: str) -> Optional[int]:
        """Safely parse int value, return None if empty or invalid."""
        if not value or value.strip() == '':
            return None
        try:
            return int(value)
        except ValueError:
            return None

    def generate_slug(self, text: str) -> str:
        """Generate a URL-friendly slug from text using python-slugify.

        Args:
            text: The text to convert to a slug

        Returns:
            A URL-friendly slug string
        """
        return slugify(text)