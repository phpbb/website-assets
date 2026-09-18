/**
 * The Support Request Template pages in the team tools (phpbb-website-private
 * #29), on the jQuery every page loads.
 *
 * Question form: only the parts that apply to the chosen type are shown.
 * Elements carry the types they apply to in data-srt-types. A yes or no
 * question shows one row per answer, Yes and No, for picking what each does.
 * "Only ask when" offers only questions on steps before the one in the step
 * field. Without this script the whole form shows.
 */
jQuery(function ($) {
	'use strict';

	var $form = $('#srt-question-form');

	if (!$form.length) {
		return;
	}

	var $type = $form.find('[data-srt-type-select]');
	var $step = $form.find('[data-srt-step-input]');
	var $requires = $form.find('[data-srt-requires-select]');
	var $warnOutdated = $form.find('input[name$="[warnOutdated]"]');
	var $table = $form.find('table.srt-options');
	var labels = {yes: 'Yes', no: 'No'};

	function field($row, name) {
		return $row.find('input[name$="[' + name + ']"]');
	}

	function isYesOrNo($row) {
		return labels.hasOwnProperty(field($row, 'value').val());
	}

	// The empty rows offered for new answers wait behind the Add button. When
	// none are left, another comes from the template.
	var $prototype = $('#srt-option-prototype');
	var nextIndex = $table.find('tbody tr').length;

	function newRow() {
		var $row = $table.find('tbody tr.srt-blank-row[hidden]').first();

		if (!$row.length && $prototype.length) {
			$row = $($.trim($prototype.html().replace(/__name__/g, String(nextIndex++))));
			// Like the empty rows the page offers: its order field is hidden
			// while dragging is on, so it must never be left empty.
			field($row, 'position').val('0');
			$row.prop('hidden', true).appendTo($table.find('tbody'));
		}

		return $row;
	}

	// A yes or no question only shows its Yes and No rows.
	function stripe() {
		var boolean = $table.hasClass('srt-boolean');

		$table.find('tbody tr').not('[hidden]').filter(function () {
			return !boolean || !$(this).hasClass('srt-row-extra');
		}).each(function (index) {
			$(this).toggleClass('bg1', index % 2 === 0).toggleClass('bg2', index % 2 === 1);
		});
	}

	// Switching a question to yes or no fills blank rows with the two answers
	// it now has, if they are not there yet.
	function addYesAndNo() {
		$.each(labels, function (value, label) {
			var $rows = $table.find('tbody tr');
			var exists = $rows.filter(function () {
				return field($(this), 'value').val() === value;
			}).length > 0;

			if (exists) {
				return;
			}

			// An empty row, but not one sent back with an error for what else
			// it had filled in.
			var $blank = $rows.filter(function () {
				var $row = $(this);

				return field($row, 'value').val() === '' && field($row, 'label').val() === ''
					&& !field($row, 'warn').is(':checked') && !$row.find('select[name$="[outcome]"]').val();
			}).first();

			if (!$blank.length) {
				$blank = newRow();
			}

			field($blank, 'value').val(value);
			field($blank, 'label').val(label);
			$blank.attr('data-srt-auto', value).removeClass('srt-blank-row').prop('hidden', false);
		});
	}

	// Switching away from yes or no again empties the rows filled above, as
	// long as nobody changed them, so they do not become answers unnoticed.
	function removeYesAndNo() {
		$table.find('tbody tr[data-srt-auto]').each(function () {
			var $row = $(this);
			var value = $row.attr('data-srt-auto');

			if (field($row, 'value').val() === value && field($row, 'label').val() === labels[value]) {
				field($row, 'value').val('');
				field($row, 'label').val('');
				$row.addClass('srt-blank-row').prop('hidden', true);
			}

			$row.removeAttr('data-srt-auto');
		});
	}

	function update() {
		var type = $type.val();
		var boolean = type === 'boolean';

		$form.find('[data-srt-types]').each(function () {
			$(this).prop('hidden', $.inArray(type, $(this).attr('data-srt-types').split(' ')) === -1);
		});

		if (boolean) {
			addYesAndNo();
		} else {
			removeYesAndNo();
		}

		$table.toggleClass('srt-boolean', boolean);
		$table.find('tbody tr').each(function () {
			var $row = $(this);
			var fixed = boolean && isYesOrNo($row);

			$row.toggleClass('srt-row-extra', boolean && !fixed);
			field($row, 'value').add(field($row, 'label')).prop('readonly', fixed);
		});
		stripe();

		// A question can only depend on one asked on an earlier step. While the
		// step field is being retyped it holds no number; leave the list be.
		var step = parseInt($step.val(), 10);
		$requires.find('option[data-srt-step]').each(function () {
			if (isNaN(step)) {
				return;
			}

			var later = parseInt($(this).attr('data-srt-step'), 10) >= step;

			$(this).prop('disabled', later).prop('hidden', later);
		});
		if (!isNaN(step) && $requires.find('option:selected').prop('disabled')) {
			$requires.val('');
		}

		// The answer a condition waits for, once there is a condition.
		$form.find('[data-srt-needs-requires]').prop('hidden', !$requires.val());

		// The warning, once an answer shown in the table, or an outdated
		// release, warns.
		var warns = $table.find('tbody tr:not(.srt-row-extra) input[name$="[warn]"]:checked').length > 0
			|| ($warnOutdated.is(':checked') && type === 'phpbb_version');
		$form.find('[data-srt-needs-warning]').prop('hidden', !warns);

		// An editor set up while hidden has no size until it is refreshed.
		$form.find('.CodeMirror').each(function () {
			if (this.CodeMirror && $(this).is(':visible')) {
				this.CodeMirror.refresh();
			}
		});
	}

	// The answers show in their order, also when the form comes back after a
	// failed save, so that dragging one keeps the order of the others. The
	// empty rows go last, out of sight.
	function position($row) {
		return parseInt(field($row, 'position').val(), 10) || 0;
	}

	var $sorted = $table.find('tbody tr').not('.srt-blank-row').get().sort(function (a, b) {
		return position($(a)) - position($(b));
	});
	$table.find('tbody').prepend($sorted);
	$table.find('tbody tr.srt-blank-row').prop('hidden', true);
	$form.find('.srt-add-option').removeAttr('hidden');
	stripe();

	// The Add button shows one empty row at a time, as the last answer.
	$form.on('click', '[data-srt-add-option]', function () {
		var $row = newRow();
		var last = 0;

		$table.find('tbody tr').not('[hidden]').each(function () {
			last = Math.max(last, position($(this)));
		});

		var $hidden = $table.find('tbody tr[hidden]').not($row).first();

		if ($hidden.length) {
			$row.insertBefore($hidden);
		} else {
			$row.appendTo($table.find('tbody'));
		}

		$row.removeClass('srt-blank-row').prop('hidden', false);
		field($row, 'position').val(last + 10);
		stripe();
		field($row, 'value').trigger('focus');
	});

	$type.add($requires).on('change', update);
	$step.on('input change', update);
	$form.on('change', 'input[name$="[warn]"], input[name$="[warnOutdated]"]', update);
	update();
});

/**
 * Drag and drop sorting of the questions and of a question's answers.
 *
 * Rows are dragged by their handle. On the overview, questions can be dropped
 * in any step, or in the "new step" table, and the new order is submitted at
 * once through #srt-order-form. In a question's answers, dropping only
 * renumbers the order fields; the answers are saved with the question.
 *
 * Nothing depends on this: without it the arrows on the overview and the order
 * fields of the answers do the same.
 */
jQuery(function ($) {
	'use strict';

	var $admin = $('#srt-admin');
	var $bodies = $admin.find('tbody[data-srt-sortable]');

	if (!$bodies.length || !('draggable' in document.createElement('tr'))) {
		return;
	}

	$admin.addClass('srt-sortable-on');
	$admin.find('.srt-new-step, .srt-drag-hint').prop('hidden', false);

	var $dragged = null;
	var group = null;
	var before = null;
	var origin = null;
	var dropped = false;
	var submitting = false;

	function rows($tbody) {
		return $tbody.children('tr').not('.srt-placeholder');
	}

	function groupOf($tbody) {
		return $tbody.attr('data-srt-sortable');
	}

	// A string that changes whenever a row of the group moves.
	function snapshot(name) {
		return $bodies.filter('[data-srt-sortable="' + name + '"]').map(function () {
			return rows($(this)).map(function () {
				return $(this).attr('data-srt-id') || $(this).find('input, select').attr('name');
			}).get().join(',');
		}).get().join('|');
	}

	function tidy($tbody) {
		var $rows = rows($tbody).not('[hidden]');

		$tbody.children('.srt-placeholder').prop('hidden', $rows.length > 0);
		$rows.each(function (index) {
			$(this).toggleClass('bg1', index % 2 === 0).toggleClass('bg2', index % 2 === 1);
		});
	}

	function submitOrder() {
		var $form = $('#srt-order-form');

		if (!$form.length || submitting) {
			return;
		}

		submitting = true;

		$bodies.filter('[data-srt-sortable="questions"]').each(function (step) {
			rows($(this)).each(function () {
				$('<input>', {type: 'hidden', name: 'order[' + step + '][]', value: $(this).attr('data-srt-id')}).appendTo($form);
			});
		});

		$form[0].submit();
	}

	function renumber($tbody) {
		rows($tbody).each(function (index) {
			$(this).find('input[name$="[position]"]').val((index + 1) * 10);
		});
	}

	$bodies.each(function () {
		tidy($(this));
	});

	// Only the handle starts a drag, so text in the answers' fields can still
	// be selected with the mouse.
	$bodies.on('mousedown', '.srt-drag-handle', function () {
		$(this).closest('tr').attr('draggable', 'true');
	});

	// A click on a handle that never became a drag must not leave the row
	// draggable, or selecting text in its fields would drag it instead.
	$(document).on('mouseup', function () {
		$admin.find('tr[draggable="true"]').not($dragged).removeAttr('draggable');
	});

	$bodies.on('dragstart', 'tr', function (event) {
		var $row = $(this);

		if (submitting || $row.attr('draggable') !== 'true') {
			event.preventDefault();
			return;
		}

		$dragged = $row;
		group = groupOf($row.parent());
		before = snapshot(group);
		origin = {parent: $row.parent(), next: $row.next()};
		dropped = false;

		$row.addClass('srt-dragging');
		event.originalEvent.dataTransfer.effectAllowed = 'move';
		// Firefox starts no drag without data.
		event.originalEvent.dataTransfer.setData('text/plain', '');
	});

	$bodies.on('dragover', function (event) {
		var $tbody = $(this);

		if (!$dragged || groupOf($tbody) !== group) {
			return;
		}

		event.preventDefault();
		event.originalEvent.dataTransfer.dropEffect = 'move';
		$bodies.removeClass('srt-drop-target');
		$tbody.addClass('srt-drop-target');

		var $source = $dragged.parent();
		var $over = $(event.target).closest('tr');

		if ($over.length && !$over.is($dragged) && $over.parent().is($tbody) && !$over.hasClass('srt-placeholder')) {
			var box = $over[0].getBoundingClientRect();

			if (event.originalEvent.clientY > box.top + box.height / 2) {
				$dragged.insertAfter($over);
			} else {
				$dragged.insertBefore($over);
			}
		} else if (!$source.is($tbody) && (!$over.length || $over.hasClass('srt-placeholder'))) {
			$dragged.appendTo($tbody);
		}

		tidy($tbody);
		if (!$source.is($tbody)) {
			tidy($source);
		}
	});

	$bodies.on('drop', function (event) {
		event.preventDefault();
		dropped = true;
	});

	$(document).on('dragend', function () {
		if (!$dragged) {
			return;
		}

		var $row = $dragged;
		var $moved = $row.parent();
		var name = group;

		$dragged = null;
		group = null;

		$row.removeClass('srt-dragging').removeAttr('draggable');
		$bodies.removeClass('srt-drop-target');

		// Cancelled with Escape or let go outside the tables: the row moved
		// while it was dragged over them, so put it back.
		if (!dropped) {
			if (origin.next.length) {
				$row.insertBefore(origin.next);
			} else {
				$row.appendTo(origin.parent);
			}

			tidy(origin.parent);
			if (!$moved.is(origin.parent)) {
				tidy($moved);
			}

			return;
		}

		if (snapshot(name) === before) {
			return;
		}

		if (name === 'questions') {
			submitOrder();
		} else {
			renumber($row.parent());
		}
	});
});
