import React, { useState, useRef } from 'react';
import { Upload, Download, FileText, AlertCircle, CheckCircle2, X, Loader2 } from 'lucide-react';
import { parseLeadsCsv } from '../../utils/partner';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (leads: Array<{ shopName: string; phone: string; city?: string }>) => Promise<void>;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [parsedLeads, setParsedLeads] = useState<Array<{ shopName: string; phone: string; city?: string }>>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [importSuccess, setImportSuccess] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    setImportSuccess(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const { leads, errors } = parseLeadsCsv(content);
        setParsedLeads(leads);
        setParseErrors(errors);
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadSample = () => {
    const sampleCsv = `Shop Name,Phone Number,City\nOm Telecom,9876543210,Karol Bagh\nShree Ganesh Mobile,9123456789,Mumbai\nNational Spares,9898989898,Ahmedabad`;
    const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample_retailer_leads.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConfirmImport = async () => {
    if (parsedLeads.length === 0) return;
    try {
      setLoading(true);
      await onImport(parsedLeads);
      setImportSuccess(parsedLeads.length);
      setTimeout(() => {
        onClose();
        setParsedLeads([]);
        setCsvFileName(null);
        setImportSuccess(null);
      }, 1500);
    } catch (err: unknown) {
      alert(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-black/10">
        <div className="flex items-center justify-between pb-2 border-b border-black/5">
          <div className="flex items-center gap-2">
            <Upload className="size-5 text-iosBlue" />
            <h3 className="text-base font-bold text-slate-900">Import Leads via CSV</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="size-5" />
          </button>
        </div>

        <p className="text-xs text-[#8E8E93] leading-relaxed">
          Upload your existing customer or retail shop directory. When any of these phone numbers sign up, they are automatically attributed to your account.
        </p>

        {/* Sample Download Button */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleDownloadSample}
            className="text-xs text-iosBlue font-semibold flex items-center gap-1 hover:underline"
          >
            <Download className="size-3.5" />
            <span>Download Sample CSV</span>
          </button>
        </div>

        {/* Upload Drop Area */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-200 hover:border-iosBlue bg-slate-50 rounded-2xl p-6 text-center cursor-pointer transition-colors space-y-2"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <FileText className="size-8 text-slate-400 mx-auto" />
          <div>
            <p className="text-xs font-bold text-slate-800">
              {csvFileName ? csvFileName : 'Click to choose CSV file'}
            </p>
            <p className="text-[11px] text-[#8E8E93]">Columns: Shop Name, Phone Number, City</p>
          </div>
        </div>

        {/* Parsed Summary */}
        {parsedLeads.length > 0 && (
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between text-xs text-emerald-800">
            <span className="flex items-center gap-1.5 font-bold">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <span>{parsedLeads.length} valid phone numbers detected</span>
            </span>
          </div>
        )}

        {/* Errors list */}
        {parseErrors.length > 0 && (
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-[11px] text-amber-800 space-y-1 max-h-28 overflow-y-auto">
            <div className="flex items-center gap-1 font-bold">
              <AlertCircle className="size-3.5 text-amber-600" />
              <span>{parseErrors.length} row warnings (skipped):</span>
            </div>
            {parseErrors.slice(0, 5).map((err, i) => (
              <p key={i} className="text-amber-700 pl-4">{err}</p>
            ))}
          </div>
        )}

        {importSuccess !== null && (
          <div className="p-3 bg-emerald-100 rounded-xl text-center text-xs font-bold text-emerald-800 animate-fade-slide-in">
            ✓ Successfully imported {importSuccess} leads!
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={parsedLeads.length === 0 || loading}
            onClick={handleConfirmImport}
            className="flex-1 py-2.5 bg-iosBlue hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-2xs transition-all"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <span>Import {parsedLeads.length} Leads</span>}
          </button>
        </div>
      </div>
    </div>
  );
};
