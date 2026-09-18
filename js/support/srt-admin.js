/**
 * Drag and drop sorting for the Support Request Template pages in the team
 * tools (phpbb-website-private #29).
 *
 * Rows are dragged by their handle. On the overview, questions can be dropped
 * in any step, or in the "new step" table, and the new order is submitted at
 * once through #srt-order-form. In a question's answers, dropping only
 * renumbers the order fields; the answers are saved with the question.
 *
 * Nothing depends on this: without it the arrows on the overview and the order
 * fields of the answers do the same.
 */
(function () {
	'use strict';

	function ready(callback) {
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', callback);
		} else {
			callback();
		}
	}

	ready(function () {
		var admin = document.getElementById('srt-admin');

		if (!admin || !('draggable' in document.createElement('tr')) || !Element.prototype.closest) {
			return;
		}

		var bodies = admin.querySelectorAll('tbody[data-srt-sortable]');

		if (!bodies.length) {
			return;
		}

		admin.classList.add('srt-sortable-on');

		var newStep = admin.querySelector('.srt-new-step');
		if (newStep) {
			newStep.hidden = false;
		}

		var dragged = null;
		var dragGroup = null;
		var before = null;
		var origin = null;
		var dropped = false;
		var submitting = false;

		// Drag events can target a text node in some browsers, which has no
		// closest().
		function element(target) {
			if (!target) {
				return null;
			}

			return target.nodeType === 1 ? target : target.parentElement;
		}

		function rows(tbody) {
			return Array.prototype.filter.call(tbody.children, function (row) {
				return row.tagName === 'TR' && !row.classList.contains('srt-placeholder');
			});
		}

		function snapshot(group) {
			return Array.prototype.map.call(admin.querySelectorAll('tbody[data-srt-sortable="' + group + '"]'), function (tbody) {
				return rows(tbody).map(function (row) {
					return row.getAttribute('data-srt-id') || row.querySelector('input, select').name;
				}).join(',');
			}).join('|');
		}

		function tidy(tbody) {
			var placeholder = tbody.querySelector('.srt-placeholder');
			var list = rows(tbody);

			if (placeholder) {
				placeholder.hidden = list.length > 0;
			}

			list.forEach(function (row, index) {
				row.classList.toggle('bg1', index % 2 === 0);
				row.classList.toggle('bg2', index % 2 === 1);
			});
		}

		function clearTargets() {
			Array.prototype.forEach.call(bodies, function (tbody) {
				tbody.classList.remove('srt-drop-target');
			});
		}

		function submitOrder() {
			var form = document.getElementById('srt-order-form');

			if (!form || submitting) {
				return;
			}

			submitting = true;

			var steps = admin.querySelectorAll('tbody[data-srt-sortable="questions"]');

			Array.prototype.forEach.call(steps, function (tbody, step) {
				rows(tbody).forEach(function (row) {
					var input = document.createElement('input');
					input.type = 'hidden';
					input.name = 'order[' + step + '][]';
					input.value = row.getAttribute('data-srt-id');
					form.appendChild(input);
				});
			});

			form.submit();
		}

		function renumber(tbody) {
			rows(tbody).forEach(function (row, index) {
				var position = row.querySelector('input[name$="[position]"]');

				if (position) {
					position.value = (index + 1) * 10;
				}
			});
		}

		Array.prototype.forEach.call(bodies, function (tbody) {
			tidy(tbody);

			// Only the handle starts a drag, so text in the answers' fields
			// can still be selected with the mouse.
			tbody.addEventListener('mousedown', function (event) {
				var target = element(event.target);
				var handle = target ? target.closest('.srt-drag-handle') : null;

				if (handle) {
					handle.closest('tr').draggable = true;
				}
			});

			tbody.addEventListener('dragstart', function (event) {
				var target = element(event.target);
				var row = target ? target.closest('tr') : null;

				if (submitting || !row || !row.draggable) {
					event.preventDefault();
					return;
				}

				dragged = row;
				origin = {parent: row.parentNode, next: row.nextSibling};
				dropped = false;
				dragGroup = tbody.getAttribute('data-srt-sortable');
				before = snapshot(dragGroup);
				row.classList.add('srt-dragging');
				event.dataTransfer.effectAllowed = 'move';
				// Firefox starts no drag without data.
				event.dataTransfer.setData('text/plain', '');
			});

			tbody.addEventListener('dragover', function (event) {
				if (!dragged || tbody.getAttribute('data-srt-sortable') !== dragGroup) {
					return;
				}

				event.preventDefault();
				event.dataTransfer.dropEffect = 'move';
				clearTargets();
				tbody.classList.add('srt-drop-target');

				var target = element(event.target);
				var over = target ? target.closest('tr') : null;
				var source = dragged.parentNode;

				if (over && over !== dragged && over.parentNode === tbody && !over.classList.contains('srt-placeholder')) {
					var box = over.getBoundingClientRect();
					var after = event.clientY > box.top + box.height / 2;
					tbody.insertBefore(dragged, after ? over.nextSibling : over);
				} else if (dragged.parentNode !== tbody && (!over || over.classList.contains('srt-placeholder'))) {
					tbody.appendChild(dragged);
				}

				tidy(tbody);
				if (source !== tbody) {
					tidy(source);
				}
			});

			tbody.addEventListener('drop', function (event) {
				event.preventDefault();
				dropped = true;
			});
		});

		// A click on a handle that never became a drag must not leave the row
		// draggable, or selecting text in its fields would drag it instead.
		document.addEventListener('mouseup', function () {
			Array.prototype.forEach.call(admin.querySelectorAll('tr[draggable="true"]'), function (row) {
				if (row !== dragged) {
					row.draggable = false;
				}
			});
		});

		document.addEventListener('dragend', function () {
			if (!dragged) {
				return;
			}

			var row = dragged;
			var group = dragGroup;
			var moved = row.parentNode;
			dragged = null;
			dragGroup = null;

			row.classList.remove('srt-dragging');
			row.draggable = false;
			clearTargets();

			// Cancelled with Escape or let go outside the tables: the row moved
			// while it was dragged over them, so put it back.
			if (!dropped) {
				origin.parent.insertBefore(row, origin.next);
				tidy(origin.parent);
				if (moved !== origin.parent) {
					tidy(moved);
				}

				return;
			}

			if (snapshot(group) === before) {
				return;
			}

			if (group === 'questions') {
				submitOrder();
			} else {
				renumber(row.parentNode);
			}
		});
	});
})();
