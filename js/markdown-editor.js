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
 * spans. The textarea's data-markdown-styles attribute carries that list
 * (App\Form\Type\MarkdownEditorType), so the buttons offer exactly what the
 * site will render and this script keeps no copy of it. Without the attribute
 * the buttons are simply left out.
 */
(function () {
	'use strict';

	/**
	 * List, heading and quote markers at the start of a line. A span has to
	 * start after them, or the line stops being a list item, heading or quote.
	 */
	var BLOCK_PREFIX = /^(\s*(?:(?:[*+-]|\d+[.)])\s+|#{1,6}\s+|>\s?)*)/;

	var SPAN_TAG = /<span class="([a-z-]+)">|<\/span>/g;

	function escapeHtml(text) {
		return String(text).replace(/[&<>"']/g, function (character) {
			return '&#' + character.charCodeAt(0) + ';';
		});
	}

	function openTag(className) {
		return '<span class="' + className + '">';
	}

	/**
	 * Widen the selection over span tags sitting right around it on its line,
	 * so selecting just the coloured words is enough to change or remove the
	 * colour.
	 */
	function takeInSurroundingTags(cm) {
		var from = cm.getCursor('from');
		var to = cm.getCursor('to');
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

		cm.setSelection(from, to);
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
	 * Wrap the selection in a span, line by line: the site only renders a
	 * span that opens and closes within one paragraph, so one must never
	 * reach across lines. With nothing selected, insert an empty pair and put
	 * the cursor inside it.
	 */
	function wrapSelection(cm, className, removeFirst) {
		takeInSurroundingTags(cm);

		var text = cm.getSelection();

		if (removeFirst) {
			text = unwrapSpans(text, removeFirst);
		}

		if (text === '') {
			cm.replaceSelection(openTag(className) + '</span>');
			var cursor = cm.getCursor();
			cm.setCursor({ line: cursor.line, ch: cursor.ch - '</span>'.length });
			cm.focus();

			return;
		}

		var firstLineFromStart = cm.getCursor('from').ch === 0;

		var lines = text.split('\n').map(function (line, index) {
			var prefix = (index > 0 || firstLineFromStart) ? line.match(BLOCK_PREFIX)[1] : '';
			var body = line.slice(prefix.length);
			var trailing = body.match(/\s*$/)[0];

			body = body.slice(0, body.length - trailing.length);

			return body === '' ? line : prefix + openTag(className) + body + '</span>' + trailing;
		});

		cm.replaceSelection(lines.join('\n'), 'around');
		cm.focus();
	}

	function removeFromSelection(cm, isTarget) {
		takeInSurroundingTags(cm);
		cm.replaceSelection(unwrapSpans(cm.getSelection(), isTarget), 'around');
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
			buttons.push({
				name: 'underline',
				className: 'fa fa-underline',
				title: 'Underline',
				action: function (editor) {
					var cm = editor.codemirror;

					takeInSurroundingTags(cm);

					var text = cm.getSelection();
					var open = openTag(styles.underline);

					// Pressed again on underlined text: take it off.
					if (text.indexOf(open) === 0 && text.slice(-'</span>'.length) === '</span>') {
						removeFromSelection(cm, function (className) {
							return className === styles.underline;
						});
					} else {
						wrapSelection(cm, styles.underline, null);
					}
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
						// A new colour replaces the old one rather than nesting.
						wrapSelection(editor.codemirror, colour.class, isColour);
					}
				};
			});

			children.push({
				name: 'colour-none',
				title: 'Remove colour',
				icon: '<i class="fa fa-eraser"></i> Remove colour',
				action: function (editor) {
					removeFromSelection(editor.codemirror, isColour);
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

	function toolbar(textarea) {
		var styles = styleButtons(readStyles(textarea));

		return ['bold', 'italic'].concat(styles, [
			'heading',
			'|',
			'quote', 'unordered-list', 'ordered-list',
			'|',
			'link', 'image', 'table', 'code',
			'|',
			'preview', 'side-by-side', 'fullscreen',
			'|',
			'guide'
		]);
	}

	function enhance(textarea) {
		if (textarea.dataset.markdownEditorReady) {
			return;
		}

		textarea.dataset.markdownEditorReady = '1';

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
			toolbar: toolbar(textarea),
			shortcuts: { underline: 'Cmd-U' },
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
