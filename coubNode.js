// Make sure to install https://github.com/TeeSeal/coub-dl , line-reader , node-fetch , and add FFmpeg to the path
// npm i coub-dl
// npm i line-reader
// npm i node-fetch
// https://www.gyan.dev/ffmpeg/builds/ -> ffmpeg-git-essentials.7z -> bin directory -> add it to PATH

const fs = require('fs');
const path = require('path');
const util = require('util');

const Coub = require('coub-dl');
const fetch = require('node-fetch');
const lineReader = require('line-reader');

const COUB_DIR = 'coubs';
const STORAGE_DIR = 'storage';

const sleep = ms => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const readStorage = (filename) => {
    let fileSet = new Set();
    lineReader.eachLine(filename, (rawLine, last) => {
        let line = rawLine.trim();
        fileSet.add(line);
    });
    return fileSet;
}

const fetchCoubs = async (channelName, coubType) => {
    await makeDirs(COUB_DIR);
    await makeDirs(STORAGE_DIR);
    console.log(`Fetching data for ${channelName}`);
    console.log(`Fetching data of type ${coubType}`);
    
    let filename = `./${STORAGE_DIR}/${channelName}-${coubType}.txt`;
    
    let nextPage = 1;
    let totalPages = nextPage;
    let urlSet = null;
    
    fs.stat(filename, (err, stat) => {
        if (err === null)
            urlSet = readStorage(filename);
        else
            urlSet = new Set();
    });
    
    // console.log(`
    // -__-
    // Had to use sleep for 2 seconds ;=;
    // Don't know how to async/await a fileread
    // `);
    await sleep(2000);
    
    if (urlSet.size > 0) {
        nextPage = Math.ceil(urlSet.size / 25);
        totalPages = nextPage;
        console.log(`${filename} loaded. New nextPage = ${nextPage}`);
    }
    
    while (nextPage <= totalPages) {
        let initialUrl = buildUrl(channelName, coubType, nextPage);
        let jsonData = await fetchJsonData(initialUrl);
        
        totalPages = jsonData.total_pages;
        nextPage = jsonData.page + 1;
        let coubs = jsonData.coubs;
        
        for (let i = 0; i < coubs.length; i++) {
            let permalink = coubs[i].permalink;
            if (coubType === 'recoubs')
                permalink = coubs[i].recoub_to.permalink;
            urlSet.add(`https://coub.com/view/${permalink}`);
        }
        
        console.log(`Fetched ${coubs.length} coubs from page ${nextPage - 1}/${totalPages}. Total coub count: ${urlSet.size}`);
        
        let writeStream = fs.createWriteStream(filename);
        urlSet.forEach(url => writeStream.write(`${url}\n`));
        writeStream.end();
     
        await sleep(2000);
    }
    
    saveCoubs(urlSet);
}

const buildUrl = (channelName, coubType, pageNum) => {
    return `https://coub.com/api/v2/timeline/channel/${channelName}?order_by=newest&permalink=${channelName}&type=${coubType}&page=${pageNum}&per_page=25`;
}

const fetchJsonData = async url => {
    return fetch(url).then(
        response => {
            if (response.ok)
                return response.json();
            
            throw new Error('Request failed!');
        }, 
        networkError => {
            console.log(networkError.message)
        });
}

const saveCoubs = async set => {
    console.log('Start');
    console.log(`Amount of URLs: ${set.size}`);
    
    let arr = Array.from(set);
    
    for (let i = 0; i < arr.length; i++) {
        let url = arr[i];
        let permLink = url.split('/').pop();
        let coub = await Coub.fetch(url, 'high');
        let title = coub.metadata.title.replace(/\W+/gi, ' ').trim();
        let path = `./${COUB_DIR}/${permLink}-${title}.mp4`;
        coub.loop(12);
        coub.attachAudio();
        coub.addOption('-shortest');
        coub.addOption('-c:v', 'copy');
        coub.addOption('-c:a', 'copy');
        console.log(`Writing to path: ${path}`);
        await coub.write(path);
        await sleep(2000);
    }

    console.log('End');
}

const makeDirs = async dirName => {
    await fs.promises.mkdir(path.join(__dirname, dirName), {recursive: true})
    .then(() => {
        console.log(`Directory created successfully!: ${path.join(__dirname, COUB_DIR)}`)
    })
    .catch((err) => {
        console.error(err);
    });
}

let argv = process.argv;

if (argv.length != 4) {
    console.warn(`Expected 4 arguments found ${argv.length}`);
    console.warn(`Usage: \n\tnode ${argv[1].split("\\").pop()} channelName coubType`);
    console.warn(`\tcoubType: \n\t\tsimples | recoubs`);
    process.exit(1);
}

fetchCoubs(argv[2].trim(), argv[3].trim());