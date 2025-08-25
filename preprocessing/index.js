import * as XLSX from "xlsx/xlsx.mjs";
import * as fs from "fs";
XLSX.set_fs(fs);

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

const slides = fs.readdirSync("./public/slides");

fs.writeFileSync(
  "./src/slides.json",
  JSON.stringify(slides.filter((file) => /.md$/.test(file)).sort())
);

console.log("preprocessing completed");

// const groupedByChemical
