import React from 'react';
import DataManagement from './DataManagement';

interface DataManagementPageProps {
  onDataImported: () => void;
}

const DataManagementPage: React.FC<DataManagementPageProps> = ({
  onDataImported,
}) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-primary-600 mb-2">Data Management</h2>
        <p className="text-neutral-600">Import, export, and manage your flashcard data</p>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <DataManagement onDataImported={onDataImported} />
      </div>
    </div>
  );
};

export default DataManagementPage;