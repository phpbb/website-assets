$(function () {
	var anchor, qtipStyle, qtipPosition,
		hashValue = location.hash.slice(1);
		expand = $('.expandall').show().find('span').text('Expand all'),
		doExpand = true;

	/**
	 * Swap "Expand all" / "Collapse all" text
	 */
	function checkExpanded() {
		var collapsed = $('.features-item-head.unselected');

		if (!collapsed.length) {
			if (doExpand) {
				expand.text('Collapse all');
				doExpand = false;
			}
			return;
		}
		
		if (!doExpand) {
			expand.text('Expand all');
			doExpand = true;
		}
	}

	/**
	 * Toggles items
	 *
	 * @param {jQuery} [items] Items to toggle. "this" will be used if items list is not set.
	 * @param {bool} [toggle] Status. By default swaps current status
	 * @param {bool} [instant] True if animation should be skipped. Default = false
	 */
	function toggleItems(items, toggle, instant) {
		var args = arguments;

		items = (arguments.length < 1) ? $(this) : $(items);
		if (items.hasClass('features-item-content')) {
			items = items.siblings('.features-item-head');
		}

		items.each(function () {
			var item = $(this),
				toggle = (args.length < 2) ? item.hasClass('unselected') : args[1],
				instant = (args.length < 3) ? false : args[2];

			if (item.hasClass('selected') == toggle) return;

			var content = item.siblings('.features-item-content');
			if (instant) {
				content.stop(true, true).toggle(toggle);
			}
			else {
				content.toggleFadeSlide(300);
			}

			item.toggleClass('selected unselected');
		});
		checkExpanded();
	}

	// Hide current content
	$('.features-item-content').hide();

	// Toggle hash
	if (hashValue) {
		anchor = $("a[name='" + hashValue + "']");

		if (anchor.length) {
			toggleItems(anchor.parents('div.features-item-content'), true, true);
		}
	}

	// Set events
	$('.features-item-head').click(function() { toggleItems(this); });
	expand.click(function() {
		toggleItems($('.features-item-head'), doExpand);
		checkExpanded();
		return false;
	});


	qtipStyle = {
		fontSize: 11,
		lineHeight: 1.2,
		name: 'cream'
	};
	qtipPosition = {
		corner: {
			target: 'topMiddle',
			tooltip: 'bottomLeft'
		}
	};

	$('span.define-gpl').qtip({
		content: 'What does this mean? Quite simply, you can use phpBB for whatever purpose you wish provided 1) You keep our copyright in the source and 2) If you distribute the code, it\'s also released under the GPLv2.',
		style: qtipStyle,
		position: qtipPosition
	});

	$('span.define-hash').qtip({
		content: 'Think of hashing as one-way encryption. There\'s no way to get the original text via decryption, so it\'s much safer.',
		style: qtipStyle,
		position: qtipPosition
	});

	$('span.define-captcha').qtip({
		content: 'CAPTCHA stands for "<strong>C</strong>ompletely <strong>A</strong>utomated <strong>P</strong>ublic <strong>T</strong>uring test to tell <strong>C</strong>omputers and <strong>H</strong>umans <strong>A</strong>part." Weird name, awesomely effective.',
		style: qtipStyle,
		position: qtipPosition
	});

	$('span.define-utf8').qtip({
		content: 'UTF-8 stands for Universal Character Set Transformation Format  8-bit.',
		style: qtipStyle,
		position: qtipPosition
	});
});
