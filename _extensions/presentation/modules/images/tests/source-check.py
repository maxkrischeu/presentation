import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from source import save_layout, revision, headings

class SourceLayoutTest(unittest.TestCase):
    def test_new_media_roundtrip(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'test.qmd'
            path.write_text('## Media {#media}\n\n::: {.image src="assets/a.svg" position="free" x="10%" y="20%" width="30%"}\n:::\n\n::: {.image src="assets/inline.svg"}\n:::\n')
            items = [dict(asset='global:file:assets/movie.mp4', src='assets/movie.mp4', x=.1, y=.2, w=.3, h=.4)]
            result = save_layout(path, revision(path.read_bytes()), 1, 'media', items, 1)
            self.assertIn('.video src="assets/movie.mp4" position="free" x="10%" y="20%" width="30%"', path.read_text())
            self.assertIn('.image src="assets/inline.svg"', path.read_text())
            self.assertNotIn('assets/a.svg', path.read_text())
            save_layout(path, result['revision'], 1, 'media', items, 1)
            self.assertEqual(path.read_text().count('.video'), 1)

    def test_empty_headings_roundtrip(self):
        for heading in ['##', '## ', '  ##', '## ###']:
            with self.subTest(heading=heading), tempfile.TemporaryDirectory() as folder:
                path = Path(folder) / 'test.qmd'
                text = '## First\n\nText.\n\n' + heading + '\n\n::: {.task height="fill"}\nTask.\n:::\n'
                path.write_text(text)
                self.assertEqual(len(headings(text)), 2)
                items = [dict(asset='global:cloud', x=.1, y=.2, w=.3, h=.4)]
                result = save_layout(path, revision(path.read_bytes()), 2, 'section', items, 2)
                self.assertEqual(len(headings(path.read_text())), 2)
                self.assertIn('::: {.task height="fill"}', path.read_text())
                save_layout(path, result['revision'], 2, result['slide'], items, 2)
                self.assertEqual(path.read_text().count('.placed-image'), 1)

    def test_roundtrip_and_conflict(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'test.qmd'
            text = '---\ntitle: Test\n---\n\n## First {.foo}\n\nKeep **this**.\n\n```python\n# not a slide\n```\n\n## Second {#second}\n\nMore text.\n'
            path.write_text(text)
            items = [dict(asset='first:cloud', x=.1,y=.2,w=.3,h=.4)]
            result = save_layout(path,revision(path.read_bytes()),1,'first',items,2)
            self.assertTrue(result['slide'].startswith('slide-'))
            self.assertIn('.foo}',path.read_text())
            self.assertIn('Keep **this**.',path.read_text())
            self.assertEqual(path.with_suffix('.qmd.layout-backup').read_text(),text)
            saved = path.read_bytes()
            with self.assertRaisesRegex(ValueError,'Source changed'):
                save_layout(path,revision(text.encode()),1,'first',items,2)
            self.assertEqual(saved,path.read_bytes())
            result2 = save_layout(path,result['revision'],1,result['slide'],[],2)
            self.assertNotIn('.placed-image', path.read_text())
            self.assertEqual(result2['slide'],result['slide'])
            save_layout(path,result2['revision'],2,'second',[],2)
            self.assertIn('## Second {#second}',path.read_text())
    def test_title_and_windows_line_endings(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'test.qmd'
            path.write_bytes(b'---\r\ntitle: Test\r\n---\r\n\r\n## First\r\n')
            result=save_layout(path,revision(path.read_bytes()),0,'title-slide',[dict(asset='global:cloud',x=.1,y=.2,w=.25,h=.4)],1)
            self.assertIn(b'::: {.placed-image asset="cloud" x="10" y="20"}\r\n:::',path.read_bytes())
            self.assertNotIn(b'\n',path.read_bytes().replace(b'\r\n',b''))
            save_layout(path,result['revision'],1,'first',[],1)
            self.assertIn(b'{#slide-',path.read_bytes())

    def test_friendly_values_and_legacy_migration(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'test.qmd'
            path.write_text('## First {#first}\n\nText.\n\n```{.presentation-image-layout}\n{"version":1,"slide":"first","images":[]}\n```\n')
            items=[dict(asset='global:cloud',x=.3758646,y=.53,w=.25,h=.4,layer=0,rotation=-15)]
            result=save_layout(path,revision(path.read_bytes()),1,'first',items,1)
            text=path.read_text()
            self.assertIn('::: {.placed-image asset="cloud" x="37.59" y="53" layer="0" rotation="-15"}',text)
            self.assertNotIn('presentation-image-layout',text)
            self.assertNotIn('version',text)
            self.assertNotIn('width=',text)
            items[0].update(layer=1,rotation=0)
            save_layout(path,result['revision'],1,'first',items,1)
            self.assertNotIn('layer=',path.read_text())
            self.assertNotIn('rotation=',path.read_text())

    def test_code_examples_are_not_modified(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'test.qmd'
            sample='````markdown\n```{.image-layout}\n- asset: example\n```\n````\n'
            path.write_text('## First {#first}\n\n'+sample)
            save_layout(path,revision(path.read_bytes()),1,'first',[],1)
            self.assertIn(sample,path.read_text())
            self.assertEqual(path.read_text().count('.image-layout'),1)

    def test_reject_invalid_and_ambiguous(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'test.qmd';path.write_text('## Test\n')
            raw=path.read_bytes()
            for items,count in [([dict(asset='global:x',x=2,y=0,w=.2,h=.2)],1),([],2)]:
                with self.assertRaises(ValueError):save_layout(path,revision(raw),1,'test',items,count)
                self.assertEqual(path.read_bytes(),raw)

    def test_native_multiple_blocks_preserve_surrounding_content(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'test.qmd'
            example='```markdown\n::: {.placed-image asset="example"}\n:::\n```'
            path.write_text('## First {#first}\n\n::: {.placed-image asset="a"}\n:::\n\nKeep this.\n\n::: {.placed-image asset="b"}\n:::\n\n'+example+'\n\n## Other {#other}\n\n::: {.placed-image asset="other"}\n:::\n')
            items=[dict(asset='global:a',x=.1,y=.2,w=.3,h=.4,transparency=35),dict(asset='global:b',x=.3,y=.4,w=.25,h=.4)]
            save_layout(path,revision(path.read_bytes()),1,'first',items,2)
            text=path.read_text()
            self.assertIn('Keep this.',text)
            self.assertIn(example,text)
            self.assertIn('asset="other"',text)
            self.assertIn('transparency="35"',text)
            self.assertEqual(text.count('.placed-image'),4)
            save_layout(path,revision(path.read_bytes()),1,'first',[],2)
            self.assertEqual(path.read_text().count('.placed-image'),2)
            self.assertIn('Keep this.',path.read_text())

    def test_yaml_migration_and_safe_attributes(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'test.qmd'
            path.write_text('## First {#first}\n\n```{.image-layout}\n- asset: cloud\n```\n')
            save_layout(path,revision(path.read_bytes()),1,'first',[dict(asset='global:a "quoted" & b',x=.1,y=.2,w=.25,h=.4)],1)
            self.assertIn('asset="a &quot;quoted&quot; &amp; b"',path.read_text())
            self.assertNotIn('.image-layout',path.read_text())

    def test_nonempty_native_block_is_not_overwritten(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'test.qmd'
            path.write_text('## First {#first}\n\n::: {.placed-image asset="cloud"}\nDo not lose this!\n:::\n')
            raw=path.read_bytes()
            with self.assertRaisesRegex(ValueError,'must be empty'):
                save_layout(path,revision(raw),1,'first',[],1)
            self.assertEqual(path.read_bytes(),raw)

if __name__=='__main__':unittest.main()
