# types.py
from __future__ import annotations
from enum import Enum
from typing import Any, Dict, Type, TypeVar, Iterable, List, Optional, Literal
from decimal import Decimal
from uuid import UUID, uuid4
from datetime import datetime, date, time, timezone

from pydantic import BaseModel, Field, validator, ValidationError



# -------------------------
# Enums
# -------------------------
class WeightUnit(str, Enum):
    KG = "kg"
    LBS = "lbs"


class MeasurementSystem(str, Enum):
    METRIC = "metric"
    IMPERIAL = "imperial"


class Sex(str, Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"


class GoalType(str, Enum):
    LOSE = "lose"
    MAINTAIN = "maintain"
    GAIN = "gain"


class MealType(str, Enum):
    BREAKFAST = "breakfast"
    LUNCH = "lunch"
    DINNER = "dinner"
    SNACK = "snack"


class DifficultyLevel(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class RecipeCategory(str, Enum):
    BREAKFAST = "breakfast"
    LUNCH = "lunch"
    DINNER = "dinner"
    SNACK = "snack"
    DESSERT = "dessert"
    BEVERAGE = "beverage"
    APPETIZER = "appetizer"
    SOUP = "soup"
    SALAD = "salad"
    MAIN_COURSE = "main_course"
    SIDE_DISH = "side_dish"
    HEALTHY = "healthy"


class ActivityLevel(str, Enum):
    SEDENTARY = "sedentary"
    LIGHT = "light"
    MODERATE = "moderate"
    ACTIVE = "active"
    VERY_ACTIVE = "very_active"


class WaterUnit(str, Enum):
    ML = "ml"
    LITER = "l"
    OUNCE = "oz"    # US fluid ounce
    CUP = "cup"     # ~240 ml (approx)

class IngredientUnit(str, Enum):
    G = "g"
    ML = "ml"
    UNIT = "unit"   # e.g., 1 egg, 1 clove
    TBSP = "tbsp"
    TSP = "tsp"
    CUP = "cup"
    OZ = "oz"

# -------------------------
# Utility conversion constants
# -------------------------
_LB_TO_KG = 0.45359237
_OUNCE_TO_ML = 29.5735295625
_CUP_TO_ML = 240.0
_LITER_TO_ML = 1000.0
_TBSP_TO_ML = 15.0
_TSP_TO_ML = 5.0

T = TypeVar("T", bound="CalorIAModel")


def _primitive(value: Any, serialize_datetime: bool = True) -> Any:
    """Convert value to a JSON-serializable primitive."""
    # nested pydantic model
    if isinstance(value, CalorIAModel):
        return value.to_dict(exclude_none=True, serialize_datetime=serialize_datetime)
    # pydantic v1/other BaseModel
    if isinstance(value, BaseModel):
        # fallback for other BaseModel types
        return value.dict(exclude_none=True)
    # enums -> value
    if isinstance(value, Enum):
        return value.value
    # uuid -> str
    if isinstance(value, UUID):
        return str(value)
    # datetime/date/time -> ISO string or raw
    if isinstance(value, (datetime, date, time)):
        return value.isoformat() if serialize_datetime else value
    # Decimal -> float (or str if you prefer)
    if isinstance(value, Decimal):
        # choose float for ease of use; change to str(...) if high-precision required
        return float(value)
    # recursively handle iterables
    if isinstance(value, dict):
        return {k: _primitive(v, serialize_datetime=serialize_datetime) for k, v in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_primitive(v, serialize_datetime=serialize_datetime) for v in value]
    # primitives (str/int/float/bool/None)
    return value

class CalorIAModel(BaseModel):
    """
    Base model that provides:
      - to_dict(): produce JSON-friendly primitives for storage/transport
      - from_dict(): classmethod that parses raw dicts into models (uses pydantic parsing)
    """

    def to_dict(
        self,
        *,
        exclude_none: bool = True,
        by_alias: bool = False,
        serialize_datetime: bool = True,
    ) -> Dict[str, Any]:
        """
        Return a fully-primitive dict representation of the model.
        - exclude_none: exclude None values
        - by_alias: use field aliases if defined
        - serialize_datetime: convert datetimes/dates/times to ISO strings (True) or keep as native objects (False)
        """
        # use pydantic's dict() to get field structure, then convert leaves to primitives
        raw = super().dict(exclude_none=exclude_none, by_alias=by_alias)
        return _primitive(raw, serialize_datetime=serialize_datetime)

    @classmethod
    def from_dict(cls: Type[T], data: Dict[str, Any], /) -> T:
        """
        Parse a plain dict (with strings, numbers, etc.) and construct the model.
        This uses pydantic's parsing which handles UUIDs, datetimes, Enums, nested models, etc.
        """
        try:
            # parse_obj allows nested parsing, accepts many primitive representations
            return cls.parse_obj(data)
        except ValidationError as exc:
            # re-raise with a helpful message (caller can catch)
            raise

# -------------------------
# Profile / Preferences
# -------------------------
class UserPreferences(CalorIAModel):
    sex: Sex
    age: Optional[int] = Field(None, ge=0, le=120)
    height: Optional[float] = Field(None, gt=0, description="Height in centimeters")
    measurement_system: MeasurementSystem = MeasurementSystem.METRIC
    default_weight_unit: WeightUnit = WeightUnit.KG
    activity_level: ActivityLevel = ActivityLevel.SEDENTARY
    goal_type: GoalType = GoalType.MAINTAIN
    target_weight: Optional[float] = Field(None, gt=0, description="Goal weight in default unit")
    daily_calorie_goal: Optional[int] = Field(None, gt=0)
    daily_water_goal_ml: Optional[int] = Field(
        None, gt=0, description="Daily water goal stored in milliliters"
    )
    preferred_language: str = "en"  # e.g., 'en' or 'es'
    timezone: str = "America/New_York"
    theme: str = "light"
    week_starts_on: str = "monday"
    diet_preferences: Optional[List[str]] = None  # e.g., ['vegetarian', 'keto']

    @validator("target_weight")
    def target_weight_positive(cls, v):
        if v is not None and v <= 0:
            raise ValueError("target_weight must be greater than 0")
        return v


class User(CalorIAModel):
    user_id: UUID = Field(default_factory=uuid4)
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    password_hash: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    preferences: UserPreferences


# -------------------------
# Food, Meal, Daily Log
# -------------------------
class FoodItem(CalorIAModel):
    name: str
    calories: int = Field(..., gt=0)
    protein_g: Optional[float] = Field(0.0, ge=0.0)
    carbs_g: Optional[float] = Field(0.0, ge=0.0)
    fat_g: Optional[float] = Field(0.0, ge=0.0)
    portion_size: Optional[str] = None  # e.g., "100 g", "1 cup"
    barcode: Optional[str] = None
    is_system: bool = Field(False, description="Whether this item was created by the system seed script")

    @validator("calories")
    def calories_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError("calories must be greater than 0")
        return v

class MealItem(CalorIAModel):
    """Individual food item within a meal with quantity and nutritional information."""
    name: str
    quantity: float = Field(1.0, gt=0, description="Amount in the specified unit")
    unit: str = "serving"
    calories: int = Field(0, ge=0)
    protein_g: float = Field(0.0, ge=0.0)
    carbs_g: float = Field(0.0, ge=0.0)
    fat_g: float = Field(0.0, ge=0.0)
    fiber_g: float = Field(0.0, ge=0.0)
    sugar_g: float = Field(0.0, ge=0.0)
    sodium_mg: float = Field(0.0, ge=0.0)

class Meal(CalorIAModel):
    user_id: UUID
    meal_type: MealType
    food_items: List["FoodItem"]
    notes: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    def total_calories(self) -> int:
        return sum(item.calories for item in self.food_items)

class DailyLog(CalorIAModel):
    user_id: UUID
    log_date: date = Field(default_factory=lambda: datetime.now(timezone.utc).date())
    meals: List["Meal"] = Field(default_factory=list)
    goal_calories: Optional[int] = None

    def total_calories(self) -> int:
        return sum(m.total_calories() for m in self.meals)


class Recipe(CalorIAModel):
    """Recipe model for storing recipe templates that can be used to create meals."""
    id: UUID = Field(default_factory=uuid4)
    name: str
    description: Optional[str] = None
    category: RecipeCategory
    prep_time_minutes: int = Field(..., gt=0, description="Preparation time in minutes")
    cook_time_minutes: Optional[int] = Field(None, ge=0, description="Cooking time in minutes")
    servings: int = Field(..., gt=0, description="Number of servings this recipe makes")
    difficulty: DifficultyLevel = DifficultyLevel.MEDIUM
    ingredients: List["RecipeIngredient"] = Field(default_factory=list)
    instructions: Optional[List[str]] = Field(default_factory=list, description="Step-by-step cooking instructions")
    tags: List[str] = Field(default_factory=list, description="Tags for filtering and searching")
    image_url: Optional[str] = None
    source_url: Optional[str] = None
    notes: Optional[str] = None
    is_system: bool = Field(False, description="Whether this recipe was created by the system")
    created_by: Optional[UUID] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None

    def total_calories(self) -> int:
        """Calculate total calories for the entire recipe (all servings)."""
        return sum(ingredient.calories() or 0 for ingredient in self.ingredients if ingredient.calories() is not None)

    def calories_per_serving(self) -> float:
        """Calculate calories per serving."""
        total_calories = self.total_calories()
        return total_calories / self.servings if self.servings > 0 else 0

    def total_prep_time(self) -> int:
        """Get total preparation time including cooking time."""
        total = self.prep_time_minutes
        if self.cook_time_minutes:
            total += self.cook_time_minutes
        return total


# -------------------------
# Weight entry (with unit + conversions)
# -------------------------
class WeightEntry(CalorIAModel):
    """Weight record that stores weight and unit. Use properties to read kg/lbs."""
    id: UUID = Field(default_factory=uuid4)
    user_id: UUID
    on_date: date = Field(default_factory=lambda: datetime.now(timezone.utc).date())
    weight: float = Field(..., gt=0, description="Weight value in the provided unit")
    unit: WeightUnit = WeightUnit.KG
    body_fat_pct: Optional[float] = Field(None, ge=0, le=100)

    @property
    def weight_kg(self) -> float:
        """Return weight in kilograms regardless of stored unit."""
        if self.unit == WeightUnit.KG:
            return float(self.weight)
        # convert lbs -> kg
        return float(self.weight) * _LB_TO_KG

    @property
    def weight_lbs(self) -> float:
        """Return weight in pounds regardless of stored unit."""
        if self.unit == WeightUnit.LBS:
            return float(self.weight)
        # convert kg -> lbs
        return float(self.weight) / _LB_TO_KG

    @validator("body_fat_pct")
    def check_body_fat_pct(cls, v):
        if v is not None and (v < 0 or v > 100):
            raise ValueError("body_fat_pct must be between 0 and 100")
        return v


# -------------------------
# Water consumption models
# -------------------------
class WaterEntry(CalorIAModel):
    id: UUID = Field(default_factory=uuid4)
    user_id: UUID
    on_date: date = Field(default_factory=lambda: datetime.now(timezone.utc).date())
    amount: float = Field(..., gt=0, description="Amount in given unit")
    unit: WaterUnit = WaterUnit.ML

    @property
    def amount_ml(self) -> float:
        """Convert amount to milliliters."""
        if self.unit == WaterUnit.ML:
            return float(self.amount)
        if self.unit == WaterUnit.LITER:
            return float(self.amount) * _LITER_TO_ML
        if self.unit == WaterUnit.OUNCE:
            return float(self.amount) * _OUNCE_TO_ML
        if self.unit == WaterUnit.CUP:
            return float(self.amount) * _CUP_TO_ML
        # fallback
        return float(self.amount)

class DailyWaterLog(CalorIAModel):
    user_id: UUID
    log_date: date = Field(default_factory=lambda: datetime.now(timezone.utc).date())
    entries: List["WaterEntry"] = Field(default_factory=list)

    def total_ml(self) -> float:
        return sum(e.amount_ml for e in self.entries)

    def meets_goal(self, goal_ml: Optional[float]) -> Optional[bool]:
        """Return True/False if goal provided, else None."""
        if goal_ml is None:
            return None
        return self.total_ml() >= goal_ml
    
# -------------------------
# Activity tracking models
# -------------------------
class ActivityEntry(CalorIAModel):
    """Activity record that stores workout data and calories burned."""
    id: UUID = Field(default_factory=uuid4)
    user_id: UUID
    on_date: date = Field(default_factory=lambda: datetime.now(timezone.utc).date())
    activity_name: str
    duration_minutes: int = Field(..., gt=0)
    calories_burned: int = Field(..., gt=0)
    notes: Optional[str] = None

    @validator("duration_minutes", "calories_burned")
    def positive_values(cls, v):
        if v <= 0:
            raise ValueError("Value must be greater than 0")
        return v

# -------------------------
# Ingredient / Recipe link
# -------------------------
class Ingredient(CalorIAModel):
    """
    Master ingredient record.
    - kcal_per_100g etc. are stored per 100g.
    - grams_per_unit: if default_unit == UNIT this tells how many grams per 'unit' (eg 1 egg = 50g)
    - density_g_per_ml: optional for better volume->weight conversions (e.g., oil ~0.91 g/ml)
    """
    id: Optional[UUID] = None
    name: str
    aliases: Optional[List[str]] = Field(default_factory=list)
    category: Optional[str] = None
    default_unit: IngredientUnit = IngredientUnit.G
    grams_per_unit: Optional[float] = None         # grams per 1 'unit' (like 1 egg = 50)
    density_g_per_ml: Optional[float] = None       # g per ml if known (for volume->weight)
    kcal_per_100g: Optional[float] = None
    protein_per_100g: Optional[float] = None
    fat_per_100g: Optional[float] = None
    carbs_per_100g: Optional[float] = None
    tags: Optional[List[str]] = Field(default_factory=list)
    image_url: Optional[str] = None
    notes: Optional[str] = None
    popularity_score: float = Field(0.0, ge=0.0, le=100.0)
    created_by: Optional[UUID] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    is_system: bool = Field(False, description="Whether this ingredient was created by the system seed script")

    @validator("kcal_per_100g", "protein_per_100g", "fat_per_100g", "carbs_per_100g")
    def _non_negative_or_none(cls, v):
        if v is not None and v < 0:
            raise ValueError("nutrition values must be >= 0")
        return v

    def amount_to_grams(self, amount: float, unit: IngredientUnit) -> float:
        """
        Convert amount in `unit` to grams using best available data.
        Fallback assumptions:
         - ml -> grams: uses density_g_per_ml if present, else assumes 1 g/ml
         - cup/tbsp/tsp/oz -> convert to ml then to grams (assume 1 g/ml unless density given)
         - unit -> uses grams_per_unit (must be provided) otherwise raises ValueError
        """
        if unit == IngredientUnit.G:
            return float(amount)
        if unit == IngredientUnit.ML:
            density = self.density_g_per_ml if self.density_g_per_ml is not None else 1.0
            return float(amount) * density
        if unit == IngredientUnit.TBSP:
            ml = float(amount) * _TBSP_TO_ML
            density = self.density_g_per_ml if self.density_g_per_ml is not None else 1.0
            return ml * density
        if unit == IngredientUnit.TSP:
            ml = float(amount) * _TSP_TO_ML
            density = self.density_g_per_ml if self.density_g_per_ml is not None else 1.0
            return ml * density
        if unit == IngredientUnit.CUP:
            ml = float(amount) * _CUP_TO_ML
            density = self.density_g_per_ml if self.density_g_per_ml is not None else 1.0
            return ml * density
        if unit == IngredientUnit.OZ:
            # oz as weight -> convert to grams (1 oz = 28.3495 g)
            return float(amount) * 28.349523125
        if unit == IngredientUnit.UNIT:
            if self.grams_per_unit is None:
                raise ValueError("grams_per_unit required to convert 'unit' to grams for this ingredient")
            return float(amount) * float(self.grams_per_unit)
        raise ValueError(f"Unsupported unit: {unit}")

    def calories_for(self, amount: float, unit: IngredientUnit) -> Optional[float]:
        """
        Return calories for given amount+unit. Returns None if kcal_per_100g not set.
        """
        if self.kcal_per_100g is None:
            return None
        grams = self.amount_to_grams(amount, unit)
        return float(self.kcal_per_100g) * (grams / 100.0)

class RecipeIngredient(CalorIAModel):
    """
    Link used inside recipes/meals:
      - ingredient_id (or whole ingredient object)
      - amount + unit
      - computed calories/protein/etc (optional cached fields)
    """
    ingredient_id: Optional[UUID] = None
    ingredient: Optional[Ingredient] = None   # convenience: include full object if available
    amount: float = 1.0
    unit: IngredientUnit = IngredientUnit.G
    notes: Optional[str] = None

    def calories(self) -> Optional[float]:
        if self.ingredient is None:
            return None
        return self.ingredient.calories_for(self.amount, self.unit)