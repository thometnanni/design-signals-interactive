import * as XLSX from "xlsx/xlsx.mjs";
import * as fs from "fs";
import { LoremIpsum } from "lorem-ipsum";
XLSX.set_fs(fs);

const args = process.argv.slice(2);
const GENERATE_MD = args.includes("--generate-md");

const workbook = XLSX.readFile(
  "./preprocessing/data/Romania's Global trade.xlsx",
  {}
);

const worksheet = workbook.Sheets[workbook.SheetNames[0]];

const json = XLSX.utils.sheet_to_json(worksheet);

const rows = json.filter((row) => row["HS92 Section"] === "Chemicals");
// const rows = json.filter(
//   (row) => row["HS92 Section"] != null && row["HS92 Section"] != ""
// );
// const rows = json.filter((row) => row.year != null);

const HS92s = [...new Set(rows.map((row) => row["HS92-4"]))];

const years = [...new Set(rows.map((row) => row["Year"]))].sort();

const descriptionKeys = Object.entries(rows[0])
  .filter(([key, value]) => typeof value !== "number" || key === "NACE-4")
  .map(([key]) => key);

const parameterKeys = Object.entries(rows[0])
  .filter(
    ([key, value]) =>
      typeof value === "number" && key !== "NACE-4" && key !== "Year"
  )
  .map(([key]) => key);

const items = HS92s.map((HS92) => {
  const itemRows = rows.filter((row) => row["HS92-4"] === HS92);
  const itemDescription = Object.fromEntries(
    Object.entries(itemRows[0])
      .filter(([key]) => descriptionKeys.includes(key))
      .map(([key, value]) => {
        if (key === "HS92-4" || key === "HS92-2")
          return [key, value.replace(/HS92/, "").trim()];
        return [key.trim(), value];
      })
  );

  const parameters = Object.fromEntries(
    parameterKeys.map((key) => {
      const values = years.map(
        (year) => itemRows.find((row) => row.Year === year)?.[key]
      );
      return [key.trim(), values];
    })
  );

  parameters.tradeBalance = years.map(
    (year, i) =>
      parameters["Export (Real Value USD)"][i] -
      parameters["Import  (Real Value USD)"][i]
  );

  parameters.tradeBalanceDiff = parameters.tradeBalance.map(
    (balance) => balance - parameters.tradeBalance[0]
  );

  return {
    ...itemDescription,
    parameters,
  };
});

fs.writeFileSync(
  "./src/data.json",
  JSON.stringify({
    years,
    descriptionKeys,
    parameterKeys: [
      ...parameterKeys.map((key) => key.trim()),
      "tradeBalanceDiff",
      "tradeBalance",
    ],
    items,
  })
);

if (GENERATE_MD) {
  const lorem = new LoremIpsum({
    sentencesPerParagraph: {
      max: 4,
      min: 2,
    },
    wordsPerSentence: {
      max: 12,
      min: 4,
    },
    suffix: "\n",
  });

  const verticals = [...new Set(items.map((i) => i["Chemical Vertical"]))];
  verticals.forEach((vertical, i) => {
    const finalYear = years.length - 1;
    const products = items.filter(
      (item) => item["Chemical Vertical"] === vertical
    );
    const lines = [];
    lines.push("---");

    lines.push(
      JSON.stringify(
        {
          _title: vertical,
          products: products.map((product) => {
            return {
              code: product["HS92-4"],
              _name: product["Product Name"],
              label:
                product.parameters.tradeBalanceDiff[finalYear] > 0
                  ? "top"
                  : "bottom",
              years: true,
              ticks: {},
            };
          }),
        },
        null,
        2
      )
    );
    lines.push("---", "");
    lines.push(`## Chemicals used in the _${vertical}_ sector`);
    lines.push("");
    lines.push(lorem.generateParagraphs(3).replace(/\n/g, "\n\n"));

    const fileNumber = (() => {
      const fileNumber = i + 1;
      return fileNumber < 10 ? `0${fileNumber}` : fileNumber;
    })();
    fs.writeFileSync(
      `./public/slides/${fileNumber} ${vertical.replace(
        /[/\\:?*"<>|]/g,
        "_"
      )}.md`,
      lines.join("\n")
    );
  });
}

const slides = fs.readdirSync("./public/slides");

fs.writeFileSync(
  "./src/slides.json",
  JSON.stringify(slides.filter((file) => /.md$/.test(file)).sort())
);

console.log("preprocessing completed");

// const groupedByChemical
