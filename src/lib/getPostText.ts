import * as Mastodon from 'tsl-mastodon-api';
const mastodon = new Mastodon.API({access_token: 'PRZhmwmS5fpkXo442UE8SGHv8TL7XOiqjhpOh49heb0', api_url: 'https://mastodon.social/api/v1/'}); // access the Mastodon API using the access token.

/*
	getPostText():

	This function performs a Mastodon API GET request to get the n most recent tweets created by Walt Ruff. Using this, the function formats these strings down into the desired plaintext of a Bluesky post, stripping out all of the unnecessary HTML tag notation and handling formatting such that the text is compatible with Bluesky.

	args: None

	returns: A string representing the desired text of the Bluesky posts we want to create. Text for different posts are delimited by \/ characters. 
*/
export default async function getPostText() 
{
	const limitVal = 15; // The number of posts to get from Mastodon.
	var pReg = new RegExp("</p><p>", "g"); // A regex to deal with <p></p>. This should create a new section in the text, which we do via 2 line breaks.
	var brReg = new RegExp("<br>", "g"); // A regex to deal with <br>. This should go to the next line, which we do via a line break. 
	var quoteReg = new RegExp(`\\\\"`, "g"); // A regex to deal with \". This should be replaced with a " value with no \.
	var andReg = new RegExp("&amp;", "g"); // A regex to deal with &amp;. This should be replaced with &.
	var logoReg = new RegExp("&nbsp;", "g"); // A regex to deal with &nbsp;. Should be deleted.
	var twitterReg = new RegExp("@twitter.com", "g"); // A regex to deal with @twitter.com. Should be deleted.
	var waltRuffReg = new RegExp("@WaltRuff@sportsbots.xyz", "g"); // A regex to deal with Walt Ruff's @. Should be replaced with the bot's @.
	var tagReg = new RegExp("<(:?[^>]+)>", "g"); // A general regex for HTML. Used to get the plaintext value of the mastodon post without tag notation.
	var awaitTweet = await mastodon.getStatuses("109705347025889119", {'limit':limitVal}); //Use the Mastodon API to get a specified number of recent posts from the Mastodon API.
	var string = JSON.stringify(awaitTweet); // Convert the post into a JSON string.
	var objJSON = JSON.parse(string)["json"]; // Convert the JSON string back to a JSON object. Kinda silly, but it doesn't work otherwise. 
	var stringArr = []; // Initialize an empty array that we will store the regexed plaintexts in.
	var urlArr = [];
	var altTextArr = [];
	for (let i = 0; i < limitVal; i++) // Iterate over all the posts we collected using the Mastodon API. 
	{
		if (objJSON[i]["media_attachments"][0] != undefined)
		{
			if (objJSON[i]["media_attachments"][0]["type"] == "image")
			{
				urlArr.push(objJSON[i]["media_attachments"][0]["url"]);
			}
			else if (objJSON[i]["media_attachments"][0]["type"] == "gifv" || objJSON[i]["media_attachments"][0]["type"] == "video")
			{
				urlArr.push(objJSON[i]["media_attachments"][0]["preview_url"]);
			}
			else
			{
				urlArr.push("None");
			}

			if (objJSON[i]["media_attachments"][0]["type"] == "gifv")
			{
				altTextArr.push("This is a thumbnail from an animated GIF on Twitter, because Bluesky does not currently have GIF support.")
			}
			else if (objJSON[i]["media_attachments"][0]["type"] == "video")
			{
				altTextArr.push("This is a thumbnail from a video on Twitter, because Bluesky does not currently have video support.")
			}
			else if (objJSON[i]["media_attachments"][0]["description"] == null)
			{
				altTextArr.push("None");
			}
			else
			{
				altTextArr.push(objJSON[i]["media_attachments"][0]["description"]);
			}
		}
		else
		{
			urlArr.push("None");
			altTextArr.push("None");
		}
		var contentJSON = objJSON[i]["content"]; // Filter through all the values of the JSON object, to get just the content of post i. 
		var contentString = JSON.stringify(contentJSON); // Convert the content of the post into a JSON string.
		contentString = contentString.slice(1,-1); // Remove the quotation marks.
		contentString = contentString.replace(twitterReg, "").replace(waltRuffReg, "notwaltruff.bsky.social").replace(sportsbotsReg, "").replace(logoReg, "").replace(quoteReg, `"`).replace(andReg, "&").replace(pReg, "\n\n").replace(brReg, "\n").replace(tagReg, ""); //Use the ", &, <p>, and <br> regexes to apply appropriate formatting. Then use the general regex to remove the HTML formatting from the mastodon post. 
		if (contentString.includes("GreatClips") || contentString.includes("HarrisTeeter") || contentString.includes("RT ") || contentString.includes("Retweet ") || contentString.includes("retweet ") || contentString.includes("RETWEET "))
		{
			contentString = contentString + "\n\n (Offer not valid on Bluesky.)";
		}
		stringArr.push(contentString); // Add the regexed content to the array of plaintexts.
	}
	var urls = urlArr.join("@#%");
	var strings = stringArr.join("@#%"); // Turn the string array into a single string by joining them with a \/ delimiter. This will be undone when used by bot functions. 
	var alts = altTextArr.join("@#%"); 
	console.log("alts: " + alts);
	var urlsStringsAltsArr = [urls, strings, alts];
	var urlsStringsAlts = urlsStringsAltsArr.join("~~~");
	return urlsStringsAlts; // Return this singular concatenated string. 
}
