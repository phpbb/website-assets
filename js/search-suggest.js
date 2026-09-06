/**
 * Suggestions offered while you type in the header search box.
 *
 * The endpoint is read from the form's data-suggest-url attribute, so the site
 * keeps ownership of the URL. It answers with an array of [url, title] pairs.
 */
jQuery(function ($) {
	var form = $('#searchbox form[data-suggest-url]');
	var input = form.find('#q');
	var list = $('#search-suggestions');

	if (!form.length || !input.length || !list.length) {
		return;
	}

	var suggestUrl = form.attr('data-suggest-url');
	var maxSuggestions = 8;
	var minQueryLength = 2;
	var typingPause = 150;
	var pending = null;
	var timer = null;

	function hide() {
		list.empty().prop('hidden', true);
	}

	function show(suggestions) {
		list.empty();

		if (!suggestions || !suggestions.length) {
			hide();
			return;
		}

		$.each(suggestions.slice(0, maxSuggestions), function (i, suggestion) {
			$('<li />').append($('<a />').attr('href', suggestion[0]).text(suggestion[1])).appendTo(list);
		});

		list.prop('hidden', false);
	}

	function suggest() {
		var query = $.trim(input.val());

		if (query.length < minQueryLength) {
			hide();
			return;
		}

		if (pending) {
			pending.abort();
		}

		pending = $.getJSON(suggestUrl, { q: query }, show).fail(hide);
	}

	input.on('input keyup', function (event) {
		if (event.which === 27) {
			hide();
			return;
		}

		clearTimeout(timer);
		timer = setTimeout(suggest, typingPause);
	});

	input.on('blur', function () {
		// Give a click on a suggestion the chance to land first.
		setTimeout(hide, typingPause);
	});
});
