#!/usr/bin/env node
/**
 * scripts/generate-contract.js - Gerador Determinístico de Contratos Zod & TypeScript DTOs
 * 
 * Gera esquemas de validação de runtime (Zod) e interfaces estáticas (TypeScript)
 * para blindagem Zero-Trust de endpoints de API.
 * 
 * Uso:
 *   node generate-contract.js POST /api/users
 *   node generate-contract.js POST /api/orders --fields "productId:string,quantity:number,coupon:string?"
 *   node generate-contract.js GET /api/products/:id --out src/contracts/product.contract.ts
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const flags = {};
const cleanArgs = [];

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg.startsWith('--')) {
    const key = arg.slice(2);
    if (args[i + 1] && !args[i + 1].startsWith('--')) {
      flags[key] = args[i + 1];
      i++;
    } else {
      flags[key] = true;
    }
  } else {
    cleanArgs.push(arg);
  }
}

if (cleanArgs.length === 0) {
  console.log(`
🛡️  ROUTE GUARD - GERADOR DE CONTRATOS & DTOs
======================================================
Uso:
  node generate-contract.js <METHOD> <ENDPOINT> [options]

Opções:
  --fields "<f1:type,f2:type>"  Campos do payload (ex: "email:string,age:number,admin:boolean")
  --name <ResourceName>         Nome customizado da entidade (ex: Order, UserProfile)
  --out <caminho.ts>            Salva o contrato diretamente em arquivo
  --json                        Retorna a especificação intermediária em JSON
  --openapi                     Exporta especificação compatível com OpenAPI 3.0 / Swagger JSON

Exemplos:
  node generate-contract.js POST /api/auth/login --fields "email:string,password:string"
  node generate-contract.js GET /api/users/:id
  node generate-contract.js PUT /api/orders/:id --fields "status:string,total:number" --out ./order-contract.ts
`);
  process.exit(1);
}

let method = 'GET';
let endpoint = '';

if (cleanArgs.length === 1) {
  endpoint = cleanArgs[0];
} else {
  method = cleanArgs[0].toUpperCase();
  endpoint = cleanArgs[1];
}

if (!endpoint.startsWith('/')) endpoint = '/' + endpoint;

// Dedução de Nome do Recurso
function deduceResourceName(ep, customName) {
  if (customName) return customName.charAt(0).toUpperCase() + customName.slice(1);
  const segments = ep.split('/').filter(s => s && !s.startsWith(':') && s !== 'api' && s !== 'v1' && s !== 'v2');
  if (segments.length === 0) return 'Resource';
  const raw = segments[segments.length - 1];
  // Singularizar simples (users -> User, orders -> Order)
  let singular = raw;
  if (singular.endsWith('ies')) singular = singular.slice(0, -3) + 'y';
  else if (singular.endsWith('s') && !singular.endsWith('ss')) singular = singular.slice(0, -1);
  return singular.charAt(0).toUpperCase() + singular.slice(1);
}

const resourceName = deduceResourceName(endpoint, flags.name);

// Parsing de campos
function parseFields(fieldStr) {
  if (!fieldStr) return null;
  const items = fieldStr.split(',').map(s => s.trim()).filter(Boolean);
  const fields = [];

  for (const item of items) {
    const [rawKey, rawType] = item.split(':').map(s => s.trim());
    if (!rawKey) continue;
    const isOptional = rawKey.endsWith('?');
    const name = isOptional ? rawKey.slice(0, -1) : rawKey;
    const type = (rawType || 'string').toLowerCase();
    fields.push({ name, type, optional: isOptional });
  }
  return fields;
}

// Fallback heurístico para endpoints conhecidos se nenhum --fields for passado
function getDefaultFields(ep, meth) {
  const epLower = ep.toLowerCase();
  if (epLower.includes('login') || epLower.includes('auth')) {
    return [
      { name: 'email', type: 'string', optional: false, validation: '.email("Email inválido")' },
      { name: 'password', type: 'string', optional: false, validation: '.min(8, "Mínimo 8 caracteres")' }
    ];
  }
  if (meth === 'POST' || meth === 'PUT' || meth === 'PATCH') {
    return [
      { name: 'title', type: 'string', optional: false, validation: '.min(1, "Campo obrigatório")' },
      { name: 'description', type: 'string', optional: true, validation: '.max(500).optional()' },
      { name: 'status', type: 'string', optional: true, validation: '.default("PENDING")' }
    ];
  }
  return [
    { name: 'id', type: 'string', optional: false, validation: '.uuid()' }
  ];
}

const parsedFields = parseFields(flags.fields) || getDefaultFields(endpoint, method);

// Extração de parâmetros de rota (ex: /users/:id)
const pathParams = [];
const pathParamRegex = /:([a-zA-Z0-9_]+)/g;
let pMatch;
while ((pMatch = pathParamRegex.exec(endpoint)) !== null) {
  pathParams.push(pMatch[1]);
}

// Geração de Código Zod
function mapZodType(f) {
  let base = 'z.string()';
  if (f.type === 'number') base = 'z.number()';
  else if (f.type === 'boolean') base = 'z.boolean()';
  else if (f.type === 'date') base = 'z.coerce.date()';
  else if (f.type === 'array') base = 'z.array(z.string())';
  else if (f.type.startsWith('enum(')) {
    const values = f.type.slice(5, -1).split('|').map(v => `'${v.trim()}'`).join(', ');
    base = `z.enum([${values}])`;
  }

  if (f.validation) {
    base += f.validation;
  } else if (f.optional) {
    base += '.optional()';
  }
  return base;
}

const actionPrefix = method === 'POST' ? 'Create' : method === 'PUT' ? 'Update' : method === 'DELETE' ? 'Delete' : 'Get';
const schemaName = `${actionPrefix}${resourceName}Schema`;
const inputTypeName = `${actionPrefix}${resourceName}Input`;
const responseTypeName = `${resourceName}Response`;

let contractCode = `/**
 * CONTRATO ZERO-TRUST: [${method}] ${endpoint}
 * Gerado automaticamente por Route Guard (Antigravity)
 * Data: ${new Date().toISOString()}
 */

import { z } from 'zod';

// ============================================================================
// 1. ESQUEMAS DE VALIDAÇÃO (RUNTIME)
// ============================================================================
`;

if (pathParams.length > 0) {
  contractCode += `
export const ${resourceName}ParamsSchema = z.object({
${pathParams.map(p => `  ${p}: z.string().min(1, "Parâmetro '${p}' é obrigatório"),`).join('\n')}
});
export type ${resourceName}Params = z.infer<typeof ${resourceName}ParamsSchema>;
`;
}

if (method !== 'GET' && method !== 'DELETE') {
  contractCode += `
export const ${schemaName} = z.object({
${parsedFields.map(f => `  ${f.name}: ${mapZodType(f)},`).join('\n')}
});
export type ${inputTypeName} = z.infer<typeof ${schemaName}>;
`;
}

contractCode += `
// Esquema do Payload de Sucesso
export const ${resourceName}DataSchema = z.object({
  id: z.string().uuid(),
${parsedFields.map(f => `  ${f.name}: ${mapZodType({ ...f, optional: false, validation: '' })},`).join('\n')}
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const ${resourceName}ResponseSchema = z.object({
  success: z.literal(true),
  data: ${resourceName}DataSchema,
  timestamp: z.string().datetime(),
});

// Esquemas de Erro Padronizados RFC 7807
export const ApiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }),
  timestamp: z.string().datetime(),
});

// ============================================================================
// 2. INTERFACES TYPESCRIPT (ESTÁTICAS)
// ============================================================================

export type ${responseTypeName} = z.infer<typeof ${resourceName}ResponseSchema>;
export type ApiErrorResponse = z.infer<typeof ApiErrorSchema>;

// ============================================================================
// 3. DEFENSOR DO CONTRATO (HELPER ZERO-TRUST)
// ============================================================================

export const ${resourceName}Contract = {
  endpoint: '${endpoint}' as const,
  method: '${method}' as const,
  ${pathParams.length > 0 ? `paramsSchema: ${resourceName}ParamsSchema,` : ''}
  ${method !== 'GET' && method !== 'DELETE' ? `bodySchema: ${schemaName},` : ''}
  responseSchema: ${resourceName}ResponseSchema,
  errorSchema: ApiErrorSchema,
  
  validateResponse(data: unknown): ${responseTypeName} {
    return ${resourceName}ResponseSchema.parse(data);
  },
  
  safeValidateResponse(data: unknown) {
    return ${resourceName}ResponseSchema.safeParse(data);
  }
};
`;

function generateOpenApiSpec() {
  const openApiPath = endpoint.replace(/:([a-zA-Z0-9_]+)/g, '{$1}');
  const lowerMethod = method.toLowerCase();

  const parameters = pathParams.map(p => ({
    name: p,
    in: 'path',
    required: true,
    schema: { type: 'string' },
    description: `Parâmetro de rota ${p}`
  }));

  const properties = {};
  parsedFields.forEach(f => {
    let prop = { type: 'string' };
    if (f.type === 'number') prop = { type: 'number' };
    else if (f.type === 'boolean') prop = { type: 'boolean' };
    else if (f.type === 'date') prop = { type: 'string', format: 'date-time' };
    else if (f.type === 'array') prop = { type: 'array', items: { type: 'string' } };
    else if (f.type.startsWith('enum(')) {
      prop = {
        type: 'string',
        enum: f.type.slice(5, -1).split('|').map(v => v.trim())
      };
    }
    properties[f.name] = prop;
  });

  const responseProperties = {
    id: { type: 'string', format: 'uuid' },
    ...properties,
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' }
  };

  const operation = {
    summary: `${actionPrefix} ${resourceName}`,
    description: `Endpoint ${method} ${endpoint} com contrato de blindagem Zero-Trust.`,
    tags: [resourceName],
    responses: {
      '200': {
        description: 'Operação bem-sucedida',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: true },
                data: {
                  type: 'object',
                  properties: responseProperties,
                  required: ['id', 'createdAt', 'updatedAt']
                },
                timestamp: { type: 'string', format: 'date-time' }
              },
              required: ['success', 'data', 'timestamp']
            }
          }
        }
      },
      '400': {
        description: 'Erro de validação RFC 7807',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                error: {
                  type: 'object',
                  properties: {
                    code: { type: 'string', example: 'VALIDATION_ERROR' },
                    message: { type: 'string' },
                    details: { type: 'object' }
                  },
                  required: ['code', 'message']
                },
                timestamp: { type: 'string', format: 'date-time' }
              }
            }
          }
        }
      },
      '401': {
        description: 'Não autorizado ou token ausente/inválido'
      }
    }
  };

  if (parameters.length > 0) {
    operation.parameters = parameters;
  }

  if (method !== 'GET' && method !== 'DELETE') {
    operation.requestBody = {
      description: `Payload de entrada para ${actionPrefix} ${resourceName}`,
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: parsedFields.filter(f => !f.optional).map(f => f.name),
            properties
          }
        }
      }
    };
  }

  return {
    openapi: '3.0.3',
    info: {
      title: `${resourceName} API Specification`,
      version: '1.0.0',
      description: `Especificação OpenAPI 3.0 gerada automaticamente pelo Route Guard (Antigravity).`
    },
    paths: {
      [openApiPath]: {
        [lowerMethod]: operation
      }
    }
  };
}

if (flags.openapi) {
  const openApiDoc = generateOpenApiSpec();
  if (flags.out) {
    const outPath = path.resolve(process.cwd(), flags.out);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(openApiDoc, null, 2), 'utf-8');
    console.log(`\n✅ Especificação OpenAPI 3.0 salva com sucesso em: ${outPath}`);
  } else {
    console.log(JSON.stringify(openApiDoc, null, 2));
  }
} else if (flags.out) {
  const outPath = path.resolve(process.cwd(), flags.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, contractCode, 'utf-8');
  console.log(`\n✅ Contrato salvo com sucesso em: ${outPath}`);
  console.log(`📦 Exportações: ${schemaName || ''}, ${responseTypeName}, ${resourceName}Contract`);
} else if (flags.json) {
  console.log(JSON.stringify({
    endpoint,
    method,
    resource: resourceName,
    pathParams,
    fields: parsedFields
  }, null, 2));
} else {
  console.log(contractCode);
}

