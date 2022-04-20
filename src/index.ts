import * as discord from "discord.js";
import * as dotenv from "dotenv";
import CustomChess from "./customChess";
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

interface Game {
    game: CustomChess,
    white: string,
    black: string,
    channel: string
}

let games: Game[] = [];

client.on("messageCreate", async (msg: discord.Message): Promise<void> => {
    if(msg.author.bot) return;

    switch(msg.content.replace(/^\+/, "")?.split(" ")?.[0]?.toLowerCase()) {
        case "start":
            const opponent = msg.content.match(/<@&?(\d{17,19})>/)?.[0].match(/\d+/)[0];

            if(!opponent) {
                await msg.channel.send("Please mention a user to play with");
                return;
            }

            if(games.filter((v: Game): boolean => v.channel === msg.channel.id).length) {
                await msg.channel.send("There is already a game in this channel");
                return;
            }

            const game: CustomChess = new CustomChess();
            await game.image({ url: "./image.png" });
        
            const embed: discord.MessageEmbed = new discord.MessageEmbed()
                .setImage("attachment://image.png");
            
            await msg.channel.send({
                content: `<@${msg.author.id}> make the first move`,
                embeds: [embed],
                files: [ "./image.png" ]
            });

            games.push({
                game: game,
                white: msg.author.id,
                black: opponent,
                channel: msg.channel.id
            });
        break;
        case "move":
            const move = msg.content.replace(/^\+/, "")?.split(" ")?.slice(1).join(" ");
            const currentGame = games.filter((v: Game): boolean => v.channel === msg.channel.id)[0];

            if(currentGame[(currentGame.game.turn() === "w" ? "white" : "black") as keyof Game] !== msg.author.id) {
                await msg.channel.send("This is either not your game or not your turn");
                return;
            }

            if(currentGame.game.move(move, { sloppy: true })) {
                await currentGame.game.image({ url: "./image.png" });

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

                const filter: discord.CollectorFilter<[discord.MessageComponentInteraction]> = (interaction: discord.ButtonInteraction): boolean => interaction.user.id === msg.author.id;
                const yesorno: discord.InteractionCollector<discord.MessageComponentInteraction> = msg.channel.createMessageComponentCollector({ filter, max: 1 });

                yesorno.on("collect", async (interaction: discord.ButtonInteraction): Promise<void> => {
                    if(interaction.customId === "yes") {
                        await interaction.reply("Move made");

                        if(currentGame.game.gameOver()) {
                            await msg.channel.send({
                                content: `Game is over!`,
                                embeds: [embed],
                                files: [ "./image.png" ]
                            });

                            games.splice(games.map((v: Game, i: number): number => currentGame.channel === v.channel ? i : 0).filter((v: number): boolean => !!v)[0]);
                        } else {
                            await msg.channel.send({
                                content: `${currentGame.game.inCheck() ? "Check! " : ""}<@${currentGame[(currentGame.white === msg.author.id ? "black" : "white")]}> your turn`,
                                embeds: [embed],
                                files: [ "./image.png" ]
                            });

                            games[games.map((v: Game, i: number): number => currentGame.channel === v.channel ? i : 0).filter((v: number): boolean => !!v)[0]].game = currentGame.game;
                        }
                    } else {
                        game.undo();
                        await interaction.reply("Doing this all over again");
                    }
                });
            } else {
                msg.channel.send("That is not a valid move");
            }
        break;
    }
});

client.login(process.env.TOKEN);