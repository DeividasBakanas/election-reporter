import path from "path";
import fs from "fs";
import readline from "readline";
import { writeFile } from "fs-extra";
import prettier from "prettier";
import { List } from "../types";

const YEAR = 2019;

const transformFile = async () => {
  const lists: List[] = [];

  const fileStream = fs.createReadStream(
    path.resolve(__dirname, `../lists/${YEAR}.txt`)
  );

  const source = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let lastReadList: List | undefined = undefined;
  for await (const line of source) {
    if (line.startsWith("Nr.")) {
      const [_prefix, listNumber, ...rest] = line.split(" ");
      const name = [...rest].join(" ").trim().toLocaleUpperCase();

      if (!lastReadList) {
        lastReadList = {
          name,
          number: Number(listNumber.replace(".", "").trim()),
          members: [],
        };
      }

      if (lastReadList.name !== name) {
        lists.push(lastReadList);
        lastReadList = {
          name,
          number: Number(listNumber),
          members: [],
        };
      }

      continue;
    }

    const [number, name] = line.split(".");

    lastReadList?.members.push({
      name: name.trim().toLocaleUpperCase(),
      position: Number(number.trim()),
    });
  }

  await writeFile(
    path.join(__dirname, `../transformed-data/${YEAR}.json`),
    prettier.format(
      JSON.stringify({
        lists,
        listNames: lists.map(({ name }) => name).sort(),
      }),
      { parser: "json" }
    )
  );
};

transformFile();
