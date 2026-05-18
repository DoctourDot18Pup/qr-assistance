"use client";

import { useRef, useState } from "react";
import { Upload, Download } from "lucide-react";
import { importUsers, type ImportRow, type ImportResult } from "./actions";

type Step = "upload" | "preview" | "results";

const TEMPLATE = `nombre,correo,matricula,rol\nAna Martínez,,21031001,student\nCarlos Ruiz,,21031002,student\nMaría López,maria.lopez@itcelaya.edu.mx,,teacher`;

function parseCSV(text: string): ImportRow[] {
  const clean = text.replace(/^﻿/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = clean.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  function splitLine(line: string): string[] {
    const result: string[] = [];
    let field = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"' && !inQuotes) { inQuotes = true; continue; }
      if (c === '"' && inQuotes) { inQuotes = false; continue; }
      if (c === "," && !inQuotes) { result.push(field.trim()); field = ""; continue; }
      field += c;
    }
    result.push(field.trim());
    return result;
  }

  const headers = splitLine(lines[0]).map((h) => h.toLowerCase());
  const idx = (key: string) => headers.indexOf(key);

  return lines
    .slice(1)
    .map((line) => {
      const v = splitLine(line);
      const role             = (v[idx("rol")]       ?? "").trim().toLowerCase();
      const enrollmentNumber = (v[idx("matricula")] ?? "").trim();
      const emailRaw         = (v[idx("correo")]    ?? "").trim();
      const email =
        !emailRaw && role === "student" && enrollmentNumber
          ? `${enrollmentNumber}@itcelaya.edu.mx`
          : emailRaw;
      return {
        name: (v[idx("nombre")] ?? "").trim(),
        email,
        enrollmentNumber,
        role,
      };
    })
    .filter((r) => r.name || r.email);
}

export function ImportUsersClient() {
  const [step, setStep]       = useState<Step>("upload");
  const [rows, setRows]       = useState<ImportRow[]>([]);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError]     = useState("");
  const fileRef               = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseCSV(reader.result as string);
      if (parsed.length === 0) {
        setError("No se encontraron filas válidas. Verifica que el archivo tenga las columnas: nombre, correo, matricula, rol.");
        return;
      }
      setError("");
      setRows(parsed);
      setStep("preview");
    };
    reader.readAsText(file, "utf-8");
  }

  async function handleImport() {
    setPending(true);
    setError("");
    try {
      const res = await importUsers(rows);
      setResults(res);
      setStep("results");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al importar.");
    } finally {
      setPending(false);
    }
  }

  function reset() {
    setStep("upload");
    setRows([]);
    setResults([]);
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  const created = results.filter((r) => r.status === "created").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const errors  = results.filter((r) => r.status === "error").length;

  return (
    <div className="space-y-4">
      {step === "upload" && (
        <div className="bg-white border border-[#D8CFB8] rounded-[6px] p-10">
          <div className="max-w-sm mx-auto text-center">
            <div className="w-12 h-12 rounded-full bg-[#F5F1EA] flex items-center justify-center mx-auto mb-4">
              <Upload size={20} className="text-[#1B3A2D]" />
            </div>
            <div className="text-sm font-semibold text-[#0A0A0A] mb-1">Selecciona un archivo CSV</div>
            <div className="text-xs text-[#6B6457] mb-5">
              Columnas: <span className="font-mono">nombre, correo, matricula, rol</span>
              <br />Alumnos: el correo se genera como <span className="font-mono">matrícula@itcelaya.edu.mx</span>
              <br />Docentes/admin: el correo debe indicarse explícitamente
              <br />Contraseña inicial: <span className="font-semibold">Bienvenido123</span>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFile}
              className="hidden"
              id="csv-upload-admin"
            />
            <label
              htmlFor="csv-upload-admin"
              className="inline-flex items-center gap-2 h-9 px-5 text-[13px] font-semibold bg-[#1B3A2D] text-white rounded hover:bg-[#163023] transition-colors cursor-pointer"
            >
              <Upload size={14} /> Seleccionar archivo
            </label>

            {error && <p className="text-xs text-[#7A1A1A] font-semibold mt-3">{error}</p>}

            <div className="mt-7 pt-6 border-t border-[#D8CFB8]">
              <a
                href={`data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE)}`}
                download="plantilla-usuarios.csv"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B3A2D] hover:underline"
              >
                <Download size={13} /> Descargar plantilla CSV
              </a>
            </div>
          </div>
        </div>
      )}

      {step === "preview" && (
        <div className="bg-white border border-[#D8CFB8] rounded-[6px]">
          <div className="px-[18px] py-4 border-b border-[#D8CFB8] flex items-center justify-between">
            <span className="text-sm font-semibold text-[#0A0A0A]">
              {rows.length} registro{rows.length !== 1 ? "s" : ""} listos para importar
            </span>
            <button onClick={reset} className="text-xs text-[#6B6457] hover:text-[#0A0A0A]">
              Cancelar
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#D8CFB8] text-[11px] font-semibold uppercase tracking-wide text-[#6B6457]">
                  <th className="text-left px-[18px] py-3">Nombre</th>
                  <th className="text-left px-4 py-3">Correo</th>
                  <th className="text-left px-4 py-3">Matrícula</th>
                  <th className="text-left px-4 py-3">Rol</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={i % 2 === 1 ? "bg-[#F5F1EA]" : ""}>
                    <td className="px-[18px] py-2.5 text-[#0A0A0A]">
                      {r.name || <span className="text-[#B8965A]">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-[#6B6457]">
                      {r.email || <span className="text-[#7A1A1A]">falta</span>}
                    </td>
                    <td className="px-4 py-2.5 tabular text-[#6B6457]">
                      {r.enrollmentNumber || "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      {r.role || <span className="text-[#7A1A1A]">falta</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {error && (
            <div className="px-[18px] py-3 border-t border-[#D8CFB8]">
              <p className="text-xs text-[#7A1A1A] font-semibold">{error}</p>
            </div>
          )}

          <div className="px-[18px] py-4 border-t border-[#D8CFB8] flex justify-end gap-2">
            <button
              onClick={reset}
              className="h-8 px-4 text-[13px] font-semibold border border-[#1B3A2D] text-[#1B3A2D] rounded hover:bg-[#F5F1EA] transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleImport}
              disabled={pending}
              className="h-8 px-4 text-[13px] font-semibold bg-[#1B3A2D] text-white rounded hover:bg-[#163023] transition-colors disabled:opacity-50"
            >
              {pending ? "Importando…" : `Importar ${rows.length} registros`}
            </button>
          </div>
        </div>
      )}

      {step === "results" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-[#D8CFB8] rounded-[6px] px-5 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[#6B6457]">Creados</div>
              <div className="text-2xl font-semibold text-[#1B3A2D] tabular mt-1">{created}</div>
            </div>
            <div className="bg-white border border-[#D8CFB8] rounded-[6px] px-5 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[#6B6457]">Omitidos</div>
              <div className="text-2xl font-semibold text-[#B8965A] tabular mt-1">{skipped}</div>
            </div>
            <div className="bg-white border border-[#D8CFB8] rounded-[6px] px-5 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[#6B6457]">Errores</div>
              <div className="text-2xl font-semibold text-[#7A1A1A] tabular mt-1">{errors}</div>
            </div>
          </div>

          <div className="bg-white border border-[#D8CFB8] rounded-[6px]">
            <div className="px-[18px] py-4 border-b border-[#D8CFB8]">
              <span className="text-sm font-semibold text-[#0A0A0A]">Detalle por registro</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[#D8CFB8] text-[11px] font-semibold uppercase tracking-wide text-[#6B6457]">
                    <th className="text-left px-[18px] py-3">Resultado</th>
                    <th className="text-left px-4 py-3">Nombre</th>
                    <th className="text-left px-4 py-3">Correo</th>
                    <th className="text-left px-4 py-3">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} className={i % 2 === 1 ? "bg-[#F5F1EA]" : ""}>
                      <td className="px-[18px] py-2.5">
                        {r.status === "created" && (
                          <span className="text-[11px] font-semibold text-[#1B3A2D]">✓ Creado</span>
                        )}
                        {r.status === "skipped" && (
                          <span className="text-[11px] font-semibold text-[#B8965A]">— Omitido</span>
                        )}
                        {r.status === "error" && (
                          <span className="text-[11px] font-semibold text-[#7A1A1A]">✕ Error</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-[#0A0A0A]">{r.name}</td>
                      <td className="px-4 py-2.5 text-[#6B6457]">{r.email}</td>
                      <td className="px-4 py-2.5 text-[#6B6457]">{r.message ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-[18px] py-4 border-t border-[#D8CFB8] flex justify-end">
              <button
                onClick={reset}
                className="h-8 px-4 text-[13px] font-semibold border border-[#1B3A2D] text-[#1B3A2D] rounded hover:bg-[#F5F1EA] transition-colors"
              >
                Nueva importación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
