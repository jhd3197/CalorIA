#!/usr/bin/env python3
"""
CalorIA Database Seeding Module
Reads CSV files and seeds the database with ingredients and meals.
"""

import csv
import os
import click
from datetime import datetime, timezone
from uuid import uuid4
from typing import Dict, List, Optional
from pathlib import Path

from .types import Ingredient, FoodItem, Meal, MealType, IngredientUnit
from . import Client


class DatabaseSeeder:
    """Database seeder that reads from CSV files and populates the database."""
    
    def __init__(self):
        self.seeded_ingredients: Dict[str, Ingredient] = {}
        self.package_dir = Path(__file__).parent
        self.seed_data_dir = self.package_dir / "seed_db"
        self.client = Client()
    
    def load_ingredients_from_csv(self) -> List[Dict]:
        """Load ingredient data from CSV file."""
        csv_path = self.seed_data_dir / "ingredients.csv"
        if not csv_path.exists():
            click.echo(f"❌ Ingredients CSV not found: {csv_path}")
            return []
        
        ingredients = []
        try:
            with open(csv_path, 'r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                for row in reader:
                    # Parse aliases and tags
                    aliases = [alias.strip() for alias in row['aliases'].split(',')] if row['aliases'] else []
                    tags = [tag.strip() for tag in row['tags'].split(',')] if row['tags'] else []
                    
                    ingredient_data = {
                        'name': row['name'],
                        'category': row['category'],
                        'default_unit': self.client._parse_unit(row['default_unit']),
                        'grams_per_unit': self.client._safe_float(row['grams_per_unit']),
                        'density_g_per_ml': self.client._safe_float(row['density_g_per_ml']),
                        'kcal_per_100g': self.client._safe_float(row['kcal_per_100g']),
                        'protein_per_100g': self.client._safe_float(row['protein_per_100g']),
                        'fat_per_100g': self.client._safe_float(row['fat_per_100g']),
                        'carbs_per_100g': self.client._safe_float(row['carbs_per_100g']),
                        'aliases': aliases,
                        'tags': tags,
                        'popularity_score': self.client._safe_float(row['popularity_score'])
                    }
                    ingredients.append(ingredient_data)
        except Exception as e:
            click.echo(f"❌ Error reading ingredients CSV: {e}")
            return []
        
        return ingredients
    
    def load_meals_from_csv(self) -> List[Dict]:
        """Load meal data from CSV file."""
        csv_path = self.seed_data_dir / "meals.csv"
        if not csv_path.exists():
            click.echo(f"❌ Meals CSV not found: {csv_path}")
            return []
        
        meals = []
        try:
            with open(csv_path, 'r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                for row in reader:
                    # Parse ingredients string: "ingredient1:amount:unit,ingredient2:amount:unit"
                    ingredients = []
                    if row['ingredients']:
                        for ingredient_str in row['ingredients'].split(','):
                            parts = ingredient_str.strip().split(':')
                            if len(parts) == 3:
                                ingredients.append({
                                    'name': parts[0],
                                    'amount': float(parts[1]),
                                    'unit': self.client._parse_unit(parts[2])
                                })
                    
                    meal_data = {
                        'name': row['name'],
                        'type': self.client._parse_meal_type(row['type']),
                        'ingredients': ingredients,
                        'notes': row.get('notes', '')
                    }
                    meals.append(meal_data)
        except Exception as e:
            click.echo(f"❌ Error reading meals CSV: {e}")
            return []
        
        return meals
    
    def seed_ingredients(self) -> int:
        """Seed ingredients from CSV file."""
        click.echo("Loading ingredients from CSV...", nl=False)
        ingredients_data = self.load_ingredients_from_csv()
        
        if not ingredients_data:
            click.echo(" ❌ No ingredients to seed")
            return 0
        
        click.echo(f" ✓ ({len(ingredients_data)} found)")
        
        count = 0
        categories = {}
        
        for data in ingredients_data:
            # Check if ingredient already exists (case-insensitive)
            existing = self.client.get_ingredient_by_name(data['name'])
            if existing:
                # Cache the existing ingredient
                self.seeded_ingredients[data['name']] = existing
                continue
            
            # Create new ingredient
            ingredient = Ingredient(
                id=uuid4(),
                name=data['name'],
                category=data['category'],
                default_unit=data['default_unit'],
                grams_per_unit=data['grams_per_unit'],
                density_g_per_ml=data['density_g_per_ml'],
                kcal_per_100g=data['kcal_per_100g'],
                protein_per_100g=data['protein_per_100g'],
                fat_per_100g=data['fat_per_100g'],
                carbs_per_100g=data['carbs_per_100g'],
                aliases=data['aliases'],
                tags=data['tags'],
                popularity_score=data['popularity_score'],
                created_at=datetime.now(timezone.utc),
                is_system=True  # Mark as system-created
            )
            
            result = self.client.create_ingredient(ingredient)
            if result:
                count += 1
                self.seeded_ingredients[data['name']] = ingredient
                
                # Track by category for progress display
                category = data['category']
                if category not in categories:
                    categories[category] = 0
                categories[category] += 1
        
        # Display results by category
        for category, cat_count in categories.items():
            click.echo(f"   • {category}: {cat_count} new")
        
        return count
    
    def seed_meals(self) -> int:
        """Seed sample meals from CSV file."""
        if not self.seeded_ingredients:
            click.echo("❌ No ingredients available for meal creation")
            return 0
        
        click.echo("Loading meals from CSV...", nl=False)
        meals_data = self.load_meals_from_csv()
        
        if not meals_data:
            click.echo(" ❌ No meals to seed")
            return 0
        
        click.echo(f" ✓ ({len(meals_data)} found)")
        
        # Check existing meals first
        existing_meals = {}
        try:
            db = self.client.get_db_connection()
            if db is not None:
                collection = db["sample_meals"]
                cursor = collection.find({})
                
                for doc in cursor:
                    if 'notes' in doc and doc['notes']:
                        existing_meals[doc['notes']] = True
        except Exception as e:
            click.echo(f"⚠️ Warning: Error checking existing meals: {e}")
        
        count = 0
        for meal_data in meals_data:
            # Generate meal note which will be used as unique identifier
            meal_note = meal_data['notes'] or f"System sample meal: {meal_data['name']}"
            
            # Skip if this meal already exists
            if meal_note in existing_meals:
                continue
                
            # Create FoodItem objects for the meal
            food_items = []
            
            for ingredient_data in meal_data['ingredients']:
                ingredient_name = ingredient_data['name']
                amount = ingredient_data['amount']
                unit = ingredient_data['unit']
                
                if ingredient_name in self.seeded_ingredients:
                    ingredient = self.seeded_ingredients[ingredient_name]
                    calories = ingredient.calories_for(amount, unit)
                    
                    if calories:
                        # Calculate macros based on ingredient nutrition per 100g
                        grams = ingredient.amount_to_grams(amount, unit)
                        multiplier = grams / 100.0
                        
                        food_item = FoodItem(
                            name=f"{amount} {unit.value} {ingredient_name}",
                            calories=int(calories),
                            protein_g=ingredient.protein_per_100g * multiplier if ingredient.protein_per_100g else 0,
                            carbs_g=ingredient.carbs_per_100g * multiplier if ingredient.carbs_per_100g else 0,
                            fat_g=ingredient.fat_per_100g * multiplier if ingredient.fat_per_100g else 0,
                            portion_size=f"{amount} {unit.value}",
                            is_system=True
                        )
                        food_items.append(food_item)
            
            if food_items:
                # Create meal
                meal = Meal(
                    meal_type=meal_data['type'],
                    food_items=food_items,
                    notes=meal_note,
                    timestamp=datetime.now(timezone.utc)
                )
                
                # Store as sample meal (in practice, these would be part of user daily logs)
                result = self.client.create_document("sample_meals", meal)
                if result:
                    count += 1
                    existing_meals[meal_note] = True
        
        return count
    
    def seed_all(self) -> Dict[str, int]:
        """Seed all data from CSV files."""
        results = {
            'ingredients': 0,
            'meals': 0
        }
        
        # Seed ingredients first
        click.echo("🥕 Seeding Ingredients:")
        results['ingredients'] = self.seed_ingredients()
        
        click.echo()
        
        # Then seed meals
        click.echo("🍽️ Seeding Sample Meals:")
        results['meals'] = self.seed_meals()
        
        return results
    
    def remove_all_seeded_data(self) -> Dict[str, int]:
        """Remove all system-generated data (ingredients and sample meals).
        
        Returns:
            Dictionary with counts of removed items
        """
        results = {
            'ingredients': 0,
            'meals': 0
        }
        
        # Remove system ingredients
        click.echo("🧹 Removing system-generated ingredients...")
        try:
            db = self.client.get_db_connection()
            if db is None:
                click.echo(" ❌ Database connection failed")
                return results
                
            collection = db["ingredients"]
            query = {"is_system": True}
            delete_result = collection.delete_many(query)
            results['ingredients'] = delete_result.deleted_count
            click.echo(f" ✓ Removed {results['ingredients']} system ingredients")
        except Exception as e:
            click.echo(f" ❌ Error removing ingredients: {e}")
        
        click.echo()
        
        # Remove sample meals
        click.echo("🧹 Removing sample meals...")
        try:
            db = self.client.get_db_connection()
            if db is None:
                return results
                
            collection = db["sample_meals"]
            delete_result = collection.delete_many({})  # All sample meals are system-generated
            results['meals'] = delete_result.deleted_count
            click.echo(f" ✓ Removed {results['meals']} sample meals")
        except Exception as e:
            click.echo(f" ❌ Error removing meals: {e}")
        
        return results


def seed_database():
    """Main seeding function that can be called from CLI or other modules."""
    click.echo("🌱 CalorIA Database Seeder")
    click.echo("=" * 40)
    
    seeder = DatabaseSeeder()
    
    # Test database connection
    if seeder.client.get_db_connection() is None:
        click.echo("❌ Failed to connect to database. Please check your MongoDB connection.")
        return False
    
    click.echo("✅ Database connection established")
    click.echo()
    
    # Perform seeding
    results = seeder.seed_all()
    
    click.echo()
    click.echo("=" * 40)
    click.echo("✅ Seeding completed!")
    click.echo(f"   • {results['ingredients']} new ingredients added")
    click.echo(f"   • {results['meals']} sample meals created")
    click.echo("   • All items marked as system-generated")
    click.echo()
    click.echo("💡 Run this script again anytime - it's safe and won't create duplicates!")
    
    return True


def remove_seeded_data():
    """Remove all system-generated data from the database."""
    click.echo("🧹 CalorIA Database Cleaner")
    click.echo("=" * 40)
    
    seeder = DatabaseSeeder()
    
    # Test database connection
    if seeder.client.get_db_connection() is None:
        click.echo("❌ Failed to connect to database. Please check your MongoDB connection.")
        return False
    
    click.echo("✅ Database connection established")
    click.echo()
    
    # Perform removal
    results = seeder.remove_all_seeded_data()
    
    click.echo()
    click.echo("=" * 40)
    click.echo("✅ Cleanup completed!")
    click.echo(f"   • Removed {results['ingredients']} system ingredients")
    click.echo(f"   • Removed {results['meals']} sample meals")
    click.echo()
    click.echo("💡 Use 'caloria seed' to re-seed the database with fresh data.")
    
    return True


@click.command()
def main():
    """CLI entry point for database seeding."""
    seed_database()


if __name__ == '__main__':
    main()