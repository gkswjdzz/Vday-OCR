const path = require("path");

const vision = require('@google-cloud/vision');
const client = new vision.ImageAnnotatorClient();

var express = require('express');
var multer  = require('multer');
const { exit } = require("process");
var storage = multer.memoryStorage();
var upload = multer({
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024
  },
  fileFilter: function(_req, file, cb) {
    checkFileType(file, cb);
  }
});

var app = express();

const init = () => {
  var fs = require('fs');
  if (!process.env['CREDENTIALS']) {
    exit(0)
  }
  fs.writeFileSync(`${__dirname}/key.json`, process.env['CREDENTIALS'].replace(/'/g, "\""));
  process.env['GOOGLE_APPLICATION_CREDENTIALS']=`${__dirname}/key.json`;
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
    return '';
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

app.post('/profile', upload.single('base_image'), async function (req, res) {
  const base64 = req.file.buffer.toString('base64');
  const ret = await getTextFromFile(base64);
  res.send(ret);
})

app.listen(3000, async () => {
  await (new Promise(resolve => setTimeout(resolve, 10000)));
  init();
  console.log(`Example app listening at http://localhost:${3000}`);
})
