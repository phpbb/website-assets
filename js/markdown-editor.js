/**
 * Turns any textarea marked data-markdown-editor into an EasyMDE editor.
 *
 * The markup stays a plain textarea until this runs, so a visitor without
 * JavaScript still gets a working form — they just type Markdown by hand.
 *
 * Requires js/vendor/easymde.min.js and css/vendor/easymde.min.css to be loaded
 * first. Both are served from our own domain: EasyMDE's own CDN fetch for the
 * toolbar icon font is switched off, and css/markdown-editor.css labels the
 * toolbar buttons instead.
 *
 * Colour and underline: Markdown has neither, so the website keeps them as
 * <span class="text-…"> with a class from a fixed list, and renders only those
 * spans, and only when a span opens and closes inside one block without
 * crossing other formatting; one that does not is left off the page. The
 * textarea's data-markdown-styles attribute carries the list
 * (App\Form\Type\MarkdownEditorType), so the buttons offer exactly what the
 * site renders and this script keeps no copy of it. Without the attribute
 * there are no such buttons.
 *
 * So that a style an author adds also shows, no edit is made on trust. The
 * buttons work line by line, leave code, tables and other block syntax alone,
 * and try every edit first: the paragraph around the line is rendered with a
 * probe span and without it, and the edit is made only if the probe opens and
 * closes around properly nested content with no block inside, and taking it
 * out again gives back exactly the rendering the paragraph had without it.
 * When the selected part of a line does not pass, the whole line's text is
 * tried; when that does not pass either, the line is left as it is.
 */
(function () {
	'use strict';

	var CLOSE = '</span>';

	var PROBE = 'markdown-editor-probe';

	/** Tags a style span may not contain; the site's rule too. */
	var BLOCK_TAGS = ['p', 'li', 'ul', 'ol', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'div', 'hr', 'pre'];

	var VOID_TAGS = ['br', 'img', 'input', 'wbr'];

	/**
	 * List, heading and quote markers at the start of a line. A span has to
	 * start after them, or the line stops being a list item, heading or quote.
	 */
	var BLOCK_PREFIX = /^(\s*(?:(?:[*+-]|\d+[.)])\s+|#{1,6}\s+|>\s?)*)/;

	/** A code fence, after any quote or list markers. */
	var FENCE = /^\s*(`{3,}|~{3,})/;

	/** A link reference definition. */
	var REFERENCE = /^ {0,3}\[[^\]]+\]:/;

	/** Lines whose syntax a span would break, styled or not. */
	var UNTOUCHABLE_LINE = [
		FENCE,
		/^ {0,3}([-*_])( *\1){2,} *$/,	// thematic break
		/^ {0,3}(=+|-+) *$/,		// setext heading underline
		REFERENCE
	];

	var SPAN_TAG = /<span class="([^"<>]*)">|<\/span>/g;

	/** Emphasis and code markers a selection may sit just inside of. */
	var MARKERS = '*_~`';

	function escapeHtml(text) {
		return String(text).replace(/[&<>"']/g, function (character) {
			return '&#' + character.charCodeAt(0) + ';';
		});
	}

	function openTag(className) {
		return '<span class="' + className + '">';
	}

	function comparePositions(a, b) {
		return a.line === b.line ? a.ch - b.ch : a.line - b.line;
	}

	function isBlank(text) {
		return /^\s*$/.test(text);
	}

	function withoutPrefix(text) {
		return text.slice(text.match(BLOCK_PREFIX)[1].length);
	}

	/**
	 * Markdown rendered by EasyMDE's own renderer: the raw HTML marked wrote,
	 * captured before the browser could repair any bad nesting in it, and the
	 * result as a detached document, in which nothing runs and nothing loads.
	 */
	function render(editor, markdown) {
		var html = editor.markdown(markdown);

		return {
			raw: editor.markdownCapture.raw,
			body: new DOMParser().parseFromString(html, 'text/html').body
		};
	}

	/**
	 * Whether the probe span in marked's raw HTML closes around properly
	 * nested inline content: every tag opened inside it closes inside it, no
	 * block starts inside it, and it is not itself closed early.
	 */
	function probeNestsCleanly(raw) {
		var start = raw.indexOf(openTag(PROBE));

		if (start === -1) {
			return false;
		}

		var tag = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;
		var stack = [];
		var match;

		tag.lastIndex = start + openTag(PROBE).length;

		while ((match = tag.exec(raw)) !== null) {
			var name = match[2].toLowerCase();

			if (BLOCK_TAGS.indexOf(name) !== -1) {
				return false;
			}

			if (VOID_TAGS.indexOf(name) !== -1) {
				continue;
			}

			if (match[1] === '') {
				stack.push(name);
			} else if (stack.length === 0) {
				return name === 'span';
			} else if (stack.pop() !== name) {
				return false;
			}
		}

		return false;
	}

	/**
	 * The inline code spans of a paragraph as [start, end) offsets, by
	 * CommonMark's rule, which is the site's: a backtick run opens one, and
	 * the next run of exactly the same length closes it. A run with no such
	 * partner is plain text. A run after a backslash opens nothing.
	 */
	function codeSpans(text) {
		var runs = [];
		var spans = [];
		var match;
		var run = /`+/g;

		while ((match = run.exec(text)) !== null) {
			var backslashes = 0;

			for (var b = match.index - 1; b >= 0 && text.charAt(b) === '\\'; b--) {
				backslashes++;
			}

			runs.push({ index: match.index, length: match[0].length, escaped: backslashes % 2 === 1 });
		}

		for (var i = 0; i < runs.length; i++) {
			if (runs[i].escaped) {
				continue;
			}

			for (var j = i + 1; j < runs.length; j++) {
				if (runs[j].length === runs[i].length) {
					spans.push([runs[i].index, runs[j].index + runs[j].length]);
					i = j;
					break;
				}
			}
		}

		return spans;
	}

	/**
	 * How many unescaped "[" are still open at a position in a text.
	 */
	function bracketDepth(text, position) {
		var depth = 0;

		for (var i = 0; i < position; i++) {
			var character = text.charAt(i);

			if (character === '\\') {
				i++;
			} else if (character === '[') {
				depth++;
			} else if (character === ']' && depth > 0) {
				depth--;
			}
		}

		return depth;
	}

	/**
	 * Whether every span tag in a text, of any class, has its partner in it.
	 */
	function spanTagsBalance(text) {
		var depth = 0;
		var match;

		SPAN_TAG.lastIndex = 0;

		while ((match = SPAN_TAG.exec(text)) !== null) {
			depth += match[1] !== undefined ? 1 : -1;

			if (depth < 0) {
				return false;
			}
		}

		return depth === 0;
	}

	/**
	 * The paragraph a line belongs to, from the blank line before it to the
	 * blank line after, with the line replaced, and every link reference
	 * definition of the document after it, so links resolve as on the page.
	 */
	function paragraph(cm, context, line, text) {
		return paragraphParts(cm, line, text).text + context.references;
	}

	/**
	 * The paragraph around a line, with the line replaced, and where the line
	 * starts in it.
	 */
	function paragraphParts(cm, line, text) {
		var first = line;
		var last = line;

		// An indented paragraph continues the list item above it, across blank
		// lines; alone it would read as a code block.
		for (;;) {
			while (first > 0 && !isBlank(cm.getLine(first - 1))) {
				first--;
			}

			if (first === 0 || !/^( {2,}|\t)/.test(cm.getLine(first))) {
				break;
			}

			while (first > 0 && isBlank(cm.getLine(first - 1))) {
				first--;
			}

			if (first === 0) {
				break;
			}
		}

		while (last < cm.lineCount() - 1 && !isBlank(cm.getLine(last + 1))) {
			last++;
		}

		var lines = [];
		var offset = 0;

		for (var i = first; i <= last; i++) {
			if (i < line) {
				offset += cm.getLine(i).length + 1;
			}

			lines.push(i === line ? text : cm.getLine(i));
		}

		return { text: lines.join('\n'), offset: offset };
	}

	/**
	 * Whether wrapping body in a span, between before and after on one line,
	 * renders as intended and changes nothing else.
	 */
	function rendersCleanly(editor, context, line, before, body, after) {
		var cm = editor.codemirror;

		// The span's own closing tag has to be the one that closes it: a
		// body with span tags that do not pair up, such as an author's stray
		// "</span>", would close it early.
		if (!spanTagsBalance(body)) {
			return false;
		}

		// Neither edge may fall inside inline code, by the site's rule: the
		// two renderers can disagree on where odd code spans start and end.
		var parts = paragraphParts(cm, line, before + body + after);
		var start = parts.offset + before.length;
		var end = start + body.length;
		var spans = codeSpans(parts.text);

		// Nor split a run of backticks, which would change which runs pair up,
		// nor follow a backslash, which would escape the tag's "<".
		if ((parts.text.charAt(start - 1) === '`' && parts.text.charAt(start) === '`')
			|| (parts.text.charAt(end - 1) === '`' && parts.text.charAt(end) === '`')
			|| parts.text.charAt(start - 1) === '\\'
			|| parts.text.charAt(end - 1) === '\\'
		) {
			return false;
		}

		for (var s = 0; s < spans.length; s++) {
			if ((start > spans[s][0] && start < spans[s][1]) || (end > spans[s][0] && end < spans[s][1])) {
				return false;
			}
		}

		// Nor cross into or out of the brackets of a link or image: both edges
		// at the same bracket depth.
		if (bracketDepth(parts.text, start) !== bracketDepth(parts.text, end)) {
			return false;
		}

		var plain = render(editor, paragraph(cm, context, line, before + body + after));
		var probed = render(editor, paragraph(cm, context, line, before + openTag(PROBE) + body + CLOSE + after));

		if (!probeNestsCleanly(probed.raw)) {
			return false;
		}

		var span = probed.body.querySelector('span.' + PROBE);

		if (!span) {
			return false;
		}

		while (span.firstChild) {
			span.parentNode.insertBefore(span.firstChild, span);
		}

		span.parentNode.removeChild(span);

		return probed.body.innerHTML === plain.body.innerHTML;
	}

	/**
	 * Whether a line is code: part of a fenced or indented code block, in a
	 * quote or list item or not. EasyMDE's Markdown mode marks code as
	 * "comment"; quote and list markers are tokens of their own.
	 */
	function isCodeLine(cm, line) {
		var tokens = cm.getLineTokens(line);
		var code = false;

		for (var i = 0; i < tokens.length; i++) {
			var type = tokens[i].type || '';

			if (/^\s*$/.test(tokens[i].string) || (/\b(quote|list|formatting-quote|formatting-list)\b/.test(type) && !/\bcomment\b/.test(type))) {
				continue;
			}

			// Inline code is "comment" too, but has its backticks marked as
			// such: a line that is only `code` is still a paragraph.
			if (!/\bcomment\b/.test(type) || /\bformatting-code\b/.test(type)) {
				return false;
			}

			code = true;
		}

		return code;
	}

	/**
	 * Whether a line lies between the fences of a fenced code block.
	 */
	function isInsideFence(cm, line) {
		var open = null;

		for (var i = 0; i < line; i++) {
			var content = withoutPrefix(cm.getLine(i));
			var fence = content.match(/^\s{0,3}(`{3,}|~{3,})(.*)$/);

			if (!fence) {
				continue;
			}

			if (open === null) {
				// A backtick fence's info string may not hold backticks: a line
				// like ```x``` is inline code, not a fence.
				if (fence[1].charAt(0) !== '`' || fence[2].indexOf('`') === -1) {
					open = fence[1];
				}
			} else if (fence[1].charAt(0) === open.charAt(0) && fence[1].length >= open.length && /^\s*$/.test(fence[2])) {
				// Closed only by the same character, at least as many of it,
				// and nothing after.
				open = null;
			}
		}

		return open !== null;
	}

	function isUntouchable(cm, line) {
		var text = cm.getLine(line);
		var content = withoutPrefix(text);

		for (var i = 0; i < UNTOUCHABLE_LINE.length; i++) {
			if (UNTOUCHABLE_LINE[i].test(text) || UNTOUCHABLE_LINE[i].test(content)) {
				return true;
			}
		}

		// The URL or title of a reference definition, on a line of its own.
		if (line > 0 && REFERENCE.test(cm.getLine(line - 1)) && !isBlank(text)) {
			return true;
		}

		// A table row, with or without the leading pipe: an unescaped pipe
		// outside inline code. A table's rows only make sense together.
		if (/(^|[^\\])\|/.test(text.replace(/(`+)[^`]*?\1/g, ''))) {
			return true;
		}

		return isCodeLine(cm, line) || isInsideFence(cm, line);
	}

	/**
	 * Where the styleable text of a line ends: before trailing whitespace, a
	 * hard-break backslash, and a heading's closing hashes.
	 */
	function contentEnd(text) {
		var end = text.length;

		if (/^ {0,3}#{1,6}(\s|$)/.test(text)) {
			var closing = text.match(/\s+#+\s*$/);

			if (closing) {
				end = closing.index;
			}
		}

		while (end > 0 && /[\s\\]/.test(text.charAt(end - 1))) {
			end--;
		}

		return end;
	}

	/**
	 * Narrow [start, end) to styleable text: after block markers, before the
	 * content's end, without surrounding whitespace, and including emphasis
	 * or code markers it sits just inside of. Null when nothing is left.
	 */
	function trimmed(text, start, end) {
		var prefix = text.match(BLOCK_PREFIX)[1].length;
		var limit = contentEnd(text);

		start = Math.max(start, prefix);
		end = Math.min(end, limit);

		while (start < end && /\s/.test(text.charAt(start))) {
			start++;
		}

		while (end > start && /\s/.test(text.charAt(end - 1))) {
			end--;
		}

		while (start > prefix && end < limit
			&& text.charAt(start - 1) === text.charAt(end)
			&& MARKERS.indexOf(text.charAt(end)) !== -1
		) {
			start--;
			end++;
		}

		return start < end ? { start: start, end: end } : null;
	}

	/**
	 * The spans in a text whose class passes the test, paired with their
	 * closing tags, as [[openIndex, openLength], [closeIndex, closeLength]].
	 */
	function spanPairs(text, isTarget) {
		var stack = [];
		var pairs = [];
		var match;

		SPAN_TAG.lastIndex = 0;

		while ((match = SPAN_TAG.exec(text)) !== null) {
			if (match[1] !== undefined) {
				stack.push({ index: match.index, length: match[0].length, target: isTarget(match[1]) });
			} else if (stack.length > 0) {
				var opening = stack.pop();

				if (opening.target) {
					pairs.push([[opening.index, opening.length], [match.index, match[0].length]]);
				}
			}
		}

		return pairs;
	}

	/**
	 * Delete tags from a line, rightmost first, one small deletion each, so
	 * no selection bookmark ever sits inside a replaced range.
	 *
	 * @return {number} How many characters went before position limit.
	 */
	function deleteTags(cm, line, cuts, limit) {
		var removed = 0;

		cuts.sort(function (a, b) {
			return b[0] - a[0];
		});

		for (var i = 0; i < cuts.length; i++) {
			cm.replaceRange('', { line: line, ch: cuts[i][0] }, { line: line, ch: cuts[i][0] + cuts[i][1] });

			if (cuts[i][0] < limit) {
				removed += cuts[i][1];
			}
		}

		return removed;
	}

	/**
	 * Try to wrap [start, end) of a line; true when the edit was made.
	 */
	function tryWrap(editor, context, line, start, end, className, removeFirst) {
		var cm = editor.codemirror;
		var text = cm.getLine(line);
		var body = text.slice(start, end);
		var cuts = [];

		if (removeFirst) {
			spanPairs(body, removeFirst).forEach(function (pair) {
				cuts.push([start + pair[0][0], pair[0][1]], [start + pair[1][0], pair[1][1]]);
			});

			cuts.slice().sort(function (a, b) {
				return b[0] - a[0];
			}).forEach(function (cut) {
				body = body.slice(0, cut[0] - start) + body.slice(cut[0] - start + cut[1]);
			});
		}

		if (!rendersCleanly(editor, context, line, text.slice(0, start), body, text.slice(end))) {
			return false;
		}

		end -= deleteTags(cm, line, cuts, end);

		// Two insertions rather than one replacement.
		cm.replaceRange(CLOSE, { line: line, ch: end });
		cm.replaceRange(openTag(className), { line: line, ch: start });

		return true;
	}

	/**
	 * Style one line's parts of the selections, rightmost first so the
	 * positions of the others stay put. A part with nothing selected gets a
	 * bookmark inside the empty pair when one went in there.
	 */
	function wrapLine(editor, context, line, parts, className, removeFirst) {
		var cm = editor.codemirror;

		if (isUntouchable(cm, line)) {
			return;
		}

		for (var i = 0; i < parts.length; i++) {
			var part = parts[i];
			var text = cm.getLine(line);

			if (part.empty) {
				// Nothing selected: an empty pair to type into, if one fits.
				if (isBlank(text)) {
					insertParagraph(cm, line, className, part);
				} else if (text.charAt(part.start - 1) !== '`' && text.charAt(part.start) !== '`'
					// Next to a backtick the two renderers can disagree on
					// whether the pair lands inside inline code.
					&& rendersCleanly(editor, context, line, text.slice(0, part.start), '', text.slice(part.start))
				) {
					cm.replaceRange(openTag(className) + CLOSE, { line: line, ch: part.start });
					part.inside = cm.setBookmark({ line: line, ch: part.start + openTag(className).length });
				}

				continue;
			}

			var piece = trimmed(text, part.start, part.end);

			if (piece === null || tryWrap(editor, context, line, piece.start, piece.end, className, removeFirst)) {
				continue;
			}

			// The selected part cuts through other formatting: the line's
			// whole text, once, instead of any other part of it.
			var whole = trimmed(text, 0, text.length);

			if (whole !== null) {
				tryWrap(editor, context, line, whole.start, whole.end, className, removeFirst);
			}

			return;
		}
	}

	/**
	 * Whether the nearest line with text in a direction (-1 up, 1 down) is
	 * part of a list or quote: marked, or indented under a list item.
	 */
	function continuesBlock(cm, line, direction) {
		for (var i = line + direction; i >= 0 && i < cm.lineCount(); i += direction) {
			var text = cm.getLine(i);

			if (!isBlank(text)) {
				return /^\s*(?:(?:[*+-]|\d+[.)])(?:\s|$)|>)/.test(text) || /^( {2,}|\t)/.test(text);
			}
		}

		return false;
	}

	/**
	 * An empty pair on a blank line, as a paragraph of its own: with a blank
	 * line added on either side that has text, it cannot join the paragraph
	 * before or after it.
	 */
	function insertParagraph(cm, line, className, part) {
		// Not between the items of a list or the lines of a quote: a paragraph
		// there would split it in two.
		if (isBlank(cm.getLine(line)) && (continuesBlock(cm, line, -1) || continuesBlock(cm, line, 1))) {
			return;
		}

		var before = line > 0 && !isBlank(cm.getLine(line - 1)) ? '\n' : '';
		var after = line < cm.lineCount() - 1 && !isBlank(cm.getLine(line + 1)) ? '\n' : '';

		cm.replaceRange(before + openTag(className) + CLOSE + after, { line: line, ch: 0 }, { line: line, ch: cm.getLine(line).length });
		part.inside = cm.setBookmark({ line: line + (before ? 1 : 0), ch: openTag(className).length });
	}

	/**
	 * Take spans off one line's parts: every pair with a tag in a part goes,
	 * both halves, except in code.
	 */
	function unwrapLine(editor, line, parts, isTarget) {
		var cm = editor.codemirror;

		if (isUntouchable(cm, line)) {
			return;
		}

		var text = cm.getLine(line);
		var code = [];
		var match;
		var inlineCode = /(`+)[^`]*?\1/g;

		while ((match = inlineCode.exec(text)) !== null) {
			code.push([match.index, match.index + match[0].length]);
		}

		var inCode = function (index) {
			return code.some(function (range) {
				return index >= range[0] && index < range[1];
			});
		};

		var inParts = function (index, length) {
			return parts.some(function (part) {
				return index < part.end && index + length > part.start;
			});
		};

		var cuts = [];

		spanPairs(text, isTarget).forEach(function (pair) {
			if (inCode(pair[0][0]) || inCode(pair[1][0])) {
				return;
			}

			if (inParts(pair[0][0], pair[0][1]) || inParts(pair[1][0], pair[1][1])) {
				cuts.push(pair[0], pair[1]);
			}
		});

		deleteTags(cm, line, cuts, 0);
	}

	/**
	 * The selections as ranges, widened over span tags right around them and
	 * merged where they overlap or touch.
	 */
	function mergedRanges(cm) {
		var list = cm.listSelections().map(function (selection) {
			var reversed = comparePositions(selection.anchor, selection.head) > 0;
			var range = takeInSurroundingTags(cm, {
				from: reversed ? selection.head : selection.anchor,
				to: reversed ? selection.anchor : selection.head
			});

			range.reversed = reversed;

			return range;
		}).sort(function (a, b) {
			return comparePositions(a.from, b.from);
		});

		var merged = [];

		list.forEach(function (range) {
			var last = merged[merged.length - 1];

			if (last && comparePositions(range.from, last.to) <= 0) {
				if (comparePositions(range.to, last.to) > 0) {
					last.to = range.to;
				}
			} else {
				merged.push(range);
			}
		});

		return merged;
	}

	/**
	 * Widen a range over span tags sitting right around it on its lines, so
	 * selecting just the styled words is enough to change or remove the style.
	 */
	function takeInSurroundingTags(cm, range) {
		var from = range.from;
		var to = range.to;
		var before = cm.getLine(from.line).slice(0, from.ch);
		var after = cm.getLine(to.line).slice(to.ch);

		for (;;) {
			var opening = before.match(/<span class="[^"<>]*">$/);
			var closing = after.match(/^<\/span>/);

			if (!opening || !closing) {
				break;
			}

			from = { line: from.line, ch: from.ch - opening[0].length };
			to = { line: to.line, ch: to.ch + closing[0].length };
			before = before.slice(0, before.length - opening[0].length);
			after = after.slice(closing[0].length);
		}

		return { from: from, to: to };
	}

	/**
	 * Every link reference definition in the document, to render paragraphs
	 * with, so reference links resolve as they do on the page.
	 */
	function references(cm) {
		var found = [];

		for (var i = 0; i < cm.lineCount(); i++) {
			if (REFERENCE.test(cm.getLine(i))) {
				found.push(cm.getLine(i));

				if (i + 1 < cm.lineCount() && !isBlank(cm.getLine(i + 1)) && !REFERENCE.test(cm.getLine(i + 1))) {
					found.push(cm.getLine(i + 1));
				}
			}
		}

		return found.length > 0 ? '\n\n' + found.join('\n') : '';
	}

	/**
	 * Run a line handler over every selection, grouped by line so parts of
	 * several selections on one line cannot trip over each other, and keep
	 * the selections around the text afterwards, so a second button acts on
	 * the same words.
	 */
	function eachLine(editor, handler) {
		var cm = editor.codemirror;

		cm.operation(function () {
			var context = { references: references(cm) };
			var lines = {};

			var marks = mergedRanges(cm).map(function (range) {
				var empty = comparePositions(range.from, range.to) === 0;
				var mark = {
					from: cm.setBookmark(range.from),
					to: cm.setBookmark(range.to, { insertLeft: true }),
					reversed: range.reversed,
					empty: empty,
					parts: []
				};

				for (var line = range.from.line; line <= range.to.line; line++) {
					var part = {
						start: line === range.from.line ? range.from.ch : 0,
						end: line === range.to.line ? range.to.ch : cm.getLine(line).length,
						empty: empty,
						inside: null
					};

					mark.parts.push(part);
					(lines[line] = lines[line] || []).push(part);
				}

				return mark;
			});

			Object.keys(lines).map(Number).sort(function (a, b) {
				return b - a;
			}).forEach(function (line) {
				handler(context, line, lines[line].sort(function (a, b) {
					return b.start - a.start;
				}));
			});

			var selections = [];

			marks.forEach(function (mark) {
				var from = mark.from.find();
				var to = mark.to.find();

				mark.from.clear();
				mark.to.clear();

				if (!from || !to) {
					return;
				}

				// An inserted empty pair: the cursor goes inside it.
				var inside = mark.empty && mark.parts[0].inside ? mark.parts[0].inside.find() : null;

				if (mark.empty && mark.parts[0].inside) {
					mark.parts[0].inside.clear();
				}

				if (inside) {
					from = to = inside;
				}

				selections.push(mark.reversed ? { anchor: to, head: from } : { anchor: from, head: to });
			});

			if (selections.length > 0) {
				cm.setSelections(selections);
			}
		});

		cm.focus();
	}

	/**
	 * The underline button, and the colour menu with one entry per colour the
	 * site renders plus one to take the colour off again.
	 */
	function styleButtons(styles) {
		var buttons = [];

		if (!styles) {
			return buttons;
		}

		if (styles.underline) {
			var isUnderline = function (className) {
				return className === styles.underline;
			};

			buttons.push({
				name: 'underline',
				className: 'fa fa-underline',
				title: 'Underline',
				action: function (editor) {
					var cm = editor.codemirror;

					// Pressed on underlined text: take the underline off.
					var underlined = mergedRanges(cm).some(function (range) {
						return cm.getRange(range.from, range.to).indexOf(openTag(styles.underline)) !== -1;
					});

					eachLine(editor, function (context, line, parts) {
						if (underlined) {
							unwrapLine(editor, line, parts, isUnderline);
						} else {
							wrapLine(editor, context, line, parts, styles.underline, isUnderline);
						}
					});
				}
			});
		}

		if (styles.colours && styles.colours.length > 0) {
			var colourClasses = styles.colours.map(function (colour) {
				return colour.class;
			});

			var isColour = function (className) {
				return colourClasses.indexOf(className) !== -1;
			};

			var children = styles.colours.map(function (colour) {
				return {
					name: 'colour-' + colour.class,
					title: colour.label,
					icon: '<i class="fa fa-font" style="color: ' + escapeHtml(colour.colour) + ';"></i> ' + escapeHtml(colour.label),
					action: function (editor) {
						eachLine(editor, function (context, line, parts) {
							// A new colour replaces the old one rather than nesting.
							wrapLine(editor, context, line, parts, colour.class, isColour);
						});
					}
				};
			});

			children.push({
				name: 'colour-none',
				title: 'Remove colour',
				icon: '<i class="fa fa-eraser"></i> Remove colour',
				action: function (editor) {
					eachLine(editor, function (context, line, parts) {
						unwrapLine(editor, line, parts, isColour);
					});
				}
			});

			buttons.push({
				name: 'colour',
				className: 'fa fa-font',
				title: 'Text colour',
				children: children
			});
		}

		return buttons;
	}

	function readStyles(textarea) {
		if (!textarea.dataset.markdownStyles) {
			return null;
		}

		try {
			return JSON.parse(textarea.dataset.markdownStyles);
		} catch (e) {
			return null;
		}
	}

	function enhance(textarea) {
		if (textarea.dataset.markdownEditorReady) {
			return;
		}

		textarea.dataset.markdownEditorReady = '1';

		var styles = readStyles(textarea);

		// marked's raw HTML, for the styling buttons' check: EasyMDE hands it
		// to the sanitizer before the browser can repair it. Nothing is
		// changed, so the preview is as before.
		var capture = { raw: '' };

		var editor = new EasyMDE({
			element: textarea,
			// The icon font is labelled by our own stylesheet; without this
			// EasyMDE injects a stylesheet from a third-party CDN.
			autoDownloadFontAwesome: false,
			// The browser's own spell checker does a better job than the
			// bundled one, and the bundled one fights with it.
			spellChecker: false,
			nativeSpellcheck: true,
			// Drafts belong in the form, not in the visitor's browser: a
			// half-finished KB article restored days later, into a different
			// article's form, is worse than losing it.
			autosave: { enabled: false },
			status: ['lines', 'words'],
			toolbar: ['bold', 'italic'].concat(styleButtons(styles), [
				'heading',
				'|',
				'quote', 'unordered-list', 'ordered-list',
				'|',
				'link', 'image', 'table', 'code',
				'|',
				'preview', 'side-by-side', 'fullscreen',
				'|',
				'guide'
			]),
			// Only with the button: bound on its own, the key would do nothing
			// and still take the place of CodeMirror's own binding.
			shortcuts: styles && styles.underline ? { underline: 'Cmd-U' } : {},
			renderingConfig: {
				sanitizerFunction: function (html) {
					capture.raw = html;

					return html;
				}
			},
			// EasyMDE's preview is client side and only approximate; the server
			// renders the article that finally gets published.
			previewClass: ['editor-preview', 'markdown-body']
		});

		editor.markdownCapture = capture;
	}

	function init() {
		if (typeof EasyMDE === 'undefined') {
			return;
		}

		var textareas = document.querySelectorAll('textarea[data-markdown-editor]');

		for (var i = 0; i < textareas.length; i++) {
			enhance(textareas[i]);
		}
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
