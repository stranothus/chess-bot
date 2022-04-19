import * as discord from "discord.js";
import * as dotenv from "dotenv";
import { Chess } from "chess.ts";
import ChessImageGenerator from "chess-image-generator-ts";
import * as fs from "fs";

dotenv.config();

const client: discord.Client = new discord.Client({
    "intents": [
        "GUILDS",
        "GUILD_MESSAGES",
        "GUILD_MEMBERS"
    ],
    "partials": [
        "CHANNEL",
        "MESSAGE"
    ]
});

client.on("ready", (): void => {
    console.log(`Client logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (msg: discord.Message): Promise<void> => {
    if(msg.author.bot) return;

    const game: Chess = new Chess();
    const image: ChessImageGenerator = new ChessImageGenerator();
    await image.loadFEN(game.fen());
    await image.generatePNG("./image.png");
    const attachment: discord.MessageAttachment = new discord.MessageAttachment("./image.png", "image.png");

    const embed: discord.MessageEmbed = new discord.MessageEmbed()
        .setImage("attachment://image.png");
        
    const buttons = "ABCDEFGH12345678".split("").map((v: string): discord.MessageButton => new discord.MessageButton()
        .setCustomId(v)
        .setStyle("SECONDARY")
        .setLabel(v)
    );
    const actionRows = [
        new discord.MessageActionRow()
            .setComponents(...buttons.slice(0, 4)),
        new discord.MessageActionRow()
            .setComponents(...buttons.slice(4, 8)),
        new discord.MessageActionRow()
            .setComponents(...buttons.slice(8, 12)),
        new discord.MessageActionRow()
            .setComponents(...buttons.slice(12, 16)),
    ];
    

    const board: discord.Message = await msg.channel.send({
        embeds: [embed],
        components: actionRows,
        files: [ "./image.png" ]
    });

    fs.rmSync("./image.png");

    const filter: discord.CollectorFilter<[discord.MessageComponentInteraction]> = (interaction: discord.ButtonInteraction): boolean => interaction.user.id === msg.author.id;
    const collector = msg.channel.createMessageComponentCollector({ filter });

    let move = "";
    collector.on('collect', async (interaction: discord.ButtonInteraction): Promise<void> => {
        const id = interaction.customId.toLowerCase();
        const regex = /[a-h]/.test(move.split("").reverse()[0]) && move ? /[1-8]/ : /[a-h]/;

        if(regex.test(id)) {
            move += id;

            if(move.length < 4) {
                interaction.reply({
                    content: `Your move so far is ${move}`,
                    ephemeral: true
                });
            } else {
                game.move(move, { sloppy: true });
                const image: ChessImageGenerator = new ChessImageGenerator();
                await image.loadFEN(game.fen());
                await image.generatePNG("./image.png");
                const attachment: discord.MessageAttachment = new discord.MessageAttachment("./image.png", "image.png");
            
                const embed: discord.MessageEmbed = new discord.MessageEmbed()
                    .setImage("attachment://image.png");
                
                await msg.channel.send({
                    content: "Would you like to make this move?",
                    embeds: [embed],
                    components: [new discord.MessageActionRow().setComponents(
                        new discord.MessageButton()
                            .setCustomId("yes")
                            .setStyle("PRIMARY")
                            .setLabel("Yes"),
                        new discord.MessageButton()
                            .setCustomId("no")
                            .setStyle("DANGER")
                            .setLabel("No")

                    )],
                    files: [ "./image.png" ]
                });

                collector.stop();
                const yesorno = msg.channel.createMessageComponentCollector({ filter, max: 1 });

                yesorno.on("collect", (interaction: discord.ButtonInteraction): void => {
                    if(interaction.customId === "yes") {
                        interaction.reply("Move made");
                    } else {
                        interaction.reply("Doing this all over again");
                    }
                });
                
                game.undo();
            }
        } else {
            interaction.reply({
                content: /[1-8]/.test(id) ? "Please select a letter" : "Please select a number",
                ephemeral: true
            });
        }
    });
});

client.login(process.env.TOKEN);