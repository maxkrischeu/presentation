"""Contract tests for the dependency-free generated Quarto configuration."""
from pathlib import Path
import importlib.util
import unittest
spec=importlib.util.spec_from_file_location('builder',Path(__file__).resolve().parents[1]/'build.py')
builder=importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)

class BuildTest(unittest.TestCase):
    def test_empty_collections_are_not_yaml_null(self):
        self.assertEqual(builder.yaml({'engine': {'packages': [], 'options': {}}}),
                         'engine:\n  packages: []\n  options: {}')
    def test_language_conflicts_are_explicit(self):
        with self.assertRaisesRegex(ValueError,'Conflicting'):
            builder.merge_messages({'de':{'Close':'Schließen'}},{'de':{'Close':'Zu'}})
    def test_module_paths_cannot_escape_extension(self):
        with self.assertRaisesRegex(ValueError,'Invalid module resource'):
            builder.resource(builder.ROOT,'../../example.qmd')

unittest.main()
