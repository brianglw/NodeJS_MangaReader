import express from 'express';
import axios from 'axios';
import bodyParser from 'body-parser';
import {API, TagTypes} from 'nhentai-api';

const app = express();
const port = 3000;
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
const api = new API();

const username = 'windslicer56';
const password = '#AshPiano2001';
const client_id = 'personal-client-a24a9ab3-fb76-4d95-ba03-1b821e02c9fa-28721f1f';
const client_secret = 'GFaygJd3Do7ktHDHNDFxEaBj8eNBnG7A';
 
let list = [];
let chapterList = [];
let hash, data;
let favorites = [];
let access_token;
let refresh_token;

app.listen(port, ()=> {
    console.log("Server running successfully");
})

app.get('/', async (req, res) => {
    res.render('index.ejs', {});
})

app.get('/nsfw', async(req, res) => {
    res.render('nsfw.ejs');
});

app.post('/nsfwRandom', async (req, res) => {
    let chapterList = [];
    await api.getRandomBook().then(book => {
        console.log(book);
        book.pages.forEach((page) => {
            chapterList.push(api.getImageURL(page));
        })
    });
    res.render('nsfwreader.ejs', {chapterList: chapterList});
});

app.post('/nsfwQuery', async (req, res) => {
    const title = req.body.title;
    console.log(title);
    let chapterList = [];
    await api.search(encodeURI(title)).then(async search => {
        console.log(search.books.length);
        for await (const book of search.books) {
            async function fetchBookCover(book) {
                const cover = await api.getImageURL(book.pages[0]);
                console.log(cover);
                chapterList.push(cover);
            }
            await fetchBookCover();
        }
    });
    console.log(chapterList);
    res.render('nsfw.ejs', {results: chapterList});
})

app.post('/query', async (req, res) => {
    list = [];
    const title = req.body.title;
    const baseURL = 'https://api.mangadex.org';
    //GET from https://api.mangadex.org/manga endpoint with title params in config
        //returns data: [{attributes, relationships}, {mangaInfo JSON}, {mangaInfo JSON}, ...]
    const response = await axios.get(`${baseURL}/manga`, {
        params: {
            title: title,
            'includes[]': 'cover_art'
        }
    });
    const queryMangaList = response.data.data;

    //Stores and renders static data about the manga at index.ejs as an JSON
    queryMangaList.forEach(manga => {
        console.log(`https://uploads.mangadex.org/covers/` + manga?.relationships[2]?.attributes?.fileName);
        const data = {
            id: manga?.id || 'N/A',
            cover: `https://uploads.mangadex.org/covers/${manga?.id}/${manga?.relationships[2]?.attributes?.fileName}.256.jpg`,
            title_en: manga?.attributes?.title?.en,
            title_jp: manga?.attributes?.altTitles[0]?.ja ,
            buy_link: manga?.attributes?.links?.amz,
            desc: manga?.attributes?.description?.en,
            genre: manga?.attributes?.publicationDemographic,
            tags: manga?.attributes?.tags.map(tag => {return tag.attributes.name.en}),
            status: manga?.attributes?.status,
            year: manga?.attributes?.year,
            nsfw: manga?.attributes?.contentRating,
            chapters: manga?.attributes?.lastChapter,
        };
        list.push(data);
    });

    res.render('index.ejs', {data: list});
});

app.get('/query', (req, res) => {
    res.render("index.ejs", {data: list});
})

//Fetches a list of chapters from https://api.mangadex.org/manga/{manga-id}/feed
app.post('/chapterlist', async(req,res) => {
    try {
        const mangaID = req.body['mangaID'];
        const api_URL = `https://api.mangadex.org/manga/${mangaID}/feed`;
        console.log('Get chapterlist API URL: ', api_URL);
        
        //make separate requests and send them to chapterList
        const response = await axios.get(api_URL, {
            limit: 500,
            offset: 0
        });

        chapterList = response.data.data.sort((a,b) => {
            return a.attributes.chapter - b.attributes.chapter
        }).map(chapter => {
            return {id: chapter.id, chapter: chapter.attributes.chapter, title: chapter.attributes.title, language: chapter.attributes.translatedLanguage}
        });
        console.log(chapterList);
        res.render("chapterlist.ejs", {chapterList: chapterList});
    } catch(error) {
        console.log("Error: ", error.message);
    }
});

app.get('/chapterlist', (req,res) => {
    res.render("chapterlist.ejs", {chapterID: chapterID || "", chapterTitle: chapterTitle || ""});
})

//will accept chapter ID as the req.body, then render a page of manga chapters
app.post('/reader', async (req, res) => {
    try {
        const chapterID = req.body.chapterID;
        const api_URL = `https://api.mangadex.org/at-home/server/${chapterID}`;
        console.log("Request chapter URL API: ", api_URL);
        const response = await axios.get(api_URL);
        console.log(response.data);
        ({hash, data} = response.data.chapter);
        console.log(hash,data);
        res.render("reader.ejs", {chapterHash: hash, chapterData: data});
    } catch(error) {
        console.log("Error: ", error.message);
    }
})

app.get('/reader', (req, res) => {
    res.render('reader.ejs', {chapterHash: hash, chapterData: data})
})
