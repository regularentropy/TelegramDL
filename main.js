const { Telegraf } = require("telegraf");
const YTDlpWrap = require("yt-dlp-wrap").default;
const fs = require("fs");
const os = require("os");
const yaml = require("js-yaml");
const path = require("path");

const config = yaml.load(fs.readFileSync('config.yml', 'utf8'));

config.token = process.env.BOT_TOKEN || config.token;

const EMOJIS = {
  DOWN: "\u{2B07}",
  MARK: "\u{2705}",
  GLASS: "\u{1F50D}",
  WAVE: "\u{1F44B}",
};

const ytDlpArgs = {
  bestAudio: ["", "-o", "%(id)s.%(ext)s", "-f", "bestaudio", "-x", "--embed-thumbnail"],
  bestVideo: ["", "-o", "%(id)s.%(ext)s", "--embed-thumbnail"],
};

if (!config.token) {
  console.error("TelegramDL: Access token isn't found");
  process.exit(1);
}

const ytDlFile = os.platform() === "win32" ? "yt-dlp.exe" : "./yt-dlp";
if (!fs.existsSync(ytDlFile)) {
  YTDlpWrap.downloadFromGithub(ytDlFile)
    .then(() => {
      console.log("yt-dlp downloaded successfully.");
    })
    .catch(err => {
      console.error("Failed to download yt-dlp:", err);
      process.exit(1);
    });
}

const ytdlBin = new YTDlpWrap(ytDlFile);

if (config.local.enabled && !fs.existsSync(config.local.directory)) {
  fs.mkdirSync(config.local.directory);
}

const bot = new Telegraf(config.token);

bot.start((ctx) => {
  console.log(`Start command received from ${ctx.from.username}`);
  ctx.reply(
    `${EMOJIS.WAVE} Hi there! Paste a link with '/dl' argument to download your media`
  );
});

bot.command("version", async (ctx) => {
  console.log(`Version command received from ${ctx.from.username}`);
  const ytDlpVersion = await ytdlBin.getVersion();
  ctx.telegram.sendMessage(
    ctx.message.chat.id,
    `TelegramDL Version: ${config.version} Alpha\nyt-dlp Version: ${ytDlpVersion}\nSource code on https://github.com/regularenthropy/TelegramDL`
  );
});

bot.command("help", (ctx) => {
  console.log(`Help command received from ${ctx.from.username}`);
  ctx.telegram.sendMessage(
    ctx.message.chat.id,
    `/dl {yt url here} - download media\n/version - show version\n/help - show this help message`
  );
});

bot.command("dl", async (ctx) => {
  const url = extractUrlFromCommand(ctx);
  console.log(`Download command received from ${ctx.from.username} with URL: ${url}`);
  if (!isValidYoutubeUrl(url)) {
    console.log("Invalid URL received.");
    await ctx.reply("Youtube/Youtube Music link isn't found");
    return;
  }
  await ctx.telegram.sendMessage(
    ctx.message.chat.id,
    `Searching for a video ${EMOJIS.GLASS}`
  );
  await ctx.reply(url, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "Best Video", callback_data: "best-video" },
          { text: "Best Audio", callback_data: "best-audio" },
        ],
      ],
    },
  });
});

bot.action("best-video", async (ctx) => {
  console.log(`Best video option selected by ${ctx.from.username}`);
  await downloadContent(ctx, "video");
});

bot.action("best-audio", async (ctx) => {
  console.log(`Best audio option selected by ${ctx.from.username}`);
  await downloadContent(ctx, "audio");
});

async function downloadContent(ctx, type) {
  const url = ctx.callbackQuery.message.text;
  console.log(`Starting download for URL: ${url}`);
  try {
    const metadata = await ytdlBin.getVideoInfo(url);
    const id = metadata.id;
    const title = metadata.title.replace(/[\/:*?"<>|]/g, '');
    let fileName;
    let ytdlArgs;

    if (type === "audio") {
      fileName = `${id}.opus`;
      ytdlArgs = ytDlpArgs.bestAudio;
    } else {
      fileName = `${id}.webm`;
      ytdlArgs = ytDlpArgs.bestVideo;
    }

    ytdlArgs[0] = url;

    if (config.security.enabled && metadata.duration > config.security.maxDuration) {
      console.log(`File duration (${metadata.duration}s) exceeds the max duration (${config.security.maxDuration}s).`);
      if (!config.local.enabled) {
        await ctx.reply("File has duration over the set limit");
        return;
      }
    }

    await ctx.reply(`Downloading: ${title}`);
    ytdlBin.exec(ytdlArgs).on("close", async (code) => {
      console.log(`Download process exited with code: ${code}`);
      if (code === 0) {
        const newFileName = `${title}.${path.extname(fileName).substring(1)}`;
        fs.renameSync(fileName, newFileName);
        handleFilePostDownload(ctx, newFileName, title);
      } else {
        ctx.reply("Failed to download the media. Please try again.");
      }
    });
  } catch (error) {
    console.error("Error during download process:", error);
    ctx.reply("An error occurred while processing your request. Please try again.");
  }
}

async function handleFilePostDownload(ctx, fileName, title) {
  const filePath = path.resolve(fileName);
  console.log(`Handling post-download for file: ${filePath}`);
  if (fs.existsSync(filePath)) {
    if (!config.local.enabled) {
      const fileSizeMB = fs.statSync(filePath).size / (1024 * 1024);
      if (fileSizeMB > 50) {
        console.log(`File size (${fileSizeMB}MB) exceeds the Telegram limit (50MB).`);
        ctx.reply("File size is over the Telegram limit (50MB)");
      } else {
        try {
          await ctx.replyWithDocument({
            source: filePath,
            filename: fileName,
          }, {
            caption: `Downloaded: ${title}`
          });
          console.log(`File ${fileName} sent successfully.`);
          fs.rmSync(filePath);
        } catch (error) {
          console.error("Error sending the file:", error);
          ctx.reply("Error sending the file. Please try again.");
        }
      }
    } else {
      fs.renameSync(filePath, path.join(config.local.directory, fileName));
      ctx.telegram.sendMessage(ctx.message.chat.id, "Successfully saved to local drive");
      console.log(`File ${fileName} saved to local drive.`);
    }
  } else {
    console.error("Downloaded file does not exist:", filePath);
    ctx.reply("Error: The downloaded file does not exist.");
  }
}

function extractUrlFromCommand(ctx) {
  return ctx.update.message.text.split(" ")[1];
}

function isValidYoutubeUrl(url) {
  return /youtube.com|music.youtube.com/gm.test(url);
}

setInterval(() => {
  if (config.ytDlpAutoUpdate) {
    console.log("Updating yt-dlp...");
    YTDlpWrap.downloadFromGithub(ytDlFile).then(() => {
      console.log("yt-dlp updated successfully.");
    }).catch(err => {
      console.error("Failed to update yt-dlp:", err);
    });
  }
}, 259200000);

bot.launch().then(() => {
  console.log("Bot launched successfully.");
}).catch(err => {
  console.error("Failed to launch bot:", err);
});
