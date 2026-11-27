from pathlib import Path
import re
from docx import Document
from docx.shared import Cm, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.opc.constants import RELATIONSHIP_TYPE as RT

ROOT=Path('/Users/agustinpayaalamar/dev/Lumen/output/lumen-business-plan')
source=(ROOT/'.build/plan.md').read_text()
doc=Document()
sec=doc.sections[0]
sec.page_width=Cm(21);sec.page_height=Cm(29.7)
sec.top_margin=Cm(1.7);sec.bottom_margin=Cm(1.65)
sec.left_margin=Cm(1.85);sec.right_margin=Cm(1.85)
sec.footer_distance=Cm(.75)
for name in ['Normal','Title','Subtitle','Heading 1','Heading 2','Heading 3']:
 st=doc.styles[name];st.font.name='Calibri';st.font.color.rgb=RGBColor(0,0,0)
 st.paragraph_format.space_after=Pt(7)
normal=doc.styles['Normal'];normal.font.size=Pt(10.6)
normal.paragraph_format.line_spacing=1.07
normal.paragraph_format.widow_control=True
for name,size in [('Title',32),('Heading 1',21),('Heading 2',16),('Heading 3',12)]:
 st=doc.styles[name];st.font.size=Pt(size);st.font.bold=name!='Title'
 st.paragraph_format.space_before=Pt(9 if name=='Heading 3' else 0)
 st.paragraph_format.space_after=Pt(9)
 st.paragraph_format.keep_with_next=True
footer=sec.footer.paragraphs[0]
footer.alignment=WD_ALIGN_PARAGRAPH.RIGHT
r=footer.add_run('Lumen · Plan de negocio · ');r.font.size=Pt(8);r.font.color.rgb=RGBColor.from_string('555555')
fld=OxmlElement('w:fldSimple');fld.set(qn('w:instr'),'PAGE');footer._p.append(fld)

def rich(p,text):
 pattern=r'(\*\*.*?\*\*|\[[^\]]+\]\(https?://[^)]+\))'
 for token in re.split(pattern,text):
  if not token:continue
  if token.startswith('**'):
   p.add_run(token[2:-2]).bold=True
  elif re.match(r'\[[^\]]+\]\(https?://',token):
   m=re.match(r'\[([^\]]+)\]\(([^)]+)\)',token)
   rel=p.part.relate_to(m.group(2),RT.HYPERLINK,is_external=True)
   h=OxmlElement('w:hyperlink');h.set(qn('r:id'),rel)
   rr=OxmlElement('w:r');prop=OxmlElement('w:rPr')
   col=OxmlElement('w:color');col.set(qn('w:val'),'205B74');prop.append(col)
   und=OxmlElement('w:u');und.set(qn('w:val'),'single');prop.append(und)
   rr.append(prop);tt=OxmlElement('w:t');tt.text=m.group(1);rr.append(tt);h.append(rr);p._p.append(h)
  else:p.add_run(token)

def table(lines):
 rows=[[v.strip() for v in line.strip().strip('|').split('|')] for line in lines]
 rows=[r for r in rows if not all(re.fullmatch(r'[-: ]+',v) for v in r)]
 count=len(rows[0]);t=doc.add_table(rows=0,cols=count)
 t.alignment=WD_TABLE_ALIGNMENT.CENTER;t.autofit=False
 if count==2: widths=[5.0,12.3]
 elif count==3: widths=[4.5,6.1,6.7]
 else:widths=[5.3]+[4.0]*(count-1)
 # Fit exact printable width.
 widths=[v*17.3/sum(widths) for v in widths]
 for c,w in zip(t.columns,widths):c.width=Cm(w)
 borders=OxmlElement('w:tblBorders')
 for side in ['top','left','bottom','right','insideH','insideV']:
  e=OxmlElement('w:'+side);e.set(qn('w:val'),'single');e.set(qn('w:sz'),'4');e.set(qn('w:color'),'D9D9D9');borders.append(e)
 t._tbl.tblPr.append(borders)
 for idx,row in enumerate(rows):
  cells=t.add_row().cells
  trpr=t.rows[-1]._tr.get_or_add_trPr()
  no=OxmlElement('w:cantSplit');trpr.append(no)
  if idx==0:
   repeat=OxmlElement('w:tblHeader');trpr.append(repeat)
  for c,value,w in zip(cells,row,widths):
   c.width=Cm(w);c.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
   props=c._tc.get_or_add_tcPr();fill=OxmlElement('w:shd')
   fill.set(qn('w:fill'),'183E50' if idx==0 else ('F2F5F7' if idx%2==0 else 'FFFFFF'));props.append(fill)
   mar=OxmlElement('w:tcMar')
   for key,val in [('top','75'),('bottom','75'),('left','100'),('right','100')]:
    e=OxmlElement('w:'+key);e.set(qn('w:w'),val);e.set(qn('w:type'),'dxa');mar.append(e)
   props.append(mar)
   p=c.paragraphs[0];p.paragraph_format.space_after=Pt(0);p.paragraph_format.line_spacing=1.02
   rich(p,value)
   for r in p.runs:
    r.font.size=Pt(9.35)
    if idx==0:r.bold=True;r.font.color.rgb=RGBColor(255,255,255)
 p=doc.add_paragraph();p.paragraph_format.space_after=Pt(1);p.paragraph_format.space_before=Pt(0);p.paragraph_format.line_spacing=Pt(3);p.add_run().font.size=Pt(3)

lines=source.splitlines();i=0;first=True
while i<len(lines):
 line=lines[i].strip()
 if not line:i+=1;continue
 if line=='<!-- PAGE -->':doc.add_page_break();i+=1;continue
 if line.startswith('|'):
  block=[]
  while i<len(lines) and lines[i].lstrip().startswith('|'):block.append(lines[i]);i+=1
  table(block);continue
 if line.startswith('# '):
  doc.add_paragraph(line[2:],'Title' if first else 'Heading 1');first=False
 elif line.startswith('## '):doc.add_paragraph(line[3:],'Heading 2')
 elif line.startswith('### '):doc.add_paragraph(line[4:],'Heading 3')
 else:
  p=doc.add_paragraph();rich(p,line)
 i+=1
doc.core_properties.title='Lumen Plan de negocio y salida al mercado'
doc.core_properties.subject='Monetización y operación autónoma en el mercado español de bodas'
doc.core_properties.author=''
doc.core_properties.keywords='Lumen, bodas, monetización, validación, operación'
for tree in [doc.styles.element,doc.element]:
 for border in list(tree.iter(qn('w:pBdr'))):
  border.getparent().remove(border)
doc.save(ROOT/'Lumen_Plan_de_negocio.docx')
print(ROOT/'Lumen_Plan_de_negocio.docx')
