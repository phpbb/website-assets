$(function() {
	// Cache the page
	'use strict';

	var $page = $('html, body');

	// Set the speed of the assisted page scroll
	var pageScrollSpeed = 500;

	// Cache Navigation in jQuery objects
	var $navContainer = $('.features-nav');

	// Cache All navigation links in jQuery objects
	var $navLinks = $('.nav-link');

	// Specific nav item, e.g., navItem.$home
	var navLink = {
		"$admin":  $navLinks.filter('.admin'),
		"$user":   $navLinks.filter('.user'),
		"$dev":    $navLinks.filter('.dev'),
		"$design": $navLinks.filter('.design'),
		"$home":   $navLinks.filter('.top')
	};

	// Specific section, e.g., section.$home
	var section = {
		"$admin":  $('#admin'),
		"$user":   $('#user'),
		"$dev":    $('#dev'),
		"$design": $('#design'),
		"$home":   $('#phpbb')
	};

	var pageScrollTo = function (target) {
		target = target > 0 ? target : target.offset().top;
		$page.animate({ 'scrollTop': target }, pageScrollSpeed);
	};

	// CLICK EVENTS ------------------------------------------------------------

	$navLinks.on('click', function (event) {
		var $this = $(this);
		var destination = $this.attr('href');

		pageScrollTo($(destination));

		event.preventDefault();

		$navLinks.removeClass('active');
		if (destination === '#phpbb' ) {
			navLink.$admin.addClass('active');
		} else {
			$this.addClass('active');
		}
	});

	// WAYPOINT EVENTS --------------------------------------------------------

	section.$admin.waypoint(function() {
		$navLinks.removeClass('active');
		navLink.$admin.addClass('active');
	});

	section.$user.waypoint(function() {
		$navLinks.removeClass('active');
		navLink.$user.addClass('active');
	});

	section.$dev.waypoint(function() {
		$navLinks.removeClass('active');
		navLink.$dev.addClass('active');
	});

	section.$design.waypoint(function() {
		$navLinks.removeClass('active');
		navLink.$design.addClass('active');
	});

	section.$home.waypoint(function() {
		$navLinks.removeClass('active');
		navLink.$admin.addClass('active');
	});

	$navContainer.waypoint('sticky');
});
