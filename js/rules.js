/**
 * Javascript highlight fragment code
 * By David Lewis (Highway of Life) http://startrekguide.com (c) 2007
 * Inspired by JavaScript highlight code by David Dorward; (http://dorward.me.uk/software/frag/hi.js)
 * copyright 2003 by David Dorward; http://dorward.me.uk
 *
 * Complies with phpBB3 Coding Standards
 * - Correct naming format
 * - Correct bracket placement and spacing
 * Access code removed to simplify script
 * - Refined loops
 * - Removed unused classes
 */

var target_fragment = '';

/* Highlight link target if the visitor arrives at the page with a # */
function highlight_load()
{
	var frag = location.hash.substring(1);

	frag_highlight(frag);
	rules_aliases_highlight(frag);
}

/* Highlight link target from an onclick event after unhighlighting the old one */
function frag_highlight(frag)
{
	var fragment = document.getElementById(frag);

	if (target_fragment.length > 0 && document.getElementById(target_fragment))
	{
		document.getElementById(target_fragment).className = '';
	}

	if (frag.length > 0 && fragment)
	{
		target_fragment = frag;
		fragment.className = 'fragment';
	}
}

/* Get all the url aliases for rules */
function rules_aliases_highlight(frag)
{
		var aliases = document.getElementById('rules').getElementsByTagName('a');

		for (i = 0; i < aliases.length; i++)
		{
			if (aliases[i].getAttribute('name') == frag)
			{
				var alias = aliases[i];
				break;
			}
		}

		if (typeof(alias) == 'undefined')
		{
			return;
		}

		var li = alias;
		do
		{
			li = li.parentNode;
		}
		while (li.tagName !== 'LI')

		li.className += 'fragment';

}

/* Add onclick events to all <a> with hrefs that include a "#" */
function onclick_highlight()
{
	if (document.getElementsByTagName)
	{
		var alinks = document.getElementById('rules').getElementsByTagName('a');
		for (i = 0; i < alinks.length; i++)
		{
			if (alinks[i].getAttribute('href') !== null && alinks[i].getAttribute('href').indexOf('#') >= 0)
			{
				var fragment = alinks[i].getAttribute('href').substring(alinks[i].getAttribute('href').indexOf('#') + 1);

				var e_onclick_function = "frag_highlight('" + fragment + "')";
				var new_function = new Function('e', e_onclick_function);
				alinks[i].onclick = new_function;
			}
		}
	}
}

/* Load the script */
window.onload = function() {
	highlight_load();
	onclick_highlight();
};
