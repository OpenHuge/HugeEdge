import { readFileSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020";

const [, , schemaPath, dataPath] = process.argv;

if (!schemaPath || !dataPath) {
  throw new Error("usage: validate-json <schema> <data>");
}

const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
const data = JSON.parse(readFileSync(dataPath, "utf8"));
const ajv = new Ajv2020({ allErrors: true, strict: false });
const validate = ajv.compile(schema);

if (!validate(data)) {
  console.error(validate.errors);
  process.exit(1);
}

console.log(`${dataPath} validates against ${schemaPath}`);
