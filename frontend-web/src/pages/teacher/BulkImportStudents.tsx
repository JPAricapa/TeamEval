import { useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { usersApi } from '@/services/api'

type StudentRow = {
  firstName: string
  lastName: string
  email: string
  nationalId: string
}

type ImportSummary = {
  summary: { total: number; created: number; existing: number; errors: number }
  group: { id: string; name: string }
  details: {
    created: Array<{ email: string; initialPassword: string }>
    existing: Array<{ email: string }>
    errors: Array<{ row: number; email: string; reason: string }>
  }
}

const EXPECTED_HEADERS = ['firstName', 'lastName', 'email', 'nationalId']

// Parser CSV sencillo que detecta el delimitador (coma, punto y coma o tab).
// No cubre todos los edge cases de RFC 4180 pero sí los comunes de Excel.
function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const cleaned = text.replace(/^\uFEFF/, '').trim()
  if (!cleaned) return { headers: [], rows: [] }

  const firstLine = cleaned.split(/\r?\n/)[0]
  const delimiter = firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : ','

  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim().length > 0)
  const parseLine = (line: string) =>
    line.split(delimiter).map((c) => c.trim().replace(/^"(.*)"$/, '$1'))

  const headers = parseLine(lines[0])
  const rows = lines.slice(1).map(parseLine)
  return { headers, rows }
}

function rowsToStudents(headers: string[], rows: string[][]): {
  students: StudentRow[]
  invalidRows: Array<{ row: number; reason: string }>
} {
  const idx = Object.fromEntries(EXPECTED_HEADERS.map((h) => [h, headers.indexOf(h)]))
  const missing = EXPECTED_HEADERS.filter((h) => idx[h] === -1)
  if (missing.length > 0) {
    throw new Error(`Faltan columnas en el CSV: ${missing.join(', ')}`)
  }

  const students: StudentRow[] = []
  const invalidRows: Array<{ row: number; reason: string }> = []

  rows.forEach((row, i) => {
    const student: StudentRow = {
      firstName: row[idx.firstName] ?? '',
      lastName: row[idx.lastName] ?? '',
      email: row[idx.email] ?? '',
      nationalId: row[idx.nationalId] ?? '',
    }
    if (!student.firstName || !student.lastName || !student.email || !student.nationalId) {
      invalidRows.push({ row: i + 2, reason: 'Fila con campos vacíos' })
      return
    }
    students.push(student)
  })

  return { students, invalidRows }
}

const TEMPLATE_CSV =
  'firstName,lastName,email,nationalId\n' +
  'Ana,García,ana.garcia@uni.edu.co,1001234567\n' +
  'Carlos,López,carlos.lopez@uni.edu.co,1002345678\n'

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'plantilla_estudiantes.csv'
  link.click()
  URL.revokeObjectURL(url)
}

export function BulkImportStudents({
  courseId,
  onImported,
}: {
  courseId: string
  onImported?: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [groupName, setGroupName] = useState('')
  const [students, setStudents] = useState<StudentRow[]>([])
  const [invalidRows, setInvalidRows] = useState<Array<{ row: number; reason: string }>>([])
  const [parseError, setParseError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<ImportSummary | null>(null)

  function handleFile(file: File) {
    setParseError('')
    setResult(null)
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const { headers, rows } = parseCsv(String(reader.result ?? ''))
        const parsed = rowsToStudents(headers, rows)
        setStudents(parsed.students)
        setInvalidRows(parsed.invalidRows)
      } catch (e) {
        setParseError(e instanceof Error ? e.message : 'Error leyendo el archivo')
        setStudents([])
        setInvalidRows([])
      }
    }
    reader.readAsText(file, 'utf-8')
  }

  async function handleSubmit() {
    if (!groupName.trim()) {
      setParseError('Escribe el nombre del grupo antes de importar.')
      return
    }
    if (students.length === 0) {
      setParseError('No hay estudiantes válidos para importar.')
      return
    }

    setSubmitting(true)
    setParseError('')
    try {
      const r = await usersApi.bulkImportStudents({
        courseId,
        groupName: groupName.trim(),
        students,
      })
      setResult(r.data.data as ImportSummary)
      onImported?.()
    } catch (e) {
      const msg =
        (e as { response?: { data?: { error?: string } } }).response?.data?.error ||
        (e instanceof Error ? e.message : 'Error en la importación')
      setParseError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  function reset() {
    setStudents([])
    setInvalidRows([])
    setParseError('')
    setResult(null)
    setGroupName('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              Importar estudiantes
            </CardTitle>
            <p className="mt-1 text-xs text-gray-500">
              Sube un CSV con las columnas: firstName, lastName, email, nationalId. La cédula será la contraseña inicial.
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={downloadTemplate}>
            <Download className="w-4 h-4" /> Plantilla
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
          <Input
            placeholder="Nombre del grupo (ej: Grupo 1)"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
          <label className="inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
            <Upload className="w-4 h-4" />
            <span>{students.length > 0 ? `${students.length} estudiantes cargados` : 'Seleccionar CSV'}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
              }}
            />
          </label>
        </div>

        {parseError && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <span>{parseError}</span>
          </div>
        )}

        {invalidRows.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <p className="font-medium">Filas ignoradas ({invalidRows.length}):</p>
            <ul className="list-disc list-inside">
              {invalidRows.slice(0, 5).map((r, i) => (
                <li key={i}>Fila {r.row}: {r.reason}</li>
              ))}
              {invalidRows.length > 5 && <li>... y {invalidRows.length - 5} más</li>}
            </ul>
          </div>
        )}

        {students.length > 0 && !result && (
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Nombre</th>
                  <th className="px-3 py-2 text-left">Correo</th>
                  <th className="px-3 py-2 text-left">Cédula</th>
                </tr>
              </thead>
              <tbody>
                {students.slice(0, 8).map((s, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                    <td className="px-3 py-2">{s.firstName} {s.lastName}</td>
                    <td className="px-3 py-2 text-gray-600">{s.email}</td>
                    <td className="px-3 py-2 text-gray-600">{s.nationalId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {students.length > 8 && (
              <p className="px-3 py-2 text-xs text-gray-500">... y {students.length - 8} más</p>
            )}
          </div>
        )}

        {result && (
          <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              Importación completada en el grupo <span className="font-semibold">{result.group.name}</span>
            </div>
            <p>
              {result.summary.created} creados · {result.summary.existing} ya existían · {result.summary.errors} con error
            </p>
            {result.details.created.length > 0 && (
              <div className="mt-2 rounded-lg bg-white/70 px-3 py-2 text-xs text-emerald-900">
                <p className="font-medium">Contraseñas iniciales:</p>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full min-w-[420px]">
                    <thead className="text-left text-emerald-700">
                      <tr>
                        <th className="py-1 pr-3 font-medium">Correo</th>
                        <th className="py-1 font-medium">Contraseña inicial</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.details.created.map((student) => (
                        <tr key={student.email} className="border-t border-emerald-100">
                          <td className="py-1 pr-3">{student.email}</td>
                          <td className="py-1 font-mono">{student.initialPassword}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-emerald-700">
                  Estas claves corresponden a la cédula cargada para cada estudiante.
                </p>
              </div>
            )}
            {result.details.errors.length > 0 && (
              <div className="mt-2 rounded-lg bg-white/60 px-3 py-2 text-xs text-amber-800">
                <p className="font-medium">Errores:</p>
                <ul className="list-disc list-inside">
                  {result.details.errors.map((e, i) => (
                    <li key={i}>Fila {e.row} ({e.email}): {e.reason}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          {(students.length > 0 || result) && (
            <Button variant="outline" size="sm" onClick={reset}>
              Limpiar
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={submitting || students.length === 0 || !!result}
            className="gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Importar {students.length > 0 ? `(${students.length})` : ''}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
