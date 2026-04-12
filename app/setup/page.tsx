'use client'

import { useState } from 'react'
import { Upload, Database, CheckCircle, AlertCircle, Loader } from 'lucide-react'
import { PRODUCTS } from '@/lib/supabase'

export default function SetupPage() {
  const [migrating, setMigrating] = useState(false)
  const [migrateResult, setMigrateResult] = useState<{ success: boolean; message: string } | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number } | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedProduct, setSelectedProduct] = useState('')
  const [csvSource, setCsvSource] = useState('scraped')

  const runMigration = async () => {
    setMigrating(true)
    setMigrateResult(null)
    try {
      const res = await fetch('/api/migrate', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setMigrateResult({ success: true, message: `Database ready! Tables: ${data.tables?.join(', ')}` })
      } else {
        setMigrateResult({ success: false, message: data.error || 'Migration failed' })
      }
    } catch (err) {
      setMigrateResult({ success: false, message: String(err) })
    }
    setMigrating(false)
  }

  const importCSV = async () => {
    if (!selectedFile) return alert('Select a CSV file first')
    setImporting(true)
    setImportResult(null)

    try {
      const text = await selectedFile.text()
      const lines = text.trim().split('\n')
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
      
      const contacts = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
        const obj: Record<string, string> = {}
        headers.forEach((h, i) => { obj[h] = values[i] || '' })
        return obj
      }).filter(c => Object.values(c).some(v => v))

      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts, product: selectedProduct, source: csvSource })
      })
      const data = await res.json()
      setImportResult({ imported: data.imported || 0 })
    } catch (err) {
      alert('Import failed: ' + String(err))
    }
    setImporting(false)
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-2">Setup & Import</h1>
      <p className="text-gray-500 text-sm mb-6">Configure your CRM database and import existing leads.</p>

      {/* Step 1: Run Migration */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-4">
        <div className="flex items-start gap-3 mb-4">
          <Database className="w-5 h-5 text-indigo-400 mt-0.5" />
          <div>
            <h2 className="text-base font-semibold text-white">Step 1: Initialize Database</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Creates all required tables in your Supabase database. Safe to run multiple times.
            </p>
          </div>
        </div>

        {migrateResult && (
          <div className={`flex items-start gap-2 p-3 rounded-lg mb-4 ${
            migrateResult.success ? 'bg-green-900/20 border border-green-800' : 'bg-red-900/20 border border-red-800'
          }`}>
            {migrateResult.success
              ? <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              : <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            }
            <p className={`text-sm ${migrateResult.success ? 'text-green-300' : 'text-red-300'}`}>
              {migrateResult.message}
            </p>
          </div>
        )}

        <button
          onClick={runMigration}
          disabled={migrating}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {migrating ? <Loader className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
          {migrating ? 'Running migration...' : 'Run Database Migration'}
        </button>
      </div>

      {/* Step 2: Import CSV */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <div className="flex items-start gap-3 mb-4">
          <Upload className="w-5 h-5 text-green-400 mt-0.5" />
          <div>
            <h2 className="text-base font-semibold text-white">Step 2: Import CSV Leads</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Import your existing leads from CSV. Duplicates on email are handled automatically.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">CSV File</label>
            <input
              type="file"
              accept=".csv"
              onChange={e => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Tag as Product</label>
              <select
                value={selectedProduct}
                onChange={e => setSelectedProduct(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none"
              >
                <option value="">No product tag</option>
                {PRODUCTS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Source</label>
              <select
                value={csvSource}
                onChange={e => setCsvSource(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none"
              >
                <option value="scraped">Scraped</option>
                <option value="organic">Organic</option>
                <option value="referral">Referral</option>
                <option value="cold_email">Cold Email</option>
                <option value="manual">Manual</option>
              </select>
            </div>
          </div>

          {importResult && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-900/20 border border-green-800">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <p className="text-sm text-green-300">✅ Imported {importResult.imported} contacts successfully!</p>
            </div>
          )}

          <button
            onClick={importCSV}
            disabled={importing || !selectedFile}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {importing ? <Loader className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {importing ? 'Importing...' : 'Import Contacts'}
          </button>
        </div>
      </div>

      {/* Quick Import Buttons */}
      <div className="mt-4 bg-gray-900 rounded-xl border border-gray-800 p-6">
        <h2 className="text-base font-semibold text-white mb-3">Quick Import Preset Leads</h2>
        <p className="text-sm text-gray-500 mb-4">Import all 147 pre-loaded leads from the workspace.</p>
        <div className="space-y-2">
          <QuickImportButton product="FitFlow" file="fitflow_leads.csv" />
          <QuickImportButton product="TranscriptAPI" file="transcriptapi_leads.csv" />
          <QuickImportButton product="Token Calculator" file="ai_token_calculator_leads.csv" />
        </div>
      </div>
    </div>
  )
}

function QuickImportButton({ product, file }: { product: string; file: string }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const run = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/import/preset?file=${file}&product=${encodeURIComponent(product)}`, { method: 'POST' })
      const data = await res.json()
      if (data.imported >= 0) setDone(true)
    } catch { }
    setLoading(false)
  }

  return (
    <button
      onClick={run}
      disabled={loading || done}
      className={`w-full flex items-center justify-between px-4 py-2 rounded-lg text-sm transition-colors ${
        done
          ? 'bg-green-900/20 border border-green-800 text-green-400'
          : 'bg-gray-800 border border-gray-700 text-gray-300 hover:border-gray-600 hover:text-white'
      }`}
    >
      <span>{done ? '✅' : '📋'} {product} ({file})</span>
      {loading ? <Loader className="w-4 h-4 animate-spin" /> : done ? <CheckCircle className="w-4 h-4" /> : null}
    </button>
  )
}
