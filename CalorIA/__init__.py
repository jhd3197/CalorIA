# CalorIA/__init__.py
from dotenv import load_dotenv

from CalorIA.mixins.tools import ToolsMixin

# Load environment variables from .env file
load_dotenv()

class Client(
    ToolsMixin,
):
  
    def __init__(self, **kwargs):
        super().__init__(**kwargs)