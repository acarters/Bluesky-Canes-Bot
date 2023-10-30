# Walt Ruff Bluesky Bot

This is a bot that automatically reposts the Twitter posts of Carolina Hurricanes reporter, Walt Ruff to [Bluesky](https://bsky.app/). Because the Twitter API now costs money to use, this bot instead collects data from the Walt Ruff Mastodon API created by sportsbots.xyz. It uses [TypeScript](https://www.typescriptlang.org/) to build the bot and [GitHub Actions](https://docs.github.com/en/actions) to schedule the posts. Although this repository is specifically for Walt Ruff, this codebase could be leveraged to produce bots to repost other Mastodon profiles to Bluesky without too much additional effort. I plan to do this for @Canes in the future, once the featureset is sufficiently dense. 

This bot uses the [Bluesky Bot Template](https://github.com/philnash/bsky-bot) created by [Phil Nash](https://github.com/philnash) as a boilerplate codebase to work from. Thanks, Phil!

* [Current Feature Set](#current-feature-set)
  * [Schedule](#schedule)
  * [Reposting](#reposting)
  * [Iterative Post Clustering](#iterative-post-clustering)
  * [Parsing Long Posts](#parsing-long-posts)
* [Things To Do](#things-to-do)
  * [Multimedia](#multimedia)
  * [Better Long Post Parsing](#better-long-post-parsing)
  * [Better RegExes](#better-regexes)
  * [Removing Junk Posts](#removing-junk-posts)
  * [Readability](#readability)
  * [Modularity](#modularity)


## Current Feature Set

### Schedule
This bot uses the GitHub Actions interface to automatically run the code. It has a cron specified to post every 5 minutes, but in reality it is considerably slower in most cases. Average time taken between executions seems to be around 10-15 minutes during normal times, and upwards of 25-45 minutes during busy times.

### Reposting
This bot uses the Mastodon Walt Ruff API to collect tweets created by Walt Ruff. The Mastodon API returns content values in HTML, so considerable regex formatting is needed in order to get the content into a plaintext value that can be used by the Bluesky API. This Mastodon API is flawed, leading some posts to not be collected and given to my bot. This is not really a workable problem for me, as my code sees the Mastodon API as a black box, and I am essentially forced to play telephone with the posts through a middleman unless I am willing to spend the money to pay Elon Musk for Twitter API. Instead, I cannot guarantee that this bot will repost every post made by Walt Ruff on Twitter. Instead, I guarantee that this bot will repost all posts collected by the Mastodon API, with the exception of image-only posts which are manually filtered out due to the current lack of image support.

### Iterative Post Clustering 
Because the execution occurs in inconsistent intervals and it is possible that Walt Ruff posts large amounts of posts at a time, this API takes a iterative approach to posting. When executed, the bot collects a constant number of posts already made by the bot, and a constant number of posts from the Mastodon API. The bot checks each Mastodon post, ensuring that they do not match with any of the posts already posted. If the posts match, the post is discarded to avoid duplicates. If the post does not match, this post has not been posted by the bot yet, and the bot posts it. This iterative process goes in reverse sequential order, ensuring that the bot posts old posts before trying to post new posts, ensuring that even during long wait times between executions, the bot does not miss a post.

### Chunking Long Posts
When Elon Musk purchased twitter, he allowed Twitter Blue accounts to post ridiculously long posts. Walt Ruff is a Twitter Blue member, and sometimes uses this feature. However, Bluesky still has a 300 character limit on posts. To remedy this, the Walt Ruff bot chunks posts longer than 300 characters into multiple smaller posts, each replied under one another in a thread format. These posts can be up to 294 characters long, and include a 6 character " [.../...]" counter. The bot determines the maximum number of words from the string that can be fit into a post (this approach allows us to avoid splitting posts mid-word), and posts these post chunks to Bluesky iteratively.

## Things To Do
Although this bot is currently up and running on Bluesky, this codebase is still very much under development. As such, there are many changes left to add. Some major ones are listed below:

### Multimedia
Walt Ruff often posts images to go along with his tweets. In the future, the Walt Ruff bot should be able to repost these images along with the text content. This seems to be a difficult process to implement, requiring local storage and significant formatting as Bluesky uses blobs in order to gather image data. As such, I want to get plaintext working perfectly before I add this extension. GIFs seem to be on the horizon for Bluesky, so these should also be implemented as needed. Videos are not on Bluesky, so these posts should instead be filtered out entirely until Bluesky receives support for them. 

### Links
It would be nice if the bot could post hyperlinks when Walt Ruff does. However, the Bluesky API is finicky in this regard, so I will likely have to do more research to get these working. 

### Better RegExes
The regular expressions I am using to parse plaintext from HTML tags work well approximately 90% of the time, but sometimes issues leak through the cracks. I have been trying to seal these cracks as they arise, but certain posts require a closer look to determine why they are badly formatted.

### Removing Junk Posts
Certain posts should not be reposted at all, as they are garbage without the context of Twitter posts. Replies are chief among these, with the bot posting nonsense out-of-context responses to posts on Twitter that are pointless clutter without responding to something. These should be filtered out and not reposted by the bot. 

### Modularity
Although this codebase exists purely to repost the posts of Walt Ruff, this codebase could serve an additional purpose of being a generic codebase for anyone wanting to create a generic bot that automatically reposts Mastodon posts from a particular account to Bluesky. In order to do this, the codebase should be modified such that it is obvious what small changes must be made to achieve this purpose, and a step-by-step guide in the readme should be provided to allow new readers to leverage my codebase for their own bots. 
