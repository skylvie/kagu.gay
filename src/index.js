import express from "express";
import dotenv from "dotenv";
import crypto from "crypto";
import fs from "fs";
import path from "path";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const CACHE = path.join(process.cwd(), "cache.json");
let cache = {};

if (fs.existsSync(CACHE)) {
    try {
        cache = JSON.parse(fs.readFileSync(CACHE, "utf-8"));
    } catch (err) {
        console.error("Failed to load cache:", err);
        cache = {};
    }
}

function write() {
    try {
        fs.writeFileSync(CACHE, JSON.stringify(cache), "utf-8");
    } catch (err) {
        console.error("Failed to save cache:", err);
    }
}

app.use(express.static("public"));

app.get("/api/v1/kagu", async (req, res) => {
    try {
        // UUID system so people can easily get the source image
        const uuidParam = req.query.uuid;

        if (uuidParam && cache[uuidParam]) {
            const img = await fetch(cache[uuidParam]);
            const buffer = await img.arrayBuffer();

            res.setHeader("Content-Type", "image/jpeg");
            return res.send(Buffer.from(buffer));
        }

        const query = "chou_kaguya-hime!";
        const url = new URL("https://safebooru.org/index.php");

        url.searchParams.append("page", "dapi");
        url.searchParams.append("s", "post");
        url.searchParams.append("q", "index");
        url.searchParams.append("pid", "0");
        url.searchParams.append("limit", "1000");
        url.searchParams.append("tags", query);
        url.searchParams.append("json", "1");

        const response = await fetch(url.href);

        if (!response.ok) {
            throw new Error(`Safebooru API returned status ${response.status}`);
        }

        const text = await response.text();
        if (!text || text.trim() === "") {
            throw new Error("API returned empty response");
        }

        const data = JSON.parse(text);

        if (!Array.isArray(data) || data.length === 0) {
            return res.status(404).json({ error: "No posts found" });
        }

        // Pick a random post from the results
        const post = data[Math.floor(Math.random() * data.length)];

        const uuid = crypto.randomUUID();
        cache[uuid] = post.file_url;

        write();
        res.json({ uuid: uuid });
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});

// For embed
app.get("/api/v1/kagu_old", async (_req, res) => {
    try {
        const query = "chou_kaguya-hime!";
        const url = new URL("https://safebooru.org/index.php");

        url.searchParams.append("page", "dapi");
        url.searchParams.append("s", "post");
        url.searchParams.append("q", "index");
        url.searchParams.append("pid", "0");
        url.searchParams.append("limit", "1000");
        url.searchParams.append("tags", query);
        url.searchParams.append("json", "1");

        const response = await fetch(url.href);

        if (!response.ok) {
            throw new Error(`Safebooru API returned status ${response.status}`);
        }

        const text = await response.text();
        if (!text || text.trim() === "") {
            throw new Error("API returned empty response");
        }

        const data = JSON.parse(text);

        if (!Array.isArray(data) || data.length === 0) {
            return res.status(404).send("No posts found");
        }

        // Pick a random post from the results
        const post = data[Math.floor(Math.random() * data.length)];

        const img = await fetch(post.file_url);
        const buffer = await img.arrayBuffer();

        res.setHeader("Content-Type", "image/jpeg");
        res.send(Buffer.from(buffer));
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});

app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`)
});