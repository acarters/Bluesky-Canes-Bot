# Carolina Hurricanes Bluesky Bot

This is a bot that automatically reposts the Twitter posts of the Carolina Hurricanes to [Bluesky](https://bsky.app/). Because the Twitter API now costs money to use, this bot instead collects data from the Walt Ruff Mastodon API created by sportsbots.xyz. It uses [TypeScript](https://www.typescriptlang.org/) to build the bot and [GitHub Actions](https://docs.github.com/en/actions) to schedule the posts. Although this repository is specifically for Walt Ruff, this codebase could be leveraged to produce bots to repost other Mastodon profiles to Bluesky without too much additional effort.

This bot uses the [Bluesky Bot Template](https://github.com/philnash/bsky-bot) created by [Phil Nash](https://github.com/philnash) as a boilerplate codebase to work from. Thanks, Phil!

* [Current Feature Set](#current-feature-set)
  * [Schedule](#schedule)
  * [Reposting](#reposting)
  * [Iterative Post Clustering](#iterative-post-clustering)
  * [Chunking Long Posts](#chunking-long-posts)
  * [Multimedia](#multimedia)
  * [Links](#links)
  * [Link Cards](#link-cards)
  * [Giveaway Disclaimers](#giveaway-disclaimers)
* [Things To Do](#things-to-do)
  * [Image Compression](#image-compression)
  * [Modularity](#modularity)


## Current Feature Set

### Schedule
This bot uses the GitHub Actions interface to automatically run the code. It has a cron specified to post every 5 minutes, but in reality it is considerably slower in most cases. Average time taken between executions seems to be around 10-15 minutes during normal times, and upwards of 25-45 minutes during busy times.

### Reposting
This bot uses the Mastodon Canes API to collect tweets created by the Canes. The Mastodon API returns content values in HTML, so considerable regex formatting is needed in order to get the content into a plaintext value that can be used by the Bluesky API. This Mastodon API is flawed, leading some posts to not be collected and given to my bot. This is not really a workable problem for me, as my code sees the Mastodon API as a black box, and I am essentially forced to play telephone with the posts through a middleman unless I am willing to spend the money to pay Elon Musk for Twitter API. I cannot guarantee that this bot will repost every post made by the Hurricanes on Twitter. Instead, I guarantee that this bot will repost all posts collected by the Mastodon API.

### Iterative Post Clustering 
Because the execution occurs in inconsistent intervals and it is possible that the Canes post large amounts of posts at a time, this API takes a iterative approach to posting. When executed, the bot collects a constant number of posts already made by the bot, and a constant number of posts from the Mastodon API. The bot checks each Mastodon post, ensuring that they do not match with any of the posts already posted. If the posts match, the post is discarded to avoid duplicates. If the post does not match, this post has not been posted by the bot yet, and the bot posts it. This iterative process goes in reverse sequential order, ensuring that the bot posts old posts before trying to post new posts, ensuring that even during long wait times between executions, the bot does not miss a post.

### Chunking Long Posts
When Elon Musk purchased twitter, he allowed Twitter Blue accounts to post ridiculously long posts. The Carolina Hurricanes are a Twitter Blue member, and sometimes use this feature. However, Bluesky still has a 300 character limit on posts. To remedy this, the Canes bot chunks posts longer than 300 characters into multiple smaller posts, each replied under one another in a thread format. These posts can be up to 294 characters long, and include a 6 character " [.../...]" counter. The bot determines the maximum number of words from the string that can be fit into a post (this approach allows us to avoid splitting posts mid-word), and posts these post chunks to Bluesky iteratively.

### Multimedia
The Hurricanes often post images to go along with their tweets. These images are collected and stored as blobs, and posted. Alt text is also collected and posted when available. Videos and GIFs are currently not available on Bluesky, so their thumbnails are posted instead when posted to Twitter. Multiple images can be collected and posted at a time when applicable.

### Links
Links are often abbreviated on Twitter, rendering them unusable when posted directly as plaintext to Bluesky. Instead, the bot automatically detects when a link has been abbreviated using a regular expression, and replaces it with the full URL stored in the Twitter post's URL card. 

### Link Cards
When an image is not available, posts look better when a preview is given of the URL. This automatically occurs on posts, generating a preview with title, description and thumbnail when a URL exists and an image does not.

### Giveaway Disclaimers
Giveaways performed by the Canes admin are not valid unless there is an external link to the giveaway. The bot detects common keywords related to giveaways from the Canes admin, and adds a disclaimer saying that the giveaway is not valid on bluesky.

## Things To Do
Although this bot is currently up and running on Bluesky, this codebase is still under development. As such, there are changes left to add. Some are listed below:

### Image Compression
Bluesky does not support the same size images as Twitter. When an image is too big, the bot should compress the image such that it is small enough to be posted. As is, the bot just rejects the images entirely.

### Modularity
Although this codebase exists purely to repost the posts of the Carolina Hurricanes, this codebase could serve an additional purpose of being a generic codebase for anyone wanting to create a generic bot that automatically reposts Mastodon posts from a particular account to Bluesky. In order to do this, the codebase should be modified such that it is obvious what small changes must be made to achieve this purpose, and a step-by-step guide in the readme should be provided to allow new readers to leverage my codebase for their own bots. 
