import { useQuery } from '@tanstack/react-query';
import { DollarSign, TrendingUp, TrendingDown, PieChart } from 'lucide-react';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { formatCurrency } from '../lib/utils';

export default function FinancialPage() {
  const { data: dashboard } = useQuery({
    queryKey: ['financial-dashboard'],
    queryFn: async () => {
      const response = await api.get('/financial/dashboard');
      return response.data.data;
    },
  });

  const { data: chartOfAccounts } = useQuery({
    queryKey: ['chart-of-accounts'],
    queryFn: async () => {
      const response = await api.get('/financial/chart-of-accounts');
      return response.data.data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Financial Overview</h1>
        <p className="text-gray-500 mt-1">Track income, expenses, and financial health</p>
      </div>

      {/* Financial Summary */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
            <div className="p-2 rounded-lg bg-green-100 text-green-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboard?.totalRevenue || 0)}</div>
            <p className="text-xs text-gray-500 mt-1">Current period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Expenses</CardTitle>
            <div className="p-2 rounded-lg bg-red-100 text-red-600">
              <TrendingDown className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboard?.totalExpenses || 0)}</div>
            <p className="text-xs text-gray-500 mt-1">Current period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Net Operating Income</CardTitle>
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboard?.netOperatingIncome || 0)}</div>
            <p className="text-xs text-gray-500 mt-1">NOI</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Cash Balance</CardTitle>
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
              <PieChart className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboard?.cashBalance || 0)}</div>
            <p className="text-xs text-gray-500 mt-1">Available funds</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart of Accounts */}
      <Card>
        <CardHeader>
          <CardTitle>Chart of Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {chartOfAccounts && chartOfAccounts.length > 0 ? (
            <div className="space-y-4">
              {['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'].map((type) => {
                const accounts = chartOfAccounts.filter((a: any) => a.type === type);
                if (accounts.length === 0) return null;

                return (
                  <div key={type}>
                    <h3 className="font-semibold text-sm text-gray-700 mb-2">
                      {type.charAt(0) + type.slice(1).toLowerCase()}s
                    </h3>
                    <div className="space-y-1">
                      {accounts.map((account: any) => (
                        <div key={account.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono text-gray-500 w-16">{account.accountNumber}</span>
                            <span className="text-sm font-medium">{account.name}</span>
                          </div>
                          <span className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded">
                            {account.subType.replace('_', ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">Loading chart of accounts...</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
