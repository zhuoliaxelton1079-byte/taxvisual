# -*- coding: utf-8 -*-
"""Extract verbatim statutory or regulatory text from a saved Cornell LII page,
as an HTML fragment for a tool's source-rules panel.

Usage:
    curl -sSL -A "Mozilla/5.0" https://www.law.cornell.edu/uscode/text/26/111 -o sec111.html
    python extract-statute.py sec111.html sec111_fragment.html

    curl -sSL -A "Mozilla/5.0" https://www.law.cornell.edu/cfr/text/26/1.111-1 -o reg1111.html
    python extract-statute.py reg1111.html reg1111_fragment.html

A third argument scopes a very long section to named top-level provisions:
    python extract-statute.py sec72.html sec72b_fragment.html "(b)"

The fragment replaces the contents of the <div class="statute"> block in the tool
page. Update the retrieval date in that panel at the same time.

Two source layouts are handled and detected automatically:
  * U.S. Code pages  - nested div.subsection / .paragraph / .subparagraph / .clause
                       carrying span.num, span.heading and span.chapeau
  * CFR pages        - div.div8 with a div.head and flat <p> paragraphs

Cornell's own markup (definition popups, topical links) is dropped; every word of
the text is kept exactly as served.
"""
import io, html, re, sys
from html.parser import HTMLParser

LEVELS = ('subsection', 'paragraph', 'subparagraph', 'clause', 'subclause', 'item')


class Node(object):
    def __init__(self, kind=None):
        self.kind = kind
        self.num = ''
        self.heading = ''
        self.text = []
        self.kids = []


class UscParser(HTMLParser):
    """U.S. Code layout: structure carried by nested divs."""

    def __init__(self):
        HTMLParser.__init__(self)
        self.root = Node('root')
        self.stack = [self.root]
        self.depth = []
        self.capture = None
        self.buf = []
        self.in_text_div = False
        self.text_div_depth = 0
        self.tagdepth = 0

    def _classes(self, attrs):
        return (dict(attrs).get('class') or '').split()

    def handle_starttag(self, tag, attrs):
        if tag == 'br':
            return
        self.tagdepth += 1
        cls = self._classes(attrs)

        if tag == 'div' and 'text' in cls and not self.in_text_div:
            self.in_text_div = True
            self.text_div_depth = self.tagdepth
            return
        if not self.in_text_div:
            return

        if tag == 'div':
            kind = next((c for c in cls if c in LEVELS), None)
            if kind:
                self._flush()
                n = Node(kind)
                self.stack[-1].kids.append(n)
                self.stack.append(n)
                self.depth.append(self.tagdepth)
                return
            if 'content' in cls:
                self._flush(); self.capture = 'text'; return
        if tag == 'span':
            if 'num' in cls:
                self._flush(); self.capture = 'num'; return
            if 'heading' in cls:
                self._flush(); self.capture = 'heading'; return
            if 'chapeau' in cls:
                self._flush(); self.capture = 'text'; return

    def handle_endtag(self, tag):
        if tag == 'br':
            return
        if self.in_text_div and self.tagdepth == self.text_div_depth and tag == 'div':
            self._flush()
            self.in_text_div = False
        elif self.in_text_div:
            if self.depth and self.tagdepth == self.depth[-1] and tag == 'div':
                self._flush()
                self.stack.pop()
                self.depth.pop()
            elif self.capture and tag in ('div', 'span'):
                self._flush()
        self.tagdepth -= 1

    def handle_data(self, data):
        if self.in_text_div and self.capture:
            self.buf.append(data)

    def handle_entityref(self, name):
        if self.in_text_div and self.capture:
            self.buf.append(html.unescape('&%s;' % name))

    def handle_charref(self, name):
        if self.in_text_div and self.capture:
            self.buf.append(html.unescape('&#%s;' % name))

    def _flush(self):
        if not self.capture:
            self.buf = []
            return
        s = re.sub(r'\s+', ' ', ''.join(self.buf)).strip()
        if s:
            node = self.stack[-1]
            if self.capture == 'num':
                node.num = s
            elif self.capture == 'heading':
                node.heading = s
            else:
                node.text.append(s)
        self.capture = None
        self.buf = []


class CfrParser(HTMLParser):
    """CFR layout: a div.head followed by flat <p> paragraphs. Each paragraph
    opens with its own designator in the text, so no structure to rebuild -
    every paragraph becomes one top-level node."""

    def __init__(self):
        HTMLParser.__init__(self)
        self.root = Node('root')
        self.in_p = False
        self.buf = []
        self.skip = 0

    def handle_starttag(self, tag, attrs):
        cls = (dict(attrs).get('class') or '').split()
        if 'note' in cls or 'source' in cls or 'authority' in cls:
            self.skip += 1
            return
        if self.skip:
            return
        if tag == 'p':
            self.in_p = True
            self.buf = []

    def handle_endtag(self, tag):
        if self.skip:
            if tag == 'div':
                self.skip = max(0, self.skip - 1)
            return
        if tag == 'p' and self.in_p:
            s = re.sub(r'\s+', ' ', ''.join(self.buf)).strip()
            if s:
                n = Node('paragraph')
                # split a leading designator, e.g. "(a) In general. ..."
                m = re.match(r'^(\((?:[a-z0-9ivx]+)\))\s*(.*)$', s)
                if m:
                    n.num, s = m.group(1), m.group(2)
                n.text.append(s)
                self.root.kids.append(n)
            self.in_p = False
            self.buf = []

    def handle_data(self, data):
        if self.in_p and not self.skip:
            self.buf.append(data)

    def handle_entityref(self, name):
        if self.in_p and not self.skip:
            self.buf.append(html.unescape('&%s;' % name))

    def handle_charref(self, name):
        if self.in_p and not self.skip:
            self.buf.append(html.unescape('&#%s;' % name))


def render(node, out, level=0):
    for kid in node.kids:
        pad = '  ' * (level + 5)
        out.append('%s<div class="lv lv-%d">' % (pad, level))
        head = []
        if kid.num:
            head.append('<span class="lv-n">%s</span>' % html.escape(kid.num))
        if kid.heading:
            head.append('<span class="lv-h">%s</span>' % html.escape(kid.heading))
        body = ' '.join(kid.text).strip()
        if body:
            head.append('<span class="lv-t">%s</span>' % html.escape(body))
        if head:
            out.append('%s  <p>%s</p>' % (pad, ' '.join(head)))
        if kid.kids:
            render(kid, out, level + 1)
        out.append('%s</div>' % pad)


def main():
    src, dest = sys.argv[1], sys.argv[2]
    # Optional 3rd arg: comma-separated top-level designators to keep, e.g. "(b)".
    # Some sections (26 U.S.C. 72 runs to 500 provisions, 156 KB) are far too long
    # to embed whole; scope them to the provision the tool actually models and say
    # so in the panel. This selects a provision, it never paraphrases one.
    keep = None
    if len(sys.argv) > 3:
        keep = set(x.strip() for x in sys.argv[3].split(',') if x.strip())
    raw = io.open(src, encoding='utf-8').read()

    i = raw.find('id="tab_default_1"')
    j = raw.find('id="tab_default_2"')
    body = raw[i:j if j > i else len(raw)]

    is_cfr = 'class="div8"' in body
    p = CfrParser() if is_cfr else UscParser()
    p.feed(body)

    if keep:
        p.root.kids = [k for k in p.root.kids if k.num in keep]
        if not p.root.kids:
            raise SystemExit('none of %s found at top level' % sorted(keep))

    out = []
    render(p.root, out)
    frag = '\n'.join(out)
    io.open(dest, 'w', encoding='utf-8', newline='').write(frag)

    def walk(n, d=0):
        for k in n.kids:
            print('  ' * d + (k.num or '-') + ' ' + (k.heading or '')[:56])
            walk(k, d + 1)

    print('layout: %s' % ('CFR' if is_cfr else 'U.S. Code'))
    walk(p.root)
    print('\nnodes: %d   fragment bytes: %d' % (len(re.findall(r'class="lv lv-', frag)), len(frag)))


if __name__ == '__main__':
    main()
