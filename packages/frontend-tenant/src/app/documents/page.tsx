'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  Download,
  Filter,
  Loader2,
  AlertCircle,
  File,
  FileCheck,
  FileClock,
  Shield,
} from 'lucide-react';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TenantLayout from '@/components/layouts/TenantLayout';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Document {
  id: string;
  name: string;
  description: string | null;
  type: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  createdAt: string;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  LEASE_AGREEMENT: 'Lease Agreement',
  LEASE_ADDENDUM: 'Lease Addendum',
  MOVE_IN_CHECKLIST: 'Move-In Checklist',
  MOVE_OUT_CHECKLIST: 'Move-Out Checklist',
  COMMUNITY_RULES: 'Community Rules',
  INSURANCE_CERTIFICATE: 'Insurance Certificate',
  PET_DOCUMENTATION: 'Pet Documentation',
  PAYMENT_RECEIPT: 'Payment Receipt',
  ANNUAL_STATEMENT: 'Annual Statement',
  OTHER: 'Other',
};

const DOCUMENT_TYPE_ICONS: Record<string, React.ReactNode> = {
  LEASE_AGREEMENT: <FileText className="w-5 h-5 text-blue-500" />,
  LEASE_ADDENDUM: <FileText className="w-5 h-5 text-blue-400" />,
  MOVE_IN_CHECKLIST: <FileCheck className="w-5 h-5 text-green-500" />,
  MOVE_OUT_CHECKLIST: <FileClock className="w-5 h-5 text-orange-500" />,
  COMMUNITY_RULES: <File className="w-5 h-5 text-purple-500" />,
  INSURANCE_CERTIFICATE: <Shield className="w-5 h-5 text-teal-500" />,
  PET_DOCUMENTATION: <File className="w-5 h-5 text-amber-500" />,
  PAYMENT_RECEIPT: <FileText className="w-5 h-5 text-green-600" />,
  ANNUAL_STATEMENT: <FileText className="w-5 h-5 text-indigo-500" />,
  OTHER: <File className="w-5 h-5 text-gray-500" />,
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) {
    return '0 Bytes';
  }
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export default function DocumentsPage() {
  const [filterType, setFilterType] = useState<string>('all');
  const [downloading, setDownloading] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['tenant-documents', filterType],
    queryFn: async () => {
      const params = filterType !== 'all' ? `?type=${filterType}` : '';
      const response = await api.get(`/tenant-portal/documents${params}`);
      return response.data.data as Document[];
    },
  });

  const handleDownload = async (documentId: string, _documentName: string) => {
    setDownloading(documentId);
    try {
      const response = await api.get(`/tenant-portal/documents/${documentId}/download`);
      const { url } = response.data.data;

      // Open in new tab or trigger download
      window.open(url, '_blank');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to download document. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  if (isLoading) {
    return (
      <TenantLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </TenantLayout>
    );
  }

  if (error) {
    return (
      <TenantLayout>
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load documents</h3>
          <p className="text-gray-500">Please try again later.</p>
        </div>
      </TenantLayout>
    );
  }

  const documents = data || [];

  // Group documents by type for summary
  const documentsByType = documents.reduce(
    (acc, doc) => {
      acc[doc.type] = (acc[doc.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <TenantLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
            <p className="text-gray-600 mt-1">
              Access your lease documents, community rules, and more
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Documents</p>
                  <p className="text-2xl font-bold">{documents.length}</p>
                </div>
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Lease Documents</p>
                  <p className="text-2xl font-bold">
                    {(documentsByType['LEASE_AGREEMENT'] || 0) +
                      (documentsByType['LEASE_ADDENDUM'] || 0)}
                  </p>
                </div>
                <FileText className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Insurance</p>
                  <p className="text-2xl font-bold">
                    {documentsByType['INSURANCE_CERTIFICATE'] || 0}
                  </p>
                </div>
                <Shield className="w-8 h-8 text-teal-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Statements</p>
                  <p className="text-2xl font-bold">
                    {(documentsByType['PAYMENT_RECEIPT'] || 0) +
                      (documentsByType['ANNUAL_STATEMENT'] || 0)}
                  </p>
                </div>
                <FileCheck className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">Filter by type:</span>
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Documents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Documents</SelectItem>
              {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Documents List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Documents</CardTitle>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
                <p className="text-gray-500">
                  {filterType !== 'all'
                    ? 'No documents match the selected filter.'
                    : 'Documents will appear here when they are uploaded.'}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between py-4 hover:bg-gray-50 -mx-4 px-4 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-gray-100">
                        {DOCUMENT_TYPE_ICONS[doc.type] || (
                          <File className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{doc.name}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span>{DOCUMENT_TYPE_LABELS[doc.type] || doc.type}</span>
                          <span>•</span>
                          <span>{formatFileSize(doc.size)}</span>
                          <span>•</span>
                          <span>{format(new Date(doc.createdAt), 'MMM d, yyyy')}</span>
                        </div>
                        {doc.description && (
                          <p className="text-sm text-gray-500 mt-1">{doc.description}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(doc.id, doc.name)}
                      disabled={downloading === doc.id}
                    >
                      {downloading === doc.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TenantLayout>
  );
}
