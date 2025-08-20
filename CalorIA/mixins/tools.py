
class ToolsMixin:
    """
    ToolsMixin
    """

    def file_get_contents(self, file_path):
        """Read the contents of a file and return it as a string."""
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read()