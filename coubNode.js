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
    let fileArray = [];
    lineReader.eachLine(filename, (rawLine, last) => {
        let line = rawLine.trim();
        fileArray.push(line);
    });
    return fileArray;
}

const fetchCoubs = async (channelName, coubType) => {
    await makeDirs(COUB_DIR);
    await makeDirs(STORAGE_DIR);
    console.log(`Fetching data for ${channelName}`);
    console.log(`Fetching data of type ${coubType}`);
    
    let filename = `./${STORAGE_DIR}/${channelName}.txt`;
    
    let nextPage = 1;
    let totalPages = nextPage;
    let urlArray = null;
    
    fs.stat(filename, (err, stat) => {
        if (err === null)
            urlArray = readStorage(filename);
        else
            urlArray = [];
    });
    
    // console.log(`
    // -__-
    // Had to use sleep for 2 seconds ;=;
    // Don't know how to async/await a fileread
    // `);
    await sleep(2000);
    
    if (urlArray.length > 0) {
        nextPage = urlArray.length / 25;
        totalPages = nextPage;
        console.log(`File loaded. New nextPage = ${nextPage}`);
    }
    
    while (nextPage <= totalPages) {
        let initialUrl = buildUrl(channelName, coubType, nextPage);
        let jsonData = await fetchJsonData(initialUrl);
        
        totalPages = jsonData.total_pages;
        nextPage = jsonData.page + 1;
        let coubs = jsonData.coubs;
        
        console.log(`Fetched ${coubs.length} coubs from page ${nextPage - 1}/${totalPages}. Total coub count: ${urlArray.length}`);
        
        for (let i = 0; i < coubs.length; i++) {
            let permalink = coubs[i].permalink;
            urlArray.push(`https://coub.com/view/${permalink}`);
        }
        
        let writeStream = fs.createWriteStream(filename);
        urlArray.forEach(url => writeStream.write(`${url}\n`));
        writeStream.end();
     
        await sleep(2000);
    }
    
    saveCoubs(urlArray);
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

const saveCoubs = async arr => {
    console.log('Start');
    console.log(`Amount of URLs: ${arr.length}`);
    
    for (let i = 0; i < arr.length; i++) {
        let url = arr[i];
        let permLink = url.split('/').pop();
        let coub = await Coub.fetch(url, 'high');
        let title = coub.metadata.title.trim();
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
    console.warn(`\tcoubType: \n\t\tall | simples | recoubs | stories`);
    process.exit(1);
}

fetchCoubs(argv[2], argv[3]);