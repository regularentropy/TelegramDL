const { Telegraf } = require("telegraf");
const YTDlpWrap = require("yt-dlp-wrap").default;
const fs = require("fs");
const os = require("os");

const version = "0.2.2";
const token = "";

/* Security to prohibit OOM attacks */
const enable_security = true; /* Limit traffic */
const max_duration = 600; /* Maximum video duration in seconds */
const enable_local = false;
const local_dir = "local";
const ytdl_autoupdate = true;

const bot = new Telegraf(token);

const emojii = {
  Down: "\u{2B07}",
  Mark: "\u{2705}",
  Glass: "\u{1F50D}",
  Wave: "\u{1F44B}",
};

let best_audio = [
  "",
  "-o",
  "%(id)s.%(ext)s",
  "-f",
  "bestaudio",
  "-x",
  "--embed-thumbnail",
];

let best_video = ["", "-o", "%(id)s.%(ext)s"];

if (token.length < 1) {
  console.log("teleDL: Access token isn't found");
  return 0;
}

if (os.platform() == "win32") {
  yt_dl_file = "yt-dlp.exe";
} else {
  yt_dl_file = "yt-dlp";
}

if (!fs.existsSync(yt_dl_file)) {
  YTDlpWrap.downloadFromGithub(yt_dl_file);
}

if (enable_local && !fs.existsSync(local_dir)) {
  fs.mkdirSync(local_dir);
}

const ytdl_bin = new YTDlpWrap(yt_dl_file);

bot.start((ctx) =>
  ctx.reply(
    `${emojii.Wave} Hi there! Paste a link with '/dl' argument to download your media`
  )
);

bot.command("version", async (ctx) => {
  let metadata = await ytdl_bin.getVersion();
  await ctx.telegram.sendMessage(
    ctx.message.chat.id,
    `TelegramDL Version: ${version} Alpha\nYoutubeDL Version: ${metadata}\nSource code on https://github.com/regularenthropy/teleDL`
  );
});

bot.command("help", (ctx) => {
  ctx.telegram.sendMessage(
    ctx.message.chat.id,
    `/dl {yt url here} - download media\n/version - show version\n/help - show this help message`
  );
});

bot.command("dl", async (ctx) => {
  var url = splitToUrl(ctx);
  if (!/youtube.com|music.youtube.com/gm.test(url)){
    await ctx.reply("Youtube/Youtube Music link isn't found")
    return
  }
  await ctx.telegram.sendMessage(
    ctx.message.chat.id,
    `Searching for a video ${emojii.Glass}`
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
  await downloadContent(ctx, "video");
});

bot.action("best-audio", async (ctx) => {
  await downloadContent(ctx, "audio");
});

async function downloadContent(ctx, vid_type) {
  const vid_url = ctx.callbackQuery.message.text;
  let metadata = await ytdl_bin.getVideoInfo(vid_url);
  const vid_id = metadata.id;
  var vid_name;
  var ytdl_args;
  if (vid_type == "audio") {
    vid_name = `${vid_id}.opus`;
    ytdl_args = best_audio;
    ytdl_args[0] = vid_url;
  } else {
    vid_name = `${vid_id}.webm`;
    ytdl_args = best_video;
    ytdl_args[0] = vid_url;
  }
  if (enable_security && metadata.duration > max_duration) {
    if (!enable_local) {
      await ctx.reply("File has duration over the setted-up limit");
      return;
    }
  }
  ytdl_bin.exec(ytdl_args).on("close", async () => {
    if (!enable_local) {
      const vid_size = fs.statSync(vid_name).size / (1024 * 1024);
      if (vid_size > 50) {
        await ctx.reply("File size is over the Telegram limit (50MB)");
      } else {
        await ctx.replyWithDocument({
          source: vid_name,
          filename: vid_name,
        });
        fs.rmSync(vid_name, { recursive: true }, (err) => {
          if (err) throw err;
        });
      }
    } else {
      fs.renameSync(vid_name, `${local_dir}/${vid_name}`);
      await ctx.sendMessage("Successfully saved to local drive");
    }
  });
}

function splitToUrl(command) {
  return command.update.message.text.split(" ")[1];
}

// Update yt-dlp every 3 days
setInterval(() => {
  if (ytdl_autoupdate){
    YTDlpWrap.downloadFromGithub(yt_dl_file);
  }
}, 259200000);

bot.launch();