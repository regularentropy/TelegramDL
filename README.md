
## About
This Telegram bot was made with the purpose of downloading media from YouTube/Youtube Music.

## Demonstration
![telebot](https://user-images.githubusercontent.com/89523758/199017350-cd570715-e633-4f68-b198-0d37b2bf3879.gif)

## Normal Launch

### Windows
```sh
git clone https://github.com/regularenthropy/TelegramDL
cd TelegramDL
npm install
node .\main.js
```

### Linux
```sh
git clone https://github.com/regularenthropy/TelegramDL
cd TelegramDL
npm install
node main.js
```

## Docker Deployment

### Build Docker Image
```sh
docker build -t telegram-downloader .
```

### Run Docker Container
```sh
docker run -d --name telegram-downloader -v $(pwd)/config.yml:/usr/src/app/config.yml -e token=your_telegram_bot_token telegram-downloader
```
Replace `your_telegram_bot_token` with your actual bot token.

## Current roadmap
- [X] Make it cross-platform (Currently Windows only)
- [X] Add ability to select between video/audio
- [X] Add local storage support
- [X] Optimize code

## Copyright
Copyright (c) 2022-2024 - regularentropy. All rights reserved.
