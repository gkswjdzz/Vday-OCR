const path = require("path");

let client;

const express = require('express');
const multer  = require('multer');
const { exit } = require("process");
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024
  },
  fileFilter: function(_req, file, cb) {
    checkFileType(file, cb);
  }
});

const app = express();

const init = () => {
  const fs = require('fs');
  const vision = require('@google-cloud/vision');

  if (!process.env['CREDENTIALS']) {
    exit(0)
  }
  fs.writeFileSync(`${__dirname}/key.json`, process.env['CREDENTIALS'].replace(/'/g, "\""));
  client = new vision.ImageAnnotatorClient({
    keyFilename: `${__dirname}/key.json`
  });
  console.log('initialized');
  // process.env['GOOGLE_APPLICATION_CREDENTIALS']=`${__dirname}/key.json`;
};

function checkFileType(file, cb) {
  const filetypes = /jpeg|jpg|png|gif/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // const mimetype = filetypes.test(file.mimetype);

  //if (mimetype && extname) {
  if (extname) {
    return cb(null, true);
  } else {
    cb('Error: Images Only!');
  }
}

async function extractDescription(response) {
  if (response.fullTextAnnotation) {
    const words = response.fullTextAnnotation.text.split('\n');
    return words;
  } else {
    console.log(`This image had no discernable text.`);
    return [];
  }
}

async function getTextFromFile (content) {
  const request = {
    image: {
      content: content,
    },
    features: [{type: 'TEXT_DETECTION'}],
  };

  const response = await client.annotateImage(request);

  if (response.error) {
    console.info(`API Error for ${content}`, response.error);
    return;
  }
  const ret = await extractDescription(response[0]);
  return ret;
}

app.post('/word_extraction', upload.single('base_image'), async function (req, res) {
  const base64 = req.file.buffer.toString('base64');
  const ret = (await getTextFromFile(base64)).join();
  res.send(ret);
})

app.listen(80, async () => {
  init();
  console.log(`Example app listening at http://localhost:${80}`);
})
