# coub-downloader
NodeJS script that downloads coub videos for the specified channel.

Install NodeJS from https://nodejs.org/en/download/current/

Open the command line and navigate inside the directory where `coubNode.js` is located.

Install all required packages
```bash
$ npm install
```

Run the script using this syntax:
```bash
Usage: node coubNode.js channelName coubType
coubType: simples | recoubs

Example:
node coubNode.js animeCoubs77 recoubs
```

Never wrote anything in NodeJS before nor anything with async/await so it can be still improved.  
It just downloads the videos using the https://github.com/TeeSeal/coub-dl module.  
It loops the video 12 times OR uses the whole audio track depending on which is shorter.

I have no further plans to update it ;) You can fork or clone it and make changes yourself.
I didn't test it with 404 errors etc. 

What could be improved: 
- async file read
- categorizing the downloaded coub videos
- proper error handling
- add stories handling