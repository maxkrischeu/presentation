import sys,tempfile,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from assets import scan
class MediaFoldersTest(unittest.TestCase):
    def test_project_and_lesson(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            for name in ['shared/a.svg','lesson/assets/b.gif','assets/c.png']:
                p=root/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text('test')
            source=root/'lesson/test.qmd'
            items=scan(root,source,folders=['shared','shared'])
            self.assertEqual([(i['scope'],i['src']) for i in items],[('global','../shared/a.svg'),('lesson','assets/b.gif')])
            self.assertEqual(len(scan(root,source)),2)
            self.assertEqual(len(scan(root,source,folders=[])),1)
            with self.assertRaises(ValueError):scan(root,source,folders=['../outside'])
if __name__=='__main__':unittest.main()
