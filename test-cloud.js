const fs = require('fs');
const { uploadImageBuffer } = require('./src/utils/imageUploader');
uploadImageBuffer(Buffer.from('hello')).then(console.log).catch(console.error);
