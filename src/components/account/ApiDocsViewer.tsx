"use client";

import { useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type JSONSchema = Record<string, unknown>;

type Parameter = {
  name: string;
  in: string;
  required?: boolean;
  description?: string;
  schema?: JSONSchema;
};

type Operation = {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: Parameter[];
  requestBody?: {
    required?: boolean;
    content?: Record<string, { schema?: JSONSchema }>;
  };
  responses?: Record<string, { description?: string }>;
};

type PathItem = {
  parameters?: Parameter[];
} & Record<string, Operation | Parameter[] | undefined>;

type OpenApiSpec = {
  info: { title: string; version: string; description?: string };
  tags?: { name: string; description?: string }[];
  paths: Record<string, PathItem>;
};

// ─── Schema display ───────────────────────────────────────────────────────────

type Prop = {
  name: string;
  schema: JSONSchema;
  required: boolean;
};

function getProps(schema: JSONSchema): Prop[] {
  const properties = schema.properties as Record<string, JSONSchema> | undefined;
  const required = (schema.required as string[]) ?? [];
  if (!properties) return [];
  return Object.entries(properties).map(([name, s]) => ({
    name,
    schema: s,
    required: required.includes(name),
  }));
}

function typeLabel(schema: JSONSchema): string {
  if (schema.const !== undefined) return `"${schema.const}"`;
  if (schema.enum) return (schema.enum as unknown[]).map((v) => `"${v}"`).join(" | ");
  if (schema.oneOf || schema.anyOf) return "one of";
  if (schema.type === "array") {
    const items = schema.items as JSONSchema | undefined;
    return items ? `${typeLabel(items)}[]` : "array";
  }
  if (Array.isArray(schema.type)) return (schema.type as string[]).join(" | ");
  const t = (schema.type as string) ?? "any";
  const format = schema.format ? ` (${schema.format})` : "";
  return t + format;
}

function constraints(schema: JSONSchema): string {
  const parts: string[] = [];
  if (schema.minimum !== undefined) parts.push(`min: ${schema.minimum}`);
  if (schema.maximum !== undefined) parts.push(`max: ${schema.maximum}`);
  if (schema.minLength !== undefined) parts.push(`minLength: ${schema.minLength}`);
  if (schema.maxLength !== undefined) parts.push(`maxLength: ${schema.maxLength}`);
  if (schema.pattern) parts.push(`pattern: ${schema.pattern}`);
  return parts.join(", ");
}

function SchemaView({ schema }: { schema: JSONSchema }) {
  const variants = (schema.oneOf ?? schema.anyOf) as JSONSchema[] | undefined;
  if (variants) {
    return (
      <div className="space-y-2">
        {variants.map((v, i) => (
          <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-500">
              Variant {i + 1}
            </div>
            <div className="px-3 py-2">
              <PropsTable props={getProps(v)} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (schema.type === "object" || schema.properties) {
    const props = getProps(schema);
    if (props.length === 0) return <span className="text-gray-400 text-xs">empty object</span>;
    return <PropsTable props={props} />;
  }

  return (
    <span className="font-mono text-xs text-gray-700">
      {typeLabel(schema)}
    </span>
  );
}

function PropsTable({ props }: { props: Prop[] }) {
  if (props.length === 0) return null;
  return (
    <table className="w-full text-xs">
      <tbody>
        {props.map(({ name, schema, required }) => (
          <tr key={name} className="border-b border-gray-100 last:border-0">
            <td className="py-1.5 pr-3 font-mono text-gray-800 align-top whitespace-nowrap">
              {name}
              {required && (
                <span className="ml-1 text-red-500 text-[10px]">*</span>
              )}
            </td>
            <td className="py-1.5 pr-3 text-gray-500 align-top whitespace-nowrap">
              {typeLabel(schema)}
            </td>
            <td className="py-1.5 text-gray-500 align-top">
              {schema.description != null && (
                <span>{schema.description as string}</span>
              )}
              {constraints(schema) && (
                <span className="ml-1 text-gray-400">{constraints(schema)}</span>
              )}
              {schema.enum != null && (
                <div className="mt-0.5 flex flex-wrap gap-1">
                  {(schema.enum as unknown[]).map((v) => (
                    <code
                      key={String(v)}
                      className="px-1 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px]"
                    >
                      {String(v)}
                    </code>
                  ))}
                </div>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Method badge ─────────────────────────────────────────────────────────────

const METHOD_COLORS: Record<string, string> = {
  get: "bg-emerald-50 text-emerald-700 border-emerald-200",
  post: "bg-blue-50 text-blue-700 border-blue-200",
  patch: "bg-amber-50 text-amber-700 border-amber-200",
  put: "bg-amber-50 text-amber-700 border-amber-200",
  delete: "bg-red-50 text-red-700 border-red-200",
};

function MethodBadge({ method }: { method: string }) {
  const color =
    METHOD_COLORS[method.toLowerCase()] ??
    "bg-gray-100 text-gray-700 border-gray-200";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-bold uppercase tracking-wide ${color}`}
    >
      {method}
    </span>
  );
}

// ─── Response badge ───────────────────────────────────────────────────────────

function statusColor(code: string): string {
  if (code.startsWith("2")) return "text-emerald-600";
  if (code.startsWith("4")) return "text-amber-600";
  if (code.startsWith("5")) return "text-red-600";
  return "text-gray-500";
}

// ─── Endpoint row ─────────────────────────────────────────────────────────────

const HTTP_METHODS = ["get", "post", "patch", "put", "delete"];

function EndpointRow({
  method,
  path,
  op,
  pathParams,
}: {
  method: string;
  path: string;
  op: Operation;
  pathParams: Parameter[];
}) {
  const [open, setOpen] = useState(false);

  const allParams = [
    ...pathParams,
    ...(op.parameters ?? []),
  ];

  const bodySchema = op.requestBody?.content
    ? Object.values(op.requestBody.content)[0]?.schema
    : undefined;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <MethodBadge method={method} />
        <code className="text-sm text-gray-700 font-mono flex-1 truncate">{path}</code>
        {op.summary && (
          <span className="text-xs text-gray-400 hidden sm:block truncate max-w-xs">
            {op.summary}
          </span>
        )}
        <svg
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-gray-200 px-4 py-4 space-y-5 bg-gray-50/50">
          {op.description && (
            <p className="text-sm text-gray-600 leading-relaxed">{op.description}</p>
          )}

          {allParams.length > 0 && (
            <section>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Parameters
              </h4>
              <table className="w-full text-xs">
                <tbody>
                  {allParams.map((p) => (
                    <tr key={`${p.in}-${p.name}`} className="border-b border-gray-100 last:border-0">
                      <td className="py-1.5 pr-3 font-mono text-gray-800 align-top whitespace-nowrap">
                        {p.name}
                        {p.required && (
                          <span className="ml-1 text-red-500 text-[10px]">*</span>
                        )}
                      </td>
                      <td className="py-1.5 pr-3 text-gray-400 align-top whitespace-nowrap">
                        <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-[10px]">
                          {p.in}
                        </span>
                      </td>
                      <td className="py-1.5 pr-3 text-gray-500 align-top whitespace-nowrap">
                        {p.schema ? typeLabel(p.schema) : "string"}
                      </td>
                      <td className="py-1.5 text-gray-500 align-top">
                        {p.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {bodySchema && (
            <section>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Request Body
                {op.requestBody?.required && (
                  <span className="ml-2 text-red-500 normal-case">required</span>
                )}
              </h4>
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <SchemaView schema={bodySchema} />
              </div>
            </section>
          )}

          {op.responses && (
            <section>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Responses
              </h4>
              <div className="space-y-1">
                {Object.entries(op.responses).map(([code, r]) => (
                  <div key={code} className="flex items-baseline gap-3 text-xs">
                    <code className={`font-bold shrink-0 ${statusColor(code)}`}>
                      {code}
                    </code>
                    <span className="text-gray-500">{r.description}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tag section ──────────────────────────────────────────────────────────────

type EndpointEntry = {
  method: string;
  path: string;
  op: Operation;
  pathParams: Parameter[];
};

function TagSection({
  name,
  description,
  endpoints,
  defaultOpen,
}: {
  name: string;
  description?: string;
  endpoints: EndpointEntry[];
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div>
          <span className="font-semibold text-gray-800">{name}</span>
          {description && (
            <span className="ml-3 text-xs text-gray-400">{description}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">
            {endpoints.length}
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {open && (
        <div className="p-4 space-y-2 bg-white">
          {endpoints.map((e) => (
            <EndpointRow key={`${e.method}-${e.path}`} {...e} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main viewer ──────────────────────────────────────────────────────────────

export default function ApiDocsViewer() {
  const [spec, setSpec] = useState<OpenApiSpec | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/openapi")
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load spec (${r.status})`);
        return r.json();
      })
      .then(setSpec)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Failed to load"),
      );
  }, []);

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        {error}
      </div>
    );
  }

  if (!spec) {
    return (
      <div className="flex items-center gap-2 text-gray-400 text-sm">
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        Loading…
      </div>
    );
  }

  const tagMeta: Record<string, string | undefined> = {};
  for (const t of spec.tags ?? []) {
    tagMeta[t.name] = t.description;
  }

  const tagOrder = (spec.tags ?? []).map((t) => t.name);
  const grouped = new Map<string, EndpointEntry[]>();

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    const pathLevelParams = (pathItem.parameters as Parameter[] | undefined) ?? [];

    for (const method of HTTP_METHODS) {
      const op = pathItem[method] as Operation | undefined;
      if (!op) continue;

      const tag = op.tags?.[0] ?? "Other";
      if (!grouped.has(tag)) grouped.set(tag, []);

      const q = search.toLowerCase();
      if (
        q &&
        !path.toLowerCase().includes(q) &&
        !op.summary?.toLowerCase().includes(q) &&
        !op.description?.toLowerCase().includes(q) &&
        !method.toLowerCase().includes(q)
      ) {
        continue;
      }

      grouped.get(tag)!.push({ method, path, op, pathParams: pathLevelParams });
    }
  }

  const sortedTags = [...grouped.entries()].sort(([a], [b]) => {
    const ai = tagOrder.indexOf(a);
    const bi = tagOrder.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  const totalEndpoints = [...grouped.values()].reduce((s, v) => s + v.length, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-gray-500">
          {spec.info.description}
        </p>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-gray-400">
            {totalEndpoints} endpoints
          </span>
          <a
            href="/api/openapi"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors underline underline-offset-2"
          >
            Raw JSON
          </a>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
          />
        </svg>
        <input
          type="text"
          placeholder="Filter endpoints…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-lg bg-white border border-gray-200 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-gray-400"
        />
      </div>

      {/* Tag sections */}
      {sortedTags.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">
          No endpoints match &quot;{search}&quot;
        </p>
      ) : (
        sortedTags.map(([tag, endpoints], i) => (
          <TagSection
            key={tag}
            name={tag}
            description={tagMeta[tag]}
            endpoints={endpoints}
            defaultOpen={i === 0}
          />
        ))
      )}
    </div>
  );
}
