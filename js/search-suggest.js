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
	var suggestUrl = $.trim(form.attr('data-suggest-url') || '');

	// An empty attribute would send the request at the current page, so treat
	// it the same as not asking for suggestions at all.
	if (!form.length || !input.length || !list.length || !suggestUrl) {
		return;
	}

	var maxSuggestions = 8;
	var minQueryLength = 2;
	var typingPause = 150;
	var keys = { enter: 13, escape: 27, up: 38, down: 40 };
	var pending = null;
	var timer = null;

	/**
	 * Somewhere we are willing to send a reader: a path on this site, or an
	 * ordinary web address. Not javascript:, not data:, and not a
	 * protocol-relative URL pointing off somewhere else.
	 */
	function isSafeUrl(url) {
		return (/^\/(?!\/)/).test(url) || (/^https?:\/\//i).test(url);
	}

	function hide() {
		list.empty().prop('hidden', true);
	}

	function show(suggestions) {
		list.empty();

		$.each((suggestions || []).slice(0, maxSuggestions), function (i, suggestion) {
			if (!isSafeUrl(suggestion[0])) {
				return;
			}

			$('<li />').append($('<a />').attr('href', suggestion[0]).text(suggestion[1])).appendTo(list);
		});

		if (!list.children().length) {
			hide();
			return;
		}

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

		pending = $.getJSON(suggestUrl, { q: query })
			.done(show)
			.fail(function (jqXHR, textStatus) {
				// Every keystroke aborts the request before it, and an abort
				// is not a failure worth clearing the list over.
				if (textStatus !== 'abort') {
					hide();
				}
			});
	}

	/**
	 * Walk the suggestions, wrapping around at either end.
	 */
	function move(offset) {
		var options = list.children('li');

		if (!options.length) {
			return;
		}

		var current = options.filter('.active');
		var index = current.length ? options.index(current) + offset : (offset > 0 ? 0 : options.length - 1);

		if (index < 0) {
			index = options.length - 1;
		} else if (index >= options.length) {
			index = 0;
		}

		options.removeClass('active');
		options.eq(index).addClass('active');
	}

	input.on('keydown', function (event) {
		if (list.prop('hidden')) {
			return;
		}

		if (event.which === keys.down || event.which === keys.up) {
			event.preventDefault();
			move(event.which === keys.down ? 1 : -1);
			return;
		}

		if (event.which === keys.escape) {
			hide();
			return;
		}

		// Enter follows the highlighted suggestion; with none highlighted the
		// form submits and the reader gets the search page, as before.
		if (event.which === keys.enter) {
			var active = list.children('li.active').find('a');

			if (active.length) {
				event.preventDefault();
				window.location = active.attr('href');
			}
		}
	});

	input.on('input keyup', function (event) {
		if (event.which === keys.down || event.which === keys.up || event.which === keys.enter) {
			return;
		}

		if (event.which === keys.escape) {
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
