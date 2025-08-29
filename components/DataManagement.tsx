import React, { useState, useRef } from 'react';
import { DataExportImport } from '../utils/dataExport';

interface DataManagementProps {
  onDataImported?: () => void;
}

const DataManagement: React.FC<DataManagementProps> = ({ onDataImported }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportAll = async () => {
    setIsExporting(true);
    try {
      const exportData = DataExportImport.exportAllData();
      DataExportImport.downloadExportData(exportData);
      setImportMessage({ type: 'success', text: 'Data exported successfully!' });
    } catch (error) {
      setImportMessage({ type: 'error', text: 'Failed to export data. Please try again.' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportProgress = async () => {
    setIsExporting(true);
    try {
      const exportData = DataExportImport.exportProgressData();
      DataExportImport.downloadExportData(exportData, `linguaflip-progress-${new Date().toISOString().split('T')[0]}.json`);
      setImportMessage({ type: 'success', text: 'Progress data exported successfully!' });
    } catch (error) {
      setImportMessage({ type: 'error', text: 'Failed to export progress data. Please try again.' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportMessage(null);

    try {
      const result = await DataExportImport.importData(file);

      if (result.success) {
        setImportMessage({ type: 'success', text: result.message });
        onDataImported?.();
      } else {
        setImportMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setImportMessage({ type: 'error', text: 'An unexpected error occurred during import.' });
    } finally {
      setIsImporting(false);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const dataSummary = DataExportImport.getDataSummary();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Data Management</h2>
        <p className="text-gray-600">Export and import your learning progress</p>
      </div>

      {/* Data Summary */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Data</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{dataSummary.cardsCount}</div>
            <div className="text-sm text-gray-600">Flashcards</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{dataSummary.sessionsCount}</div>
            <div className="text-sm text-gray-600">Study Sessions</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-sm font-bold text-purple-600">
              {dataSummary.lastBackup ? new Date(dataSummary.lastBackup).toLocaleDateString() : 'Never'}
            </div>
            <div className="text-sm text-gray-600">Last Activity</div>
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Data</h3>
        <p className="text-gray-600 mb-6">
          Download your learning data to backup or transfer to another device.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={handleExportAll}
            disabled={isExporting}
            className="flex flex-col items-center p-6 border-2 border-blue-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="text-3xl mb-3">📦</div>
            <h4 className="font-semibold text-gray-900 mb-1">Export All Data</h4>
            <p className="text-sm text-gray-600 text-center mb-3">
              Includes flashcards and study history
            </p>
            <span className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
              {isExporting ? 'Exporting...' : 'Export All'}
            </span>
          </button>

          <button
            onClick={handleExportProgress}
            disabled={isExporting}
            className="flex flex-col items-center p-6 border-2 border-green-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="text-3xl mb-3">📊</div>
            <h4 className="font-semibold text-gray-900 mb-1">Export Progress Only</h4>
            <p className="text-sm text-gray-600 text-center mb-3">
              Study sessions and statistics only
            </p>
            <span className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors">
              {isExporting ? 'Exporting...' : 'Export Progress'}
            </span>
          </button>
        </div>
      </div>

      {/* Import Options */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Data</h3>
        <p className="text-gray-600 mb-6">
          Restore your learning data from a previously exported file.
        </p>

        <div className="text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />

          <button
            onClick={handleImportClick}
            disabled={isImporting}
            className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isImporting ? 'Importing...' : 'Choose File to Import'}
          </button>

          <p className="text-xs text-gray-500 mt-2">
            Only .json files exported from LinguaFlip are supported
          </p>
        </div>
      </div>

      {/* Status Messages */}
      {importMessage && (
        <div className={`p-4 rounded-lg ${
          importMessage.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              {importMessage.type === 'success' ? (
                <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">{importMessage.text}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setImportMessage(null)}
                className="inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warning */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h4 className="text-sm font-medium text-yellow-800">Important Notes</h4>
            <div className="mt-2 text-sm text-yellow-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Importing data will overwrite your current progress</li>
                <li>Make sure to backup your current data before importing</li>
                <li>Only import files that were exported from LinguaFlip</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataManagement;