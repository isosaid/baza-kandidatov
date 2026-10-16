#!/usr/bin/env python3
# Генератор тестовых резюме (PDF / DOCX / TXT) + эталонные значения
import json, os, re, shutil
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from docx import Document

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, "test_resumes")
STAGE = os.path.join(BASE, "stage")
shutil.rmtree(OUT, ignore_errors=True)
shutil.rmtree(STAGE, ignore_errors=True)
os.makedirs(OUT, exist_ok=True)
os.makedirs(STAGE, exist_ok=True)

pdfmetrics.registerFont(TTFont("DJ", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"))
pdfmetrics.registerFont(TTFont("DJB", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"))


def make_pdf(path, lines):
    c = canvas.Canvas(path, pagesize=A4)
    y = 280 * mm
    for ln in lines:
        bold = ln.startswith("**")
        txt = ln.replace("**", "")
        c.setFont("DJB" if bold else "DJ", 13 if bold else 10)
        if y < 20 * mm:
            c.showPage()
            y = 280 * mm
        c.drawString(20 * mm, y, txt)
        y -= (7 * mm if bold else 5 * mm)
    c.save()


def make_docx(path, lines):
    d = Document()
    for ln in lines:
        if ln.startswith("**"):
            d.add_heading(ln.replace("**", ""), level=1)
        else:
            d.add_paragraph(ln)
    d.save(path)


R = []

# ---------- 1. Бухгалтер, классическое русское резюме, PDF ----------
R.append(dict(
    f="Rahimova_Firuza.pdf", kind="pdf", folder="Бухгалтер",
    truth=dict(name="Рахимова Фируза Саидовна", phone="+992931234567",
               email="f.rahimova@mail.ru", city="Душанбе", birth=1988, exp=10.0, edu=4,
               skills=["1С", "MS Excel", "Бухгалтерский учёт", "Налоговый учёт", "Первичная документация",
                       "Отчётность", "Банк-клиент", "Касса"],
               langs=["таджикский", "русский", "английский"]),
    lines=[
        "**РЕЗЮМЕ",
        "Рахимова Фируза Саидовна",
        "Дата рождения: 14.05.1988",
        "Город: Душанбе",
        "Телефон: +992 93 123 45 67",
        "E-mail: f.rahimova@mail.ru",
        "",
        "**Желаемая должность: Главный бухгалтер",
        "",
        "**ОБРАЗОВАНИЕ",
        "2005-2010, Таджикский государственный университет коммерции,",
        "высшее, специальность «Бухгалтерский учёт, анализ и аудит»",
        "",
        "**ОПЫТ РАБОТЫ",
        "01.2015 - 01.2020, ООО «Сомон Трейд», бухгалтер",
        " - ведение первичной документации, банк-клиент, касса",
        " - подготовка налоговой отчётности",
        "02.2020 - 02.2025, ОАО «Нурафшон», главный бухгалтер",
        " - полный цикл бухгалтерского учёта, налоговый учёт",
        " - сдача отчётности в налоговые органы",
        "",
        "**КЛЮЧЕВЫЕ НАВЫКИ",
        "1С:Предприятие, MS Excel, бухгалтерский учёт, налоговый учёт,",
        "первичная документация, отчётность, банк-клиент, касса",
        "",
        "**ЯЗЫКИ",
        "Таджикский - родной, Русский - свободно, Английский - базовый",
    ]))

# ---------- 2. Ҳисобдор, таджикское резюме, PDF ----------
R.append(dict(
    f="Qurbonov_Dilshod.pdf", kind="pdf", folder="Материальный бухгалтер",
    truth=dict(name="Қурбонов Дилшод Раҳимович", phone="+992927778899",
               email="dilshod.q@gmail.com", city="Худжанд", birth=1990, exp=8.0, edu=4,
               skills=["1С", "MS Excel", "Склад", "Бухгалтерский учёт"],
               langs=["таджикский", "русский", "узбекский"]),
    lines=[
        "**ТАРҶУМАИ ҲОЛ",
        "Қурбонов Дилшод Раҳимович",
        "Соли таваллуд: 1990",
        "Шаҳр: Хуҷанд",
        "Телефон: +992 92 777 88 99",
        "Почта: dilshod.q@gmail.com",
        "",
        "**Вазифа: Ҳисобдори молӣ",
        "",
        "**МАЪЛУМОТ",
        "Донишгоҳи давлатии Хуҷанд, маълумоти олӣ, ихтисоси иқтисодшиносӣ",
        "",
        "**ТАҶРИБАИ КОР",
        "2016 - 2020, ҶДММ «Ориён», ҳисобдор",
        "2021 - 2025, ҶДММ «Баракат», ҳисобдори молӣ, баҳисобгирии муҳосибӣ",
        " - анбор ва баҳисобгирии мол",
        "",
        "**МАЛАКАҲО",
        "1С, MS Excel, складской учёт, баҳисобгирии муҳосибӣ",
        "",
        "**ЗАБОНҲО",
        "Тоҷикӣ, русӣ, ӯзбекӣ",
    ]))

# ---------- 3. Графический дизайнер, DOCX, опыт указан словами ----------
R.append(dict(
    f="Soliev_Jamshed.docx", kind="docx", folder="Графический дизайнер",
    truth=dict(name="Солиев Джамшед Икромович", phone="+992985551122",
               email="jamshed.design@inbox.ru", city="Бохтар", birth=1994, exp=6.0, edu=2,
               skills=["Photoshop", "Illustrator", "CorelDRAW", "Графический дизайн", "Figma"],
               langs=["таджикский", "русский"]),
    lines=[
        "**Резюме",
        "ФИО: Солиев Джамшед Икромович",
        "Возраст: 32 года",
        "Город проживания: Бохтар",
        "Моб.: +992 98 555 11 22",
        "Почта: jamshed.design@inbox.ru",
        "Должность: Графический дизайнер",
        "Опыт работы: 6 лет",
        "**Образование",
        "Колледж искусств, среднее специальное, 2012-2015",
        "**Опыт",
        "2020 - 2023, рекламное агентство «Рангин», дизайнер",
        "**Навыки",
        "Adobe Photoshop, Adobe Illustrator, CorelDRAW, Figma, графический дизайн",
        "**Языки",
        "Таджикский, русский",
    ]))

# ---------- 4. Юрист, DOCX, даты словами ----------
R.append(dict(
    f="Nazarova_Zarina.docx", kind="docx", folder="Юрист",
    truth=dict(name="Назарова Зарина Фаррухевна", phone="+992918345678",
               email="z.nazarova@yandex.ru", city="Душанбе", birth=1986, exp=7.8, edu=4,
               skills=["Юриспруденция", "Договорная работа", "Трудовой кодекс", "Деловая переписка", "MS Word"],
               langs=["таджикский", "русский", "английский"]),
    lines=[
        "**Назарова Зарина Фаррухевна",
        "Дата рождения: 02.11.1986",
        "Душанбе",
        "918-34-56-78",
        "z.nazarova@yandex.ru",
        "**Цель: должность юрисконсульта",
        "**Образование",
        "Таджикский национальный университет, юридический факультет, высшее, 2004-2009",
        "**Опыт работы",
        "май 2017 — апрель 2021, ЗАО «Фароз», юрист",
        "договорная работа, претензионная работа, трудовой кодекс РТ",
        "май 2021 — апрель 2025, ООО «Авесто Строй», ведущий юрисконсульт",
        "правовое сопровождение, договоры, деловая переписка",
        "**Навыки",
        "Договорная работа, трудовой кодекс, деловая переписка, MS Word",
        "**Языки: таджикский, русский, английский (B2)",
    ]))

# ---------- 5. Менеджер проекта, PDF, опыт только из дат ----------
R.append(dict(
    f="Sharipov_Behruz.pdf", kind="pdf", folder="Менеджер проекта",
    truth=dict(name="Шарипов Бехруз Насимович", phone="+992907654321",
               email="b.sharipov@gmail.com", city="Куляб", birth=1992, exp=4.0, edu=4,
               skills=["Проектное управление", "MS Excel", "CRM", "Переговоры"],
               langs=["таджикский", "русский", "английский"]),
    lines=[
        "**Шарипов Бехруз Насимович",
        "Дата рождения: 23.07.1992",
        "г. Куляб",
        "Тел.: +992 90 765 43 21",
        "b.sharipov@gmail.com",
        "**Образование",
        "Российско-Таджикский славянский университет, высшее, менеджмент",
        "**Опыт работы",
        "06.2019 - 06.2023, ООО «Пайванд Групп», менеджер проекта",
        "управление проектами, работа с подрядчиками, переговоры",
        "внедрение Битрикс24 в подразделениях",
        "**Навыки",
        "Управление проектами, MS Excel, Битрикс24, переговоры",
        "**Языки: таджикский, русский, английский",
    ]))

# ---------- 6. Офис-менеджер, PDF, минимум данных ----------
R.append(dict(
    f="Hakimova_Nilufar.pdf", kind="pdf", folder="Офис менеджер",
    truth=dict(name="Хакимова Нилуфар", phone="+992937001122",
               email=None, city="Душанбе", birth=None, exp=None, edu=2,
               skills=["MS Word", "MS Excel", "Делопроизводство"],
               langs=["таджикский", "русский"]),
    lines=[
        "**Хакимова Нилуфар",
        "Душанбе, тел. 937-00-11-22",
        "Ищу работу офис-менеджера",
        "Образование: колледж, среднее специальное",
        "Владею: MS Word, MS Excel, делопроизводство",
        "Языки: таджикский, русский",
    ]))

# ---------- 7. Специалист AML, DOCX, англоязычные термины ----------
R.append(dict(
    f="Mirzoev_Sorbon.docx", kind="docx", folder="Специалист AML",
    truth=dict(name="Мирзоев Сорбон Акбарович", phone="+992935009988",
               email="s.mirzoev@orionbank.tj", city="Душанбе", birth=1989, exp=8.0, edu=4,
               skills=["AML", "Внутренний аудит", "MS Excel", "Финансовый анализ", "Отчётность"],
               langs=["таджикский", "русский", "английский"]),
    lines=[
        "**Мирзоев Сорбон Акбарович",
        "Дата рождения: 30.01.1989",
        "Город: Душанбе",
        "Телефон: +992 93 500 99 88",
        "E-mail: s.mirzoev@orionbank.tj",
        "**Желаемая должность: Специалист AML / комплаенс",
        "Опыт работы более 8 лет в банковском секторе",
        "**Образование",
        "Таджикский национальный университет, высшее, финансы и кредит",
        "MBA, Банковская академия, 2018",
        "**Опыт",
        "2017 - 2021, ОАО «Ориёнбанк», специалист отдела комплаенс",
        "AML / ПОД-ФТ процедуры, внутренний аудит",
        "2021 - 2025, ЗАО «Банк Эсхата», ведущий специалист AML",
        "финансовый анализ операций, отчётность в Нацбанк",
        "**Навыки",
        "AML, compliance, внутренний аудит, финансовый анализ, MS Excel, отчётность",
        "**Языки: таджикский, русский, английский (upper-intermediate)",
    ]))

# ---------- 8. Скан без текстового слоя ----------
def make_scan(path):
    c = canvas.Canvas(path, pagesize=A4)
    c.setFillColorRGB(0.92, 0.92, 0.92)
    c.rect(20 * mm, 60 * mm, 170 * mm, 210 * mm, fill=1, stroke=0)
    c.setFillColorRGB(0.6, 0.6, 0.6)
    for i in range(18):
        c.rect(30 * mm, (250 - i * 10) * mm, (40 + (i * 13) % 110) * mm, 3 * mm, fill=1, stroke=0)
    c.save()


R.append(dict(f="skan_rezume_001.pdf", kind="scan", folder="Другие",
              truth=dict(scan=True), lines=[]))

# ---------- 9. TXT, неоконченное высшее ----------
R.append(dict(
    f="Odinaev_Firdavs.txt", kind="txt", folder="Специалист финансовых работ",
    truth=dict(name="Одинаев Фирдавс Шарифович", phone="+992988112233",
               email="firdavs.o@mail.ru", city="Истаравшан", birth=1999, exp=10.0, edu=3,
               skills=["MS Excel", "Финансовый анализ", "Бюджетирование", "SQL", "Отчётность"],
               langs=["таджикский", "русский", "английский"]),
    lines=[
        "Одинаев Фирдавс Шарифович",
        "Дата рождения: 10.03.1999",
        "Город: Истаравшан",
        "Телефон: +992 98 811 22 33",
        "E-mail: firdavs.o@mail.ru",
        "",
        "Образование: неоконченное высшее, Таджикский национальный университет, 4 курс",
        "",
        "Опыт работы:",
        "2014 - 2024, ООО «Фарход Инвест», финансовый аналитик",
        "финансовый анализ, бюджетирование, отчётность",
        "",
        "Навыки: MS Excel, финансовый анализ, бюджетирование, SQL",
        "Языки: таджикский, русский, английский",
    ]))

# ---------- 10. PDF, ФИО только в имени файла ----------
R.append(dict(
    f="Юсупова Мадина Рустамовна.pdf", kind="pdf", folder="Дизайнер",
    truth=dict(name="Юсупова Мадина Рустамовна", phone="+992917445566",
               email="madina.y@list.ru", city="Душанбе", birth=None, exp=3.0, edu=4,
               skills=["Figma", "Photoshop", "Веб-разработка"],
               langs=["русский", "английский"]),
    lines=[
        "**АНКЕТА СОИСКАТЕЛЯ",
        "Контактный телефон: +992 91 744 55 66",
        "Электронная почта: madina.y@list.ru",
        "Место проживания: город Душанбе",
        "Образование высшее, дизайн среды",
        "**Опыт работы",
        "01.2022 - 01.2025, студия «Нигора», UI-дизайнер",
        "**Профессиональные навыки",
        "Figma, Photoshop, вёрстка HTML / CSS",
        "**Владение языками: русский, английский",
    ]))

meta = []
for r in R:
    folder = os.path.join(OUT, r["folder"])
    os.makedirs(folder, exist_ok=True)
    path = os.path.join(folder, r["f"])
    if r["kind"] == "pdf":
        make_pdf(path, r["lines"])
    elif r["kind"] == "docx":
        make_docx(path, r["lines"])
    elif r["kind"] == "scan":
        make_scan(path)
    else:
        open(path, "w", encoding="utf-8").write("\n".join(r["lines"]))
    meta.append(dict(file=r["f"], folder=r["folder"], path=path, truth=r["truth"]))

# Playwright не передаёт файлы по путям с кириллицей, поэтому для прогона
# кладём ASCII-копии в stage/ и запоминаем соответствие имён.
TR = {"а":"a","б":"b","в":"v","г":"g","д":"d","е":"e","ж":"zh","з":"z","и":"i","й":"y","к":"k",
      "л":"l","м":"m","н":"n","о":"o","п":"p","р":"r","с":"s","т":"t","у":"u","ф":"f","х":"h",
      "ц":"c","ч":"ch","ш":"sh","щ":"sch","ы":"y","э":"e","ю":"yu","я":"ya","ь":"","ъ":""}


def translit(s):
    o = ""
    for ch in s:
        r = TR.get(ch.lower(), ch)
        o += r.upper() if (ch.isupper() and r) else r
    return re.sub(r"[^A-Za-z0-9._ -]", "_", o)


for m in meta:
    ascii_name = translit(m["file"])
    dst = os.path.join(STAGE, ascii_name)
    shutil.copy(m["path"], dst)
    m["stage"] = os.path.abspath(dst)
    m["stage_name"] = ascii_name
    if m["file"] != ascii_name:
        m["cyr_name_check"] = m["truth"].get("name")
        m["truth"]["name"] = os.path.splitext(ascii_name)[0].replace("_", " ")

json.dump(meta, open(os.path.join(BASE, "truth.json"), "w"), ensure_ascii=False, indent=1)
print(f"Создано резюме: {len(meta)}")
for m in meta:
    print(f"  {m['folder']:34s} {m['file']}  {os.path.getsize(m['path'])} b")
