$(function () {
	"use strict";

	function isIE() {
		return navigator.userAgent.match(/MSIE \d\.\d+/);
	}

	// setup the drop downs for mouse-hover
	$('#phpbb-menu').children('li').hoverIntent(function () {
		// Show
		$('> .sub-menu', this).toggle();
		$('a', this).addClass('hovering');
	}, function () {
		// Hide
		$('> .sub-menu', this).toggle();
		$('a', this).removeClass('hovering');
	});

	// IE fun
	if (isIE()) {
		$('#phpbb-menu').find('li li').hover(function () {
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

	// responsive navbar menu
	$('#phpbb-menu-toggle').on('click', function () {
		$('#phpbb-menu').toggleClass('show');
	});

	// add fly-out toggle buttons for responsive submenus
	if (phpbb.isTouch) {
		$('#phpbb-menu').find('.nav-button').each(function() {
			if($(this).children('.sub-menu').length) {
				$(this).prepend('<a href="#" class="submenu-toggle"></a>');
			}
			$(this).children('.submenu-toggle').on('click', function() {
				$(this).siblings('.sub-menu').toggle();
			});
		});
	}

	// side-bar menu
	var $extras = $('#extras');

	if ($extras.length) {
		$extras.wrap('<div id="phpbb-sidebar" class="sidebar"></div>').before('<a href="#" id="phpbb-sidebar-toggle" class="sidebar-toggle" title="Toggle sidebar"></a>');
		$('#main').addClass('has-sidebar');
	}
	$('#phpbb-sidebar-toggle').on('click', function() {
		$('#phpbb-sidebar').toggleClass('show');
	});

	// Hide active dropdowns/menus when click event happens outside
	$('body').click(function(e) {
		var parents = $(e.target).parents();
		if (!parents.is('#phpbb-navbar')) {
			$('#phpbb-menu').toggleClass('show',false);
		}
		if (!parents.is('#phpbb-sidebar')) {
			$('#phpbb-sidebar').toggleClass('show',false);
		}
	});

	// Autofocus cookies debugger thing
	$('form[action="cookies.php"] [name="url"]').focus();

	// Showcase click tracker
	$('.showcase').on('click', 'a:[href*="http"]', function (e) {
		var href = this.href,
			location,
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
	"use strict";

	return this.animate({
		opacity: 'toggle',
		height: 'toggle'
	}, duration, easing, callback);
};
