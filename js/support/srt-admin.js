/**
 * Drag and drop sorting for the Support Request Template pages in the team
 * tools (phpbb-website-private #29), on the jQuery every page loads.
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
	$admin.find('.srt-new-step').prop('hidden', false);

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
		var $rows = rows($tbody);

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
