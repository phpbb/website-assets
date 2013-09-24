$(function () {
	function isIE() {
		return navigator.userAgent.match(/MSIE \d\.\d+/)
	}		
	
	// setup the drop downs
	$('#navbar ul > li').hoverIntent(function () {
		// Show
		$('> .sub-menu', this).toggle();
		$('a span', this).addClass('hovering');
	}, function () {
		// Hide
		$('> .sub-menu', this).toggle();
		$('a span', this).removeClass('hovering');
	});
	
	// IE fun
	if (isIE()) {
		$('#navbar li li').hover(function () {
			$(this).addClass('hover_ie');
		}, function () {
			$(this).removeClass('hover_ie');
		});

		// For each div with class menu (i.e., the thing we want to be on top)
		$('.sub-menu').parents().each(function() {
			var p = $(this),
				pos = p.css('position');

			// If it's positioned,
			if (pos === 'relative' || pos === 'absolute' || pos === 'fixed') {
				p.hover(function() {
					$(this).addClass('on-top');
				}, function() {
					$(this).removeClass('on-top');
				});
			}
		});
	}

	// Autofocus cookies debugger thing
	$('form[action="cookies.php"] [name="url"]').focus();

	// Showcase click tracker
	$('.showcase').on('click', 'a:[href*="http"]', function (e) {
		var href = this.href,
			letsGo = function () {
				location = href;

				// Only happen once!
				letsGo = function () {};
			};

		// Maximum 200ms
		$.get(location, {urlClicked: href}, letsGo);
		setTimeout(letsGo, 200);

		return false; // Yup, we want to stop propagation
	});

	// Teams page
	$('dd.detailed-definition').hide();
	$('dt.name-term a').click(function (e) {
		e.preventDefault();

		$(this).parents('dt').siblings('dd').toggle();
	});


	$('#g-plusone-sltr').attr({
		'data-size': 'medium',
		'data-count': 'false',
		'data-href': 'https://www.phpbb.com/'
	});

	var po = document.createElement('script'); 
	po.type = 'text/javascript'; 
	po.async = true;
	po.src = 'https://apis.google.com/js/plusone.js';
	var s = document.getElementsByTagName('script')[0];
	s.parentNode.insertBefore(po, s);
});

$.fn.toggleFadeSlide = function (duration, easing, callback) {
	return this.animate({
		opacity: 'toggle',
		height: 'toggle'
	}, duration, easing, callback);
};