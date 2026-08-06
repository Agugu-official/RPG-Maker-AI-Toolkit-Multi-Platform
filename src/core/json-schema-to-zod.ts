import { z } from "zod";

type JsonSchemaType =
  | "array"
  | "boolean"
  | "integer"
  | "null"
  | "number"
  | "object"
  | "string";

export type JsonSchemaProperty = {
  type?: JsonSchemaType | JsonSchemaType[];
  enum?: unknown[];
  const?: unknown;
  description?: string;
  properties?: Record<string, JsonSchemaProperty>;
  items?: JsonSchemaProperty;
  required?: string[];
  additionalProperties?: boolean | JsonSchemaProperty;
  anyOf?: JsonSchemaProperty[];
  oneOf?: JsonSchemaProperty[];
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minItems?: number;
  maxItems?: number;
};

export type JsonObjectSchema = JsonSchemaProperty & {
  type: "object";
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
};

function literalSchema(value: unknown): z.ZodTypeAny {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return z.literal(value);
  }

  // JSON Schema permits structured enum values, whereas Zod literals do not.
  const expected = JSON.stringify(value);
  return z.custom((candidate) => JSON.stringify(candidate) === expected);
}

function unionOf(schemas: z.ZodTypeAny[]): z.ZodTypeAny {
  if (schemas.length === 0) return z.never();
  if (schemas.length === 1) return schemas[0];
  return z.union(schemas as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]);
}

function schemaForType(type: JsonSchemaType, schema: JsonSchemaProperty): z.ZodTypeAny {
  switch (type) {
    case "number": {
      let numberSchema = z.number();
      if (schema.minimum !== undefined) numberSchema = numberSchema.min(schema.minimum);
      if (schema.maximum !== undefined) numberSchema = numberSchema.max(schema.maximum);
      if (schema.exclusiveMinimum !== undefined) numberSchema = numberSchema.gt(schema.exclusiveMinimum);
      if (schema.exclusiveMaximum !== undefined) numberSchema = numberSchema.lt(schema.exclusiveMaximum);
      if (schema.multipleOf !== undefined) numberSchema = numberSchema.multipleOf(schema.multipleOf);
      return numberSchema;
    }
    case "integer": {
      let numberSchema = z.number().int();
      if (schema.minimum !== undefined) numberSchema = numberSchema.min(schema.minimum);
      if (schema.maximum !== undefined) numberSchema = numberSchema.max(schema.maximum);
      if (schema.exclusiveMinimum !== undefined) numberSchema = numberSchema.gt(schema.exclusiveMinimum);
      if (schema.exclusiveMaximum !== undefined) numberSchema = numberSchema.lt(schema.exclusiveMaximum);
      if (schema.multipleOf !== undefined) numberSchema = numberSchema.multipleOf(schema.multipleOf);
      return numberSchema;
    }
    case "boolean":
      return z.boolean();
    case "null":
      return z.null();
    case "array": {
      let arraySchema = z.array(schema.items ? jsonSchemaPropertyToZod(schema.items) : z.unknown());
      if (schema.minItems !== undefined) arraySchema = arraySchema.min(schema.minItems);
      if (schema.maxItems !== undefined) arraySchema = arraySchema.max(schema.maxItems);
      return arraySchema;
    }
    case "object":
      return jsonSchemaToZod(schema as JsonObjectSchema);
    case "string": {
      let stringSchema = z.string();
      if (schema.minLength !== undefined) stringSchema = stringSchema.min(schema.minLength);
      if (schema.maxLength !== undefined) stringSchema = stringSchema.max(schema.maxLength);
      if (schema.pattern !== undefined) stringSchema = stringSchema.regex(new RegExp(schema.pattern));
      return stringSchema;
    }
  }
}

export function jsonSchemaPropertyToZod(schema: JsonSchemaProperty): z.ZodTypeAny {
  let zodSchema: z.ZodTypeAny;

  if (schema.const !== undefined) {
    zodSchema = literalSchema(schema.const);
  } else if (schema.enum && schema.enum.length > 0) {
    zodSchema = unionOf(schema.enum.map(literalSchema));
  } else if (schema.oneOf && schema.oneOf.length > 0) {
    zodSchema = unionOf(schema.oneOf.map(jsonSchemaPropertyToZod));
  } else if (schema.anyOf && schema.anyOf.length > 0) {
    zodSchema = unionOf(schema.anyOf.map(jsonSchemaPropertyToZod));
  } else if (Array.isArray(schema.type)) {
    zodSchema = unionOf(schema.type.map((type) => schemaForType(type, schema)));
  } else if (schema.type) {
    zodSchema = schemaForType(schema.type, schema);
  } else {
    // An omitted JSON Schema type means any JSON value, not a string.
    zodSchema = z.unknown();
  }

  return schema.description ? zodSchema.describe(schema.description) : zodSchema;
}

export function jsonSchemaToZod(schema: JsonObjectSchema): z.ZodObject<z.ZodRawShape> {
  const required = new Set(schema.required || []);
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const [name, property] of Object.entries(schema.properties || {})) {
    const propertySchema = jsonSchemaPropertyToZod(property);
    shape[name] = required.has(name) ? propertySchema : propertySchema.optional();
  }

  const objectSchema = z.object(shape);
  if (schema.additionalProperties === false) return objectSchema.strict();
  if (typeof schema.additionalProperties === "object") {
    return objectSchema.catchall(jsonSchemaPropertyToZod(schema.additionalProperties));
  }

  // JSON Schema allows additional properties unless explicitly disabled.
  return objectSchema.passthrough();
}
