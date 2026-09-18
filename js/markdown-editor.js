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
 * spans, and only when a span opens and closes within one block without
 * crossing other formatting. The textarea's data-markdown-styles attribute
 * carries the list (App\Form\Type\MarkdownEditorType), so the buttons offer
 * exactly what the site renders and this script keeps no copy of it. Without
 * the attribute there are no such buttons.
 *
 * The buttons therefore style text line by line, leave code, tables and other
 * block syntax alone, and never put a span halfway into bold, links or code:
 * a span the site could not render would show on the page as HTML text.
 */
(function () {
	'use strict';

	var CLOSE = '</span>';

	/**
	 * List, heading and quote markers at the start of a line. A span has to
	 * start after them, or the line stops being a list item, heading or quote.
	 */
	var BLOCK_PREFIX = /^(\s*(?:(?:[*+-]|\d+[.)])\s+|#{1,6}\s+|>\s?)*)/;

	/** Lines whose syntax a span would break, styled or not. */
	var UNTOUCHABLE_LINE = [
		/^\s*(`{3,}|~{3,})/,					// code fence
		/^ {0,3}([-*_])( *\1){2,} *$/,			// thematic break
		/^ {0,3}(=+|-+) *$/,					// setext heading underline
		/^\s*\|/,								// table row
		/^\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/	// table delimiter row
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

	/**
	 * Whether a piece of a line can be wrapped in a span without cutting
	 * through inline code, emphasis, a link or another span.
	 */
	function isBalanced(text) {
		var t = text.replace(/\\./g, '');

		t = t.replace(/(`+)[\s\S]*?\1/g, '');

		if (t.indexOf('`') !== -1) {
			return false;
		}

		return count(t, /\*\*/g) % 2 === 0
			&& count(t, /__/g) % 2 === 0
			&& count(t.replace(/\*\*/g, ''), /\*/g) % 2 === 0
			&& count(t, /\[/g) === count(t, /\]/g)
			&& count(t, /\(/g) === count(t, /\)/g)
			&& count(t, /<span class="[a-z-]+">/g) === count(t, /<\/span>/g);
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

		return isCodeLine(cm, line);
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

	function comparePositions(a, b) {
		return a.line === b.line ? a.ch - b.ch : a.line - b.line;
	}

	/**
	 * Each selection as {from, to}, last in the document first, so styling
	 * one never moves the others.
	 */
	function ranges(cm) {
		return cm.listSelections().map(function (selection) {
			var ordered = comparePositions(selection.anchor, selection.head) <= 0;

			return {
				from: ordered ? selection.anchor : selection.head,
				to: ordered ? selection.head : selection.anchor
			};
		}).sort(function (a, b) {
			return comparePositions(b.from, a.from);
		});
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
	 * The part of one line a style should go on: within the range, after any
	 * block markers, without surrounding whitespace or a hard-break backslash,
	 * and including emphasis or code markers it sits just inside of. Null when
	 * there is nothing on the line to style.
	 */
	function segment(cm, range, line) {
		var text = cm.getLine(line);
		var prefix = text.match(BLOCK_PREFIX)[1].length;
		var start = Math.max(line === range.from.line ? range.from.ch : 0, prefix);
		var end = line === range.to.line ? range.to.ch : text.length;

		while (start < end && /\s/.test(text.charAt(start))) {
			start++;
		}

		while (end > start && /[\s\\]/.test(text.charAt(end - 1))) {
			end--;
		}

		while (start > prefix && end < text.length
			&& text.charAt(start - 1) === text.charAt(end)
			&& MARKERS.indexOf(text.charAt(end)) !== -1
		) {
			start--;
			end++;
		}

		return start < end ? { line: line, start: start, end: end, text: text, prefix: prefix } : null;
	}

	/**
	 * The whole styleable content of a line, for when the selected part of it
	 * cuts through other formatting.
	 */
	function wholeLine(piece) {
		var start = piece.prefix;
		var end = piece.text.length;

		while (end > start && /[\s\\]/.test(piece.text.charAt(end - 1))) {
			end--;
		}

		return { line: piece.line, start: start, end: end, text: piece.text, prefix: piece.prefix };
	}

	/**
	 * Style a range: wrap each line's part of it in its own span.
	 *
	 * @param {function|null} removeFirst Spans to take off first, so a new
	 *                                    colour replaces the old one.
	 */
	function wrapRange(cm, range, className, removeFirst) {
		range = takeInSurroundingTags(cm, range);

		if (comparePositions(range.from, range.to) === 0) {
			// Nothing selected: an empty pair to type into, unless in code.
			if (/\bcomment\b/.test(cm.getTokenTypeAt(range.from) || '') || isUntouchable(cm, range.from.line, cm.getLine(range.from.line))) {
				return;
			}

			cm.replaceRange(openTag(className) + CLOSE, range.from);

			// With a single cursor, put it inside the pair to type into.
			if (cm.listSelections().length === 1) {
				cm.setCursor({ line: range.from.line, ch: range.from.ch + openTag(className).length });
			}

			return;
		}

		for (var line = range.to.line; line >= range.from.line; line--) {
			if (isUntouchable(cm, line, cm.getLine(line))) {
				continue;
			}

			var piece = segment(cm, range, line);

			if (piece === null) {
				continue;
			}

			var body = piece.text.slice(piece.start, piece.end);

			if (removeFirst) {
				body = unwrapSpans(body, removeFirst);
			}

			if (!isBalanced(body)) {
				piece = wholeLine(piece);
				body = piece.text.slice(piece.start, piece.end);

				if (removeFirst) {
					body = unwrapSpans(body, removeFirst);
				}

				if (body === '' || !isBalanced(body)) {
					continue;
				}
			}

			cm.replaceRange(
				openTag(className) + body + CLOSE,
				{ line: line, ch: piece.start },
				{ line: line, ch: piece.end }
			);
		}
	}

	/**
	 * Take spans off a range. When the range holds half of a pair, the whole
	 * lines are cleaned instead: spans never reach across lines, so that is
	 * where the other half is.
	 */
	function unwrapRange(cm, range, isTarget) {
		range = takeInSurroundingTags(cm, range);

		var text = cm.getRange(range.from, range.to);

		if (count(text, /<span class="[a-z-]+">/g) !== count(text, /<\/span>/g)) {
			range = {
				from: { line: range.from.line, ch: 0 },
				to: { line: range.to.line, ch: cm.getLine(range.to.line).length }
			};
			text = cm.getRange(range.from, range.to);
		}

		var cleaned = unwrapSpans(text, isTarget);

		if (cleaned !== text) {
			cm.replaceRange(cleaned, range.from, range.to);
		}
	}

	function eachRange(editor, handler) {
		var cm = editor.codemirror;

		cm.operation(function () {
			var list = ranges(cm);

			for (var i = 0; i < list.length; i++) {
				handler(cm, list[i]);
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
					eachRange(editor, function (cm, range) {
						var widened = takeInSurroundingTags(cm, range);

						// Pressed on underlined text: take the underline off.
						if (cm.getRange(widened.from, widened.to).indexOf(openTag(styles.underline)) !== -1) {
							unwrapRange(cm, range, isUnderline);
						} else {
							wrapRange(cm, range, styles.underline, null);
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
						eachRange(editor, function (cm, range) {
							// A new colour replaces the old one rather than nesting.
							wrapRange(cm, range, colour.class, isColour);
						});
					}
				};
			});

			children.push({
				name: 'colour-none',
				title: 'Remove colour',
				icon: '<i class="fa fa-eraser"></i> Remove colour',
				action: function (editor) {
					eachRange(editor, function (cm, range) {
						unwrapRange(cm, range, isColour);
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
