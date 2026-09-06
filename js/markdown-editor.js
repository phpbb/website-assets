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
 */
(function () {
	'use strict';

	var TOOLBAR = [
		'bold', 'italic', 'heading',
		'|',
		'quote', 'unordered-list', 'ordered-list',
		'|',
		'link', 'image', 'table', 'code',
		'|',
		'preview', 'side-by-side', 'fullscreen',
		'|',
		'guide'
	];

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
			toolbar: TOOLBAR,
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
