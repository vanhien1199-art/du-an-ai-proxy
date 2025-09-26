const fetch = require('node-fetch');

const apiKey = 'YOUR_API_KEY'; // Thay bằng API Key thật
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

fetch(url)
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error('Lỗi:', err));
