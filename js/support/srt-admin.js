/**
 * The Support Request Template pages in the team tools (phpbb-website-private
 * #29), on the jQuery every page loads. The pages rely on this script.
 */

/**
 * Where the pages report what the server said, in #srt-status.
 */
function srtStatus(message, colour) {
	'use strict';

	jQuery('#srt-status').empty().append(jQuery('<div class="note-box"></div>').addClass(colour).text(message));
}

/**
 * The message in a JSON error answer, or a general one.
 */
function srtErrorMessage(xhr) {
	'use strict';

	try {
		return JSON.parse(xhr.responseText).message || 'Something went wrong. Please reload the page and try again.';
	} catch (e) {
		return 'Something went wrong. Please reload the page and try again.';
	}
}

/**
 * The question form: only the parts that apply to the chosen type are shown.
 * Elements carry the types they apply to in data-srt-types. A yes or no
 * question shows one row per answer, Yes and No, for picking what each does.
 * "Only ask when" offers only questions on steps before the one in the step
 * field. The Add button adds an answer from the form's prototype row.
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
	var $prototype = $('#srt-option-prototype');
	var labels = {yes: 'Yes', no: 'No'};

	// Past the highest index in the table: a form sent back after a failed
	// save can have gaps, where rows were added and taken out again.
	var nextIndex = 0;
	$table.find('tbody input[name$="[value]"]').each(function () {
		var match = /\[options\]\[(\d+)\]/.exec(this.name);

		if (match) {
			nextIndex = Math.max(nextIndex, parseInt(match[1], 10) + 1);
		}
	});

	function field($row, name) {
		return $row.find('input[name$="[' + name + ']"]');
	}

	function position($row) {
		return parseInt(field($row, 'position').val(), 10) || 0;
	}

	function isYesOrNo($row) {
		return labels.hasOwnProperty(field($row, 'value').val());
	}

	// A yes or no question only shows its Yes and No rows.
	function stripe() {
		var boolean = $table.hasClass('srt-boolean');

		$table.find('tbody tr').filter(function () {
			return !boolean || !$(this).hasClass('srt-row-extra');
		}).each(function (index) {
			$(this).toggleClass('bg1', index % 2 === 0).toggleClass('bg2', index % 2 === 1);
		});
	}

	// A new answer, from the prototype, after the others.
	function newRow() {
		var last = 0;

		$table.find('tbody tr').each(function () {
			last = Math.max(last, position($(this)));
		});

		var $row = $($.trim($prototype.html().replace(/__name__/g, String(nextIndex++))));

		field($row, 'position').val(last + 10);
		$row.appendTo($table.find('tbody'));

		return $row;
	}

	// Switching a question to yes or no fills an empty row, or adds one, for
	// each of the two answers it now has, if they are not there yet.
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
			var $row = $rows.filter(function () {
				var $candidate = $(this);

				return field($candidate, 'value').val() === '' && field($candidate, 'label').val() === ''
					&& !field($candidate, 'warn').is(':checked') && !$candidate.find('select[name$="[outcome]"]').val();
			}).first();

			if (!$row.length) {
				$row = newRow();
			}

			field($row, 'value').val(value);
			field($row, 'label').val(label);
			$row.attr('data-srt-auto', value);
		});
	}

	// Switching away from yes or no again takes out the rows filled above, as
	// long as nobody changed them, so they do not become answers unnoticed.
	function removeYesAndNo() {
		$table.find('tbody tr[data-srt-auto]').each(function () {
			var $row = $(this);
			var value = $row.attr('data-srt-auto');

			if (field($row, 'value').val() === value && field($row, 'label').val() === labels[value]) {
				$row.remove();
			} else {
				$row.removeAttr('data-srt-auto');
			}
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
	// failed save, so that dragging one keeps the order of the others.
	$table.find('tbody').append($table.find('tbody tr').get().sort(function (a, b) {
		return position($(a)) - position($(b));
	}));

	$form.on('click', '[data-srt-add-option]', function () {
		var $row = newRow();

		stripe();
		field($row, 'value').trigger('focus');
	});

	$type.add($requires).on('change', update);
	$step.on('input change', update);
	$form.on('change', 'input[name$="[warn]"], input[name$="[warnOutdated]"]', update);
	update();
});

/**
 * A button busy with a request: disabled, with its text saying so.
 */
function srtBusy($button, busy) {
	'use strict';

	var text = $button.is('input') ? 'val' : 'text';

	if (busy && $button.hasClass('srt-busy')) {
		return;
	}

	if (busy) {
		$button.attr('data-srt-label', $button[text]());
		$button[text]($button.attr('data-srt-busy') || 'Saving…');
	} else if ($button.attr('data-srt-label')) {
		$button[text]($button.attr('data-srt-label'));
	}

	$button.prop('disabled', busy).toggleClass('srt-busy', busy);
}

/**
 * Deleting a question or an outcome, with the page's CSRF token. Symfony
 * routes it as DELETE; on the wire it is a POST with _method=DELETE, because
 * the site's .htdev refuses DELETE requests. The server answers with where
 * to go next, or why it did not delete.
 *
 * Saving a form shows that it is busy until the next page comes.
 */
jQuery(function ($) {
	'use strict';

	var $admin = $('#srt-admin');

	$admin.on('click', '[data-srt-delete]', function () {
		var $button = $(this);

		if (!window.confirm($button.attr('data-srt-confirm'))) {
			return;
		}

		srtBusy($button, true);
		srtStatus('Deleting…', 'yellow');

		$.ajax({
			type: 'POST',
			url: $button.attr('data-srt-delete'),
			data: {_method: 'DELETE'},
			headers: {'X-CSRF-Token': $button.attr('data-srt-token')},
			dataType: 'json'
		}).done(function (data) {
			window.location.href = data.redirect;
		}).fail(function (xhr) {
			srtBusy($button, false);
			srtStatus(srtErrorMessage(xhr), 'red');
			// The button is at the bottom of the form, the message at the top.
			document.getElementById('srt-status').scrollIntoView();
		});
	});

	$admin.on('submit', 'form[method="post"]', function () {
		// Not Cancel, which belongs to a form of its own.
		var $buttons = $(this).find('input[type="submit"], button[type="submit"]').not('[form]');

		// Disabled only after the browser has taken the form's fields.
		window.setTimeout(function () {
			$buttons.each(function () {
				srtBusy($(this), true);
			});
		}, 0);
	});

	// Back to a page kept by the browser: its buttons are not busy any more.
	$(window).on('pageshow', function () {
		$admin.find('.srt-busy').each(function () {
			srtBusy($(this), false);
		});
	});
});

/**
 * Sorting the questions on the overview and a question's answers.
 *
 * Rows are dragged by their handle, or moved with the arrow keys while their
 * handle has focus. On the overview, a question can go into any step, or into
 * the "new step" table after the last one, and every move is saved at once:
 * the steps are then renumbered, an emptied step disappears and a new empty
 * one follows the last. A move the server refuses is undone. In a question's
 * answers, a move only renumbers the hidden order fields; the answers are
 * saved with the question.
 */
jQuery(function ($) {
	'use strict';

	var $admin = $('#srt-admin');
	var $steps = $('#srt-steps');
	var $newStep = $steps.find('.srt-new-step').first().clone();

	var $dragged = null;
	var group = null;
	var before = null;
	var beforeSections = null;
	var origin = null;
	var dropped = false;
	var saving = false;

	function bodies(name) {
		return $admin.find('tbody[data-srt-sortable="' + name + '"]');
	}

	function rows($tbody) {
		return $tbody.children('tr').not('.srt-placeholder');
	}

	function groupOf($tbody) {
		return $tbody.attr('data-srt-sortable');
	}

	// Where every row of the group is, to compare with later or to go back to.
	function layout(name) {
		return bodies(name).map(function () {
			return {tbody: $(this), rows: rows($(this)).get()};
		}).get();
	}

	function sameLayout(a, b) {
		if (a.length !== b.length) {
			return false;
		}

		for (var i = 0; i < a.length; i++) {
			if (a[i].rows.length !== b[i].rows.length) {
				return false;
			}

			for (var j = 0; j < a[i].rows.length; j++) {
				if (a[i].rows[j] !== b[i].rows[j]) {
					return false;
				}
			}
		}

		return true;
	}

	function restore(saved) {
		$.each(saved, function (index, place) {
			place.tbody.prepend(place.rows);
			tidy(place.tbody);
		});
	}

	function tidy($tbody) {
		var $rows = rows($tbody);

		$tbody.children('.srt-placeholder').prop('hidden', $rows.length > 0);
		$rows.each(function (index) {
			$(this).toggleClass('bg1', index % 2 === 0).toggleClass('bg2', index % 2 === 1);
		});
	}

	function renumber($tbody) {
		rows($tbody).each(function (index) {
			$(this).find('input[name$="[position]"]').val((index + 1) * 10);
		});
	}

	// The steps as they are, to go back to.
	function stepSections() {
		return $steps.children('.srt-step').map(function () {
			return {
				element: this,
				heading: $(this).find('[data-srt-step-heading]').text(),
				isNew: $(this).hasClass('srt-new-step')
			};
		}).get();
	}

	// Steps as the server numbers them: empty ones gone, and one empty "new
	// step" after the last. Emptied steps are only detached, so a refused
	// move can bring them back.
	function renumberSteps() {
		var number = 0;

		$steps.children('.srt-step').each(function () {
			var $step = $(this);

			if (rows($step.find('tbody')).length === 0) {
				$step.detach();
				return;
			}

			number++;
			$step.removeClass('srt-new-step').find('[data-srt-step-heading]').text('Step ' + number);
		});

		$steps.append($newStep.clone());
	}

	function restoreSteps(sections) {
		$steps.children('.srt-step').detach();

		$.each(sections, function (index, section) {
			$(section.element).toggleClass('srt-new-step', section.isNew)
				.find('[data-srt-step-heading]').text(section.heading);
			$steps.append(section.element);
		});
	}

	// Sends the order of every question. The steps show the new order at
	// once, and go back to how they were if the server refuses it.
	function saveOrder(saved, sections, $row) {
		var order = bodies('questions').map(function () {
			return [rows($(this)).map(function () {
				return $(this).attr('data-srt-id');
			}).get()];
		}).get();

		saving = true;
		renumberSteps();
		$steps.addClass('srt-saving');
		$row.addClass('srt-row-saving');
		srtStatus('Saving the order…', 'yellow');

		$.ajax({
			type: 'POST',
			url: $steps.attr('data-srt-order-url'),
			headers: {'X-CSRF-Token': $steps.attr('data-srt-token')},
			data: {order: order},
			dataType: 'json'
		}).done(function (data) {
			srtStatus(data.message, 'green');
		}).fail(function (xhr) {
			// Putting the steps back takes focus from the handle it was on.
			var focused = document.activeElement;

			restoreSteps(sections);
			restore(saved);
			$(focused).filter('.srt-drag-handle').trigger('focus');
			srtStatus(srtErrorMessage(xhr), 'red');
		}).always(function () {
			saving = false;
			$steps.removeClass('srt-saving');
			$row.removeClass('srt-row-saving');
		});
	}

	function moved(name, $row, saved, sections) {
		if (name === 'questions') {
			saveOrder(saved, sections, $row);
		} else {
			renumber($row.parent());
		}
	}

	// Only the handle starts a drag, so text in the answers' fields can still
	// be selected with the mouse.
	$admin.on('mousedown', 'tbody[data-srt-sortable] .srt-drag-handle', function () {
		$(this).closest('tr').attr('draggable', 'true');
	});

	// A click on a handle that never became a drag must not leave the row
	// draggable, or selecting text in its fields would drag it instead.
	$(document).on('mouseup', function () {
		$admin.find('tr[draggable="true"]').not($dragged).removeAttr('draggable');
	});

	$admin.on('dragstart', 'tbody[data-srt-sortable] > tr', function (event) {
		var $row = $(this);

		if (saving || $row.attr('draggable') !== 'true') {
			event.preventDefault();
			return;
		}

		$dragged = $row;
		group = groupOf($row.parent());
		before = layout(group);
		beforeSections = stepSections();
		origin = {parent: $row.parent(), next: $row.next()};
		dropped = false;

		$row.addClass('srt-dragging');
		event.originalEvent.dataTransfer.effectAllowed = 'move';
		// Firefox starts no drag without data.
		event.originalEvent.dataTransfer.setData('text/plain', '');
	});

	$admin.on('dragover', 'tbody[data-srt-sortable]', function (event) {
		var $tbody = $(this);

		if (!$dragged || groupOf($tbody) !== group) {
			return;
		}

		event.preventDefault();
		event.originalEvent.dataTransfer.dropEffect = 'move';
		$admin.find('tbody.srt-drop-target').removeClass('srt-drop-target');
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
			$dragged.insertBefore($tbody.children('.srt-placeholder').first());
			if (!$dragged.parent().is($tbody)) {
				$dragged.appendTo($tbody);
			}
		}

		tidy($tbody);
		if (!$source.is($tbody)) {
			tidy($source);
		}
	});

	$admin.on('drop', 'tbody[data-srt-sortable]', function (event) {
		event.preventDefault();
		dropped = true;
	});

	$(document).on('dragend', function () {
		if (!$dragged) {
			return;
		}

		var $row = $dragged;
		var name = group;

		$dragged = null;
		group = null;

		$row.removeClass('srt-dragging').removeAttr('draggable');
		$admin.find('tbody.srt-drop-target').removeClass('srt-drop-target');

		// Cancelled with Escape or let go outside the tables: the row moved
		// while it was dragged over them, so put it back.
		if (!dropped) {
			restore(before);
			return;
		}

		if (!sameLayout(before, layout(name))) {
			moved(name, $row, before, beforeSections);
		}
	});

	// The arrow keys on a handle move its row one place up or down; a question
	// at the edge of its step moves on into the step before or after.
	$admin.on('keydown', 'tbody[data-srt-sortable] .srt-drag-handle', function (event) {
		var up = event.which === 38;

		if (saving || $dragged || (!up && event.which !== 40)
			|| event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
			return;
		}

		event.preventDefault();

		var $handle = $(this);
		var $row = $handle.closest('tr');
		var $tbody = $row.parent();
		var name = groupOf($tbody);
		var saved = layout(name);
		var sections = stepSections();
		var $rows = rows($tbody);
		var index = $rows.index($row);
		var $sibling = up ? (index > 0 ? $rows.eq(index - 1) : $()) : $rows.eq(index + 1);

		if ($sibling.length) {
			if (up) {
				$row.insertBefore($sibling);
			} else {
				$row.insertAfter($sibling);
			}
		} else if (name === 'questions') {
			var $all = bodies('questions');
			var target = $all.index($tbody) + (up ? -1 : 1);

			// The only question of the last step would start a new step that
			// is the same one.
			if (target < 0 || target >= $all.length || (target === $all.length - 1 && $rows.length === 1)) {
				return;
			}

			var $target = $all.eq(target);

			if (up) {
				$row.insertBefore($target.children('.srt-placeholder').first());
				if (!$row.parent().is($target)) {
					$row.appendTo($target);
				}
			} else {
				$row.prependTo($target);
			}

			tidy($target);
		} else {
			return;
		}

		tidy($tbody);
		$handle.trigger('focus');
		moved(name, $row, saved, sections);
	});
});
