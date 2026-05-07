"""Convert chapter2_updated.md to chapter2.docx with GOST-style formatting."""

import re
from pathlib import Path
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.style import WD_STYLE_TYPE
from docx.oxml.ns import qn
from docx.oxml import OxmlElement


def set_paragraph_format(para, first_line_indent=True, space_before=0, space_after=0,
                          line_spacing=None, alignment=WD_ALIGN_PARAGRAPH.JUSTIFY):
    pf = para.paragraph_format
    pf.alignment = alignment
    pf.space_before = Pt(space_before)
    pf.space_after = Pt(space_after)
    if first_line_indent:
        pf.first_line_indent = Cm(1.25)
    else:
        pf.first_line_indent = Cm(0)
    if line_spacing:
        from docx.shared import Pt as SPt
        from docx.enum.text import WD_LINE_SPACING
        pf.line_spacing_rule = WD_LINE_SPACING.EXACTLY
        pf.line_spacing = SPt(line_spacing)
    else:
        from docx.enum.text import WD_LINE_SPACING
        pf.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE


def set_run_font(run, size=14, bold=False, italic=False, name='Times New Roman'):
    run.font.name = name
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic
    # Set east-asian and complex script fonts too
    rpr = run._r.get_or_add_rPr()
    for tag in [qn('w:rFonts')]:
        el = rpr.find(tag)
        if el is None:
            el = OxmlElement(tag)
            rpr.append(el)
        el.set(qn('w:ascii'), name)
        el.set(qn('w:hAnsi'), name)
        el.set(qn('w:cs'), name)


def add_heading(doc, text, level):
    para = doc.add_paragraph()
    set_paragraph_format(para, first_line_indent=False,
                          space_before=12 if level == 2 else 6,
                          space_after=6,
                          alignment=WD_ALIGN_PARAGRAPH.LEFT)
    run = para.add_run(text)
    set_run_font(run, size=14, bold=True)
    return para


def add_body(doc, text):
    para = doc.add_paragraph()
    set_paragraph_format(para, first_line_indent=True, space_before=0, space_after=0)
    # Handle inline code (backticks)
    parts = re.split(r'`([^`]+)`', text)
    for i, part in enumerate(parts):
        if not part:
            continue
        run = para.add_run(part)
        if i % 2 == 1:  # inside backticks
            set_run_font(run, size=12, name='Courier New')
        else:
            set_run_font(run, size=14)
    return para


def add_bullet(doc, text):
    para = doc.add_paragraph()
    pf = para.paragraph_format
    pf.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    pf.space_before = Pt(0)
    pf.space_after = Pt(0)
    pf.left_indent = Cm(1.25)
    pf.first_line_indent = Cm(0)
    from docx.enum.text import WD_LINE_SPACING
    pf.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE

    run = para.add_run(text)
    set_run_font(run, size=14)
    return para


def build_doc(md_path: Path, out_path: Path):
    doc = Document()

    # Page margins (GOST: top/bottom 20mm, left 30mm, right 15mm)
    section = doc.sections[0]
    section.top_margin = Cm(2.0)
    section.bottom_margin = Cm(2.0)
    section.left_margin = Cm(3.0)
    section.right_margin = Cm(1.5)
    section.page_width = Cm(21.0)
    section.page_height = Cm(29.7)

    lines = md_path.read_text(encoding='utf-8').splitlines()

    for line in lines:
        stripped = line.strip()

        if not stripped:
            continue

        if stripped.startswith('---'):
            # horizontal rule — skip
            continue

        if stripped.startswith('# '):
            add_heading(doc, stripped[2:], level=1)
        elif stripped.startswith('## '):
            add_heading(doc, stripped[3:], level=2)
        elif stripped.startswith('### '):
            add_heading(doc, stripped[4:], level=3)
        elif stripped.startswith('– ') or stripped.startswith('- '):
            prefix = '– ' if stripped.startswith('– ') else '- '
            add_bullet(doc, stripped)
        else:
            add_body(doc, stripped)

    doc.save(str(out_path))
    print(f"Saved: {out_path}")


if __name__ == '__main__':
    base = Path(__file__).parent
    build_doc(base / 'chapter2_updated.md', base / 'chapter2.docx')
