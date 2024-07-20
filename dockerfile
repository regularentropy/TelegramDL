FROM ubuntu:22.04

RUN apt-get update && \
    apt-get install -y \
    ffmpeg \
    wget \
    curl \
    python3 \
    python3-pip \
    gnupg && \
    pip3 install mutagen && \
    apt-get clean

RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs

RUN wget -O /usr/local/bin/yt-dlp https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD [ "node", "main.js" ]
