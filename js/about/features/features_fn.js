$(function () {
	var anchor, qtipStyle, qtipPosition,
		hashValue = location.hash.slice(1);

	$('.features-item-content').hide();

	if (hashValue) {
		anchor = $("a[name='" + hashValue + "']");

		if (anchor.length) {
			anchor.parents('div.features-item-content')
				.toggle()
				.siblings('.features-item-head')
					.removeClass('unselected')
					.addClass('selected');
		}
	}

	$('.features-item-head').click(function () {
		$(this).toggleClass('selected unselected')
			.siblings('.features-item-content')
				.toggleFadeSlide(300)
	});

	$('.expandall').show()
		.find('span')
			.text('Expand all')
			.click(function () {
				var closed = $(this).text() === 'Expand all';
				$(this).text(closed ? 'Collapse all' : 'Expand all');

				$('.features-item-head').click();
			});


	$('span.feature-collapse').click(function() {
		$(this).parent().siblings('.features-item-head').click();
	}).show();

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
