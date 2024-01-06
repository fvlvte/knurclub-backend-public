const fs = require("fs");
const path = require("path");

const targetFilePath = path.join(__dirname, "../.env.json");

const contents = JSON.parse(fs.readFileSync(targetFilePath, "utf8"));

for (let key in contents) {
  if (contents[key].startsWith("process.env")) {
    contents[key] = process.env[contents[key].replace("process.env.", "")];
  }
}

fs.writeFileSync(targetFilePath, JSON.stringify(contents, null, 4), "utf8");
