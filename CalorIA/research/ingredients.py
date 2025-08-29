#!/usr/bin/env python3
"""
CalorIA Ingredient Research
AI-powered ingredient discovery and database population.
"""

import click
from typing import List, Dict, Optional, Any
from datetime import datetime, timezone
from uuid import uuid4

from .tools import BaseResearcher, ResearchResult
from ..types import Ingredient, IngredientUnit
from .. import Client


class IngredientResearcher(BaseResearcher):
    """AI-powered ingredient research and discovery system."""

    def get_existing_ingredients_by_category(self, category: str) -> List[str]:
        """Get list of existing ingredient names for a category."""
        try:
            db = self.client.get_db_connection()
            if db is None:
                return []

            collection = db["ingredients"]
            cursor = collection.find({"category": category}, {"name": 1})

            return [doc["name"] for doc in cursor]
        except Exception as e:
            click.echo(f"❌ Error getting existing ingredients: {e}")
            return []

    def generate_research_prompt(self, category: str, existing_ingredients: List[str], letters: Optional[List[str]] = None) -> str:
        """Generate a prompt for the AI to research missing ingredients by letter."""

        # If no letters specified, use a default set
        if not letters:
            letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']

        # Create existing ingredients set for quick lookup
        existing_set = set(ing.lower() for ing in existing_ingredients)

        # Generate letter-based requests
        letter_requests = []
        for letter in letters[:5]:  # Limit to 5 letters per request to avoid overwhelming
            letter_requests.append(f"3-5 {category} starting with '{letter}'")

        prompt = f"""I need you to generate a JSON array of missing {category} ingredients for a nutrition database, organized by letter.

Focus on ingredients that start with these letters: {', '.join(letters[:5])}

Existing ingredients to avoid: {', '.join(existing_ingredients[:10])}{'...' if len(existing_ingredients) > 10 else ''}

Please think step by step, then provide the final JSON array.

Step 1: For each letter, list 3-5 {category} that start with that letter and are not in the existing list.
Step 2: For each ingredient, gather nutritional data (kcal, protein, fat, carbs per 100g).
Step 3: Format as JSON array with these fields: name, category ("{category}"), default_unit, kcal_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g, aliases, tags, popularity_score.

Example format:
[
  {{
    "name": "Asparagus",
    "category": "{category}",
    "default_unit": "g",
    "kcal_per_100g": 20.0,
    "protein_per_100g": 2.2,
    "fat_per_100g": 0.1,
    "carbs_per_100g": 3.9,
    "aliases": ["asparagus spears"],
    "tags": ["green vegetable", "spring vegetable"],
    "popularity_score": 75.0
  }},
  {{
    "name": "Broccoli",
    "category": "{category}",
    "default_unit": "g",
    "kcal_per_100g": 34.0,
    "protein_per_100g": 2.8,
    "fat_per_100g": 0.4,
    "carbs_per_100g": 7.0,
    "aliases": ["broccoli florets"],
    "tags": ["cruciferous", "green vegetable"],
    "popularity_score": 90.0
  }}
]

After your thinking, end with the JSON array:"""

        return prompt

    def query_ai_for_ingredients(self, category: str, letters: Optional[List[str]] = None) -> Optional[List[Dict]]:
        """Query AI for missing ingredients in a category."""

        existing_ingredients = self.get_existing_ingredients_by_category(category)
        prompt = self.generate_research_prompt(category, existing_ingredients, letters)

        content = self.query_ai(prompt)
        if not content:
            return None

        return self.parse_json_response(content)

    def parse_ingredient_data(self, ingredient_data: Dict) -> Optional[Ingredient]:
        """Parse AI response data into an Ingredient object."""

        try:
            # Validate required fields
            required_fields = ['name', 'kcal_per_100g', 'protein_per_100g', 'fat_per_100g', 'carbs_per_100g']
            for field in required_fields:
                if field not in ingredient_data or ingredient_data[field] is None:
                    click.echo(f"❌ Missing required field: {field}")
                    return None

            # Parse unit
            unit_str = ingredient_data.get('default_unit', 'g')
            try:
                default_unit = IngredientUnit(unit_str)
            except ValueError:
                click.echo(f"❌ Invalid unit: {unit_str}, defaulting to 'g'")
                default_unit = IngredientUnit.G

            # Create ingredient object
            ingredient = Ingredient(
                id=uuid4(),
                name=ingredient_data['name'],
                category=ingredient_data.get('category', 'Unknown'),
                default_unit=default_unit,
                grams_per_unit=ingredient_data.get('grams_per_unit'),
                density_g_per_ml=ingredient_data.get('density_g_per_ml'),
                kcal_per_100g=float(ingredient_data['kcal_per_100g']),
                protein_per_100g=float(ingredient_data['protein_per_100g']),
                fat_per_100g=float(ingredient_data['fat_per_100g']),
                carbs_per_100g=float(ingredient_data['carbs_per_100g']),
                aliases=ingredient_data.get('aliases', []),
                tags=ingredient_data.get('tags', []),
                popularity_score=float(ingredient_data.get('popularity_score', 50.0)),
                created_at=datetime.now(timezone.utc),
                is_system=True
            )

            return ingredient

        except Exception as e:
            click.echo(f"❌ Error parsing ingredient data: {e}")
            return None

    def is_duplicate_ingredient(self, ingredient: Ingredient) -> bool:
        """Check if an ingredient already exists (case-insensitive)."""

        # Check by exact name match
        existing = self.client.get_ingredient_by_name(ingredient.name)
        if existing:
            return True

        # Check aliases
        for alias in ingredient.aliases:
            existing = self.client.get_ingredient_by_name(alias)
            if existing:
                return True

        return False

    def research_and_add_ingredients(self, category: str, max_ingredients: int = 20, dry_run: bool = False, letters: Optional[List[str]] = None) -> ResearchResult:
        """Research and add missing ingredients for a category."""

        results = ResearchResult()

        if letters:
            click.echo(f"🔍 Researching missing ingredients for category: {category} (letters: {', '.join(letters)})")
        else:
            click.echo(f"🔍 Researching missing ingredients for category: {category}")

        # Query AI for ingredients
        ingredients_data = self.query_ai_for_ingredients(category, letters)
        if not ingredients_data:
            click.echo("❌ Failed to get ingredients from AI")
            return results

        results.researched = len(ingredients_data)
        click.echo(f"✓ Found {len(ingredients_data)} potential ingredients from AI")

        # Process each ingredient
        added_count = 0
        for i, ingredient_data in enumerate(ingredients_data):
            if added_count >= max_ingredients:
                break

            click.echo(f"  Processing {i+1}/{len(ingredients_data)}: {ingredient_data.get('name', 'Unknown')}")

            # Parse ingredient data
            ingredient = self.parse_ingredient_data(ingredient_data)
            if not ingredient:
                results.errors += 1
                continue

            # Check for duplicates
            if self.is_duplicate_ingredient(ingredient):
                click.echo(f"    ⚠️  Duplicate found: {ingredient.name}")
                results.duplicates += 1
                continue

            # Add ingredient
            if not dry_run:
                result = self.client.create_ingredient(ingredient)
                if result:
                    click.echo(f"    ✅ Added: {ingredient.name}")
                    results.added += 1
                    added_count += 1
                else:
                    click.echo(f"    ❌ Failed to add: {ingredient.name}")
                    results.errors += 1
            else:
                click.echo(f"    🔍 Would add: {ingredient.name} (dry run)")
                results.added += 1
                added_count += 1

        return results

    def get_available_categories(self) -> List[str]:
        """Get list of available ingredient categories from existing data."""

        try:
            db = self.client.get_db_connection()
            if db is None:
                return []

            collection = db["ingredients"]
            categories = collection.distinct("category")
            return sorted(categories)

        except Exception as e:
            click.echo(f"❌ Error getting categories: {e}")
            return []


def research_ingredients_command(category=None, max_ingredients=20, letters=None, dry_run=False):
    """Main function for the research-ingredients CLI command."""

    click.echo("🧪 CalorIA Ingredient Research System")
    click.echo("=" * 50)

    researcher = IngredientResearcher()

    # Get available categories
    categories = researcher.get_available_categories()
    if not categories:
        click.echo("❌ No categories found in database. Please seed ingredients first.")
        return

    # Category selection
    if not category:
        click.echo(f"📂 Available categories: {', '.join(categories)}")
        category = click.prompt("Enter category to research", type=click.Choice(categories))

    # Validate category exists
    if category not in categories:
        click.echo(f"❌ Category '{category}' not found in database.")
        click.echo(f"📂 Available categories: {', '.join(categories)}")
        return

    # Letters selection
    if not letters:
        letters_input = click.prompt("Enter letters to research (comma-separated, e.g., 'A,B,C')", default="")
        if letters_input.strip():
            letters = [letter.strip().upper() for letter in letters_input.split(',')]
        else:
            letters = None

    # Max ingredients
    if not max_ingredients or max_ingredients <= 0:
        max_ingredients = click.prompt("Maximum ingredients to add", type=int, default=20)

    # Dry run option
    if not dry_run:
        dry_run = click.confirm("Dry run? (Show what would be added without actually adding)", default=False)

    # Show research plan
    if letters:
        click.echo(f"📝 Researching {category} ingredients starting with: {', '.join(letters)}")
    else:
        click.echo(f"📝 Researching {category} ingredients (systematic approach)")

    # Confirm
    if not dry_run:
        if not click.confirm(f"Add up to {max_ingredients} ingredients to category '{category}'?", default=True):
            click.echo("❌ Operation cancelled")
            return

    # Perform research
    click.echo()
    results = researcher.research_and_add_ingredients(category, max_ingredients, dry_run, letters)

    # Summary
    click.echo()
    click.echo("=" * 50)
    click.echo("📊 Research Summary:")
    click.echo(f"   • Researched: {results.researched} ingredients")
    click.echo(f"   • Added: {results.added} ingredients")
    click.echo(f"   • Duplicates skipped: {results.duplicates} ingredients")
    click.echo(f"   • Errors: {results.errors} ingredients")

    if dry_run:
        click.echo("💡 This was a dry run - no ingredients were actually added")
    else:
        click.echo("✅ Research complete!")


if __name__ == '__main__':
    research_ingredients_command()