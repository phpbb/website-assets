$(document).ready(function() {
	var contact = $('#contact'),
		footer = $('#page-footer');

	if (!contact.length || !footer.length) return;

	var extra = 5,
		footerSpacing = 20,
		top = contact.offset().top - extra,
		height = contact.height(),
		maxTop = footer.offset().top - height - footerSpacing,
		$window = $(window),
		fixed = false;

	function scroll() {
		var windowTop = $window.scrollTop();
		if (windowTop <= top || windowTop >= maxTop)
		{
			if (fixed)
			{
				contact.css({
					position: 'static',
					top: 'auto'
				});
			}
			fixed = false;
			return;
		}
		if (!fixed)
		{
			fixed = true;
			contact.css({
				position: 'fixed',
				top: extra + 'px'
			});
		}
	}
	scroll();
	$(window).scroll(scroll);
});
