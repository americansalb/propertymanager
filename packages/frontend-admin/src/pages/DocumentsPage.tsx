import { useMemo, useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Upload,
  FolderOpen,
  Search,
  Download,
  Trash2,
  Eye,
  File,
  FileImage,
  FileSpreadsheet,
  FileArchive,
  Building2,
  Home,
  Wrench,
  Users,
  CheckCircle,
  X,
  Grid,
  List,
  SortAsc,
  SortDesc,
  Link as LinkIcon,
  Copy,
  ExternalLink,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import api from '../services/api';
import { format, formatDistanceToNow } from 'date-fns';

type DocumentType =
  | 'all'
  | 'LEASE_AGREEMENT'
  | 'LEASE_ADDENDUM'
  | 'MOVE_IN_CHECKLIST'
  | 'MOVE_OUT_CHECKLIST'
  | 'VENDOR_INSURANCE'
  | 'VENDOR_W9'
  | 'VENDOR_LICENSE'
  | 'VENDOR_CONTRACT'
  | 'WORK_ORDER_PHOTO'
  | 'WORK_ORDER_INVOICE'
  | 'MAINTENANCE_PHOTO'
  | 'PROPERTY_PHOTO'
  | 'UNIT_PHOTO'
  | 'OTHER';

type ViewMode = 'grid' | 'list';
type SortBy = 'name' | 'date' | 'size' | 'type';
type SortOrder = 'asc' | 'desc';

interface BackendDocument {
  id: string;
  name: string;
  description: string | null;
  type: string;
  storageKey: string;
  storageUrl: string | null;
  storageProvider: string;
  mimeType: string;
  size: number;
  entityType: string;
  entityId: string;
  isPublic: boolean;
  organizationId: string;
  uploadedById: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const typeConfig: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  all: { label: 'All', icon: FolderOpen, color: 'gray' },
  LEASE_AGREEMENT: { label: 'Lease Agreement', icon: FileText, color: 'blue' },
  LEASE_ADDENDUM: { label: 'Lease Addendum', icon: FileText, color: 'blue' },
  MOVE_IN_CHECKLIST: { label: 'Move-in Checklist', icon: FileText, color: 'green' },
  MOVE_OUT_CHECKLIST: { label: 'Move-out Checklist', icon: FileText, color: 'orange' },
  VENDOR_INSURANCE: { label: 'Vendor Insurance', icon: Users, color: 'purple' },
  VENDOR_W9: { label: 'Vendor W9', icon: Users, color: 'purple' },
  VENDOR_LICENSE: { label: 'Vendor License', icon: Users, color: 'purple' },
  VENDOR_CONTRACT: { label: 'Vendor Contract', icon: Users, color: 'purple' },
  WORK_ORDER_PHOTO: { label: 'Work Order Photo', icon: Wrench, color: 'orange' },
  WORK_ORDER_INVOICE: { label: 'Work Order Invoice', icon: Wrench, color: 'orange' },
  MAINTENANCE_PHOTO: { label: 'Maintenance Photo', icon: Wrench, color: 'yellow' },
  PROPERTY_PHOTO: { label: 'Property Photo', icon: Home, color: 'green' },
  UNIT_PHOTO: { label: 'Unit Photo', icon: Home, color: 'emerald' },
  OTHER: { label: 'Other', icon: File, color: 'gray' },
};

const getFileIcon = (mimeType: string) => {
  if (mimeType.includes('image')) {
    return FileImage;
  }
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) {
    return FileSpreadsheet;
  }
  if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('rar')) {
    return FileArchive;
  }
  return FileText;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) {
    return '0 Bytes';
  }
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export default function DocumentsPage() {
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<DocumentType>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedDocument, setSelectedDocument] = useState<BackendDocument | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [uploadEntityType, setUploadEntityType] = useState('Property');
  const [uploadEntityId, setUploadEntityId] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadType, setUploadType] = useState<DocumentType>('OTHER');
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch documents from backend
  const { data: documentsResponse, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const response = await api.get('/documents?limit=100');
      return response.data;
    },
  });

  // Fetch storage stats
  const { data: statsResponse } = useQuery({
    queryKey: ['documents', 'stats'],
    queryFn: async () => {
      const response = await api.get('/documents/stats');
      return response.data;
    },
  });

  // Fetch properties for upload form
  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      const response = await api.get('/properties');
      return response.data.data;
    },
  });

  // Fetch vendors for upload form
  const { data: vendors } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const response = await api.get('/vendors');
      return response.data.data;
    },
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setShowUploadModal(false);
      setUploadFiles(null);
      setUploadDescription('');
      setUploadType('OTHER');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/documents/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setSelectedDocument(null);
    },
  });

  const documents: BackendDocument[] = documentsResponse?.data || [];
  const stats = statsResponse?.data || { totalDocuments: 0, totalSize: 0, totalSizeFormatted: '0 Bytes', byType: {} };

  // Filter and sort documents
  const filteredDocuments = useMemo(() => {
    let filtered = documents;

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter((doc) => doc.type === selectedType);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (doc) =>
          doc.name.toLowerCase().includes(query) ||
          doc.description?.toLowerCase().includes(query) ||
          doc.entityType.toLowerCase().includes(query),
      );
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [documents, selectedType, searchQuery, sortBy, sortOrder]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setUploadFiles(files);
      setShowUploadModal(true);
    }
  };

  const handleUploadSubmit = async () => {
    if (!uploadFiles || !uploadEntityId) return;

    for (let i = 0; i < uploadFiles.length; i++) {
      const formData = new FormData();
      formData.append('file', uploadFiles[i]);
      formData.append('entityType', uploadEntityType);
      formData.append('entityId', uploadEntityId);
      formData.append('type', uploadType);
      if (uploadDescription) {
        formData.append('description', uploadDescription);
      }
      await uploadMutation.mutateAsync(formData);
    }
  };

  const handleDownload = useCallback(async (doc: BackendDocument) => {
    try {
      const response = await api.get(`/documents/${doc.id}/download-url`);
      const url = response.data.data.url;
      window.open(url, '_blank');
    } catch {
      alert('Failed to get download URL');
    }
  }, []);

  const handleDelete = useCallback((doc: BackendDocument) => {
    if (confirm(`Are you sure you want to delete "${doc.name}"?`)) {
      deleteMutation.mutate(doc.id);
    }
  }, [deleteMutation]);

  const handleSelectDocument = (docId: string) => {
    setSelectedDocuments((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedDocuments.size === filteredDocuments.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(filteredDocuments.map((d) => d.id)));
    }
  };

  const toggleSort = (field: SortBy) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg">
              <FolderOpen className="w-6 h-6 text-white" />
            </div>
            Document Management
          </h1>
          <p className="text-gray-500 mt-1">Upload, organize, and manage all your documents</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp"
          />
          <Button onClick={handleUploadClick} className="gap-2">
            <Upload className="w-4 h-4" />
            Upload Files
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Documents</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalDocuments}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-xl">
              <FileArchive className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Storage</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSizeFormatted}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-xl">
              <Upload className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Storage Provider</p>
              <p className="text-2xl font-bold text-gray-900">{stats.storageProvider || 'Local'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 rounded-xl">
              <FolderOpen className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Document Types</p>
              <p className="text-2xl font-bold text-gray-900">
                {Object.keys(stats.byType || {}).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as DocumentType)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
          >
            <option value="all">All Types</option>
            <option value="LEASE_AGREEMENT">Lease Agreement</option>
            <option value="VENDOR_W9">Vendor W9</option>
            <option value="VENDOR_INSURANCE">Vendor Insurance</option>
            <option value="WORK_ORDER_PHOTO">Work Order Photo</option>
            <option value="PROPERTY_PHOTO">Property Photo</option>
            <option value="OTHER">Other</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Selection Controls */}
        {selectedDocuments.size > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={handleSelectAll} className="text-sm text-primary font-medium">
                {selectedDocuments.size === filteredDocuments.length
                  ? 'Deselect All'
                  : 'Select All'}
              </button>
              <span className="text-sm text-gray-500">{selectedDocuments.size} selected</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2 text-red-600 hover:text-red-700">
                <Trash2 className="w-4 h-4" />
                Delete Selected
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Documents View */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <RefreshCw className="w-8 h-8 text-gray-400 mx-auto mb-3 animate-spin" />
          <p className="text-gray-500">Loading documents...</p>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No documents found</h3>
          <p className="text-gray-500">
            {searchQuery
              ? 'Try adjusting your search or filter criteria'
              : 'Upload your first document to get started'}
          </p>
          <Button onClick={handleUploadClick} className="mt-4 gap-2">
            <Upload className="w-4 h-4" />
            Upload Files
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDocuments.map((doc) => {
            const FileIcon = getFileIcon(doc.mimeType);
            const typeConf = typeConfig[doc.type] || typeConfig.OTHER;

            return (
              <div
                key={doc.id}
                className={`bg-white rounded-xl border shadow-sm p-4 hover:shadow-md transition-all cursor-pointer group ${
                  selectedDocuments.has(doc.id)
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-gray-200'
                }`}
                onClick={() => setSelectedDocument(doc)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-3 bg-gray-100 rounded-xl">
                    <FileIcon className="w-6 h-6 text-gray-600" />
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectDocument(doc.id);
                      }}
                      className={`p-1.5 rounded hover:bg-gray-100 ${
                        selectedDocuments.has(doc.id) ? 'text-primary' : 'text-gray-400'
                      }`}
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(doc);
                      }}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(doc);
                      }}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="font-medium text-gray-900 truncate mb-1" title={doc.name}>
                  {doc.name}
                </h3>

                <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                  <LinkIcon className="w-3 h-3" />
                  <span className="truncate">{doc.entityType}: {doc.entityId.slice(0, 8)}...</span>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{formatFileSize(doc.size)}</span>
                  <span>{formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}</span>
                </div>

                <div className="mt-3">
                  <span className={`px-2 py-0.5 bg-${typeConf.color}-100 text-${typeConf.color}-700 rounded-full text-xs font-medium`}>
                    {typeConf.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={
                      selectedDocuments.size === filteredDocuments.length &&
                      filteredDocuments.length > 0
                    }
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th
                  className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Name
                    {sortBy === 'name' &&
                      (sortOrder === 'asc' ? (
                        <SortAsc className="w-4 h-4" />
                      ) : (
                        <SortDesc className="w-4 h-4" />
                      ))}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Entity</th>
                <th
                  className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort('size')}
                >
                  <div className="flex items-center gap-1">
                    Size
                    {sortBy === 'size' &&
                      (sortOrder === 'asc' ? (
                        <SortAsc className="w-4 h-4" />
                      ) : (
                        <SortDesc className="w-4 h-4" />
                      ))}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort('date')}
                >
                  <div className="flex items-center gap-1">
                    Uploaded
                    {sortBy === 'date' &&
                      (sortOrder === 'asc' ? (
                        <SortAsc className="w-4 h-4" />
                      ) : (
                        <SortDesc className="w-4 h-4" />
                      ))}
                  </div>
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredDocuments.map((doc) => {
                const FileIcon = getFileIcon(doc.mimeType);
                const typeConf = typeConfig[doc.type] || typeConfig.OTHER;

                return (
                  <tr
                    key={doc.id}
                    className={`hover:bg-gray-50 ${selectedDocuments.has(doc.id) ? 'bg-primary/5' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedDocuments.has(doc.id)}
                        onChange={() => handleSelectDocument(doc.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div
                        className="flex items-center gap-3 cursor-pointer"
                        onClick={() => setSelectedDocument(doc)}
                      >
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <FileIcon className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 truncate max-w-xs">{doc.name}</p>
                          {doc.description && (
                            <p className="text-xs text-gray-500 truncate max-w-xs">
                              {doc.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${typeConf.color}-100 text-${typeConf.color}-700`}>
                        {typeConf.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {doc.entityType}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatFileSize(doc.size)}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-600">
                        {format(new Date(doc.createdAt), 'MMM d, yyyy')}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedDocument(doc)}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(doc)}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(doc)}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Document Preview Modal */}
      {selectedDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Document Details</h2>
              <button
                onClick={() => setSelectedDocument(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              {/* Document Preview Area */}
              <div className="bg-gray-100 rounded-xl p-8 mb-6 flex items-center justify-center">
                {selectedDocument.mimeType.includes('image') ? (
                  <div className="text-center">
                    <FileImage className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Image Preview</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      {selectedDocument.mimeType.includes('pdf') ? 'PDF Document' : 'Document'}
                    </p>
                  </div>
                )}
              </div>

              {/* Document Info */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">{selectedDocument.name}</h3>
                  {selectedDocument.description && (
                    <p className="text-gray-500 mt-1">{selectedDocument.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">File Size</p>
                    <p className="font-medium text-gray-900">
                      {formatFileSize(selectedDocument.size)}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">File Type</p>
                    <p className="font-medium text-gray-900">
                      {selectedDocument.mimeType.split('/')[1]?.toUpperCase() || 'Unknown'}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Uploaded</p>
                    <p className="font-medium text-gray-900">
                      {format(new Date(selectedDocument.createdAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Document Type</p>
                    <p className="font-medium text-gray-900">{typeConfig[selectedDocument.type]?.label || 'Other'}</p>
                  </div>
                </div>

                <div className="p-4 border border-gray-200 rounded-lg">
                  <p className="text-xs text-gray-500 mb-2">Linked To</p>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-900">
                      {selectedDocument.entityType}
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {selectedDocument.entityId.slice(0, 8)}...
                    </span>
                  </div>
                </div>

                <div className="p-4 border border-gray-200 rounded-lg">
                  <p className="text-xs text-gray-500 mb-2">Storage</p>
                  <p className="text-sm text-gray-600">Provider: {selectedDocument.storageProvider}</p>
                  <p className="text-xs text-gray-400 mt-1 truncate">Key: {selectedDocument.storageKey}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-2" onClick={() => {
                  navigator.clipboard.writeText(selectedDocument.storageKey);
                  alert('Storage key copied to clipboard');
                }}>
                  <Copy className="w-4 h-4" />
                  Copy Key
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-red-600 hover:text-red-700"
                  onClick={() => {
                    handleDelete(selectedDocument);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={() => handleDownload(selectedDocument)}
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Upload Documents</h2>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadFiles(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {uploadFiles && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700">
                    {uploadFiles.length} file(s) selected: {Array.from(uploadFiles).map(f => f.name).join(', ')}
                  </p>
                </div>
              )}

              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-2">Drag and drop files here, or click to browse</p>
                <p className="text-sm text-gray-400">Supports PDF, DOC, XLS, JPG, PNG up to 10MB</p>
                <Button variant="outline" className="mt-4" onClick={handleUploadClick}>
                  Select Files
                </Button>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Entity Type *</label>
                  <select
                    value={uploadEntityType}
                    onChange={(e) => setUploadEntityType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="Property">Property</option>
                    <option value="Vendor">Vendor</option>
                    <option value="Lease">Lease</option>
                    <option value="WorkOrder">Work Order</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Link to *
                  </label>
                  <select
                    value={uploadEntityId}
                    onChange={(e) => setUploadEntityId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="">Select...</option>
                    {uploadEntityType === 'Property' && properties?.map((p: { id: string; name: string }) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                    {uploadEntityType === 'Vendor' && vendors?.map((v: { id: string; companyName: string }) => (
                      <option key={v.id} value={v.id}>{v.companyName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
                  <select
                    value={uploadType}
                    onChange={(e) => setUploadType(e.target.value as DocumentType)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="OTHER">Other</option>
                    <option value="LEASE_AGREEMENT">Lease Agreement</option>
                    <option value="VENDOR_W9">Vendor W9</option>
                    <option value="VENDOR_INSURANCE">Vendor Insurance</option>
                    <option value="PROPERTY_PHOTO">Property Photo</option>
                    <option value="WORK_ORDER_PHOTO">Work Order Photo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Add a description..."
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 bg-gray-50">
              <Button variant="outline" onClick={() => {
                setShowUploadModal(false);
                setUploadFiles(null);
              }}>
                Cancel
              </Button>
              <Button
                className="gap-2"
                onClick={handleUploadSubmit}
                disabled={!uploadFiles || !uploadEntityId || uploadMutation.isPending}
              >
                {uploadMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Upload Files
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
