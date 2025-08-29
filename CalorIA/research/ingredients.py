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
        """Get list of existing ingredient names for a category from CSV."""

        try:
            import csv
            from pathlib import Path

            csv_path = Path(__file__).parent.parent / "seed_db" / "ingredients.csv"

            if not csv_path.exists():
                click.echo(f"⚠️  CSV file not found: {csv_path}")
                return []

            existing_ingredients = []
            with open(csv_path, 'r', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)
                for row in reader:
                    if row.get('category') == category:
                        existing_ingredients.append(row['name'])

            return existing_ingredients

        except Exception as e:
            click.echo(f"❌ Error reading CSV: {e}")
            return []
    def generate_research_prompt(self, category: str, existing_ingredients: List[str], letters: Optional[List[str]] = None) -> str:
        """Generate a prompt for the AI to research missing ingredients by letter."""

        # If no letters specified, use a default set
        if not letters:
            letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']

        # Create existing ingredients set for quick lookup
        existing_set = set(ing.lower() for ing in existing_ingredients)

        # For single letter processing, filter existing ingredients by that letter
        if len(letters) == 1:
            letter = letters[0]
            existing_for_letter = [ing for ing in existing_ingredients if ing.lower().startswith(letter.lower())]
            click.echo(f"🔍 Found {len(existing_for_letter)} existing ingredients starting with '{letter}': {existing_for_letter}")
            existing_text = f"All existing {category} starting with '{letter}': {', '.join(existing_for_letter)}"
        else:
            # For multiple letters, show general existing ingredients
            existing_text = f"Existing ingredients to avoid: {', '.join(existing_ingredients[:10])}{'...' if len(existing_ingredients) > 10 else ''}"

        # Generate letter-based requests
        letter_requests = []
        for letter in letters[:5]:  # Limit to 5 letters per request to avoid overwhelming
            letter_requests.append(f"exactly 5 {category} starting with '{letter}'")

        prompt = f"""I need you to generate a JSON array of missing {category} ingredients for a nutrition database, organized by letter.

Focus on ingredients that start with these letters: {', '.join(letters[:5])}

{existing_text}

Please think step by step, then provide the final JSON array.

Step 1: For each letter, list exactly 5 {category} that start with that letter and do not include any of the existing ingredients listed above.
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

            # Clean the ingredient name
            cleaned_name = self.clean_ingredient_name(ingredient_data['name'])

            # Create ingredient object
            ingredient = Ingredient(
                id=uuid4(),
                name=cleaned_name,
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
    def clean_ingredient_name(self, name: str) -> str:
        """Clean ingredient name by removing parentheses, quotes, and simplifying."""
        import re

        # Remove parentheses and their contents
        name = re.sub(r'\([^)]*\)', '', name).strip()

        # Remove quotes
        name = name.replace('"', '').replace("'", '').strip()

        # Remove extra spaces
        name = re.sub(r'\s+', ' ', name).strip()

        # If the cleaned name is empty or too short, return original
        if len(name) < 2:
            return name

        return name

    def is_duplicate_ingredient(self, ingredient: Ingredient, category: str) -> bool:
        """Check if an ingredient already exists in CSV (case-insensitive)."""

        try:
            import csv
            from pathlib import Path

            csv_path = Path(__file__).parent.parent / "seed_db" / "ingredients.csv"

            if not csv_path.exists():
                return False

            with open(csv_path, 'r', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)
                for row in reader:
                    # Check exact name match (case-insensitive)
                    if row['name'].lower() == ingredient.name.lower():
                        return True

                    # Check aliases (case-insensitive)
                    if row.get('aliases'):
                        aliases = [alias.strip().lower() for alias in row['aliases'].split(',')]
                        if ingredient.name.lower() in aliases:
                            return True
                        for alias in ingredient.aliases:
                            if alias.lower() in aliases:
                                return True

            return False

        except Exception as e:
            click.echo(f"❌ Error checking duplicates in CSV: {e}")
            return False

    def research_and_add_ingredients(self, category: str, max_ingredients: int = 20, dry_run: bool = False, letters: Optional[List[str]] = None) -> ResearchResult:
        """Research and add missing ingredients for a category."""

        results = ResearchResult()

        # Define research strategy: vowels first, then full alphabet
        if not letters:
            vowels = ['A', 'E', 'I', 'O', 'U']
            consonants = ['B', 'C', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'V', 'W', 'X', 'Y', 'Z']
            letters = vowels + consonants
            click.echo(f"🔍 Researching missing ingredients for category: {category} (vowels first, then full alphabet)")
        else:
            click.echo(f"🔍 Researching missing ingredients for category: {category} (letters: {', '.join(letters)})")

        # Process letters one by one
        added_count = 0
        for letter in letters:
            click.echo(f"📝 Processing letter: {letter}")

            # Query AI for this single letter
            click.echo(f"🔍 Querying AI for letter {letter}...")
            ingredients_data = self.query_ai_for_ingredients(category, [letter])
            if not ingredients_data:
                click.echo(f"❌ Failed to get ingredients for letter {letter}")
                continue

            # Validate we have exactly 5 ingredients for this letter
            expected_count = 5
            if len(ingredients_data) != expected_count:
                click.echo(f"⚠️  Expected {expected_count} ingredients for letter {letter}, got {len(ingredients_data)}")
                # Continue processing what we have, but log the discrepancy

            results.researched += len(ingredients_data)
            click.echo(f"✓ Found {len(ingredients_data)} potential ingredients for letter {letter}")

            # Process each ingredient for this letter
            for j, ingredient_data in enumerate(ingredients_data):
                if added_count >= max_ingredients:
                    break

                click.echo(f"  Processing {j+1}/{len(ingredients_data)}: {ingredient_data.get('name', 'Unknown')}")

                # Parse ingredient data
                ingredient = self.parse_ingredient_data(ingredient_data)
                if not ingredient:
                    results.errors += 1
                    continue

                # Check for duplicates
                if self.is_duplicate_ingredient(ingredient, category):
                    click.echo(f"    ⚠️  Duplicate found: {ingredient.name}")
                    results.duplicates += 1
                    continue

                # Add ingredient to CSV
                if not dry_run:
                    success = self.add_ingredient_to_csv(ingredient)
                    if success:
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

            if added_count >= max_ingredients:
                break

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

    def add_ingredient_to_csv(self, ingredient: Ingredient) -> bool:
        """Add a single ingredient to the CSV file."""
        import csv
        from pathlib import Path

        csv_path = Path(__file__).parent.parent / "seed_db" / "ingredients.csv"

        try:
            # Read existing ingredients
            existing_ingredients = []
            if csv_path.exists():
                with open(csv_path, 'r', encoding='utf-8') as csvfile:
                    reader = csv.DictReader(csvfile)
                    existing_ingredients = list(reader)

            # Add new ingredient
            new_row = {
                'name': ingredient.name,
                'category': ingredient.category,
                'default_unit': ingredient.default_unit.value if ingredient.default_unit else 'g',
                'grams_per_unit': str(ingredient.grams_per_unit) if ingredient.grams_per_unit else '',
                'density_g_per_ml': str(ingredient.density_g_per_ml) if ingredient.density_g_per_ml else '',
                'kcal_per_100g': str(ingredient.kcal_per_100g),
                'protein_per_100g': str(ingredient.protein_per_100g),
                'fat_per_100g': str(ingredient.fat_per_100g),
                'carbs_per_100g': str(ingredient.carbs_per_100g),
                'aliases': ','.join(ingredient.aliases) if ingredient.aliases else '',
                'tags': ','.join(ingredient.tags) if ingredient.tags else '',
                'popularity_score': str(ingredient.popularity_score)
            }

            existing_ingredients.append(new_row)

            # Sort by category then name
            existing_ingredients.sort(key=lambda x: (x['category'], x['name']))

            # Write back to CSV
            with open(csv_path, 'w', newline='', encoding='utf-8') as csvfile:
                fieldnames = [
                    'name', 'category', 'default_unit', 'grams_per_unit',
                    'density_g_per_ml', 'kcal_per_100g', 'protein_per_100g',
                    'fat_per_100g', 'carbs_per_100g', 'aliases', 'tags', 'popularity_score'
                ]

                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                writer.writeheader()

                for row in existing_ingredients:
                    writer.writerow(row)

            return True

        except Exception as e:
            click.echo(f"❌ Error adding ingredient to CSV: {e}")
            return False

    def export_to_csv(self, csv_path: str = None) -> bool:
        """Export all ingredients from CSV to CSV file (re-sort)."""
        import csv
        from pathlib import Path

        if csv_path is None:
            # Default to the seed_db directory
            csv_path = Path(__file__).parent.parent / "seed_db" / "ingredients.csv"

        try:
            if not csv_path.exists():
                click.echo(f"⚠️  CSV file not found: {csv_path}")
                return False

            # Read all ingredients
            with open(csv_path, 'r', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)
                ingredients = list(reader)

            if not ingredients:
                click.echo("⚠️  No ingredients found in CSV")
                return False

            # Sort by category then name
            ingredients.sort(key=lambda x: (x['category'], x['name']))

            # Write back sorted
            with open(csv_path, 'w', newline='', encoding='utf-8') as csvfile:
                fieldnames = [
                    'name', 'category', 'default_unit', 'grams_per_unit',
                    'density_g_per_ml', 'kcal_per_100g', 'protein_per_100g',
                    'fat_per_100g', 'carbs_per_100g', 'aliases', 'tags', 'popularity_score'
                ]

                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                writer.writeheader()

                for ingredient in ingredients:
                    writer.writerow(ingredient)

            click.echo(f"✅ Re-sorted {len(ingredients)} ingredients in {csv_path}")
            return True

        except Exception as e:
            click.echo(f"❌ Error re-sorting CSV: {e}")
            return False


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

    # Letters selection - if not provided, use systematic approach (no prompt)
    if not letters:
        click.echo("📝 Using systematic research approach (vowels first, then full alphabet)")
        letters = None
    else:
        click.echo(f"📝 Researching specific letters: {', '.join(letters)}")

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