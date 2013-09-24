(function($) {
	var how = 'update', version;

	$('[data-switch]').each(function () {
		$this = $(this);
		var toSwitch = $this.attr('data-switch');
		
		$this.find('[name="' + toSwitch + '"]').click(function () {
			$('[id^="' + toSwitch + '"]').hide();
			$('#' + toSwitch + '-' + $(this).val()).show();
		});
	});
	
	$('select[name="version"]').change(function() {
		version = $(this).find(':selected').val();
		getPackage();
	});
	
	$('input[name="how"]').click(function() {
		how = $(this).val();
		getPackage();
	});

	if (location.hash == '#install') {
		$('[name="action"][value="install"]').click();
	} else if (location.hash == '#update') {
		$('[name="action"][value="update"]').click();
	}
	
	function getPackage() {
		if (version && how) {
			$.get('download.php?version=' + version + '&how=' + how, function(body) {
				if (body.length == 0) {
					$('.notfound').show();
					return;
				}
				
				$('.notfound').hide();
				for (var i = 0; i < body.length; i++) {
					var element = $('.download-container .' + body[i].FORMAT);
					element.find('img').attr('alt', body[i].ALT);
					element.find('a').attr('href', body[i].U_DOWNLOAD).text(body[i].FILENAME);
					element.find('.size').text(body[i].SIZE);
					element.find('.md5').text(body[i].MD5);
				}
				
				$('.yourdownload').show();
			});
		}
	}
})(jQuery);
