import { useMemo, useState, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
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
} from 'lucide-react';
import { Button } from '../components/ui/button';
import api from '../services/api';
import { format, formatDistanceToNow } from 'date-fns';

type DocumentCategory =
  | 'all'
  | 'lease'
  | 'property'
  | 'work_order'
  | 'vendor'
  | 'financial'
  | 'other';
type ViewMode = 'grid' | 'list';
type SortBy = 'name' | 'date' | 'size' | 'type';
type SortOrder = 'asc' | 'desc';

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  category: DocumentCategory;
  linkedTo?: {
    type: 'property' | 'lease' | 'work_order' | 'vendor';
    id: string;
    name: string;
  };
  uploadedBy: string;
  uploadedAt: Date;
  description?: string;
  tags: string[];
  url: string;
}

const categoryConfig: Record<
  DocumentCategory,
  { label: string; icon: React.ComponentType<any>; color: string }
> = {
  all: { label: 'All Documents', icon: FolderOpen, color: 'gray' },
  lease: { label: 'Lease Documents', icon: FileText, color: 'blue' },
  property: { label: 'Property Documents', icon: Home, color: 'green' },
  work_order: { label: 'Work Orders', icon: Wrench, color: 'orange' },
  vendor: { label: 'Vendor Documents', icon: Users, color: 'purple' },
  financial: { label: 'Financial', icon: FileSpreadsheet, color: 'emerald' },
  other: { label: 'Other', icon: File, color: 'gray' },
};

const getFileIcon = (type: string) => {
  if (type.includes('image')) {
    return FileImage;
  }
  if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv')) {
    return FileSpreadsheet;
  }
  if (type.includes('zip') || type.includes('archive') || type.includes('rar')) {
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

// Generate mock documents from real data
const generateDocumentsFromData = (
  properties: any[],
  leases: any[],
  workOrders: any[],
  vendors: any[],
): Document[] => {
  const documents: Document[] = [];
  let docId = 1;

  // Property documents
  properties?.forEach((property: any) => {
    documents.push({
      id: `doc-${docId++}`,
      name: `${property.name} - Property Deed.pdf`,
      type: 'application/pdf',
      size: Math.floor(Math.random() * 5000000) + 500000,
      category: 'property',
      linkedTo: { type: 'property', id: property.id, name: property.name },
      uploadedBy: 'System',
      uploadedAt: new Date(
        property.createdAt || Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
      ),
      description: 'Property deed and title documentation',
      tags: ['deed', 'legal', 'property'],
      url: '#',
    });

    documents.push({
      id: `doc-${docId++}`,
      name: `${property.name} - Insurance Certificate.pdf`,
      type: 'application/pdf',
      size: Math.floor(Math.random() * 2000000) + 200000,
      category: 'property',
      linkedTo: { type: 'property', id: property.id, name: property.name },
      uploadedBy: 'System',
      uploadedAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
      description: 'Property insurance documentation',
      tags: ['insurance', 'legal'],
      url: '#',
    });
  });

  // Lease documents
  leases?.forEach((lease: any) => {
    const tenantName = `${lease.tenant?.firstName || 'Unknown'} ${lease.tenant?.lastName || 'Tenant'}`;

    documents.push({
      id: `doc-${docId++}`,
      name: `Lease Agreement - ${tenantName}.pdf`,
      type: 'application/pdf',
      size: Math.floor(Math.random() * 3000000) + 400000,
      category: 'lease',
      linkedTo: { type: 'lease', id: lease.id, name: `Lease - ${tenantName}` },
      uploadedBy: 'System',
      uploadedAt: new Date(
        lease.createdAt || Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000,
      ),
      description: 'Signed lease agreement',
      tags: ['lease', 'agreement', 'signed'],
      url: '#',
    });

    if (Math.random() > 0.5) {
      documents.push({
        id: `doc-${docId++}`,
        name: `ID Verification - ${tenantName}.jpg`,
        type: 'image/jpeg',
        size: Math.floor(Math.random() * 1000000) + 100000,
        category: 'lease',
        linkedTo: { type: 'lease', id: lease.id, name: `Lease - ${tenantName}` },
        uploadedBy: 'System',
        uploadedAt: new Date(
          lease.createdAt || Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000,
        ),
        description: 'Tenant ID verification document',
        tags: ['id', 'verification', 'tenant'],
        url: '#',
      });
    }
  });

  // Work order documents
  workOrders?.forEach((wo: any) => {
    if (wo.status === 'COMPLETED' || Math.random() > 0.7) {
      documents.push({
        id: `doc-${docId++}`,
        name: `Work Order #${wo.id.slice(-6)} - ${wo.status === 'COMPLETED' ? 'Completion Report' : 'Photos'}.pdf`,
        type: wo.status === 'COMPLETED' ? 'application/pdf' : 'image/jpeg',
        size: Math.floor(Math.random() * 4000000) + 300000,
        category: 'work_order',
        linkedTo: {
          type: 'work_order',
          id: wo.id,
          name: wo.title || `Work Order #${wo.id.slice(-6)}`,
        },
        uploadedBy: wo.vendor?.companyName || 'Maintenance Team',
        uploadedAt: new Date(wo.updatedAt || Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        description:
          wo.status === 'COMPLETED' ? 'Work completion report and photos' : 'Before/after photos',
        tags: [
          'work-order',
          wo.priority?.toLowerCase() || 'normal',
          wo.status?.toLowerCase() || 'pending',
        ],
        url: '#',
      });
    }
  });

  // Vendor documents
  vendors?.forEach((vendor: any) => {
    documents.push({
      id: `doc-${docId++}`,
      name: `${vendor.companyName} - W9 Form.pdf`,
      type: 'application/pdf',
      size: Math.floor(Math.random() * 500000) + 100000,
      category: 'vendor',
      linkedTo: { type: 'vendor', id: vendor.id, name: vendor.companyName },
      uploadedBy: vendor.companyName,
      uploadedAt: new Date(
        vendor.createdAt || Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000,
      ),
      description: 'Vendor W9 tax form',
      tags: ['w9', 'tax', 'vendor'],
      url: '#',
    });

    if (Math.random() > 0.5) {
      documents.push({
        id: `doc-${docId++}`,
        name: `${vendor.companyName} - Insurance Certificate.pdf`,
        type: 'application/pdf',
        size: Math.floor(Math.random() * 1500000) + 200000,
        category: 'vendor',
        linkedTo: { type: 'vendor', id: vendor.id, name: vendor.companyName },
        uploadedBy: vendor.companyName,
        uploadedAt: new Date(Date.now() - Math.random() * 120 * 24 * 60 * 60 * 1000),
        description: 'Vendor liability insurance certificate',
        tags: ['insurance', 'liability', 'vendor'],
        url: '#',
      });
    }
  });

  // Financial documents
  for (let i = 0; i < 5; i++) {
    const month = new Date();
    month.setMonth(month.getMonth() - i);

    documents.push({
      id: `doc-${docId++}`,
      name: `Financial Report - ${format(month, 'MMMM yyyy')}.xlsx`,
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: Math.floor(Math.random() * 2000000) + 500000,
      category: 'financial',
      uploadedBy: 'System',
      uploadedAt: new Date(month),
      description: 'Monthly financial report and rent roll',
      tags: ['financial', 'report', 'monthly'],
      url: '#',
    });
  }

  return documents;
};

export default function DocumentsPage() {
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch data
  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      const response = await api.get('/properties');
      return response.data.data;
    },
  });

  const { data: leases } = useQuery({
    queryKey: ['leases'],
    queryFn: async () => {
      const response = await api.get('/leases');
      return response.data.data;
    },
  });

  const { data: workOrders } = useQuery({
    queryKey: ['workOrders'],
    queryFn: async () => {
      const response = await api.get('/work-orders');
      return response.data.data;
    },
  });

  const { data: vendors } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const response = await api.get('/vendors');
      return response.data.data;
    },
  });

  // Generate documents from real data
  const documents = useMemo(() => {
    return generateDocumentsFromData(
      properties || [],
      leases || [],
      workOrders || [],
      vendors || [],
    );
  }, [properties, leases, workOrders, vendors]);

  // Filter and sort documents
  const filteredDocuments = useMemo(() => {
    let filtered = documents;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((doc) => doc.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (doc) =>
          doc.name.toLowerCase().includes(query) ||
          doc.description?.toLowerCase().includes(query) ||
          doc.tags.some((tag) => tag.toLowerCase().includes(query)) ||
          doc.linkedTo?.name.toLowerCase().includes(query),
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          comparison = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
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
  }, [documents, selectedCategory, searchQuery, sortBy, sortOrder]);

  // Stats
  const stats = useMemo(() => {
    const totalSize = documents.reduce((sum, doc) => sum + doc.size, 0);
    const categoryBreakdown = documents.reduce(
      (acc, doc) => {
        acc[doc.category] = (acc[doc.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      total: documents.length,
      totalSize,
      categoryBreakdown,
      recentUploads: documents.filter(
        (doc) => new Date(doc.uploadedAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000,
      ).length,
    };
  }, [documents]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      console.log(
        '[DocumentsPage] Files selected for upload:',
        Array.from(files).map((f) => f.name),
      );
      setShowUploadModal(true);
    }
  };

  const handleDownload = useCallback((doc: Document) => {
    console.log('[DocumentsPage] Downloading document:', doc.name);
    // In a real app, this would trigger a download
    alert(`Download started: ${doc.name}`);
  }, []);

  const handleDelete = useCallback((doc: Document) => {
    console.log('[DocumentsPage] Delete requested for:', doc.name);
    if (confirm(`Are you sure you want to delete "${doc.name}"?`)) {
      console.log('[DocumentsPage] Document deleted:', doc.id);
    }
  }, []);

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
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
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
              <p className="text-2xl font-bold text-gray-900">{formatFileSize(stats.totalSize)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-xl">
              <Upload className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Recent Uploads</p>
              <p className="text-2xl font-bold text-gray-900">{stats.recentUploads}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 rounded-xl">
              <FolderOpen className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Categories</p>
              <p className="text-2xl font-bold text-gray-900">
                {Object.keys(stats.categoryBreakdown).length}
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
              placeholder="Search documents by name, tags, or linked items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {(Object.keys(categoryConfig) as DocumentCategory[]).map((category) => {
              const config = categoryConfig[category];
              const Icon = config.icon;
              const count =
                category === 'all' ? stats.total : stats.categoryBreakdown[category] || 0;

              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    selectedCategory === category
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {config.label}
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-xs ${
                      selectedCategory === category ? 'bg-white/20' : 'bg-gray-200'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

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

        {/* Selection and Sort Controls */}
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
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="w-4 h-4" />
                Download
              </Button>
              <Button variant="outline" size="sm" className="gap-2 text-red-600 hover:text-red-700">
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Documents View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDocuments.map((doc) => {
            const FileIcon = getFileIcon(doc.type);
            const categoryConf = categoryConfig[doc.category];

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
                  <div className={`p-3 bg-${categoryConf.color}-100 rounded-xl`}>
                    <FileIcon className={`w-6 h-6 text-${categoryConf.color}-600`} />
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

                {doc.linkedTo && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                    <LinkIcon className="w-3 h-3" />
                    <span className="truncate">{doc.linkedTo.name}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{formatFileSize(doc.size)}</span>
                  <span>{formatDistanceToNow(new Date(doc.uploadedAt), { addSuffix: true })}</span>
                </div>

                {doc.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {doc.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                    {doc.tags.length > 3 && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                        +{doc.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
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
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Category</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Linked To</th>
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
                const FileIcon = getFileIcon(doc.type);
                const categoryConf = categoryConfig[doc.category];
                const CategoryIcon = categoryConf.icon;

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
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-${categoryConf.color}-100 text-${categoryConf.color}-700`}
                      >
                        <CategoryIcon className="w-3 h-3" />
                        {categoryConf.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {doc.linkedTo ? (
                        <span className="text-sm text-gray-600 truncate max-w-xs block">
                          {doc.linkedTo.name}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatFileSize(doc.size)}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-600">
                        {format(new Date(doc.uploadedAt), 'MMM d, yyyy')}
                      </div>
                      <div className="text-xs text-gray-400">by {doc.uploadedBy}</div>
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

          {filteredDocuments.length === 0 && (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No documents found</h3>
              <p className="text-gray-500">Try adjusting your search or filter criteria</p>
            </div>
          )}
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
                {selectedDocument.type.includes('image') ? (
                  <div className="text-center">
                    <FileImage className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Image Preview</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      {selectedDocument.type.includes('pdf') ? 'PDF Document' : 'Document Preview'}
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
                      {selectedDocument.type.split('/')[1]?.toUpperCase() || 'Unknown'}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Uploaded</p>
                    <p className="font-medium text-gray-900">
                      {format(new Date(selectedDocument.uploadedAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Uploaded By</p>
                    <p className="font-medium text-gray-900">{selectedDocument.uploadedBy}</p>
                  </div>
                </div>

                {selectedDocument.linkedTo && (
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <p className="text-xs text-gray-500 mb-2">Linked To</p>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">
                        {selectedDocument.linkedTo.name}
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {selectedDocument.linkedTo.type.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                )}

                {selectedDocument.tags.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedDocument.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-2">
                  <Copy className="w-4 h-4" />
                  Copy Link
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Open
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-red-600 hover:text-red-700"
                  onClick={() => {
                    handleDelete(selectedDocument);
                    setSelectedDocument(null);
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
                onClick={() => setShowUploadModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary">
                    {(Object.keys(categoryConfig) as DocumentCategory[])
                      .filter((c) => c !== 'all')
                      .map((category) => (
                        <option key={category} value={category}>
                          {categoryConfig[category].label}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Link to (optional)
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary">
                    <option value="">No link</option>
                    <optgroup label="Properties">
                      {properties?.map((p: any) => (
                        <option key={p.id} value={`property:${p.id}`}>
                          {p.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Vendors">
                      {vendors?.map((v: any) => (
                        <option key={v.id} value={`vendor:${v.id}`}>
                          {v.companyName}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Add a description..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 bg-gray-50">
              <Button variant="outline" onClick={() => setShowUploadModal(false)}>
                Cancel
              </Button>
              <Button className="gap-2">
                <Upload className="w-4 h-4" />
                Upload Files
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
