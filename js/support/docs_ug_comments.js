/*
 * Not for redistribution
 */

var bbtags = new Array('[b]','[/b]','[i]','[/i]','[u]','[/u]','[quote]','[/quote]','[code]','[/code]','[list]','[/list]','[list=]','[/list]','[img]','[/img]','[url]','[/url]','[flash=]', '[/flash]','[size=]','[/size]');
var form_name = 'add-comment';
var text_name = 'comment_text';

function add_comment_submit(tab, section)
{
	// alert(tab + '.....' + section);

	jQuery.ajax({
		type: "POST",
		url: "index.php",
		data: "mode=add" + "&selected_tab=" + tab + "&selected_sec=" + section + "&comment_text=" + jQuery("#comment_text").val(),
		success: function(html)
		{
			// Reload the comments
			$('#display_comments_block').replaceWith(html);

			//$('#qr_editor_div').css("display","none");
		}
	});
}

function comment_inline_edit(commentID)
{
	jQuery("div[id='comment-body-" + commentID + "']").toggle();
	jQuery("div[id='comment-edit-" + commentID + "']").toggle();
	jQuery("div[id='comment-body-" + commentID + "']").focus();
}

function comment_edit(commentID)
{
	jQuery.ajax({
		type: "POST",
		url: "index.php",
		data: "mode=edit" + "&comment-id=" + commentID + "&new_comment_text=" + jQuery("textarea#textarea-" + commentID + "").val(),
		success: function(html)
		{
			// Reload the comments
			$('#display_comments_block').replaceWith(html);
		}
	});
}

/* Delete */
function comment_delete(commentID)
{
	if (confirm("Are you sure you wish to delete this comment?"))
	{
		jQuery.ajax({
			type: "POST",
			url: "index.php",
			data: "mode=delete" + "&comment_id=" + commentID,
			success: function(html){
				$('#display_comments_block').replaceWith(html);
				return true;
			}
		});
	}
}

/* Approve */
function comment_approve(commentID)
{
	if (confirm("Are you sure you wish to approve this comment?"))
	{
		jQuery.ajax({
			type: "POST",
			url: "index.php",
			data: "mode=approve" + "&comment_id=" + commentID,
			success: function(html){
				$('#display_comments_block').replaceWith(html);
				return true;
			}
		})
	}
}
$(document).ready(function()
{
	jQuery("form#add-comment").submit(function(e){
		e.preventDefault();
		alert('fire2');
		return false;
	})

	jQuery("form[id^='new-form-']").submit(function(e){
		e.preventDefault();
		alert('fire1');
		return false;
	})

	jQuery(body).on('click', "a[id^='delete-']", function()
	{
		var delID = jQuery(this).attr('id').split('-')[1];
		//alert(delID);
		comment_delete(delID);
		return false;
	})

	jQuery(body).on('click', "a[id^='approve-']", function()
	{
		var appID = jQuery(this).attr('id').split('-')[1];
		comment_approve(appID);
		return false;
	})
})

function hide_qr(show)
{
	dE('qr_editor_div');
	dE('qr_showeditor_div');
	/*if (show && document.getElementById('qr_editor_div').style.display != 'none')
	{
		document.getElementsByName('comment_text')[0].focus();
	}*/
	return true;
}
