#!/usr/bin/env python3
"""
CalorIA CLI - Command Line Interface for the CalorIA application.

This CLI provides commands to manage the Flask backend and React frontend
of the CalorIA application.
"""

import click
import subprocess
import sys
import os
from pathlib import Path


def get_project_root():
    """Get the root directory of the project."""
    return Path(__file__).parent.parent


@click.group()
@click.version_option(version='1.0.0')
def cli():
    """CalorIA - Command Line Interface for managing the CalorIA application."""
    pass


@cli.command()
@click.option('--host', default='127.0.0.1', help='Host to bind to')
@click.option('--port', default=4032, help='Port to bind to')
@click.option('--debug', is_flag=True, help='Run in debug mode')
def backend(host, port, debug):
    """Start the Flask backend server."""
    click.echo("Building frontend first...")
    
    # Build frontend before starting backend
    project_root = get_project_root()
    frontend_dir = project_root / "CalorIA" / "frontend"
    package_json = frontend_dir / "package.json"
    
    if not package_json.exists():
        click.echo(f"Error: {package_json} not found!", err=True)
        sys.exit(1)
    
    # Change to frontend directory and build
    original_cwd = os.getcwd()
    os.chdir(frontend_dir)
    
    try:
        result = subprocess.run(['npm', 'run', 'build'], shell=True, check=True)
        click.echo("Frontend build completed successfully!")
    except subprocess.CalledProcessError as e:
        click.echo(f"❌ Error building React frontend: {e}", err=True)
        sys.exit(1)
    
    # Now start the Flask backend server
    click.echo("Starting Flask backend server...")
    
    backend_dir = project_root / "CalorIA" / "backend"
    app_file = backend_dir / "app.py"
    
    if not app_file.exists():
        click.echo(f"Error: {app_file} not found!", err=True)
        sys.exit(1)
    
    # Change to backend directory and run the Flask app directly
    os.chdir(backend_dir)
    
    env = os.environ.copy()
    if debug:
        env['FLASK_DEBUG'] = '1'
    
    try:
        subprocess.run([
            sys.executable, 'app.py',
            '--host', str(host),
            '--port', str(port)
        ], env=env, check=True)
    except subprocess.CalledProcessError as e:
        click.echo(f"Error running Flask backend: {e}", err=True)
        sys.exit(1)
    except KeyboardInterrupt:
        click.echo("\nBackend server stopped.")
    finally:
        os.chdir(original_cwd)


@cli.command()
@click.option('--port', default=3000, help='Port for the development server')
def frontend(port):
    """Start the React frontend development server."""
    click.echo("Starting React frontend development server...")
    
    project_root = get_project_root()
    frontend_dir = project_root / "CalorIA" / "frontend"
    package_json = frontend_dir / "package.json"
    
    if not package_json.exists():
        click.echo(f"Error: {package_json} not found!", err=True)
        sys.exit(1)
    
    # Change to frontend directory
    os.chdir(frontend_dir)
    
    # Set environment variable for port
    env = os.environ.copy()
    env['PORT'] = str(port)
    
    try:
        subprocess.run(['npm', 'start'], env=env, shell=True, check=True)
    except subprocess.CalledProcessError as e:
        click.echo(f"Error running React frontend: {e}", err=True)
        sys.exit(1)
    except KeyboardInterrupt:
        click.echo("\nFrontend development server stopped.")


@cli.command()
@click.option('--output-dir', default='build', help='Output directory for the build')
def build(output_dir):
    """Build the React frontend for production."""
    click.echo("Building React frontend for production...")
    
    project_root = get_project_root()
    frontend_dir = project_root / "CalorIA" / "frontend"
    package_json = frontend_dir / "package.json"
    
    if not package_json.exists():
        click.echo(f"Error: {package_json} not found!", err=True)
        sys.exit(1)
    
    # Change to frontend directory
    os.chdir(frontend_dir)
    
    # Set BUILD_PATH if different from default
    env = os.environ.copy()
    if output_dir != 'build':
        env['BUILD_PATH'] = output_dir
    
    try:
        result = subprocess.run(['npm', 'run', 'build'], env=env, shell=True, check=True)
        click.echo(f"Frontend build completed successfully!")
        click.echo(f"Build output location: {frontend_dir / output_dir}")
    except subprocess.CalledProcessError as e:
        click.echo(f"Error building React frontend: {e}", err=True)
        sys.exit(1)


@cli.command()
def seed():
    """Seed the database with sample data for testing and development."""
    try:
        # Import the seeding function from the CalorIA package
        from CalorIA.seed import seed_database
        
        # Run the seeding
        success = seed_database()
        
        if not success:
            sys.exit(1)
            
    except ImportError as e:
        click.echo(f"❌ Error importing seeding module: {e}", err=True)
        sys.exit(1)
    except KeyboardInterrupt:
        click.echo("\n Database seeding interrupted.")
        sys.exit(1)
    except Exception as e:
        click.echo(f"❌ Unexpected error during seeding: {e}", err=True)
        sys.exit(1)


@cli.command()
@click.option('--confirm', is_flag=True, help='Confirm deletion without prompting')
def unseed(confirm):
    """Remove all system-generated sample data from the database."""
    if not confirm:
        click.confirm('This will remove all system-generated ingredients and sample meals. Continue?', abort=True)
    
    try:
        # Import the removal function from the CalorIA package
        from CalorIA.seed import remove_seeded_data
        
        # Run the removal
        success = remove_seeded_data()
        
        if not success:
            sys.exit(1)
            
    except ImportError as e:
        click.echo(f"❌ Error importing seeding module: {e}", err=True)
        sys.exit(1)
    except KeyboardInterrupt:
        click.echo("\n Database cleanup interrupted.")
        sys.exit(1)
    except Exception as e:
        click.echo(f"❌ Unexpected error during cleanup: {e}", err=True)
        sys.exit(1)


@cli.command()
@click.option('--category', help='Specific category to research (if not provided, will show available categories)')
@click.option('--max-ingredients', default=20, help='Maximum number of ingredients to add')
@click.option('--letters', help='Comma-separated letters to research (e.g., "A,B,C") - if not provided, uses systematic approach')
@click.option('--dry-run', is_flag=True, help='Show what would be added without actually adding ingredients')
def research_ingredients(category, max_ingredients, letters, dry_run):
    """Research and add missing ingredients using AI for a specific category, organized by letter."""
    try:
        # Import the research function from the CalorIA package
        from CalorIA.research.ingredients import research_ingredients_command

        # Parse letters if provided
        letters_list = None
        if letters:
            letters_list = [letter.strip().upper() for letter in letters.split(',')]

        # Run the research with parameters
        research_ingredients_command(
            category=category,
            max_ingredients=max_ingredients,
            letters=letters_list,
            dry_run=dry_run
        )

    except ImportError as e:
        click.echo(f"❌ Error importing research module: {e}", err=True)
        click.echo("💡 Make sure the research dependencies are installed:")
        click.echo("   pip install openai requests")
        click.echo("   Set environment variables:")
        click.echo("   - For OpenAI: OPENAI_API_KEY and OPENAI_MODEL")
        click.echo("   - For Ollama: OLLAMA_BASE_URL and OLLAMA_MODEL")
        click.echo("   - Set AI_PROVIDER to 'openai' or 'ollama'")
        sys.exit(1)
    except KeyboardInterrupt:
        click.echo("\n Research interrupted.")
        sys.exit(1)
    except Exception as e:
        click.echo(f"❌ Unexpected error during research: {e}", err=True)
        sys.exit(1)


@cli.command()
@click.option('--category', help='Specific category to research (if not provided, will show available categories)')
@click.option('--max-recipes', default=10, help='Maximum number of recipes to add')
@click.option('--letters', help='Comma-separated letters to research (e.g., "A,B,C") - if not provided, uses systematic approach')
@click.option('--dry-run', is_flag=True, help='Show what would be added without actually adding recipes')
def research_recipes(category, max_recipes, letters, dry_run):
    """Research and add missing recipes using AI for a specific category, organized by letter."""
    try:
        # Import the research function from the CalorIA package
        from CalorIA.research.recipes import research_recipes_command

        # Parse letters if provided
        letters_list = None
        if letters:
            letters_list = [letter.strip().upper() for letter in letters.split(',')]

        # Run the research with parameters
        research_recipes_command(
            category=category,
            max_recipes=max_recipes,
            letters=letters_list,
            dry_run=dry_run
        )

    except ImportError as e:
        click.echo(f"❌ Error importing research module: {e}", err=True)
        click.echo("💡 Make sure the research dependencies are installed:")
        click.echo("   pip install openai requests")
        click.echo("   Set environment variables:")
        click.echo("   - For OpenAI: OPENAI_API_KEY and OPENAI_MODEL")
        click.echo("   - For Ollama: OLLAMA_BASE_URL and OLLAMA_MODEL")
        click.echo("   - Set AI_PROVIDER to 'openai' or 'ollama'")
        sys.exit(1)
    except KeyboardInterrupt:
        click.echo("\n Research interrupted.")
        sys.exit(1)
    except Exception as e:
        click.echo(f"❌ Unexpected error during research: {e}", err=True)
        sys.exit(1)


if __name__ == '__main__':
    cli()