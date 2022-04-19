import { Chess } from "chess.ts";
import ChessImageGenerator from "chess-image-generator-ts";

class CustomChess extends Chess {
    async image(options?: ChessImageGenerator.Options & { url: string }): Promise<ChessImageGenerator> {
        const image: ChessImageGenerator = new ChessImageGenerator();
        await image.loadFEN(this.fen());
        await image.generatePNG(options.url);

        return image;
    }
}

export default CustomChess;