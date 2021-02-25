const express = require('express');
const router = express.Router();
const request = require('sync-request');
const uniqid = require('uniqid');
var fs = require('fs');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
 cloud_name: 'deyw4czpf',
 api_key: '652491259593498',
 api_secret: 'tz5mXMcSbUPLjiBo4oikcnuXnzw' });

// Azure  
const subscriptionKey = '8b77cb66b32d4715a86d150eed7139c5';
const uriBase = 'https://westcentralus.api.cognitive.microsoft.com/face/v1.0/detect';

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

/* POST upload a picture received from frontend */
router.post('/upload', async function (req, res, next) {
  const imagePath = './temp/'+uniqid()+'.jpg';
  const resultCopy = await req.files.snap.mv(imagePath);
  if(!resultCopy) {
    // upload on Cloudinary
    const resultCloudinary = await cloudinary.uploader.upload(imagePath);
    // Delete image from temp storage
    fs.unlinkSync(imagePath);
    // Request to Azure
    const params = {
      returnFaceId: 'true',
      returnFaceLandmarks: 'false',
      returnFaceAttributes: 'age,gender,smile,facialHair,glasses,emotion,hair'
    };
    const options = {
      qs: params,
      body: `{"url": "${resultCloudinary.url}"}`,
      headers: {
          'Content-Type': 'application/json',
          'Ocp-Apim-Subscription-Key' : subscriptionKey
      }
     };
     const resultVisionRaw = await request('POST', uriBase, options);
     let resultVision = await resultVisionRaw.body;
     resultVision = await JSON.parse(resultVision);

     // Analysis & treatment of resultVision
     const faceAnalysis = resultVision[0]["faceAttributes"];
     let person = {
       pictureUrl: resultCloudinary.url,
       age: faceAnalysis["age"] + ' ans',
      };

     const hasGender = faceAnalysis["gender"];
     if (hasGender === 'male') { 
       person.gender = 'Homme';
      } else if (hasGender === 'female') {
        person.gender = 'Femme';
      }

      const hasGlasses = faceAnalysis["glasses"];
      console.log(hasGlasses);
      if (hasGlasses === 'NoGlasses') {
        person.glasses = 'Pas de lunettes'
      } else if (hasGlasses === 'Sunglasses') {
        person.glasses = 'Lunettes de soleil'
      } else if (hasGlasses === 'ReadingGlasses') {
        person.glasses = 'Lunettes de soleil'
      }

      const hasBeard = faceAnalysis["facialHair"]["beard"];
      if (hasBeard > 0.5 && hasBeard < 1) {
        person.beard = 'Barbu'
      } else {
        person.beard = 'Pas de barbe'
      }

      const isSmiling = faceAnalysis["smile"];
      if (isSmiling > 0.7 & isSmiling <1) {
        person.smile = 'Sourire'
      } else { 
        person.smile = 'Pas de sourire'
      }

      const hasHairColor = faceAnalysis["hair"]["hairColor"][0]["color"];
      if (hasHairColor === 'brown') {
        person.hair = 'cheveux châtain'
      } else if (hasHairColor === 'black') {
        person.hair = 'cheveux bruns'
      } else if (hasHairColor === 'blond') {
        person.hair = 'cheveux blonds'
      } else if (hasHairColor === 'red') {
        person.hair = 'cheveux roux'       
      } else if (hasHairColor === 'gray') {
        person.hair = 'cheveux gris'
      }  

    res.json({result: true, message: 'File uploaded!', person } );      
  } else {
    res.json({result: false, message: resultCopy} ); } 
});
module.exports = router;
