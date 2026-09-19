/**
 * The Support Request Template generator (phpbb-website-private #29), on the
 * jQuery every page loads.
 *
 * An answer that warns shows its warning under its question as soon as it is
 * picked, and hides it again when another answer is.
 */
jQuery(function ($) {
	'use strict';

	var $form = $('#srt_gen form[method="post"]');

	if (!$form.length) {
		return;
	}

	$form.find('.srt-warning[data-srt-warn-for]').each(function () {
		var $warning = $(this);
		var $fields = $form.find('[name="' + $warning.attr('data-srt-warn-for') + '"]');
		var values = $.map(JSON.parse($warning.attr('data-srt-warn-values')), String);

		function answer() {
			var $field = $fields.filter('select, textarea, input:not([type="radio"]), input[type="radio"]:checked').first();

			return $field.length ? String($field.val()) : '';
		}

		function update() {
			$warning.prop('hidden', $.inArray(answer(), values) === -1);
		}

		$fields.on('change', update);
		update();
	});
});
