import { bskyAccount, bskyService, alternateCardImage } from "./config.js";
import type {
  AtpAgentLoginOpts,
  AtpAgentOptions,
  AppBskyFeedPost,
} from "@atproto/api";
import atproto from "@atproto/api";
const { BskyAgent, RichText } = atproto;
import { AppBskyEmbedVideo, AppBskyVideoDefs, AtpAgent } from "@atproto/api";
import { promises as fs } from "fs";
import axios from "axios";

type BotOptions = 
{
  service: string | URL;
  dryRun: boolean;
};

export default class Bot 
{
  userAgent; // Private value containing our bluesky agent.

  public rootCid: string; // Public variable in the class to store the CID of the most recent non-reply post, the root we need for replies. 
  public rootUri: string; // Public variable in the class to store the URI of the most recent non-reply post, the root we need for replies. 

  static defaultOptions: BotOptions = 
  {
    service: bskyService, // Variable detailing the service we want to initialize the Bluesky agent on.
    dryRun: false, // Change this to true if you want the bot to not actually post to Bluesky for testing purposes.
  } as const; // The options can't be changed mid-execution. Change these manually in source code if you want them to be different.

  /*
    constructor(service):

    This function sets the parameters of the Bot object on initialization.

    args:
      service: An AtpAgentOpts value that specifies what Bluesky service to use.

    returns: void
  */
  constructor(service: AtpAgentOptions["service"]) 
  {
    this.userAgent = new AtpAgent({service: "https://bsky.social"}); // Initialize the Bluesky agent on the specified service. Allows us to interface with the Bluesky API.
    this.rootCid = ""; // Initialize the root CID as the empty string. Only define this as a value when attempting to post a reply.
    this.rootUri = ""; // Initialize the root URI as the empty string. Only define this as a value when attempting to post a reply.
  }

  /*
    login(loginOpts):

    This function logs the Agent into the Bluesky account.

    args:
      loginOpts: an AtpAgentLoginOpts object that specifies the options to be used to login. 

    returns: The output of an Agent.login request.
  */
  async login(loginOpts: AtpAgentLoginOpts) 
  {
    await this.userAgent.login(loginOpts); // Login to Bluesky using the specified login details. Allows us to access Bluesky via the account we are logging in.
  }

  /*
    post(isReply, text):

    This function performs a Bluesky POST request to the agent that has been logged in, posting the plaintext supplied by the text argument. Checks the text first to ensure that the text has not been posted recently by this user, and that the text is not blank. If either of these are the case, return an arbitrary value instead.

    args:
      isReply: boolean value that determines whether the post is made as a reply to the previous post made, or as a root post. Use isReply == 0 for a root post, isReply == 1 for a reply to the previous post.
      text: string or record (but usually string) value that determines the plaintext to post. 

    returns: The output of a successful Agent.post request if successful, int 37 on invalid input.
  */

    async postVideo(
    isReply: boolean, 
    url: string, 
    alt: string,
    text: string | (Partial<AppBskyFeedPost.Record> & Omit<AppBskyFeedPost.Record, "createdAt">)
  ): Promise<void> {

    var postNum = 20; // Specify the number of recent posts to compare from the logged in user's feed.
    var bskyFeedAwait = await this.userAgent.app.bsky.feed.getAuthorFeed({actor: bskyAccount.identifier, limit: postNum,}); // Get a defined number + 2 of most recent posts from the logged in user's feed.
    var bskyFeed = bskyFeedAwait["data"]["feed"]; // Filter down the await values so we are only looking at the feeds.
    for (let i = 0; i < bskyFeed.length; i++) // Consider all collected posts.
      {
        var bskyPost = bskyFeed[i]; // Get the post i from the collected Bluesky feed.
        var bskyRecord = bskyPost["post"]["record"]; // Filter post i down so we are only considering the record.
        var bskyEntries = Object.entries(bskyRecord); // Accessing the values from here is weird, so I put them all in an array and access the one corresponding to text (0,1).
        var bskyText = bskyEntries[bskyEntries.length - 1][1];
        if (text === bskyText || text === "") // Check if the text we are trying to post has already been posted in the last postNum posts, or is empty. Might change empty conditional if I get images working.  
        {
          console.log("failed on case " + i + " in video post");
          return;
        }
      }

    var metadataArr = alt.split("@#*");
    
    // Fetch the video as a buffer
    const videoResponse = await axios.get(url, { responseType: 'arraybuffer' });
    const videoBuffer = Buffer.from(videoResponse.data);

    // Upload the video
    const { data } = await this.userAgent.com.atproto.repo.uploadBlob(videoBuffer);

    if (!data?.blob) {
      throw new Error("Failed to upload video: no blob returned.");
    }

    console.log("Video uploaded, posting...");

    if (typeof text === "string") 
    {
    const postResponse = await this.userAgent.post({
      text: text,
      langs: ["en"],
      embed: {
        $type: "app.bsky.embed.video",
        video: data.blob,
        aspectRatio: {width: parseInt(metadataArr[0]), height: parseInt(metadataArr[1]),}
      },
    });
    }

  }

  async post
  (
    isReply: boolean, url: string, alt: string, card: string, text:
      | string
      | (Partial<AppBskyFeedPost.Record> &
          Omit<AppBskyFeedPost.Record, "createdAt">)
  ) 
  {
    var img;
    var urls = url.split("!^&");
    var alts = alt.split("!^&");
    var cards = card.split("!^&");
    var cardEmbed;

    const { data: serviceAuth } = await this.userAgent.com.atproto.server.getServiceAuth({aud: 'did:web:video.bsky.app', lxm: 'app.bsky.video.getUploadLimits', exp: Date.now() / 1000 + 60 * 30,},);
    const token = serviceAuth.token;
    const limitsUrl = 'https://video.bsky.app/xrpc/app.bsky.video.getUploadLimits'; 
    const limitsResponse = await axios.get(limitsUrl, {headers: {'Authorization': `Bearer ${token}`}});
    const limits = limitsResponse.data;

    if (urls[0].slice(-3) == "mp4" && parseFloat(alts[0].split("@#*")[2]) < 60 && limits.canUpload == true)
    {
      await this.postVideo(false, urls[0], alts[0], text);
      return 37;
    }
    else
    {
      if (urls[0].slice(-3) == "mp4")
      {
        urls[0] = alts[0].split("@#*")[3];
        if (limits.canUpload == false)
        {
          alts[0] = "The bot has posted its maximum number of videos for the day. This is the thumbnail of the video instead.";
        }
        else
        {
          alts[0] = "The video is too long to be posted on Bluesky. This is the thumbnail of the video instead.";
        }
      }
      if (card != "None" && urls[0] == "None")
      {
        var cardResponse = await axios.get(cards[3], { responseType: 'arraybuffer'});
        var cardBuffer = Buffer.from(cardResponse.data, "utf-8");
          if (cardBuffer.length > 1000000)
          {
            console.log("file too big");
            if (alternateCardImage)
            {
              cardResponse = await axios.get(alternateCardImage, { responseType: 'arraybuffer'});
              cardBuffer = Buffer.from(cardResponse.data, "utf-8");
            }
          }
          const cardUpload = await this.userAgent.com.atproto.repo.uploadBlob(cardBuffer, {encoding: "image/png"});
          var cardObj = {"uri": cards[0], "title": cards[1], "description": cards[2], "thumb": cardUpload["data"]["blob"],};
          cardEmbed = {"$type": "app.bsky.embed.external", "external": cardObj};
      }

      for (var i = 0; i < 4; i++)
      {
        if (urls[i] != "None")
        {
          var response = await axios.get(urls[i], { responseType: 'arraybuffer'});
          var buffer = Buffer.from(response.data, "utf-8");
          if (buffer.length <= 1000000)
          {
            const upload = await this.userAgent.com.atproto.repo.uploadBlob(buffer, {encoding: "image/png"});
            if (img == undefined)
            {
              if (alts[i] != "None")
              {
                img = {images: [{image: upload["data"]["blob"], alt: alts[i],},], $type: "app.bsky.embed.images",};
              }
              else
              {
                img = {images: [{image: upload["data"]["blob"], alt: "",},], $type: "app.bsky.embed.images",};
              }
            }
            else 
            {
              if (alts[i] != "None")
              {
                img["images"].push({image: upload["data"]["blob"], alt: alts[i],});
              }
              else
              {
                img["images"].push({image: upload["data"]["blob"], alt: "",});
              }
            }
          }
        }
      }

      var postNum = 20; // Specify the number of recent posts to compare from the logged in user's feed.
      var bskyFeedAwait = await this.userAgent.app.bsky.feed.getAuthorFeed({actor: bskyAccount.identifier, limit: postNum,}); // Get a defined number + 2 of most recent posts from the logged in user's feed.
      var bskyFeed = bskyFeedAwait["data"]["feed"]; // Filter down the await values so we are only looking at the feeds.
      var bskyFeed0 = bskyFeed[0]; // Select post 0, the most recent post made by this user.
      var bskyPost0 = bskyFeed0["post"]; // Filter down the values of the post so we can look at the params.
      var parentId = {uri: "", cid: ""}; // Initialize the parent ID as 2 empty strings. This should never matter, because it shouldn't be possible to use parentId without assigning it.
      if (isReply == false) // Check if this is not a reply, meaning it is a root post.
      {
        this.rootUri = ""; // Reset the root URI to the empty string, since we are no longer replying under a previous post.
        this.rootCid = ""; // Reset the root CID to the empty string, since we are no longer replying under a previous post.
      }
      else // If this is a reply
      {
        var bskyUri = bskyPost0["uri"]; // Collect the URI from the most recent post by the logged in user.
        var bskyCid = bskyPost0["cid"]; // Collect the CID from the most recent post by the logged in user.
        parentId = {uri: bskyUri, cid: bskyCid}; // Create an ID object using the URI and CID from the most recent post.
        if (this.rootUri == "") // Only change the root once per thread. Root stays constant regardless of if this is post 2 or post 37.
        {
          this.rootUri = bskyUri; // Change the root URI to be the most recent post's URI.
          this.rootCid = bskyCid; // Change the root CID to be the most recent post's CID.
        }
      }
      for (let i = 0; i < bskyFeed.length; i++) // Consider all collected posts.
      {
        var bskyPost = bskyFeed[i]; // Get the post i from the collected Bluesky feed.
        var bskyRecord = bskyPost["post"]["record"]; // Filter post i down so we are only considering the record.
        var bskyEntries = Object.entries(bskyRecord); // Accessing the values from here is weird, so I put them all in an array and access the one corresponding to text (0,1).
        var bskyText = bskyEntries[bskyEntries.length - 1][1];
        if (text === bskyText || text === "") // Check if the text we are trying to post has already been posted in the last postNum posts, or is empty. Might change empty conditional if I get images working.  
        {
          console.log("failed on case " + i);
          return "37"; // Output an arbitrary value that can be treated as a fail code. Could be anything, I picked 37 because I like the number 37. 
        }
      }
      if (typeof text === "string") // Check that text is a string (This should always be the case in this codebase, but it seems to break if I get rid of the option for it to not be.)
      {
        const richText = new RichText({text}); // Create a new RichText object from our text string. Sorta arcane object type detailed in ATProto API.
        await richText.detectFacets(this.userAgent); // Detect facets from the agent.
        var record; // Create empty record variable that we will put our post details into.
        if (isReply == true) // If we are trying to post a reply
        {
          var rootId = {uri: this.rootUri, cid: this.rootCid}; // Format the root URI and root CID from the public object variables into a form that can be used.
          if (urls[0] != "None")
          {
            record = 
            {
              text: richText.text, // Specify the text of our post as the text in the RichText obj (should be our plaintext string)
              facets: richText.facets, // Specify the facets of our post to be the facets of the RichText.
              reply: {root: rootId, parent: parentId,}, // Specify the reply details. Make the root the values from our public root variables, make the parent the ID values collected from this function (the ones from the most recent post)
              embed: img,
            };
          }
          else if (card != "None")
          {
            record = 
            {
              text: richText.text, // Specify the text of our post as the text in the RichText obj (should be our plaintext string)
              facets: richText.facets, // Specify the facets of our post to be the facets of the RichText.
              reply: {root: rootId, parent: parentId,}, // Specify the reply details. Make the root the values from our public root variables, make the parent the ID values collected from this function (the ones from the most recent post)
              embed: cardEmbed,
            }; 
            console.log("record with card");
            console.log(record);
          }
          else
          {
            record = 
            {
              text: richText.text, // Specify the text of our post as the text in the RichText obj (should be our plaintext string)
              facets: richText.facets, // Specify the facets of our post to be the facets of the RichText.
              reply: {root: rootId, parent: parentId,}, // Specify the reply details. Make the root the values from our public root variables, make the parent the ID values collected from this function (the ones from the most recent post)
            }; 
          }
        }
        else // If we are trying to post a root post
        {
          if (urls[0] != "None")
          {
            console.log("there is a url.");
            record = 
            {
              text: richText.text, // Specify the text of our post as the text in the RichText obj (should be our plaintext string)
              facets: richText.facets, // Specify the facets of our post to be the facets of the RichText.
              embed: img,
            };
          }
          else if (card != "None")
          {
            console.log("there is a card.");
            record = 
            {
              text: richText.text, // Specify the text of our post as the text in the RichText obj (should be our plaintext string)
              facets: richText.facets, // Specify the facets of our post to be the facets of the RichText.
              embed: cardEmbed,
            };
            console.log("record with card");
            console.log(record);
          }
          else
          {
            console.log("no url or card");
            record = 
            {
              text: richText.text, // Specify the text of our post as the text in the RichText obj (should be our plaintext string)
              facets: richText.facets, // Specify the facets of our post to be the facets of the RichText.
            }; 
          }
        }
        return this.userAgent.post(record); // Post the record we have specified using the Bluesky agent, return the output from doing this.
      }
      else // If we are trying to post text not in the format of a string. Shouldn't happen in this unmodified codebase, I don't think
      {
        return this.userAgent.post(text); // Post the raw text value using the Bluesky agent, return the output from doing this.
      }
    }
  }

    /*
      run(getPostText, botOptions?):

      This function creates the Bot object, collects recent Mastodon posts from the desired Mastodon account, and queues Bot.post requests. This function is also responsible for parsing text from HTML to plaintext, and chunking text longer than 300 characters.

      args:
        getPostText: function value that returns a string value, which is then parsed out into a String[] value. Used to get the most recent Mastodon posts. 
        botOptions?: optional BotOptions value that allows us to change the settings of the bot as needed. Default is usually fine. 

      returns: void
    */

    static async run(
      getPostText: () => Promise<string>,
      botOptions?: Partial<BotOptions>
    ) 
    {
      const { service, dryRun } = botOptions
        ? Object.assign({}, this.defaultOptions, botOptions) //Set the bot's options.
        : this.defaultOptions;
      const bot = new Bot(service); // Instantiate a constant bot value as a new Bot under the supplied Bluesky service.
      await bot.login(bskyAccount); // Log the bot into the specified Bluesky account determined by the bskyAccount value.
      const mastodonAwait = await getPostText(); // Get the desired number of recent Mastodon posts from the specified user in getPostText.

      var urlsStringsAltsCardsArr = mastodonAwait.split("~~~");
      var mastUrlArr = urlsStringsAltsCardsArr[0].split("@#%");
      var mastodonArr = urlsStringsAltsCardsArr[1].split("@#%");
      var mastAltArr = urlsStringsAltsCardsArr[2].split("@#%");
      var mastCardArr = urlsStringsAltsCardsArr[3].split("@#%");

      if (!dryRun) // Make sure that we don't wanna run the bot without posting. Tbh, I think I might have broken this feature through my changes to the source code. May need to reimplement dry run as a working option when I generalize the code for other purposes.
      { 
        var postCount = 0; // Variable to keep track of how many successful posts occurred.
        for (let i = mastodonArr.length - 1; i >= 0; i--) // Iterate over the recent Mastodon posts in reverse sequential order. -1 may not be necessary, do some more testing.
        {
          if (mastodonArr[i].length <= 300) // Simple case, where a post is 300 characters or less, within the length bounds of a Bluesky post.
          {
            var postVal = await bot.post(false, mastUrlArr[i], mastAltArr[i], mastCardArr[i], mastodonArr[i]); // Run bot.post on this text value, posting to Bluesky if the text is new. Post this as a root value. // Run bot.post on this text value, posting to Bluesky if the text is new. Post this as a root value.
            if (Number(postVal) != 37)
            {
              postCount++;
            }
          }
          else // Complicated case where a post is longer than 300 characters, longer than a valid Bluesky post. 
          {
            var wordArr = mastodonArr[i].split(" "); // Turn the string into an array of words parsed by spaces.
            var chunkLen = 0; // Initialize the length of a chunk to 0.
            var chunkArr = []; // Initialize the array storing the words contained in the chunk to be empty.
            var threadArr = []; // Initialize the array storing the chunk strings to be empty.
            var chunkStr = ""; // Initialize the chunk string to be empty.
            while (wordArr.length != 0) // Loop while there are still words in the array to chunk.
            {
              if(chunkLen + wordArr[0].length <= 294) // If adding the next word in the array to the chunk will not cause it to surpass the max length:
              {
                chunkLen += wordArr[0].length + 1; // Increase the chunk length by the length of the word being added.  
                chunkArr.push(wordArr.shift()); // Add the new word to the end of the chunk array, while also removing it from the front of the word array.
              }
              else  // If the max length is surpassed by adding the next word to the chunk:
              {
                chunkStr = chunkArr.join(" "); // Turn the chunk into a string by delimiting the words with spaces. 
                chunkArr = []; // Empty the chunk array.
                chunkLen = 0; // Reset the chunk length to 0.
                threadArr.push(chunkStr); // Add the chunk string to the thread array. 
              }
            }
            chunkStr = chunkArr.join(" "); // Turn the last chunk into a string by delimiting the words with spaces.
            threadArr.push(chunkStr); // Add the last chunk string to the thread array.
            var isReply = false; // Create a boolean value to determine if we want to post a root post or a reply. Start with a root post. 
            for (var j = 0; j < threadArr.length; j++) // Iterate over all of the chunk strings contained in the thread array.
            {
              var postVal = await bot.post(isReply, mastUrlArr[i], mastAltArr[i], mastCardArr[i], threadArr[j] + " [" + (j+1) + "/" + threadArr.length + "]"); // Post string j in the thread array. Use the boolean variable to determine whether this is a root post or a reply, add a post counter on the end to make the thread easier to read. 
              if (Number(postVal) != 37)
              {
                postCount++;
              }
              if (isReply == false) // If this post was posted as a root, meaning that this is the first iteration:
              {
                isReply = true; // Set the boolean value to post as replies for the remaining iterations.
                mastUrlArr[i] = "None!^&None!^&None!^&None";
                mastAltArr[i] = "None!^&None!^&None!^&None";
              }
            }
          }
        }
        if (postCount == mastodonArr.length)
        {
          await bot.post(false, "None!^&None!^&None!^&None", "None!^&None!^&None!^&None", "None", "ERROR: Repost Detection Glitch.");
        }
      }
      return; // Return void, we're done. 
    }
  }