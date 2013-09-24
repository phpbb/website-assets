window.onscroll = function () {
	if(document.getElementById("contact") != null &&
		document.getElementById("enhancements")!=null &&
		document.getElementById("page-footer")!=null)
	{
		var adTop=document.getElementById("contact").offsetTop;
		var adHeight=document.getElementById("contact").offsetHeight;
		var answerTop=document.getElementById("enhancements").offsetTop;
		var footerTop=document.getElementById("page-footer").offsetTop;

		var ie7Fix=0;

		var ScrollTop = document.body.scrollTop;
		if (ScrollTop == 0)
		{
			if (window.pageYOffset)
				ScrollTop = window.pageYOffset;
			else
				ScrollTop = (document.body.parentElement) ? document.body.parentElement.scrollTop : 0;
		}
		if(ScrollTop>(answerTop+ie7Fix))
		{
			document.getElementById("contact").style.position="fixed";
			document.getElementById("contact").style.top="5px";
		}
		else
		{
			document.getElementById("contact").style.position="relative";
			document.getElementById("contact").style.top=ie7Fix+"px";
		}
		if(answerTop+ie7Fix+adHeight>footerTop)
		{
			document.getElementById("contact").style.top=(footerTop-adHeight)+"px";
		}
	}
}