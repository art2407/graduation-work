"""Convert listings.md to listings.docx with proper code formatting."""

import re
from pathlib import Path
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.oxml.ns import qn
from docx.oxml import OxmlElement


def set_font(run, size=12, bold=False, italic=False, name='Times New Roman', color=None):
    run.font.name = name
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic
    if color:
        run.font.color.rgb = RGBColor(*color)
    rpr = run._r.get_or_add_rPr()
    for tag in [qn('w:rFonts')]:
        el = rpr.find(tag)
        if el is None:
            el = OxmlElement(tag)
            rpr.append(el)
        el.set(qn('w:ascii'), name)
        el.set(qn('w:hAnsi'), name)
        el.set(qn('w:cs'), name)


def add_heading(doc, text, level=1):
    para = doc.add_paragraph()
    pf = para.paragraph_format
    pf.alignment = WD_ALIGN_PARAGRAPH.LEFT
    pf.space_before = Pt(14 if level == 1 else 8)
    pf.space_after = Pt(6)
    pf.first_line_indent = Cm(0)
    pf.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
    run = para.add_run(text)
    set_font(run, size=14, bold=True)
    return para


def add_body(doc, text):
    para = doc.add_paragraph()
    pf = para.paragraph_format
    pf.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    pf.space_before = Pt(0)
    pf.space_after = Pt(0)
    pf.first_line_indent = Cm(1.25)
    pf.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
    run = para.add_run(text)
    set_font(run, size=14)
    return para


def add_code_line(doc, text):
    """Строка кода — Courier New, без отступа, серый фон через shading."""
    para = doc.add_paragraph()
    pf = para.paragraph_format
    pf.alignment = WD_ALIGN_PARAGRAPH.LEFT
    pf.space_before = Pt(0)
    pf.space_after = Pt(0)
    pf.first_line_indent = Cm(0)
    pf.left_indent = Cm(1.0)
    pf.line_spacing_rule = WD_LINE_SPACING.SINGLE

    # Серый фон абзаца
    pPr = para._p.get_or_add_pPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), 'F5F5F5')
    pPr.append(shd)

    run = para.add_run(text if text else ' ')
    set_font(run, size=10, name='Courier New', color=(50, 50, 50))
    return para


def add_code_block(doc, lines, caption=None):
    """Блок кода с рамкой (граница абзаца имитируется через первый/последний элемент)."""
    if caption:
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(6)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.first_line_indent = Cm(0)
        p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
        r = p.add_run(caption)
        set_font(r, size=11, italic=True, color=(100, 100, 100))

    for line in lines:
        add_code_line(doc, line)

    # Пустая строка после блока
    sp = doc.add_paragraph()
    sp.paragraph_format.space_before = Pt(0)
    sp.paragraph_format.space_after = Pt(4)


def build_doc(md_path: Path, out_path: Path):
    doc = Document()

    # Поля страницы по ГОСТ
    section = doc.sections[0]
    section.top_margin = Cm(2.0)
    section.bottom_margin = Cm(2.0)
    section.left_margin = Cm(3.0)
    section.right_margin = Cm(1.5)
    section.page_width = Cm(21.0)
    section.page_height = Cm(29.7)

    lines = md_path.read_text(encoding='utf-8').splitlines()

    in_code = False
    code_buf = []
    code_lang = ''
    pending_caption = None

    for line in lines:
        # Открытие блока кода
        if line.startswith('```'):
            if not in_code:
                in_code = True
                code_lang = line[3:].strip()
                code_buf = []
            else:
                # Закрытие блока
                in_code = False
                caption = None
                if code_lang:
                    lang_labels = {
                        'prisma': 'Prisma Schema',
                        'typescript': 'TypeScript',
                        'python': 'Python',
                        'sql': 'SQL',
                    }
                    label = lang_labels.get(code_lang.lower(), code_lang)
                    caption = f'[{label}]'
                if pending_caption:
                    caption = pending_caption
                    pending_caption = None
                add_code_block(doc, code_buf, caption)
                code_buf = []
                code_lang = ''
            continue

        if in_code:
            code_buf.append(line)
            continue

        stripped = line.strip()

        if not stripped:
            continue

        if stripped.startswith('---'):
            # Горизонтальный разделитель — пропускаем
            continue

        if stripped.startswith('# '):
            add_heading(doc, stripped[2:], level=1)
        elif stripped.startswith('## '):
            add_heading(doc, stripped[3:], level=2)
        elif stripped.startswith('### '):
            add_heading(doc, stripped[4:], level=3)
        else:
            add_body(doc, stripped)

    doc.save(str(out_path))
    print(f'Saved: {out_path}')


if __name__ == '__main__':
    base = Path(__file__).parent
    build_doc(base / 'listings.md', base / 'listings.docx')
