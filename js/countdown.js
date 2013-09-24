// <![CDATA[
/*
	Author: DavidIQ
	Website: www.davidiq.com
	License: The author authorized any reproduction, use, or modification as long as this notice is kept intact.
*/
	//Set these according to the event information
	var eventYear = 2010;
	var eventMonth = 8;
	var eventDay = 21;
	var eventHour = 08;  //24 hour format and substract 1
	var eventMinute = 59;  //60 minute format minus 1.  If 0 then enter 59

	function startCountdown()
	{
		var now = new Date();
		var timerID = null;
		var years_left = 0;
		var months_left = 0;
		var days_left = 0;
		var hours_left = 0;
		var minutes_left = 0;
		var seconds_left = 0;
		var curr_hours = now.getHours();
		var curr_minutes = now.getMinutes();
		var curr_seconds = now.getSeconds();
		var curr_date = now.getDate();
		var curr_month = now.getMonth() + 1;
		var curr_year = now.getYear();

		years_left = eventYear - curr_year;
		months_left = eventMonth - curr_month;
		if (months_left < 0)
		{
			months_left = 12 + months_left;
		}

		days_left = eventDay - curr_date;
		switch (curr_month)
		{
			case 4:
			case 6:
			case 9:
			case 11:
				if (days_left < 0)
				{
					days_left = 30 + days_left;
					months_left -= 1;
				}
				break;

			case 2:
				if (days_left < 0)
				{
					days_left = 28 + days_left;
					months_left -= 1;
				}
				//For leap year
				if (curr_year % 4 == 0)
				{
					days_left += 1;
				}
				break;

			default:
				if (days_left < 0)
				{
					days_left = 31 + days_left;
					months_left -= 1;
				}
				break;
		}

		hours_left = eventHour - curr_hours;
		if (hours_left < 0 && months_left > 0 && days_left > 0)
		{
			hours_left = 24 + hours_left;
			if (days_left > 0)
			{
				days_left -= 1;
			}
			minutes_left = eventMinute - curr_minutes;
			seconds_left = 60 - curr_seconds;
		}
		else if (hours_left < 0)
		{
			hours_left = 0;
			minutes_left = 0;
			seconds_left = 0;
		}
		else
		{
			minutes_left = eventMinute - curr_minutes;
			seconds_left = 60 - curr_seconds;
		}

		if (minutes_left < 0)
		{
			minutes_left = 0;
			seconds_left = 0;
		}

		//$('span#spnyears').text(years_left);
		$('span#spnmonths').text(months_left);
		$('span#spndays').text(days_left);
		$('span#spnhours').text(hours_left);
		$('span#spnminutes').text(minutes_left);
		$('span#spnseconds').text(seconds_left);

		timerID = setTimeout("startCountdown()",1000)
	}
	$(document).ready(function() {
		$("div#countdown").show();
		startCountdown();
	});
// ]]>
