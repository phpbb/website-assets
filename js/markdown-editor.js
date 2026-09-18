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
 * crossing other formatting. The textarea's data-markdown-styles attribute
 * carries the list (App\Form\Type\MarkdownEditorType), so the buttons offer
 * exactly what the site renders and this script keeps no copy of it. Without
 * the attribute there are no such buttons.
 *
 * A span the site cannot render shows on the page as HTML text, so no edit is
 * made on trust. The buttons work line by line, leave code, tables and other
 * block syntax alone, and try every edit first: the line is rendered with a
 * probe span and without it, and the edit is made only if the probe comes out
 * as an element directly inside its block and taking it out again gives back
 * exactly the rendering the line had without it. When the selected part of a
 * line does not pass, the whole line's text is tried; when that does not pass
 * either, the line is left as it is.
 */
(function () {
	'use strict';

	var CLOSE = '</span>';

	var PROBE = 'markdown-editor-probe';

	/** Elements a span may sit directly inside; the site's rule too. */
	var BLOCK_PARENTS = ['P', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'TD', 'TH'];

	/**
	 * List, heading and quote markers at the start of a line. A span has to
	 * start after them, or the line stops being a list item, heading or quote.
	 */
	var BLOCK_PREFIX = /^(\s*(?:(?:[*+-]|\d+[.)])\s+|#{1,6}\s+|>\s?)*)/;

	/** Lines whose syntax a span would break, styled or not. */
	var UNTOUCHABLE_LINE = [
		/^\s*(`{3,}|~{3,})/,		// code fence
		/^ {0,3}([-*_])( *\1){2,} *$/,	// thematic break
		/^ {0,3}(=+|-+) *$/,		// setext heading underline
		/^ {0,3}\[[^\]]+\]:/		// link reference definition
	];

	var SPAN_TAG = /<span class="([a-z-]+)">|<\/span>/g;

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

	function count(text, pattern) {
		return (text.match(pattern) || []).length;
	}

	function comparePositions(a, b) {
		return a.line === b.line ? a.ch - b.ch : a.line - b.line;
	}

	/**
	 * Markdown rendered by EasyMDE's own renderer, as a detached document:
	 * DOMParser runs no scripts and loads no images.
	 */
	function render(editor, markdown) {
		return new DOMParser().parseFromString(editor.markdown(markdown), 'text/html').body;
	}

	/**
	 * Whether wrapping body in a span, between before and after on one line,
	 * renders as intended and changes nothing else.
	 */
	function rendersCleanly(editor, before, body, after) {
		var plain = render(editor, before + body + after);
		var probed = render(editor, before + openTag(PROBE) + body + CLOSE + after);
		var span = probed.querySelector('span.' + PROBE);

		if (!span || BLOCK_PARENTS.indexOf(span.parentNode.nodeName) === -1) {
			return false;
		}

		while (span.firstChild) {
			span.parentNode.insertBefore(span.firstChild, span);
		}

		span.parentNode.removeChild(span);

		return probed.innerHTML === plain.innerHTML;
	}

	/**
	 * Whether a whole line is code: a line in a fenced or indented code block.
	 * EasyMDE's Markdown mode marks code as "comment".
	 */
	function isCodeLine(cm, line) {
		var tokens = cm.getLineTokens(line);
		var code = false;

		for (var i = 0; i < tokens.length; i++) {
			// Indentation is a token of its own, without a type.
			if (/^\s*$/.test(tokens[i].string)) {
				continue;
			}

			if (!/\bcomment\b/.test(tokens[i].type || '')) {
				return false;
			}

			code = true;
		}

		return code;
	}

	function isUntouchable(cm, line, text) {
		for (var i = 0; i < UNTOUCHABLE_LINE.length; i++) {
			if (UNTOUCHABLE_LINE[i].test(text)) {
				return true;
			}
		}

		// A table row, with or without the leading pipe: an unescaped pipe
		// outside inline code. A table's rows only make sense together.
		if (/(^|[^\\])\|/.test(text.replace(/(`+)[^`]*?\1/g, ''))) {
			return true;
		}

		return isCodeLine(cm, line);
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
	 * Remove the spans whose class passes the test, with their matching
	 * closing tags, keeping everything between them.
	 */
	function unwrapSpans(text, isTarget) {
		var stack = [];
		var cuts = [];
		var match;

		SPAN_TAG.lastIndex = 0;

		while ((match = SPAN_TAG.exec(text)) !== null) {
			if (match[1] !== undefined) {
				stack.push({ index: match.index, length: match[0].length, target: isTarget(match[1]) });
			} else if (stack.length > 0) {
				var opening = stack.pop();

				if (opening.target) {
					cuts.push([opening.index, opening.length], [match.index, match[0].length]);
				}
			}
		}

		cuts.sort(function (a, b) {
			return b[0] - a[0];
		});

		for (var i = 0; i < cuts.length; i++) {
			text = text.slice(0, cuts[i][0]) + text.slice(cuts[i][0] + cuts[i][1]);
		}

		return text;
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
			var opening = before.match(/<span class="[a-z-]+">$/);
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
	 * Try to wrap [start, end) of a line; true when the edit was made.
	 */
	function tryWrap(editor, line, start, end, className, removeFirst) {
		var cm = editor.codemirror;
		var text = cm.getLine(line);
		var body = text.slice(start, end);

		if (removeFirst) {
			body = unwrapSpans(body, removeFirst);
		}

		if (!rendersCleanly(editor, text.slice(0, start), body, text.slice(end))) {
			return false;
		}

		cm.replaceRange(openTag(className) + body + CLOSE, { line: line, ch: start }, { line: line, ch: end });

		return true;
	}

	/**
	 * Style one line's parts of the selections, rightmost first so the
	 * positions of the others stay put. A part with nothing selected is
	 * marked inserted when an empty pair went in there.
	 */
	function wrapLine(editor, line, parts, className, removeFirst) {
		var cm = editor.codemirror;

		if (isUntouchable(cm, line, cm.getLine(line))) {
			return;
		}

		for (var i = 0; i < parts.length; i++) {
			var part = parts[i];
			var text = cm.getLine(line);

			if (part.empty) {
				// Nothing selected: an empty pair to type into, if one fits.
				if (rendersCleanly(editor, text.slice(0, part.start), '', text.slice(part.start))) {
					cm.replaceRange(openTag(className) + CLOSE, { line: line, ch: part.start });
					part.inserted = true;
				}

				continue;
			}

			var piece = trimmed(text, part.start, part.end);

			if (piece === null || tryWrap(editor, line, piece.start, piece.end, className, removeFirst)) {
				continue;
			}

			// The selected part cuts through other formatting: the line's
			// whole text, once, instead of any other part of it.
			var whole = trimmed(text, 0, text.length);

			if (whole !== null) {
				tryWrap(editor, line, whole.start, whole.end, className, removeFirst);
			}

			return;
		}
	}

	/**
	 * Take spans off one line's parts. When a part holds half of a pair the
	 * whole line is cleaned instead: spans never reach across lines, so that
	 * is where the other half is.
	 */
	function unwrapLine(editor, line, parts, isTarget) {
		var cm = editor.codemirror;

		for (var i = 0; i < parts.length; i++) {
			var text = cm.getLine(line);
			var start = parts[i].start;
			var end = parts[i].end;
			var slice = text.slice(start, end);

			if (count(slice, /<span class="[a-z-]+">/g) !== count(slice, /<\/span>/g)) {
				cm.replaceRange(unwrapSpans(text, isTarget), { line: line, ch: 0 }, { line: line, ch: text.length });

				return;
			}

			var cleaned = unwrapSpans(slice, isTarget);

			if (cleaned !== slice) {
				cm.replaceRange(cleaned, { line: line, ch: start }, { line: line, ch: end });
			}
		}
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
			var selections = cm.listSelections().map(function (selection) {
				var ordered = comparePositions(selection.anchor, selection.head) <= 0;

				return takeInSurroundingTags(cm, {
					from: ordered ? selection.anchor : selection.head,
					to: ordered ? selection.head : selection.anchor
				});
			});

			var lines = {};
			var marks = [];

			selections.forEach(function (range, index) {
				var empty = comparePositions(range.from, range.to) === 0;

				marks.push({
					from: cm.setBookmark(range.from),
					to: cm.setBookmark(range.to, { insertLeft: true }),
					empty: empty,
					parts: []
				});

				for (var line = range.from.line; line <= range.to.line; line++) {
					var part = {
						start: line === range.from.line ? range.from.ch : 0,
						end: line === range.to.line ? range.to.ch : cm.getLine(line).length,
						empty: empty,
						inserted: false
					};

					marks[index].parts.push(part);
					(lines[line] = lines[line] || []).push(part);
				}
			});

			Object.keys(lines).map(Number).sort(function (a, b) {
				return b - a;
			}).forEach(function (line) {
				handler(line, lines[line].sort(function (a, b) {
					return b.start - a.start;
				}));
			});

			cm.setSelections(marks.map(function (mark) {
				var from = mark.from.find();
				var to = mark.to.find();

				mark.from.clear();
				mark.to.clear();

				// An inserted empty pair: the cursor goes inside it.
				if (mark.empty && mark.parts[0].inserted) {
					from = to = { line: to.line, ch: to.ch - CLOSE.length };
				}

				return { anchor: from, head: to };
			}));
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
					var underlined = cm.listSelections().some(function (selection) {
						var ordered = comparePositions(selection.anchor, selection.head) <= 0;
						var range = takeInSurroundingTags(cm, {
							from: ordered ? selection.anchor : selection.head,
							to: ordered ? selection.head : selection.anchor
						});

						return cm.getRange(range.from, range.to).indexOf(openTag(styles.underline)) !== -1;
					});

					eachLine(editor, function (line, parts) {
						if (underlined) {
							unwrapLine(editor, line, parts, isUnderline);
						} else {
							wrapLine(editor, line, parts, styles.underline, null);
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
						eachLine(editor, function (line, parts) {
							// A new colour replaces the old one rather than nesting.
							wrapLine(editor, line, parts, colour.class, isColour);
						});
					}
				};
			});

			children.push({
				name: 'colour-none',
				title: 'Remove colour',
				icon: '<i class="fa fa-eraser"></i> Remove colour',
				action: function (editor) {
					eachLine(editor, function (line, parts) {
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

		new EasyMDE({
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
			// EasyMDE's preview is client side and only approximate; the server
			// renders the article that finally gets published.
			previewClass: ['editor-preview', 'markdown-body']
		});
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
