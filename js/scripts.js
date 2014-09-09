$(function () {
	'use strict';

	// Swap .nojs and .hasjs
	phpbb.isTouch = (window && typeof window.ontouchstart !== 'undefined');
	$('#phpbb.nojs').toggleClass('nojs hasjs');
	$('#phpbb').toggleClass('hastouch', phpbb.isTouch);
	$('#phpbb.hastouch').removeClass('notouch');

	function isIE() {
		return navigator.userAgent.match(/MSIE \d\.\d+/);
	}

	var $phpbbNavbar = $('#phpbb-navbar');
	var $phpbbMenu = $('#phpbb-menu');

	// Setup the drop downs for mouse-hover
	$phpbbMenu.children('li').hoverIntent(function () {
		// Show
		if (!(phpbb.isTouch && $(window).width() < 900)) {
			$('> .sub-menu', this).toggle();
			$('a', this).addClass('hovering');
		}
	}, function () {
		// Hide
		if (!(phpbb.isTouch && $(window).width() < 900)) {
			$('> .sub-menu', this).toggle();
			$('a', this).removeClass('hovering');
		}
	});

	// IE fun
	if (isIE()) {
		$phpbbMenu.find('li li').hover(function () {
			$(this).addClass('hover_ie');
		}, function () {
			$(this).removeClass('hover_ie');
		});

		// For each div with class menu (i.e., the thing we want to be on top)
		$('.sub-menu').parents().each(function() {
			var $p = $(this),
				pos = $p.css('position');

			// If it's positioned,
			if (pos === 'relative' || pos === 'absolute' || pos === 'fixed') {
				$p.hover(function() {
					$(this).addClass('on-top');
				}, function() {
					$(this).removeClass('on-top');
				});
			}
		});
	}

	// Responsive navbar menu
	$phpbbNavbar.find('#phpbb-menu-toggle').on('click', function () {
		$phpbbMenu.toggleClass('show');
		$phpbbNavbar.toggleClass('menu-open');
	});

	// Add fly-out toggle buttons for responsive submenus
	if (phpbb.isTouch) {
		$phpbbMenu.find('.nav-button').each(function() {
			if($(this).children('.sub-menu').length) {
				$(this).prepend('<a href="#" class="submenu-toggle"></a>');
			}
			$(this).children('.submenu-toggle').on('click', function() {
				var $itemMenu = $(this).siblings('.sub-menu');
				$itemMenu.toggle();

				// close all other sub-menus
				$phpbbMenu.find('.sub-menu').not($itemMenu).each(function() {
					$(this).toggle(false);
				});
			});
		});
	}

	// Responsive side-bar menu
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
		var $parents = $(e.target).parents();
		if (!$parents.is('#phpbb-navbar')) {
			$('#phpbb-menu').toggleClass('show',false);
			$phpbbNavbar.toggleClass('menu-open', false);
		}
		if (!$parents.is('#phpbb-sidebar')) {
			$('#phpbb-sidebar').toggleClass('show',false);
		}
	});

	// Generate side-bar "sections" mini-panel content by parsing headings
	var $sectionsPanel = $('.mini-panel.js-sections'),
		sectionsHTML = '';

	if ($sectionsPanel.length) {
		var hasH2 = false,
			indent;

		$('#main').find('h2, h3').not('.imgrep').each(function() {
			var $this = $(this),
				id = $this.attr('id');

			if (!id) {
				id = $this.parent('li').attr('id');
			}

			if ($this.is('h2')) {
				hasH2 = true;
				indent = '';
			} else if (hasH2) {
				indent = '- ';
			} else {
				indent = '';
			}

			if (id) {
				sectionsHTML += '<li>' + indent + '<a href="#' + id + '">' + $this.text() + '</a></li>';
			}
		});

		if(sectionsHTML) {
			sectionsHTML = '<div class="inner"><h3>Page Sections</h3></h3><ul class="menu">' + sectionsHTML + '</ul></div>';
			$sectionsPanel.html(sectionsHTML).toggle(true);
		}
	}

	// Side-bar "sections" mini-panel will scroll with content
	var $scrollPanel = $('.mini-panel.js-scroll'),
		$pageFooter = $('#page-footer');

	if ($scrollPanel.length && $pageFooter.length) {
		var extra = 5,
			footerSpacing = 20,
			top = $scrollPanel.offset().top - extra,
			height = $scrollPanel.height(),
			maxTop = $pageFooter.offset().top - height - footerSpacing,
			fixed = false,
			scrollPanelActive = !$scrollPanel.is(':empty');

		scrollSidePanel();
	}

	function scrollSidePanel() {
		if (scrollPanelActive) {
			var windowTop = $(window).scrollTop();
			if (windowTop <= top || windowTop >= maxTop)
			{
				if (fixed)
				{
					$scrollPanel.css('top', 'auto').removeClass('fixed');
				}
				fixed = false;
				return;
			}
			if (!fixed)
			{
				fixed = true;
				$scrollPanel.css('top', extra + 'px').addClass('fixed');
			}
		}
	}

	$(window).scroll(scrollSidePanel);

	// Autofocus cookies debugger thing
	$('form[action="cookies.php"] [name="url"]').focus();

	// Showcase click tracker
	$('.showcase').on('click', 'a:[href*="http"]', function () {
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
