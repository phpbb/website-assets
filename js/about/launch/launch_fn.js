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

	// COUNTDOWN -------------------------------------------------------------

	var $timer = $('#countdown-big');

	var utc = new Date('Tue Oct 28 2014 17:00:00 GMT+0000 (UTC)').getTime();
	$timer.countdown(utc, function(event) {
		$(this).html(event.strftime('<div class="timer-unit days"><span class="timer-big">%D</span><span class="timer-small">days</span></div><div class="timer-unit hours"><span class="timer-big">%H</span><span class="timer-small">hours</span></div><div class="timer-unit minutes"><span class="timer-big">%M</span><span class="timer-small">minutes</span></div><div class="timer-unit seconds"><span class="timer-big">%S</span><span class="timer-small">seconds</span></div>'));
	}).on('finish.countdown', function() {
		$('.lead-masthead').find('.countdown-big').remove();
		$('.lead-masthead').append('<p class="lead-sub-buttons lead-sub-title text-center"><a class="lead-clear-outline download-btn" href="https://www.phpbb.com/downloads/" style="">Download 3.1</a> <span>or</span> <a class="lead-clear-outline test-btn" href="http://www.try-phpbb.com/31x/" style="">Try It</a></p>');
	});

	$timer.show();
});
