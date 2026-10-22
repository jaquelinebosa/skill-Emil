"""Monta operand/index.html a partir de fonte.html: CSS base da palestra Ducake, QR e retrato embutidos.
Uso: python3 montar.py <qr.svg> <retrato.txt (data URI)>"""
import sys, re, pathlib
aqui = pathlib.Path(__file__).parent
base = (aqui.parent / "index.html").read_text()
css = re.search(r"<style>\n(.*?)</style>", base, re.S).group(1)
qr = pathlib.Path(sys.argv[1]).read_text().strip()
retrato = pathlib.Path(sys.argv[2]).read_text().strip()
src = (aqui / "fonte.html").read_text()
out = src.replace("/*CSS_BASE*/", css).replace("__QR__", qr).replace("__RETRATO__", retrato)
(aqui / "index.html").write_text(out)
print(len(out))
