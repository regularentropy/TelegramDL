const { Telegraf } = require("telegraf");
const YTDlpWrap = require("yt-dlp-wrap").default;
const fs = require("fs");
const os = require("os")

const version = "0.0.2";
const token = "";
let yt_dl_file = "";

const bot = new Telegraf(token);

const emojii = {
  Down: "\u{2B07}",
  Mark: "\u{2705}",
  Glass: "\u{1F50D}",
  Wave: "\u{1F44B}"
};

if (token.length < 1){
  console.log("teleDL: Access token isn't found")
  return 0
}

if (!fs.existsSync(yt_dl_file)) {
  YTDlpWrap.downloadFromGithub(yt_dl_file)
}

if (os.platform() == "win32"){
  yt_dl_file = "yt-dlp.exe"
} else {
  yt_dl_file = "yt-dlp"
}

const ytdl_bin = new YTDlpWrap(yt_dl_file)

bot.start((ctx) =>
  ctx.reply(`${emojii.Wave} Hi there! Paste a link with '/dl' argument to download your audio`)
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
    `/dl {yt url here} - download audio\n/version - show version\n/help - show this help message`
    )
})

bot.command("dl", async (ctx) => {
    var url = splitToUrl(ctx);
    let metadata = await ytdl_bin.getVideoInfo(url);
    await ctx.telegram.sendMessage(
      ctx.message.chat.id,
      `Searching for a video ${emojii.Glass}`
    );
    await ctx.telegram.sendMessage(
      ctx.message.chat.id,
      `Downloading ${emojii.Down}`
    );
    ytdl_bin
      .exec([
        url,
        "-o",
        "%(id)s.%(ext)s",
        "-f",
        "bestaudio",
        "-x",
        "--embed-thumbnail",
      ])
      .on("error", () => {
        ctx.telegram.sendMessage(ctx.message.chat.id, `Something went wrong`)
      })
      .on("close", async () => {
        var song_id = metadata.id;
        var song_title = metadata.title
        await ctx.telegram.sendMessage(
          ctx.message.chat.id,
          `Finished downloading ${song_title}! ${emojii.Mark}`
        );
        await ctx.telegram.sendDocument(ctx.message.chat.id, {
          source: `${song_id}.opus`,
          filename: `${song_id}.opus`,
        });
        fs.rm(`${song_id}.opus`, { recursive:true }, (err)=> {
          if(err) throw err
        })
      });
  })
  .catch((err) => {
    console.log(err)
  });

function splitToUrl(command) {
  return command.update.message.text.split(" ")[1]
}

bot.launch();
